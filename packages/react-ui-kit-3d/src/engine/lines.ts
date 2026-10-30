import type * as T from 'three';
import type { ThreeModule } from '../types';

/** Uniforms shared by every line material so one resize updates them all. */
export interface LineUniforms {
  uRes: { value: T.Vector2 };
  /** Line width in device pixels. */
  uWidth: { value: number };
}

// WebGL draws 1px lines. Ink edges, silhouettes and guides are screen-space quads instead: constant width
// in device pixels (2 CSS px x DPR), square caps, optional dashes, within three core only.
const QUAD_VERT = /* glsl */ `
uniform vec2 uRes; uniform float uWidth;
attribute vec3 aEnd; attribute vec2 aCorner;
varying float vLen;
void main() {
  vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  vec4 b = projectionMatrix * modelViewMatrix * vec4(aEnd, 1.);
  vec2 sa = a.xy / max(a.w, 1e-4) * uRes * .5, sb = b.xy / max(b.w, 1e-4) * uRes * .5;
  vec2 d = sb - sa; float len = length(d); d = len > 0. ? d / len : vec2(1., 0.);
  float h = uWidth * .5; float e = aCorner.x;
  vec4 p = e > .5 ? b : a;
  vec2 off = (vec2(-d.y, d.x) * aCorner.y + d * (e * 2. - 1.)) * h;
  vLen = e * len + (e * 2. - 1.) * h;
  gl_Position = vec4(p.xy + off / (uRes * .5) * p.w, p.z, p.w);
}`;

const HULL_VERT = /* glsl */ `
uniform vec2 uRes; uniform float uWidth;
attribute vec3 aSmooth;
void main() {
  vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  vec2 dir = (projectionMatrix * vec4(normalize(normalMatrix * aSmooth), 0.)).xy;
  float l = length(dir); dir = l > 1e-5 ? dir / l : vec2(0.);
  c.xy += dir * uWidth * 2. / uRes * c.w;
  gl_Position = c;
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity, uWidth; uniform vec2 uDash;
varying float vLen;
void main() {
  vec2 dd = uDash * uWidth;
  if (dd.x > 0. && mod(vLen, dd.x + dd.y) > dd.x) discard;
  gl_FragColor = vec4(uColor, uOpacity);
  #include <colorspace_fragment>
}`;

const HULL_FRAG = /* glsl */ `
uniform vec3 uColor;
void main() {
  gl_FragColor = vec4(uColor, 1.);
  #include <colorspace_fragment>
}`;

export function lineUniforms(three: ThreeModule): LineUniforms {
  return { uRes: { value: new three.Vector2(1, 1) }, uWidth: { value: 2 } };
}

/** Solid or dashed screen-space line material. `dash` is [dash, gap] in line widths. */
export function lineMaterial(three: ThreeModule, u: LineUniforms, color: string, opts: { dash?: [number, number]; transparent?: boolean } = {}): T.ShaderMaterial {
  return new three.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: FRAG,
    uniforms: { ...u, uColor: { value: new three.Color(color) }, uOpacity: { value: 1 }, uDash: { value: new three.Vector2(...(opts.dash ?? [0, 0])) } },
    side: three.DoubleSide,
    transparent: opts.transparent ?? false,
    depthTest: !opts.transparent,
    depthWrite: !opts.transparent,
  });
}

/** Back-face hull pushed outward in screen space: the silhouette outline. */
export function hullMaterial(three: ThreeModule, u: LineUniforms, color: string): T.ShaderMaterial {
  return new three.ShaderMaterial({ vertexShader: HULL_VERT, fragmentShader: HULL_FRAG, uniforms: { ...u, uColor: { value: new three.Color(color) } }, side: three.BackSide });
}

/** A quad per segment of `segments` (pairs of points, local space). */
export function quadGeometry(three: ThreeModule, segments: ArrayLike<number>): T.BufferGeometry {
  const n = segments.length / 6;
  const start = new Float32Array(n * 12);
  const end = new Float32Array(n * 12);
  const corner = new Float32Array(n * 8);
  const index = new Uint32Array(n * 6);
  for (let i = 0; i < n; i++) {
    for (let v = 0; v < 4; v++) {
      for (let k = 0; k < 3; k++) {
        start[i * 12 + v * 3 + k] = segments[i * 6 + k]!;
        end[i * 12 + v * 3 + k] = segments[i * 6 + 3 + k]!;
      }
      corner.set([v >> 1, v & 1 ? 1 : -1], i * 8 + v * 2);
    }
    index.set([0, 1, 2, 1, 3, 2].map((c) => c + i * 4), i * 6);
  }
  const g = new three.BufferGeometry();
  g.setAttribute('position', new three.BufferAttribute(start, 3));
  g.setAttribute('aEnd', new three.BufferAttribute(end, 3));
  g.setAttribute('aCorner', new three.BufferAttribute(corner, 2));
  g.setIndex(new three.BufferAttribute(index, 1));
  return g;
}

/** Crease edges of a geometry as quads. */
export function edgeGeometry(three: ThreeModule, source: T.BufferGeometry, angle = 35): T.BufferGeometry {
  const edges = new three.EdgesGeometry(source, angle);
  const g = quadGeometry(three, edges.getAttribute('position').array);
  edges.dispose();
  return g;
}

/** Same vertices as `source`, plus smoothed normals (coincident positions averaged) so the hull has no gaps at hard edges. */
export function hullGeometry(three: ThreeModule, source: T.BufferGeometry): T.BufferGeometry {
  const pos = source.getAttribute('position');
  const nor = source.getAttribute('normal') ?? (source.computeVertexNormals(), source.getAttribute('normal'));
  const sums = new Map<string, [number, number, number]>();
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  for (let i = 0; i < pos.count; i++) {
    const s = sums.get(key(i)) ?? [0, 0, 0];
    s[0] += nor.getX(i);
    s[1] += nor.getY(i);
    s[2] += nor.getZ(i);
    sums.set(key(i), s);
  }
  const smooth = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const s = sums.get(key(i))!;
    const l = Math.hypot(s[0], s[1], s[2]) || 1;
    smooth.set([s[0] / l, s[1] / l, s[2] / l], i * 3);
  }
  const g = new three.BufferGeometry();
  g.setAttribute('position', pos);
  g.setAttribute('aSmooth', new three.BufferAttribute(smooth, 3));
  if (source.index) g.setIndex(source.index);
  return g;
}

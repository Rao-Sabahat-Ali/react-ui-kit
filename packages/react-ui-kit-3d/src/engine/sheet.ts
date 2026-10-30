import type * as T from 'three';
import type { SceneLook, SceneTokens, ThreeModule } from '../types';
import { edgeGeometry, hullGeometry, hullMaterial, lineMaterial, type LineUniforms } from './lines';

export type SheetKind = 'surface' | 'raised' | 'accent' | 'shell' | 'ink';

const colorOf = (kind: SheetKind, t: SceneTokens) => ({ surface: t.surface, raised: t.surfaceRaised, accent: t.accent, shell: t.shell, ink: t.line })[kind];

/** The materials of a scene: one shared fill per kind, one shared ink edge and one shared silhouette hull. */
export function createSheet(three: ThreeModule, tokens: SceneTokens, look: SceneLook, u: LineUniforms) {
  const fills = new Map<SheetKind, T.MeshBasicMaterial | T.MeshStandardMaterial>();
  const edge = lineMaterial(three, u, tokens.line);
  const hull = hullMaterial(three, u, tokens.line);
  edge.userData.shared = hull.userData.shared = true;
  let current = tokens;

  const fill = (kind: SheetKind) => {
    let m = fills.get(kind);
    if (!m) {
      const color = colorOf(kind, current);
      // Sheet fills are flat and unlit and sit just behind their own edges (polygon offset); shaded fills are lit.
      m =
        look === 'sheet'
          ? new three.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
          : new three.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.04 });
      m.userData.shared = true;
      fills.set(kind, m);
    }
    return m;
  };

  const disposeMaterial = (m: T.Material) => {
    for (const value of Object.values(m)) if ((value as T.Texture | null)?.isTexture) (value as T.Texture).dispose();
    m.dispose();
  };

  return {
    /** Replace every mesh's material with the shared sheet fill and (sheet look) add its ink silhouette and crease edges. */
    restyle(object: T.Object3D) {
      const meshes: T.Mesh[] = [];
      object.traverse((o) => {
        if ((o as T.Mesh).isMesh && !o.userData.sheetPart && !o.userData.sheetDone) meshes.push(o as T.Mesh);
      });
      for (const mesh of meshes) {
        for (const old of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) disposeMaterial(old);
        mesh.material = fill((mesh.userData.sheet as SheetKind | undefined) ?? 'surface');
        mesh.userData.sheetDone = true;
        if (look !== 'sheet') continue;
        const outline = new three.Mesh(hullGeometry(three, mesh.geometry), hull);
        const edges = new three.Mesh(edgeGeometry(three, mesh.geometry), edge);
        for (const part of [outline, edges]) {
          part.userData.sheetPart = true;
          part.frustumCulled = false;
          mesh.add(part);
        }
      }
    },
    /** Re-colour in place (theme or profile changed); nothing is rebuilt. */
    setTokens(next: SceneTokens) {
      current = next;
      for (const [kind, m] of fills) m.color.set(colorOf(kind, next));
      edge.uniforms.uColor!.value.set(next.line);
      hull.uniforms.uColor!.value.set(next.line);
    },
    dispose() {
      for (const m of fills.values()) m.dispose();
      edge.dispose();
      hull.dispose();
      fills.clear();
    },
  };
}

/** Dispose geometries, materials and their textures under `object` (the scene's shared sheet materials are disposed with the scene). */
export function disposeTree(object: T.Object3D) {
  object.traverse((o) => {
    const mesh = o as T.Mesh;
    mesh.geometry?.dispose();
    for (const m of Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []) {
      if (m.userData.shared) continue;
      for (const value of Object.values(m)) if ((value as T.Texture | null)?.isTexture) (value as T.Texture).dispose();
      m.dispose();
    }
  });
}

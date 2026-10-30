import type { Object3D } from 'three';

/** The dynamically imported three module, handed to model factories so they never import three themselves. */
export type ThreeModule = typeof import('three');

export type SceneLook = 'sheet' | 'shaded';
export type Vec3 = [number, number, number];

/** Design tokens read live from the scene's root element (`--ui-*`), as CSS colours and a line width in px. */
export interface SceneTokens {
  surface: string;
  surfaceRaised: string;
  line: string;
  lineMuted: string;
  accent: string;
  shell: string;
  /** `--ui-line-width` in CSS px (2). */
  lineWidth: number;
}

export interface ModelContext {
  tokens: SceneTokens;
  look: SceneLook;
  reducedMotion: boolean;
}

/** Builds the object. Mark meshes with `userData.sheet = 'accent' | 'shell' | 'raised' | 'ink'` to pick their fill in `look="sheet"`. */
export type ModelFactory = (three: ThreeModule, ctx: ModelContext) => Object3D | Promise<Object3D>;

export type AnimateFn = (object: Object3D, time: { elapsed: number; delta: number }) => void;

export interface CameraOptions {
  position?: Vec3;
  target?: Vec3;
  fov?: number;
}

/** What a `Model3D` declares to its scene. */
export interface ModelDef {
  factory?: ModelFactory;
  src?: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  fit?: boolean;
  parts?: 'children' | 'none';
  animate?: AnimateFn;
  restyle?: boolean;
  label?: string;
}

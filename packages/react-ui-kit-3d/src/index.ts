import './styles.scss';

// three is never imported here: Scene3D loads it with import('three') when the scene nears the viewport.
export { Scene3D, type Scene3DProps } from './components/Scene3D';
export { Model3D, type Model3DProps } from './components/Model3D';
export { en3d, type Scene3DMessages, type Scene3DMessageKey } from './locale';
export type { AnimateFn, CameraOptions, ModelContext, ModelDef, ModelFactory, SceneLook, SceneTokens, ThreeModule, Vec3 } from './types';

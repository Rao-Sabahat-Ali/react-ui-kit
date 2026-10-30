import { useContext, useEffect, useId } from 'react';
import { SceneContext, isDev, warnOnce } from '../../context';
import type { ModelDef } from '../../types';

export type Model3DProps = ModelDef;

/**
 * Declares one object inside a `Scene3D`: a procedural `factory` or a glTF `src`. Renders nothing to the DOM;
 * the parent scene builds, places, restyles, animates and disposes it. Keep `factory` and `animate` stable
 * (module level or `useCallback`): a new function identity rebuilds the object.
 */
export function Model3D(props: Model3DProps): null {
  const registry = useContext(SceneContext);
  const id = useId();
  useEffect(() => {
    registry?.register(id, props);
  });
  useEffect(() => () => registry?.unregister(id), [registry, id]);

  if (!registry) {
    if (isDev()) throw new Error('Model3D must be rendered inside a Scene3D.');
    return null;
  }
  if (!props.factory && !props.src) warnOnce('Model3D: pass a `factory` or a `src`.');
  return null;
}

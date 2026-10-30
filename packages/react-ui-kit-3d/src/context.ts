import { createContext } from 'react';
import type { ModelDef } from './types';

/** How a `Model3D` talks to the nearest `Scene3D`. */
export interface SceneRegistry {
  register(id: string, def: ModelDef): void;
  unregister(id: string): void;
}

export const SceneContext = createContext<SceneRegistry | null>(null);

export const isDev = () => typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

const warned = new Set<string>();
/** Development-only console warning, once per message. */
export function warnOnce(message: string) {
  if (!isDev() || warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

const same = (a?: readonly number[] | number, b?: readonly number[] | number) => (Array.isArray(a) || Array.isArray(b) ? String(a) === String(b) : a === b);

/** Whether two declarations of one model need no stage update (arrays compared by value). */
export function sameDef(a: ModelDef, b: ModelDef): boolean {
  return (
    a.factory === b.factory &&
    a.src === b.src &&
    a.fit === b.fit &&
    a.parts === b.parts &&
    a.animate === b.animate &&
    a.restyle === b.restyle &&
    a.label === b.label &&
    same(a.position, b.position) &&
    same(a.rotation, b.rotation) &&
    same(a.scale, b.scale)
  );
}

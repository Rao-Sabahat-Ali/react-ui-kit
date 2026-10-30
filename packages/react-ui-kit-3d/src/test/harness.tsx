import { act, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import type { Mesh, Object3D, PerspectiveCamera, Scene } from 'three';
import type { ModelFactory } from '../types';
import { FakeRenderer, installBrowserMocks, type BrowserMocks } from './fakes';

/** Install the browser mocks and return them; call `restore()` in afterEach. */
export const setup = (): BrowserMocks => installBrowserMocks();

/** Three boxes in a row at x = -1, 0, 1: a model with three assembly parts. */
export const trio: ModelFactory = (THREE) => {
  const g = new THREE.Group();
  for (const x of [-1, 0, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8));
    m.position.set(x, 0, 0);
    m.name = `part ${x}`;
    g.add(m);
  }
  return g;
};

/** Wait for the stage to be built, run the first frame and wait for the poster to hand over to the canvas. */
export async function reachReady(mocks: BrowserMocks): Promise<HTMLElement> {
  await waitFor(() => expect(mocks.pending()).toBeGreaterThan(0));
  act(() => mocks.step());
  const root = document.querySelector<HTMLElement>('.ui-scene3d')!;
  await waitFor(() => expect(root).toHaveAttribute('data-state', 'ready'));
  return root;
}

export const renderer = () => FakeRenderer.instances.at(-1)!;
export const canvas = () => document.querySelector('canvas')!;
export const sceneRoot = (): Scene => renderer().last()[0];
export const cameraOf = (): PerspectiveCamera => renderer().last()[1];
/** The first object a model added to the turntable group (the model's holder). */
export const holder = (index = 0): Object3D => sceneRoot().children[0]!.children[index]!;
export const object = (index = 0): Object3D => holder(index).children[0]!;
export const meshes = (o: Object3D): Mesh[] => {
  const out: Mesh[] = [];
  o.traverse((c) => (c as Mesh).isMesh && out.push(c as Mesh));
  return out;
};

export const poster = <svg data-testid="poster" viewBox="0 0 10 10" />;

export function mockConsole() {
  return { warn: vi.spyOn(console, 'warn').mockImplementation(() => {}), error: vi.spyOn(console, 'error').mockImplementation(() => {}) };
}


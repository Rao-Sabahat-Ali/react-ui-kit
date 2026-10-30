import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box3, Vector3, type BoxGeometry, type Mesh, type MeshBasicMaterial, type Object3D, type ShaderMaterial } from 'three';
import { gltf, type BrowserMocks } from '../../test/fakes';
import { cameraOf, holder, meshes, mockConsole, object, poster, reachReady, renderer, sceneRoot, setup, trio } from '../../test/harness';
import type { ModelContext, ModelFactory } from '../../types';
import { Scene3D } from '../Scene3D';
import { Model3D } from './Model3D';

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  const { FakeRenderer: Fake, probe } = await import('../../test/fakes');
  probe.threeLoads++;
  return { ...actual, WebGLRenderer: Fake };
});
vi.mock('three/addons/loaders/GLTFLoader.js', async () => {
  const T = await vi.importActual<typeof import('three')>('three');
  const { gltf: log } = await import('../../test/fakes');
  class GLTFLoader {
    async loadAsync(url: string) {
      log.loads.push(url);
      const scene = new T.Group();
      scene.add(new T.Mesh(new T.BoxGeometry(1, 1, 1)));
      return { scene };
    }
  }
  return { GLTFLoader };
});

let mocks: BrowserMocks;
beforeEach(() => {
  mocks = setup();
  gltf.loads = [];
});
afterEach(() => {
  mocks.restore();
  vi.restoreAllMocks();
});

const scene = (children: React.ReactNode, props: Partial<React.ComponentProps<typeof Scene3D>> = {}) => (
  <Scene3D aria-label="Test scene" poster={poster} loading="eager" {...props}>
    {children}
  </Scene3D>
);

describe('Model3D', () => {
  it('AC-1: a factory is built with the dynamically imported three module and a context of tokens, look and reducedMotion; async factories are awaited', async () => {
    const factory = vi.fn<ModelFactory>(async (THREE) => {
      await Promise.resolve();
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
      return g;
    });
    render(scene(<Model3D factory={factory} />));
    await reachReady(mocks);
    expect(factory).toHaveBeenCalledTimes(1);
    const [three, ctx] = factory.mock.calls[0] as [typeof import('three'), ModelContext];
    expect(typeof three.WebGLRenderer).toBe('function');
    expect(ctx.look).toBe('sheet');
    expect(ctx.reducedMotion).toBe(false);
    expect(ctx.tokens).toMatchObject({ surface: expect.any(String), line: expect.any(String), accent: expect.any(String), lineWidth: 2 });
    expect(meshes(object())).toHaveLength(1 + 2); // the mesh plus its ink silhouette and edge lines: the awaited object is in the scene
  });

  it('AC-2: a src model loads through the on-demand GLTFLoader; unsafe URLs are refused without a request and reported through onError', async () => {
    const view = render(scene(<Model3D src="/models/shelf.glb" />));
    await reachReady(mocks);
    expect(gltf.loads).toEqual(['/models/shelf.glb']);
    expect(object().children.length).toBeGreaterThan(0);
    view.unmount();

    for (const src of ['javascript:alert(1)', 'data:text/html;base64,PGgxPg==', 'mailto:a@b.c']) {
      const onError = vi.fn();
      const bad = render(scene(<Model3D src={src} />, { onError }));
      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(onError.mock.calls[0]![0]).toMatchObject({ message: expect.stringContaining('unsafe model URL') });
      bad.unmount();
    }
    expect(gltf.loads).toEqual(['/models/shelf.glb']);

    const data = render(scene(<Model3D src="data:model/gltf-binary;base64,AAAA" />));
    await reachReady(mocks);
    expect(gltf.loads.at(-1)).toBe('data:model/gltf-binary;base64,AAAA');
    data.unmount();
  });

  it('AC-3: position, rotation and scale are applied and change without rebuilding the object', async () => {
    const factory = vi.fn(trio);
    const { rerender } = render(scene(<Model3D factory={factory} position={[1, 2, 3]} rotation={[0, Math.PI / 2, 0]} scale={2} />));
    await reachReady(mocks);
    expect(holder().position.toArray()).toEqual([1, 2, 3]);
    expect(holder().rotation.y).toBeCloseTo(Math.PI / 2);
    expect(holder().scale.toArray()).toEqual([2, 2, 2]);
    const built = object();

    rerender(scene(<Model3D factory={factory} position={[0, 0.5, 0]} scale={[1, 2, 3]} />));
    act(() => mocks.step());
    expect(holder().position.toArray()).toEqual([0, 0.5, 0]);
    expect(holder().rotation.y).toBe(0);
    expect(holder().scale.toArray()).toEqual([1, 2, 3]);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(object()).toBe(built);
  });

  it('AC-4: fit frames the camera so the whole bounding box is visible at the scene aspect ratio', async () => {
    for (const [w, h] of [[400, 300], [200, 600]] as const) {
      mocks.setSize(w, h);
      const view = render(scene(<Model3D factory={trio} fit position={[2, 0, -1]} />));
      await reachReady(mocks);
      const camera = cameraOf();
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      const box = new Box3().setFromObject(holder(), true);
      const corners = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => new Vector3(x ? box.max.x : box.min.x, y ? box.max.y : box.min.y, z ? box.max.z : box.min.z))));
      for (const corner of corners) {
        const p = corner.project(camera);
        expect(Math.abs(p.x), `x at ${w}x${h}`).toBeLessThanOrEqual(1);
        expect(Math.abs(p.y), `y at ${w}x${h}`).toBeLessThanOrEqual(1);
        expect(p.z).toBeLessThan(1);
      }
      view.unmount();
    }
  });

  it('AC-5: in the sheet look every mesh gets a surface fill and ink edge lines; restyle={false} keeps authored materials', async () => {
    const authored = vi.fn((THREE: typeof import('three')) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 'red' })));
      return g;
    });
    document.documentElement.style.setProperty('--ui-color-surface', '#fafafa');
    document.documentElement.style.setProperty('--ui-color-line', '#101010');
    const view = render(scene(<><Model3D factory={trio} /><Model3D factory={authored} restyle={false} /></>));
    await reachReady(mocks);
    const [body] = meshes(object(0)).filter((m) => !m.userData.sheetPart);
    expect((body!.material as MeshBasicMaterial).color.getHexString()).toBe('fafafa');
    const lines = body!.children as Mesh[];
    expect(lines).toHaveLength(2); // silhouette hull + crease edges
    for (const l of lines) expect(((l.material as ShaderMaterial).uniforms.uColor!.value).getHexString()).toBe('101010');
    expect(((lines[1]!.geometry as BoxGeometry).getAttribute('aCorner')).count).toBe(12 * 4); // a quad per box edge
    const [kept] = meshes(object(1));
    expect((kept!.material as MeshBasicMaterial).color.getHexString()).toBe('ff0000');
    expect(kept!.children).toHaveLength(0);
    view.unmount();
    document.documentElement.removeAttribute('style');
  });

  it('AC-6: parts="children" exposes the direct children as assembly parts; parts="none" does not', async () => {
    const view = render(scene(<Model3D factory={trio} parts="children" />, { assemble: true }));
    await reachReady(mocks);
    expect(object().children.filter((c) => c.userData.sheetPart)).toHaveLength(1); // the guide group, one guide per part
    expect(object().children.filter((c) => c.userData.sheetPart)[0]!.children).toHaveLength(3);
    expect(object().children[0]!.position.x).not.toBe(-1);
    view.unmount();

    render(scene(<Model3D factory={trio} parts="none" />, { assemble: true }));
    await reachReady(mocks);
    expect(object().children.map((c) => c.position.x)).toEqual([-1, 0, 1]);
    expect(object().children.some((c) => c.userData.sheetPart)).toBe(false);
  });

  it('AC-7: animate runs once per rendered frame with elapsed and delta, never under reduced motion, while paused or offscreen', async () => {
    const animate = vi.fn();
    const { rerender } = render(scene(<Model3D factory={trio} animate={animate} />));
    await reachReady(mocks);
    mocks.step();
    mocks.step();
    mocks.step();
    expect(animate.mock.calls.length).toBe(renderer().render.mock.calls.length);
    const [target, time] = animate.mock.calls.at(-1) as [Object3D, { elapsed: number; delta: number }];
    expect(target).toBe(object());
    expect(time.delta).toBeGreaterThan(0);
    expect(time.elapsed).toBeGreaterThan(0);

    // offscreen
    act(() => mocks.view().trigger(false));
    const calls = animate.mock.calls.length;
    mocks.step();
    mocks.step();
    expect(animate).toHaveBeenCalledTimes(calls);
    act(() => mocks.view().trigger(true));
    mocks.step();
    expect(animate.mock.calls.length).toBeGreaterThan(calls);

    // paused by the user (Pause/Play button hides the loop's model animation)
    const before = animate.mock.calls.length;
    const pause = document.querySelector<HTMLButtonElement>('.ui-scene3d__controls button')!;
    act(() => pause.click());
    mocks.settle();
    const paused = animate.mock.calls.length;
    mocks.step();
    mocks.step();
    expect(animate).toHaveBeenCalledTimes(paused);
    expect(paused).toBeGreaterThanOrEqual(before);
    sessionStorage.removeItem('ui-scene3d:paused');
    rerender(<></>);

    // reduced motion
    mocks.setReducedMotion(true);
    const still = vi.fn();
    render(scene(<Model3D factory={trio} animate={still} />));
    await waitFor(() => expect(mocks.pending()).toBeGreaterThan(0));
    mocks.settle();
    expect(still).not.toHaveBeenCalled();
  });

  it('AC-8: rendering Model3D outside a Scene3D throws a development error naming the component', () => {
    mockConsole();
    expect(() => render(<Model3D factory={trio} />)).toThrow(/Model3D must be rendered inside a Scene3D/);
  });

  it('AC-9: unmounting a model removes it and disposes what it created without rebuilding the others', async () => {
    const a = vi.fn(trio);
    const b = vi.fn(trio);
    const { rerender } = render(scene(<><Model3D key="a" factory={a} label="A" /><Model3D key="b" factory={b} label="B" /></>));
    await reachReady(mocks);
    const [modelA, modelB] = [object(0), object(1)];
    const geometriesA = meshes(modelA).map((m) => m.geometry);
    const geometriesB = meshes(modelB).map((m) => m.geometry);
    const disposeA = geometriesA.map((g) => vi.spyOn(g, 'dispose'));
    const disposeB = geometriesB.map((g) => vi.spyOn(g, 'dispose'));
    expect(document.querySelector('.ui-scene3d__description')!.textContent).toContain('A');

    rerender(scene(<><Model3D key="b" factory={b} label="B" /></>));
    act(() => mocks.step());
    expect(sceneRoot().children[0]!.children).toHaveLength(1);
    expect(sceneRoot().children[0]!.children[0]!.children[0]).toBe(modelB);
    for (const spy of disposeA) expect(spy).toHaveBeenCalled();
    for (const spy of disposeB) expect(spy).not.toHaveBeenCalled();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.ui-scene3d__description')!.textContent).not.toContain('A');
  });
});

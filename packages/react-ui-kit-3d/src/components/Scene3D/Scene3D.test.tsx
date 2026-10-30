import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider, type LocaleMessages } from '@sabahat/react-ui-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import type { BoxGeometry, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial, Texture } from 'three';
import { FakeRenderer, type BrowserMocks } from '../../test/fakes';
import { canvas, meshes, mockConsole, object, poster, reachReady, renderer, sceneRoot, setup, trio } from '../../test/harness';
import { Model3D } from '../Model3D';
import { Scene3D } from './Scene3D';

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  const { FakeRenderer: Fake, probe } = await import('../../test/fakes');
  probe.threeLoads++;
  return { ...actual, WebGLRenderer: Fake };
});

let mocks: BrowserMocks;
beforeEach(() => {
  mocks = setup();
});
afterEach(() => {
  mocks.restore();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('style');
});

const scene = (props: Partial<React.ComponentProps<typeof Scene3D>> = {}, factory = trio) => (
  <Scene3D aria-label="Three boxes" poster={poster} loading="eager" {...props}>
    <Model3D factory={factory} />
  </Scene3D>
);

describe('Scene3D', () => {
  it('AC-1: three is imported only when loading triggers (visible: 200px margin; eager: mount; interaction: pointerdown or focus)', async () => {
    // visible: nothing happens until the root intersects with a 200px margin.
    const visible = render(scene({ loading: 'visible' }));
    const root = visible.container.querySelector('.ui-scene3d')!;
    expect(mocks.near().options?.rootMargin).toBe('200px');
    expect(root).toHaveAttribute('data-state', 'poster');
    expect(FakeRenderer.instances).toHaveLength(0);
    act(() => mocks.near().trigger(false));
    expect(root).toHaveAttribute('data-state', 'poster');
    act(() => mocks.near().trigger(true));
    await reachReady(mocks);
    expect(FakeRenderer.instances).toHaveLength(1);
    visible.unmount();

    // interaction: first pointerdown (or focus), not before.
    const interaction = render(scene({ loading: 'interaction' }));
    const el = interaction.container.querySelector('.ui-scene3d')!;
    await Promise.resolve();
    expect(el).toHaveAttribute('data-state', 'poster');
    fireEvent.pointerDown(el);
    await waitFor(() => expect(el).toHaveAttribute('data-state', 'loading'));
    interaction.unmount();

    // eager: on mount.
    const eager = render(scene({ loading: 'eager' }));
    await waitFor(() => expect(eager.container.querySelector('.ui-scene3d')).toHaveAttribute('data-state', 'loading'));
  });

  it('AC-2: the poster shares the canvas box, and stays with onError without WebGL, on a load failure or a throwing factory', async () => {
    const { container, unmount } = render(scene({ loading: 'visible', aspectRatio: '3 / 2' }));
    const root = container.querySelector<HTMLElement>('.ui-scene3d')!;
    expect(root.style.aspectRatio).toBe('3 / 2');
    // Poster and canvas are siblings in one box (both absolutely positioned over it in the stylesheet): nothing shifts at the handover.
    expect(screen.getByTestId('poster').closest('.ui-scene3d__poster')!.parentElement).toBe(root);
    expect(canvas().parentElement).toBe(root);
    unmount();

    // No WebGL context at all: three is not even downloaded.
    const onError = vi.fn();
    (HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const none = render(scene({ onError }));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(none.container.querySelector('.ui-scene3d')).toHaveAttribute('data-state', 'error');
    expect(screen.getByTestId('poster')).toBeVisible();
    expect(FakeRenderer.instances).toHaveLength(0);
    none.unmount();

    // The renderer cannot be created.
    (HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mockReturnValue({ getExtension: () => null });
    FakeRenderer.failWith = new Error('Error creating WebGL context.');
    const onRenderError = vi.fn();
    const broken = render(scene({ onError: onRenderError }));
    await waitFor(() => expect(onRenderError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error creating WebGL context.' })));
    expect(broken.container.querySelector('.ui-scene3d')).toHaveAttribute('data-state', 'error');
    broken.unmount();

    // A model factory throws.
    FakeRenderer.failWith = null;
    const onFactoryError = vi.fn();
    const boom = render(
      scene({ onError: onFactoryError }, () => {
        throw new Error('bad factory');
      }),
    );
    await waitFor(() => expect(onFactoryError).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad factory' })));
    expect(boom.container.querySelector('.ui-scene3d')).toHaveAttribute('data-state', 'error');
    expect(screen.getByTestId('poster')).toBeVisible();
  });

  it('AC-3: non-decorative scenes are role=img with the label and a description; decorative scenes are hidden; a missing label warns', async () => {
    const warn = mockConsole().warn;
    const { container, rerender } = render(scene({ description: 'Three white boxes in a row.' }, trio));
    const root = container.querySelector<HTMLElement>('.ui-scene3d')!;
    // Poster stage: the poster carries the alternative.
    const img = screen.getByRole('img', { name: 'Three boxes' });
    expect(img).toHaveAccessibleDescription('Three white boxes in a row.');
    await reachReady(mocks);
    // Ready: the canvas takes over the same role, name and description.
    const live = screen.getByRole('img', { name: 'Three boxes' });
    expect(live.tagName).toBe('CANVAS');
    expect(live).toHaveAccessibleDescription('Three white boxes in a row.');
    expect(root.querySelector('.ui-scene3d__poster')).toHaveAttribute('aria-hidden', 'true');

    rerender(scene({ decorative: true }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(canvas()).toHaveAttribute('aria-hidden', 'true');
    expect(root.querySelector('.ui-scene3d__poster')).toHaveAttribute('aria-hidden', 'true');
    expect(warn).not.toHaveBeenCalled();

    render(<Scene3D poster={poster} loading="visible" />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('aria-label'));
  });

  it('AC-4: with controls="orbit" the canvas is one tab stop and the arrows, +/- and Home move and reset the camera only while it has focus', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        {scene({ controls: 'orbit' })}
        <button type="button">after</button>
      </>,
    );
    await reachReady(mocks);
    const view = screen.getByRole('application', { name: 'Three boxes' });
    expect(view).toHaveAttribute('tabindex', '0');
    expect(view).toHaveAccessibleDescription(/Arrow keys rotate/);

    await user.tab();
    expect(screen.getByRole('button', { name: 'before' })).toHaveFocus();
    await user.tab();
    expect(view).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Reset view' })).toHaveFocus(); // the Reset button is the second stop; Tab always leaves the canvas

    const pose = () => {
      const p = renderer().last()[1].position;
      return [p.x, p.y, p.z].map((n) => n.toFixed(4)).join(',');
    };
    const home = pose();
    const press = async (keys: string) => {
      view.focus();
      await user.keyboard(keys);
      act(() => mocks.step());
      return pose();
    };
    const afterRight = await press('{ArrowRight}');
    expect(afterRight).not.toBe(home);
    const afterUp = await press('{ArrowUp}');
    expect(afterUp).not.toBe(afterRight);
    const afterZoom = await press('{+}');
    expect(afterZoom).not.toBe(afterUp);
    expect(await press('{Home}')).toBe(home);

    // Keys do nothing while another element has focus.
    screen.getByRole('button', { name: 'before' }).focus();
    await user.keyboard('{ArrowLeft}');
    act(() => mocks.step());
    expect(pose()).toBe(home);
  });

  it('AC-5: autoRotate shows a localised Pause/Play button that stops and resumes the rotation', async () => {
    const messages = { scene3dPause: 'Pausa', scene3dPlay: 'Spela' } as unknown as Partial<LocaleMessages>;
    render(<LocaleProvider locale="sv" messages={messages}>{scene({ autoRotate: 30 })}</LocaleProvider>);
    await reachReady(mocks);
    const turntable = () => sceneRoot().children[0]!.rotation.y;
    mocks.step();
    mocks.step();
    mocks.step();
    expect(turntable()).toBeGreaterThan(0);

    const toggle = screen.getByRole('button', { name: 'Pausa' });
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Spela' })).toBeInTheDocument();
    mocks.settle();
    const stopped = turntable();
    mocks.step();
    mocks.step();
    expect(turntable()).toBe(stopped);
    expect(sessionStorage.getItem('ui-scene3d:paused')).toBe('1');

    await userEvent.click(screen.getByRole('button', { name: 'Spela' }));
    mocks.step();
    mocks.step();
    mocks.step();
    expect(turntable()).toBeGreaterThan(stopped);
    sessionStorage.removeItem('ui-scene3d:paused');
  });

  it('AC-5b: a scene without autoRotate or animation has no Pause/Play button; the default English labels apply', async () => {
    render(scene({ autoRotate: 12 }));
    await reachReady(mocks);
    expect(screen.getByRole('button', { name: 'Pause animation' })).toBeInTheDocument();
  });

  it('AC-6: under prefers-reduced-motion nothing animates and exactly one frame of the finished scene is drawn', async () => {
    mocks.setReducedMotion(true);
    const animate = vi.fn();
    render(
      <Scene3D aria-label="Boxes" poster={poster} loading="eager" assemble autoRotate>
        <Model3D factory={trio} parts="children" animate={animate} />
      </Scene3D>,
    );
    await reachReady(mocks);
    mocks.settle();
    expect(renderer().render).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /pause/i })).toBeNull();
    expect(sceneRoot().children[0]!.rotation.y).toBe(0);
    // The finished object: every part at its authored position, no guide lines.
    expect(object().children.map((c) => c.position.x)).toEqual([-1, 0, 1]);
    expect(object().children).toHaveLength(3);
  });

  it('AC-7: the render loop stops offscreen and in a hidden tab, and resumes when the scene returns', async () => {
    render(scene({ autoRotate: 30 }));
    await reachReady(mocks);
    const frames = () => renderer().render.mock.calls.length;
    mocks.step();
    const running = frames();
    expect(mocks.pending()).toBe(1);

    act(() => mocks.view().trigger(false));
    expect(mocks.pending()).toBe(0);
    mocks.step();
    expect(frames()).toBe(running);

    act(() => mocks.view().trigger(true));
    mocks.step();
    expect(frames()).toBeGreaterThan(running);

    mocks.setHidden(true);
    const hidden = frames();
    expect(mocks.pending()).toBe(0);
    mocks.step();
    expect(frames()).toBe(hidden);
    mocks.setHidden(false);
    mocks.step();
    expect(frames()).toBeGreaterThan(hidden);
  });

  it('AC-8: assemble moves each part from an exploded position to its own with staggered timing, draws a guide per part and ends exact', async () => {
    const authored = [-1, 0, 1].map((x) => new Vector3(x, 0, 0));
    render(
      <Scene3D aria-label="Boxes" poster={poster} loading="eager" assemble>
        <Model3D factory={trio} parts="children" />
      </Scene3D>,
    );
    await reachReady(mocks);
    const parts = () => object().children.filter((c) => !c.userData.sheetPart);
    const guides = () => object().children.filter((c) => c.userData.sheetPart).flatMap((g) => g.children);
    // First frame: exploded, one dashed guide per part.
    expect(parts()).toHaveLength(3);
    parts().forEach((p, i) => expect(p.position.distanceTo(authored[i]!)).toBeGreaterThan(0.5));
    expect(guides()).toHaveLength(3);
    expect(((guides()[0] as Mesh).material as ShaderMaterial).uniforms.uDash!.value.x).toBeGreaterThan(0);
    expect(document.querySelector('.ui-scene3d')).toHaveAttribute('data-animating');

    // Staggered: while all travel, the first part is further along than the last one.
    const start = parts().map((p, i) => p.position.distanceTo(authored[i]!));
    mocks.step(200);
    const left = parts().map((p, i) => p.position.distanceTo(authored[i]!) / start[i]!);
    expect(left[0]!).toBeLessThan(left[2]!);

    mocks.settle();
    parts().forEach((p, i) => expect(p.position.toArray()).toEqual(authored[i]!.toArray())); // exactly the authored transform
    expect(object().children.filter((c) => c.userData.sheetPart)).toHaveLength(0);
    expect(document.querySelector('.ui-scene3d')).not.toHaveAttribute('data-animating');
  });

  it('AC-8b: only the first 12 parts animate; the rest stay in place', async () => {
    const many = (THREE: typeof import('three')) => {
      const g = new THREE.Group();
      for (let i = 0; i < 14; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
        m.position.set((i % 7) * 0.4 - 1.2, Math.floor(i / 7) * 0.4, 0);
        g.add(m);
      }
      return g;
    };
    render(
      <Scene3D aria-label="Many" poster={poster} loading="eager" assemble>
        <Model3D factory={many} parts="children" />
      </Scene3D>,
    );
    await reachReady(mocks);
    const parts = object().children.filter((c) => !c.userData.sheetPart);
    expect(parts).toHaveLength(14);
    const guides = object().children.filter((c) => c.userData.sheetPart).flatMap((g) => g.children);
    expect(guides).toHaveLength(12);
    expect(parts[12]!.position.x).toBeCloseTo((12 % 7) * 0.4 - 1.2); // untouched
  });

  it('AC-9: look="sheet" fills with the surface token, draws edges in the line token, and re-colours on theme or profile change without rebuilding', async () => {
    const factory = vi.fn(trio);
    document.documentElement.style.setProperty('--ui-color-surface', '#ffffff');
    document.documentElement.style.setProperty('--ui-color-line', '#121212');
    render(scene({}, factory));
    await reachReady(mocks);
    const fill = () => (meshes(object())[0]!.material as MeshBasicMaterial).color.getHexString();
    const edge = () => {
      const edges = meshes(object()).find((m) => (m.material as ShaderMaterial).isShaderMaterial && m.userData.sheetPart)!;
      return (edges.material as ShaderMaterial).uniforms.uColor!.value.getHexString() as string;
    };
    expect(fill()).toBe('ffffff');
    expect(edge()).toBe('121212');
    const created = FakeRenderer.instances.length;

    document.documentElement.style.setProperty('--ui-color-surface', '#0c0c0c');
    document.documentElement.style.setProperty('--ui-color-line', '#f2f2f2');
    act(() => document.documentElement.setAttribute('data-bs-theme', 'dark'));
    await waitFor(() => expect(fill()).toBe('0c0c0c'));
    expect(edge()).toBe('f2f2f2');

    document.documentElement.style.setProperty('--ui-color-line', '#ffc53d');
    act(() => document.documentElement.setAttribute('data-ui-profile', 'game'));
    await waitFor(() => expect(edge()).toBe('ffc53d'));
    expect(factory).toHaveBeenCalledTimes(1);
    expect(FakeRenderer.instances).toHaveLength(created);
  });

  it('AC-10: unmounting disposes every geometry, material and texture of the scene and its models and releases the renderer', async () => {
    let texture!: Texture;
    let authoredGeometry!: BoxGeometry;
    const textured = (THREE: typeof import('three')) => {
      const g = new THREE.Group();
      texture = new THREE.Texture();
      authoredGeometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(authoredGeometry, new THREE.MeshBasicMaterial({ map: texture }));
      g.add(mesh);
      return g;
    };
    const view = render(
      <Scene3D aria-label="Textured" poster={poster} loading="eager">
        <Model3D factory={textured} restyle={false} />
        <Model3D factory={trio} />
      </Scene3D>,
    );
    await reachReady(mocks);
    const spies = new Set<ReturnType<typeof vi.fn>>();
    const watch = (o: { dispose(): void }) => {
      const fn = vi.spyOn(o, 'dispose');
      spies.add(fn as never);
      return fn;
    };
    const all: Object3D[] = [object(0), object(1)];
    const resources = new Set<{ dispose(): void }>();
    for (const root of all) {
      root.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) resources.add(m.geometry);
        for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) resources.add(mat);
      });
    }
    resources.add(texture);
    expect(resources.size).toBeGreaterThan(5);
    for (const r of resources) watch(r);
    const r = renderer();

    view.unmount();
    for (const spy of spies) expect(spy).toHaveBeenCalled();
    expect(texture.dispose).toHaveBeenCalled();
    expect(r.dispose).toHaveBeenCalled();
    expect(r.forceContextLoss).toHaveBeenCalled();
    expect(mocks.pending()).toBe(0);
  });

  it('AC-11: webglcontextlost shows the poster and webglcontextrestored rebuilds the scene and hides it again', async () => {
    const factory = vi.fn(trio);
    const view = render(scene({}, factory));
    const root = (await reachReady(mocks)) as HTMLElement;
    expect(factory).toHaveBeenCalledTimes(1);

    const lost = new Event('webglcontextlost', { cancelable: true });
    act(() => void canvas().dispatchEvent(lost));
    expect(lost.defaultPrevented).toBe(true);
    expect(root).toHaveAttribute('data-state', 'lost');
    expect(screen.getByRole('img', { name: 'Three boxes' }).tagName).not.toBe('CANVAS');
    expect(mocks.pending()).toBe(0);

    act(() => void canvas().dispatchEvent(new Event('webglcontextrestored')));
    await reachReady(mocks);
    expect(FakeRenderer.instances).toHaveLength(2);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(root).toHaveAttribute('data-state', 'ready');
    expect(view.container.querySelector('.ui-scene3d__poster')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-12: the pixel ratio never exceeds maxDpr and the canvas follows its box', async () => {
    mocks.setDpr(3);
    const view = render(scene({ maxDpr: 1.5 }));
    await reachReady(mocks);
    expect(renderer().setPixelRatio).toHaveBeenLastCalledWith(1.5);
    expect(renderer().setSize).toHaveBeenLastCalledWith(400, 300, false);
    expect(cameraAspect()).toBeCloseTo(400 / 300);
    view.unmount();

    mocks.setDpr(1);
    render(scene());
    await reachReady(mocks);
    expect(renderer().setPixelRatio).toHaveBeenLastCalledWith(1);
    mocks.setDpr(3);
    mocks.setSize(600, 200);
    act(() => mocks.size().trigger());
    mocks.step();
    expect(renderer().setPixelRatio).toHaveBeenLastCalledWith(2); // default cap
    expect(renderer().setSize).toHaveBeenLastCalledWith(600, 200, false);
    expect(cameraAspect()).toBeCloseTo(3);

    function cameraAspect() {
      return renderer().last()[1].aspect;
    }
  });

});

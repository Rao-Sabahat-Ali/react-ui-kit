import { act, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EASING, MOTION, parseCssLength, parseCssTime, readAssembleDistance, safeAnimate, useAssemble, useCountTick, useFlip, usePresence, useReducedMotion, useViewTransition } from './index';

interface FakeAnimation {
  el: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
  finish: ReturnType<typeof vi.fn>;
  finished: Promise<void>;
  addEventListener: ReturnType<typeof vi.fn>;
}

let calls: FakeAnimation[] = [];
let reduced = false;

function installWaapi() {
  calls = [];
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = function (this: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    const animation: FakeAnimation = { el: this, keyframes, options, cancel: vi.fn(), finish: vi.fn(), finished: Promise.resolve(), addEventListener: vi.fn() };
    calls.push(animation);
    return animation;
  };
}

function mockMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  reduced = false;
  (document as unknown as { getAnimations: unknown }).getAnimations = () => [];
  installWaapi();
  mockMatchMedia();
});
afterEach(() => {
  delete (document as unknown as { getAnimations?: unknown }).getAnimations;
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
  vi.useRealTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('motion tokens', () => {
  it('AC-1: constants mirror the generated tokens (grammar order, easing curves, 12px travel)', () => {
    expect([MOTION.instant, MOTION.quick, MOTION.part, MOTION.step]).toEqual([90, 160, 280, 420]);
    expect(MOTION.stagger).toBe(40);
    expect(MOTION.assembleDistance).toBe(12);
    expect(EASING.out).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(EASING.snap).toBe('cubic-bezier(0.34, 1.4, 0.64, 1)');
    expect(EASING.in).toBe('cubic-bezier(0.7, 0, 0.84, 0)');
  });

  it('AC-2: parses css times and lengths, falling back to the constants', () => {
    expect(parseCssTime('280ms', 1)).toBe(280);
    expect(parseCssTime('0.42s', 1)).toBe(420);
    expect(parseCssTime('', 7)).toBe(7);
    expect(parseCssLength('12px', 1)).toBe(12);
    expect(parseCssLength('1rem', 1)).toBe(16);
    expect(readAssembleDistance(document.body)).toBe(12);
  });
});

describe('useReducedMotion', () => {
  it('AC-3: reflects the media query', () => {
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
    reduced = true;
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });
});

describe('safeAnimate', () => {
  it('AC-4: skips under reduced motion unless a fade is requested, then keeps opacity only (≤ 120 ms)', () => {
    reduced = true;
    const el = document.createElement('div');
    expect(safeAnimate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })).toBeNull();
    safeAnimate(el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 80, reduced: 'fade' });
    const call = calls.at(-1)!;
    expect(call.keyframes.every((k) => !('transform' in k))).toBe(true);
    expect(call.options.duration).toBe(120);
    expect(call.options.delay).toBe(0);
  });

  it('AC-5: does nothing in a hidden tab and finishes running animations when the tab is hidden', () => {
    const el = document.createElement('div');
    const a = safeAnimate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 100 })!;
    expect(a).toBeTruthy();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(calls.at(-1)!.finish).toHaveBeenCalled();
    expect(safeAnimate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 100 })).toBeNull();
  });

  it('AC-6: returns null when the Web Animations API is missing', () => {
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
    expect(safeAnimate(document.createElement('div'), [{ opacity: 0 }, { opacity: 1 }], { duration: 100 })).toBeNull();
  });
});

describe('usePresence', () => {
  it('AC-7: stays mounted with data-state closed for exitMs, then unmounts', () => {
    vi.useFakeTimers();
    const onExited = vi.fn();
    const { result, rerender } = renderHook(({ open }) => usePresence(open, { exitMs: 200, onExited }), { initialProps: { open: true } });
    expect(result.current).toMatchObject({ present: true, state: 'open', exiting: false });
    rerender({ open: false });
    expect(result.current).toMatchObject({ present: true, state: 'closed', exiting: true });
    act(() => void vi.advanceTimersByTime(199));
    expect(result.current.present).toBe(true);
    act(() => void vi.advanceTimersByTime(2));
    expect(result.current.present).toBe(false);
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('AC-8: mounts in the same render when opened, and unmounts at once under reduced motion', () => {
    reduced = true;
    const { result, rerender } = renderHook(({ open }) => usePresence(open, { exitMs: 200 }), { initialProps: { open: false } });
    expect(result.current.present).toBe(false);
    rerender({ open: true });
    expect(result.current.present).toBe(true);
    rerender({ open: false });
    expect(result.current.present).toBe(false);
  });

  it('AC-9a: without CSS animation support (SSR, jsdom) the content unmounts at once', () => {
    delete (document as unknown as { getAnimations?: unknown }).getAnimations;
    const { result, rerender } = renderHook(({ open }) => usePresence(open, { exitMs: 200 }), { initialProps: { open: true } });
    rerender({ open: false });
    expect(result.current.present).toBe(false);
  });

  it('AC-9a: without CSS animation support (SSR, jsdom) the content unmounts at once', () => {
    delete (document as unknown as { getAnimations?: unknown }).getAnimations;
    const { result, rerender } = renderHook(({ open }) => usePresence(open, { exitMs: 200 }), { initialProps: { open: true } });
    rerender({ open: false });
    expect(result.current.present).toBe(false);
  });

  it('AC-9: reopening during the exit cancels the unmount', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ open }) => usePresence(open, { exitMs: 200 }), { initialProps: { open: true } });
    rerender({ open: false });
    act(() => void vi.advanceTimersByTime(100));
    rerender({ open: true });
    act(() => void vi.advanceTimersByTime(500));
    expect(result.current).toMatchObject({ present: true, state: 'open' });
  });
});

function Sheet({ trigger = 0, enabled = true, reverse = false, onComplete }: { trigger?: number; enabled?: boolean; reverse?: boolean; onComplete?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useAssemble(ref, { trigger, enabled, reverse, onComplete });
  return (
    <div ref={ref} data-testid="sheet">
      <span data-assemble-guide />
      {Array.from({ length: 10 }, (_, i) => (
        <p key={i} data-assemble>
          part {i}
        </p>
      ))}
    </div>
  );
}

describe('useAssemble', () => {
  it('AC-10: parts enter in order with 40ms stagger, travel 12px, and the last part snaps', () => {
    render(<Sheet />);
    const parts = calls.filter((c) => c.el.hasAttribute('data-assemble'));
    expect(parts).toHaveLength(MOTION.maxAnimated);
    expect(parts.map((c) => c.options.delay)).toEqual([0, 40, 80, 120, 160, 200, 240, 280]);
    expect(parts[0]!.keyframes[0]).toMatchObject({ opacity: 0, transform: 'translate(0, 12px)' });
    expect(parts[0]!.options.easing).toBe(EASING.out);
    expect(parts.at(-1)!.options.easing).toBe(EASING.snap);
    expect(parts[0]!.options.fill).toBe('backwards');
  });

  it('AC-10b: reverse lowers the parts in from above', () => {
    render(<Sheet reverse />);
    const parts = calls.filter((c) => c.el.hasAttribute('data-assemble'));
    expect(parts[0]!.keyframes[0]).toMatchObject({ opacity: 0, transform: 'translate(0, -12px)' });
  });

  it('AC-11: draws the dashed guide line in with clip-path', () => {
    render(<Sheet />);
    const guide = calls.find((c) => c.el.hasAttribute('data-assemble-guide'))!;
    expect(guide.keyframes[0]).toHaveProperty('clipPath');
  });

  it('AC-12: only transform and opacity (and clip-path on the guide) are animated, never layout properties', () => {
    render(<Sheet />);
    const props = new Set(calls.flatMap((c) => c.keyframes.flatMap((k) => Object.keys(k))));
    expect([...props].sort()).toEqual(['clipPath', 'opacity', 'transform']);
  });

  it('AC-13: replays when the trigger changes and cancels the previous run', () => {
    const { rerender } = render(<Sheet trigger={0} />);
    const first = calls.length;
    rerender(<Sheet trigger={1} />);
    expect(calls.length).toBe(first * 2);
    expect(calls[0]!.cancel).toHaveBeenCalled();
  });

  it('AC-14: reduced motion fades parts only (no travel, no stagger, no guide)', () => {
    reduced = true;
    render(<Sheet />);
    expect(calls.filter((c) => c.el.hasAttribute('data-assemble-guide'))).toHaveLength(0);
    const parts = calls.filter((c) => c.el.hasAttribute('data-assemble'));
    expect(parts.length).toBeGreaterThan(0);
    for (const p of parts) {
      expect(p.keyframes.every((k) => !('transform' in k))).toBe(true);
      expect(p.options.delay).toBe(0);
      expect(Number(p.options.duration)).toBeLessThanOrEqual(120);
    }
  });

  it('AC-15: enabled=false animates nothing; no WAAPI calls onComplete at once', () => {
    render(<Sheet enabled={false} />);
    expect(calls).toHaveLength(0);
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
    const done = vi.fn();
    render(<Sheet onComplete={done} />);
    expect(done).toHaveBeenCalled();
    expect(screen.getAllByText(/part 0/).length).toBeGreaterThan(0);
  });

  it('AC-16: cancels running animations on unmount', () => {
    const { unmount } = render(<Sheet />);
    unmount();
    expect(calls.every((c) => c.cancel.mock.calls.length > 0)).toBe(true);
  });
});

function Board({ order }: { order: string[] }) {
  const ref = useRef<HTMLUListElement>(null);
  useFlip(ref, [order.join()]);
  return (
    <ul ref={ref}>
      {order.map((id) => (
        <li key={id} data-id={id}>
          {id}
        </li>
      ))}
    </ul>
  );
}

describe('useFlip', () => {
  function layout(positions: () => Record<string, number>) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const y = this.tagName === 'UL' ? 0 : (positions()[this.dataset.id ?? ''] ?? 0);
      return { left: 0, top: y, right: 100, bottom: y + 20, width: 100, height: 20, x: 0, y, toJSON: () => ({}) };
    });
  }

  it('AC-17: moved items animate from the old position with transform only; first render does not animate', () => {
    let pos: Record<string, number> = { a: 0, b: 20, c: 40 };
    layout(() => pos);
    const { rerender } = render(<Board order={['a', 'b', 'c']} />);
    expect(calls).toHaveLength(0);
    pos = { c: 0, a: 20, b: 40 };
    rerender(<Board order={['c', 'a', 'b']} />);
    const byId = Object.fromEntries(calls.map((c) => [(c.el as HTMLElement).dataset.id, c]));
    expect(byId.c!.keyframes[0]).toEqual({ transform: 'translate(0px, 40px)' });
    expect(byId.a!.keyframes[0]).toEqual({ transform: 'translate(0px, -20px)' });
    expect(byId.b!.keyframes[0]).toEqual({ transform: 'translate(0px, -20px)' });
    expect(byId.c!.keyframes[1]).toEqual({ transform: 'translate(0, 0)' });
    expect(byId.c!.options.duration).toBe(MOTION.step);
    vi.restoreAllMocks();
  });

  it('AC-18: lists over 8 items and reduced motion change layout without animating', () => {
    let pos: Record<string, number> = {};
    const ids = Array.from({ length: 9 }, (_, i) => `i${i}`);
    ids.forEach((id, i) => (pos[id] = i * 20));
    layout(() => pos);
    const { rerender } = render(<Board order={ids} />);
    pos = Object.fromEntries([...ids].reverse().map((id, i) => [id, i * 20]));
    rerender(<Board order={[...ids].reverse()} />);
    expect(calls).toHaveLength(0);
    vi.restoreAllMocks();

    reduced = true;
    let p2: Record<string, number> = { a: 0, b: 20 };
    layout(() => p2);
    const r = render(<Board order={['a', 'b']} />);
    p2 = { b: 0, a: 20 };
    r.rerender(<Board order={['b', 'a']} />);
    expect(calls).toHaveLength(0);
    vi.restoreAllMocks();
  });
});

describe('useCountTick', () => {
  it('AC-19: only changed columns roll, aligned from the right, with direction', () => {
    const { result, rerender } = renderHook(({ t }) => useCountTick(t), { initialProps: { t: '199' } });
    expect(result.current.ticking).toBe(false);
    rerender({ t: '200' });
    expect(result.current.chars).toEqual([
      { char: '2', prev: '1' },
      { char: '0', prev: '9' },
      { char: '0', prev: '9' },
    ]);
    expect(result.current.direction).toBe(1);
    rerender({ t: '20' });
    expect(result.current.direction).toBe(-1);
  });

  it('AC-20: a longer number rolls the new leading column in; settles after the roll', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ t }) => useCountTick(t), { initialProps: { t: '99' } });
    rerender({ t: '100' });
    expect(result.current.chars[0]).toEqual({ char: '1', prev: ' ' });
    act(() => void vi.advanceTimersByTime(MOTION.part + 100));
    expect(result.current.ticking).toBe(false);
    expect(result.current.chars.map((c) => c.char).join('')).toBe('100');
  });

  it('AC-21: reduced motion shows the new value at once', () => {
    reduced = true;
    const { result, rerender } = renderHook(({ t }) => useCountTick(t), { initialProps: { t: '1' } });
    rerender({ t: '2' });
    expect(result.current.ticking).toBe(false);
    expect(result.current.chars).toEqual([{ char: '2', prev: null }]);
  });
});

describe('useViewTransition', () => {
  it('AC-22: falls back to running the update when View Transitions are unsupported', async () => {
    const { result } = renderHook(() => useViewTransition());
    expect(result.current.supported).toBe(false);
    const update = vi.fn();
    await result.current.run(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('AC-23: uses document.startViewTransition (with types) when available and awaits finish', async () => {
    const update = vi.fn();
    const start = vi.fn((arg: unknown) => {
      const cb = typeof arg === 'function' ? arg : (arg as { update: () => void }).update;
      cb();
      return { finished: Promise.resolve(), ready: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    const { result } = renderHook(() => useViewTransition());
    expect(result.current.supported).toBe(true);
    await result.current.run(update, { types: ['forward'] });
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ types: ['forward'] }));
    expect(update).toHaveBeenCalledTimes(1);
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it('AC-24: skips the transition under reduced motion', async () => {
    reduced = true;
    const start = vi.fn();
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    const { result } = renderHook(() => useViewTransition());
    const update = vi.fn();
    await result.current.run(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
});

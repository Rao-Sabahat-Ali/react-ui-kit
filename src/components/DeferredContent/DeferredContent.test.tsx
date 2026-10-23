import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeferredContent } from './DeferredContent';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let callbacks: Callback[] = [];
let options: IntersectionObserverInit[] = [];

function stubObserver() {
  callbacks = [];
  options = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Callback, opts?: IntersectionObserverInit) {
        callbacks.push(cb);
        options.push(opts ?? {});
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
}

describe('DeferredContent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('AC-1: children are not mounted until intersecting; onLoad fires once', () => {
    stubObserver();
    const onLoad = vi.fn();
    render(<DeferredContent onLoad={onLoad} placeholder={<p>Loading chart</p>}><p>Heavy widget</p></DeferredContent>);
    expect(screen.queryByText('Heavy widget')).toBeNull();
    expect(screen.getByText('Loading chart')).toBeInTheDocument();
    expect(options[0]!.rootMargin).toBe('200px');
    act(() => callbacks[0]!([{ isIntersecting: false }]));
    expect(screen.queryByText('Heavy widget')).toBeNull();
    act(() => callbacks[0]!([{ isIntersecting: true }]));
    expect(screen.getByText('Heavy widget')).toBeInTheDocument();
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('AC-2: renders immediately without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const onLoad = vi.fn();
    render(<DeferredContent onLoad={onLoad}><p>Heavy widget</p></DeferredContent>);
    expect(screen.getByText('Heavy widget')).toBeInTheDocument();
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});

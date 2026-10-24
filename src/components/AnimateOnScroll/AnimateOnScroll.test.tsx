import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileScss, mediaBlock } from '../../../test/scss';
import { AnimateOnScroll } from './AnimateOnScroll';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let callbacks: Callback[] = [];
let options: IntersectionObserverInit[] = [];
let disconnects = 0;

function stubObserver() {
  callbacks = [];
  options = [];
  disconnects = 0;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Callback, opts?: IntersectionObserverInit) {
        callbacks.push(cb);
        options.push(opts ?? {});
      }
      observe() {}
      disconnect() {
        disconnects++;
      }
      unobserve() {}
    },
  );
}

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));

const el = () => screen.getByText('Feature').parentElement!;
const wrapper = () => screen.getByText('Feature').closest('.ui-animate')!;

describe('AnimateOnScroll', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('AC-1: pending before intersecting, visible after', () => {
    stubObserver();
    render(<AnimateOnScroll><p>Feature</p></AnimateOnScroll>);
    expect(wrapper()).toHaveClass('ui-animate--pending');
    expect(wrapper()).toHaveAttribute('data-visible', 'false');
    act(() => callbacks[0]!([{ isIntersecting: false }]));
    expect(wrapper()).toHaveClass('ui-animate--pending');
    act(() => callbacks[0]!([{ isIntersecting: true }]));
    expect(wrapper()).not.toHaveClass('ui-animate--pending');
    expect(wrapper()).toHaveAttribute('data-visible', 'true');
  });

  it('AC-2: once keeps it revealed and disconnects; once={false} hides again', () => {
    stubObserver();
    const first = render(<AnimateOnScroll><p>Feature</p></AnimateOnScroll>);
    act(() => callbacks[0]!([{ isIntersecting: true }]));
    expect(disconnects).toBeGreaterThan(0);
    act(() => callbacks[0]!([{ isIntersecting: false }]));
    expect(wrapper()).toHaveAttribute('data-visible', 'true');
    first.unmount();

    stubObserver();
    render(<AnimateOnScroll once={false}><p>Feature</p></AnimateOnScroll>);
    act(() => callbacks[0]!([{ isIntersecting: true }]));
    expect(wrapper()).toHaveAttribute('data-visible', 'true');
    act(() => callbacks[0]!([{ isIntersecting: false }]));
    expect(wrapper()).toHaveAttribute('data-visible', 'false');
    act(() => callbacks[0]!([{ isIntersecting: true }]));
    expect(wrapper()).toHaveAttribute('data-visible', 'true');
  });

  it('AC-3: threshold and rootMargin reach the observer', () => {
    stubObserver();
    render(<AnimateOnScroll threshold={0.6} rootMargin="0px 0px -80px 0px"><p>Feature</p></AnimateOnScroll>);
    expect(options[0]).toEqual({ threshold: 0.6, rootMargin: '0px 0px -80px 0px' });
  });

  it('AC-4: preset selects classes; delay sets transition-delay', () => {
    stubObserver();
    const { unmount } = render(<AnimateOnScroll><p>Feature</p></AnimateOnScroll>);
    expect(wrapper()).toHaveClass('ui-animate--fade');
    unmount();
    render(<AnimateOnScroll preset="slide-up" delay={120} style={{ color: 'red' }}><p>Feature</p></AnimateOnScroll>);
    expect(wrapper()).toHaveClass('ui-animate--slide-up');
    expect(wrapper()).toHaveStyle({ transitionDelay: '120ms', color: 'rgb(255, 0, 0)' });
  });

  it('AC-5: without IntersectionObserver the content is visible immediately', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<AnimateOnScroll><p>Feature</p></AnimateOnScroll>);
    expect(wrapper()).not.toHaveClass('ui-animate--pending');
    expect(wrapper()).toHaveAttribute('data-visible', 'true');
  });

  it('AC-6: under reduced motion the content is visible and no observer is created', () => {
    stubObserver();
    reducedMotion(true);
    render(<AnimateOnScroll><p>Feature</p></AnimateOnScroll>);
    expect(callbacks).toHaveLength(0);
    expect(wrapper()).not.toHaveClass('ui-animate--pending');
    expect(wrapper()).toHaveAttribute('data-visible', 'true');
  });

  it('AC-7: children stay in the DOM and accessible in every state; SSR markup has no pending class', () => {
    stubObserver();
    render(<AnimateOnScroll><button type="button">Feature</button></AnimateOnScroll>);
    expect(wrapper()).toHaveClass('ui-animate--pending');
    expect(screen.getByRole('button', { name: 'Feature' })).toBeInTheDocument();
    expect(wrapper()).not.toHaveAttribute('aria-hidden');
    expect(wrapper()).not.toHaveAttribute('hidden');
    const html = renderToString(<AnimateOnScroll><p>Feature</p></AnimateOnScroll>);
    expect(html).toContain('Feature');
    expect(html).not.toContain('ui-animate--pending');
    expect(el()).toBe(wrapper());
  });

  it('AC-8: only opacity and transform are transitioned', () => {
    const css = compileScss('src/components/AnimateOnScroll/AnimateOnScroll.scss');
    expect(css).toMatch(/\.ui-animate\s*\{[^}]*transition-property:\s*opacity,\s*transform/);
    expect(css).not.toMatch(/transition-property:[^;]*(height|margin|top|left|width)/);
    expect(mediaBlock(css, '(prefers-reduced-motion: reduce)')).toMatch(/transition:\s*none/);
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compileScss, mediaBlock } from '../../test/scss';
import { ThemeProvider } from '../theme/ThemeProvider';
import { Badge } from './Badge/Badge';
import { BlockUI } from './BlockUI/BlockUI';
import { BottomNav } from './BottomNav/BottomNav';
import { Countdown } from './Countdown/Countdown';
import { EmptyState } from './EmptyState/EmptyState';
import { Inplace } from './Inplace/Inplace';
import { Message } from './Message/Message';
import { Messages, type MessagesHandle } from './Messages/Messages';
import { ProgressBar } from './ProgressBar/ProgressBar';
import { ProgressCircle } from './ProgressCircle/ProgressCircle';
import { ScrollTop } from './ScrollTop/ScrollTop';
import { Skeleton } from './Skeleton/Skeleton';
import { Terminal } from './Terminal/Terminal';
import { ThemeToggle } from './ThemeToggle/ThemeToggle';

// Wave 5 (misc, messages, layout leftovers): v2 markup and motion. Exit ghosts and presence only run where Web
// Animations exist, so tests that expect them stub `document.getAnimations`; the rest run as plain jsdom (= instant).
const withAnimations = () => {
  (document as { getAnimations?: unknown }).getAnimations = () => [];
};
afterEach(() => {
  delete (document as { getAnimations?: unknown }).getAnimations;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Message and Messages (v2)', () => {
  it('AC-v2-1: a message carries its severity modifier and an open presence state', () => {
    const { container } = render(<Message severity="warning">Low disk</Message>);
    expect(container.firstChild).toHaveClass('alert', 'alert-warning', 'ui-message', 'ui-message--warning');
    expect(container.firstChild).toHaveAttribute('data-state', 'open');
  });

  it('AC-v2-2: dismissing leaves inert and closed, then unmounts', async () => {
    withAnimations();
    render(<Message dismissible>Bye</Message>);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    const note = screen.getByText('Bye').closest('.ui-message')!;
    expect(note).toHaveAttribute('data-state', 'closed');
    expect(note).toHaveAttribute('inert');
    await waitFor(() => expect(screen.queryByText('Bye')).toBeNull());
  });

  it('AC-v2-3: a removed message stays as an inert, silent ghost while it leaves', async () => {
    withAnimations();
    const ref = createRef<MessagesHandle>();
    render(<Messages ref={ref} />);
    act(() => ref.current!.show([{ id: 'a', children: 'First', severity: 'danger' }, { id: 'b', children: 'Second' }]));
    act(() => ref.current!.remove('a'));
    const ghost = screen.getByText('First').closest('.ui-message')!;
    expect(ghost).toHaveAttribute('data-state', 'closed');
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost).not.toHaveAttribute('role');
    expect(ghost.querySelector('button')).toBeNull();
    await waitFor(() => expect(screen.queryByText('First')).toBeNull());
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('AC-v2-4: the stylesheet frames the note in the intent colour, never a coloured side border, and fades under reduced motion', () => {
    const css = compileScss('src/components/Message/Message.scss');
    expect(css).not.toMatch(/border-(left|right|inline-start|inline-end)\s*:/);
    expect(css).toMatch(/border:\s*var\(--ui-line-width\) solid var\(--ui-message-line\)/);
    const reduced = mediaBlock(css, '(prefers-reduced-motion: reduce)');
    expect(reduced).toMatch(/ui-message-fade 90ms/);
    expect(reduced).not.toMatch(/translate/);
  });
});

describe('Progress (v2)', () => {
  it('AC-v2-5: the ProgressBar fill scales with transform, not width, and indeterminate travels', () => {
    const { container, rerender } = render(<ProgressBar label="x" value={25} />);
    const fill = () => container.querySelector('.ui-progress-bar__fill') as HTMLElement;
    expect(fill().style.getPropertyValue('--ui-progress-value')).toBe('0.25');
    rerender(<ProgressBar label="x" />);
    expect(screen.getByRole('progressbar')).toHaveClass('ui-progress-bar--indeterminate');
    const css = compileScss('src/components/ProgressBar/ProgressBar.scss');
    expect(css).toMatch(/ui-progress-travel/);
    expect(css).toMatch(/transform:\s*scaleX\(var\(--ui-progress-value/);
    expect(mediaBlock(css, '(prefers-reduced-motion: reduce)')).toMatch(/animation:\s*none/);
  });

  it('AC-v2-6: primary is the accent, lg writes the value beside the track', () => {
    const { container } = render(<ProgressBar label="x" value={40} size="lg" showValue />);
    expect(screen.getByRole('progressbar')).toHaveClass('ui-progress-bar--primary');
    expect(container.querySelector('.ui-progress-bar__value')).toHaveTextContent('40%');
  });

  it('AC-v2-7: the ProgressCircle ring is the 2px line by default', () => {
    const { container } = render(<ProgressCircle label="x" value={50} />);
    expect(container.querySelector('.ui-progress-circle__track')).toHaveAttribute('stroke-width', '2');
    expect(container.querySelector('.ui-progress-circle__value')).toHaveAttribute('stroke-width', '2');
  });
});

describe('Skeleton and Spinner (v2)', () => {
  it('AC-v2-8: an offscreen skeleton pauses and resumes', () => {
    let callback: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: typeof callback) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { container } = render(<Skeleton lines={2} />);
    const root = container.firstElementChild!;
    expect(root).not.toHaveAttribute('data-paused');
    act(() => callback([{ isIntersecting: false }]));
    expect(root).toHaveAttribute('data-paused', 'true');
    act(() => callback([{ isIntersecting: true }]));
    expect(root).not.toHaveAttribute('data-paused');
  });

  it('AC-v2-9: the shimmer is slow (1.2 to 1.6s) and stops under reduced motion; the spinner pulses instead of turning', () => {
    const skeleton = compileScss('src/components/Skeleton/Skeleton.scss');
    expect(skeleton).toMatch(/ui-skeleton-sweep 1\.4s/);
    expect(mediaBlock(skeleton, '(prefers-reduced-motion: reduce)')).toMatch(/animation:\s*none/);
    const spinner = compileScss('src/components/Spinner/Spinner.scss');
    expect(mediaBlock(spinner, '(prefers-reduced-motion: reduce)')).toMatch(/animation:\s*ui-spinner-pulse/);
    expect(spinner).toMatch(/border:\s*var\(--ui-line-width\) solid/);
  });
});

describe('Countdown (v2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  it('AC-v2-10: clock digits are a QuantityTick that stays silent; words stay plain text', () => {
    const { container, rerender } = render(<Countdown label="Ends in" duration={90_000} format="mm:ss" />);
    expect(container.querySelector('.ui-qty-tick')).not.toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByRole('timer')).toHaveTextContent('01:29');
    rerender(<Countdown label="Ends in" duration={90_000} format="words" />);
    expect(container.querySelector('.ui-qty-tick')).toBeNull();
  });
});

describe('Layout parts (v2)', () => {
  it('AC-v2-11: EmptyState assembles its parts and forwards its ref', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<EmptyState ref={ref} title="Nothing yet" description="Add one." action={<button type="button">Add</button>} />);
    expect(ref.current).toBe(container.firstElementChild);
    expect(container.querySelectorAll('[data-assemble]')).toHaveLength(4);
    const css = compileScss('src/components/EmptyState/EmptyState.scss');
    expect(css).toMatch(/color-mix\(in srgb, var\(--ui-color-shell\)/);
    expect(css).toMatch(/vector-effect:\s*non-scaling-stroke/);
  });

  it('AC-v2-12: BottomNav places one sliding accent mark on the active item', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const active = this.getAttribute('aria-current') === 'page';
      return { left: active ? 100 : 0, width: active ? 80 : 300, top: 0, height: 64, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
    const items = [
      { label: 'Home', href: '/', icon: 'home' as const },
      { label: 'Words', href: '/words', icon: 'search' as const },
    ];
    const { container, rerender } = render(<BottomNav items={items} activeHref="/words" />);
    const list = container.querySelector('.ui-bottom-nav__list') as HTMLElement;
    expect(list.style.getPropertyValue('--ui-mark-size')).toBe('80');
    rerender(<BottomNav items={items} />);
    expect(list.style.getPropertyValue('--ui-mark-size')).toBe('0');
  });

  it('AC-v2-13: Inplace animates the swap only after the first change', async () => {
    const { container } = render(
      <Inplace display="Title" label="title">
        {(close) => <button onClick={close}>Done</button>}
      </Inplace>,
    );
    expect(container.firstChild).not.toHaveClass('ui-inplace--swap');
    await userEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    expect(container.firstChild).toHaveClass('ui-inplace--swap');
  });

  it('AC-v2-14: Badge subtle keeps the Tag hairline classes', () => {
    render(<Badge value="Beta" variant="info" appearance="subtle" />);
    expect(screen.getByText('Beta').parentElement).toHaveClass('border', 'border-info-subtle');
  });
});

describe('Overlays and chrome (v2)', () => {
  it('AC-v2-15: the BlockUI veil fades out inert before it unmounts', async () => {
    withAnimations();
    const { rerender } = render(
      <BlockUI blocked>
        <p>Body</p>
      </BlockUI>,
    );
    expect(document.querySelector('.ui-block-ui__overlay')).toHaveAttribute('data-state', 'open');
    rerender(
      <BlockUI blocked={false}>
        <p>Body</p>
      </BlockUI>,
    );
    expect(document.querySelector('.ui-block-ui__overlay')).toHaveAttribute('data-state', 'closed');
    await waitFor(() => expect(document.querySelector('.ui-block-ui__overlay')).toBeNull());
    const css = compileScss('src/components/BlockUI/BlockUI.scss');
    expect(css).not.toMatch(/backdrop-filter|blur\(/);
  });

  it('AC-v2-16: ScrollTop is a lifted round part with a presence state, hidden while closed', async () => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    withAnimations();
    const setY = (y: number) => {
      Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
      act(() => void window.dispatchEvent(new Event('scroll')));
    };
    setY(0);
    render(<ScrollTop threshold={100} />);
    setY(500);
    const button = screen.getByRole('button', { name: 'Scroll to top' });
    expect(button).toHaveAttribute('data-state', 'open');
    setY(0);
    expect(button).toHaveAttribute('data-state', 'closed');
    await waitFor(() => expect(button).toHaveAttribute('hidden'));
    const css = compileScss('src/components/ScrollTop/ScrollTop.scss');
    expect(css).toMatch(/box-shadow:\s*var\(--ui-shadow-lift\)/);
    expect(mediaBlock(css, '(prefers-reduced-motion: reduce)')).toMatch(/animation:\s*none/);
  });

  it('AC-v2-17: Terminal is always the night sheet', () => {
    render(<Terminal onCommand={() => 'ok'} />);
    expect(screen.getByRole('group', { name: 'Terminal' })).toHaveAttribute('data-bs-theme', 'dark');
  });

  it('AC-v2-18: ThemeToggle keeps both icons in one slot and flips which one is active', async () => {
    const { container } = render(
      <ThemeProvider theme="light" storageKey={null}>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const icons = () => Array.from(container.querySelectorAll('.ui-theme-toggle__icon')).map((el) => el.getAttribute('data-active'));
    expect(icons()).toEqual(['true', 'false']);
    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(icons()).toEqual(['false', 'true']);
    const css = compileScss('src/components/ThemeToggle/ThemeToggle.scss');
    expect(mediaBlock(css, '(prefers-reduced-motion: reduce)')).toMatch(/transition:\s*none/);
  });
});

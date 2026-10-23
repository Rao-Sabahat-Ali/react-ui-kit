import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollTop } from './ScrollTop';

function setScrollY(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('ScrollTop', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    setScrollY(0);
  });
  afterEach(() => setScrollY(0));

  it('AC-1: appears after threshold, hidden before', () => {
    render(<ScrollTop threshold={300} />);
    expect(screen.queryByRole('button')).toBeNull();
    setScrollY(301);
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeVisible();
    setScrollY(100);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('AC-2: click scrolls to top and moves focus to main', async () => {
    render(
      <>
        <main>Content</main>
        <ScrollTop />
      </>,
    );
    setScrollY(1000);
    await userEvent.click(screen.getByRole('button', { name: 'Scroll to top' }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('AC-2: skip-link target takes precedence over main', async () => {
    render(
      <>
        <div id="main-content">Skip target</div>
        <main>Content</main>
        <ScrollTop label="Back to top" />
      </>,
    );
    setScrollY(1000);
    await userEvent.click(screen.getByRole('button', { name: 'Back to top' }));
    expect(document.getElementById('main-content')).toHaveFocus();
  });

  it('parent target listens to the container scroll', () => {
    const { container } = render(
      <div data-testid="pane">
        <ScrollTop target="parent" threshold={50} />
      </div>,
    );
    const pane = container.firstElementChild as HTMLElement;
    expect(screen.queryByRole('button')).toBeNull();
    pane.scrollTop = 80;
    act(() => {
      pane.dispatchEvent(new Event('scroll'));
    });
    expect(screen.getByRole('button')).toBeVisible();
  });
});

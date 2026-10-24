import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileScss, mediaBlock } from '../../../test/scss';
import { ToastProvider, useToast, type ToastApi, type ToastPosition } from './Toast';

let api: ToastApi;
function Capture() {
  api = useToast();
  return null;
}
const setup = (max?: number, position?: ToastPosition) => render(<ToastProvider max={max} position={position}><Capture /></ToastProvider>);

afterEach(() => vi.useRealTimers());

describe('Toast', () => {
  it('AC-1: renders in correct live region', () => {
    setup();
    act(() => {
      api.success('Saved');
      api.error('Failed');
    });
    expect(within(screen.getByRole('status')).getByText('Saved')).toBeInTheDocument();
    expect(within(screen.getByRole('alert')).getByText('Failed')).toBeInTheDocument();
  });

  it('AC-2: auto-dismiss after life; pauses on hover', async () => {
    vi.useFakeTimers();
    setup();
    act(() => void api.info('Hello', { life: 1000 }));
    act(() => vi.advanceTimersByTime(500));
    act(() => screen.getByText('Hello').closest('.ui-toast')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('Hello')).toBeInTheDocument();
    act(() => screen.getByText('Hello').closest('.ui-toast')!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByText('Hello')).toBeNull();
  });

  it('AC-3: max limits visible toasts (oldest removed)', () => {
    setup(2);
    act(() => {
      api.info('one');
      api.info('two');
      api.info('three');
    });
    expect(screen.queryByText('one')).toBeNull();
    expect(screen.getByText('three')).toBeInTheDocument();
  });

  it('AC-4: action runs and dismisses', async () => {
    const undo = vi.fn();
    setup();
    act(() => void api.show({ message: 'Word removed', action: { label: 'Undo', onClick: undo } }));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalled();
    expect(screen.queryByText('Word removed')).toBeNull();
  });

  it('errors are sticky and dismissible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup();
    act(() => void api.error('Broken'));
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByText('Broken')).toBeInTheDocument();
    vi.useRealTimers();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Broken')).toBeNull();
  });

  it('AC-5: position prop selects the corner; reduced motion disables the slide', () => {
    const positions: ToastPosition[] = ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end'];
    for (const position of positions) {
      const [vertical, horizontal] = position.split('-');
      const { container, unmount } = setup(undefined, position);
      const region = container.ownerDocument.querySelector('.ui-toast-container')!;
      expect(region).toHaveClass(`ui-toast-container--${vertical}`, `ui-toast-container--${horizontal}`);
      unmount();
    }
    const css = compileScss('src/components/Toast/Toast.scss');
    expect(css).toMatch(/\.ui-toast-container--start\s*\{[^}]*inset-inline-start/);
    expect(css).toMatch(/\.ui-toast-container--end\s*\{[^}]*inset-inline-end/);
    expect(mediaBlock(css, '(prefers-reduced-motion: reduce)')).toMatch(/\.ui-toast\s*\{[^}]*animation:\s*none/);
  });
});

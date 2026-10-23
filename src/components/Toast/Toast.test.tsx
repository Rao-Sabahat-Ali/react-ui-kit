import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast, type ToastApi } from './Toast';

let api: ToastApi;
function Capture() {
  api = useToast();
  return null;
}
const setup = (max?: number) => render(<ToastProvider max={max}><Capture /></ToastProvider>);

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
});

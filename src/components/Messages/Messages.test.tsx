import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Messages, type MessagesHandle } from './Messages';

describe('Messages', () => {
  afterEach(() => vi.useRealTimers());

  it('AC-1: imperative methods add, remove and replace messages', () => {
    const ref = createRef<MessagesHandle>();
    render(<Messages ref={ref} />);
    act(() => ref.current!.show([{ id: 'a', children: 'First' }, { id: 'b', children: 'Second', severity: 'success' }]));
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    act(() => ref.current!.remove('a'));
    expect(screen.queryByText('First')).toBeNull();
    act(() => ref.current!.replace({ children: 'Only' }));
    expect(screen.queryByText('Second')).toBeNull();
    expect(screen.getByText('Only')).toBeInTheDocument();
    act(() => ref.current!.clear());
    expect(screen.queryByText('Only')).toBeNull();
  });

  it('AC-1: controlled value with onRemove on dismiss', async () => {
    const onRemove = vi.fn();
    render(<Messages value={[{ id: 'x', children: 'Controlled' }]} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onRemove).toHaveBeenCalledWith('x');
    expect(screen.getByText('Controlled')).toBeInTheDocument();
  });

  it('AC-2: life auto-removes non-sticky messages', () => {
    vi.useFakeTimers();
    const ref = createRef<MessagesHandle>();
    render(<Messages ref={ref} />);
    act(() => ref.current!.show([{ children: 'Fleeting', life: 3000 }, { children: 'Sticky', life: 3000, sticky: true }]));
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getByText('Fleeting')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByText('Fleeting')).toBeNull();
    expect(screen.getByText('Sticky')).toBeInTheDocument();
  });

  it('wrapper is a polite live region; danger items are assertive alerts', () => {
    const ref = createRef<MessagesHandle>();
    const { container } = render(<Messages ref={ref} />);
    act(() => ref.current!.show([{ children: 'Bad', severity: 'danger' }, { children: 'Fine' }]));
    expect(container.firstElementChild).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('alert')).toHaveTextContent('Bad');
  });
});

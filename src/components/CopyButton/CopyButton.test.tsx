import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { CopyButton } from './CopyButton';

const setClipboard = (clipboard: unknown) => Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
const setExec = (fn: unknown) => Object.defineProperty(document, 'execCommand', { value: fn, configurable: true, writable: true });

describe('CopyButton', () => {
  let writeText: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
  });
  afterEach(() => {
    setClipboard(undefined);
    setExec(undefined);
    vi.restoreAllMocks();
  });

  it('AC-1: copies the value with the Clipboard API, calls onCopy and evaluates lazy values on click', async () => {
    const onCopy = vi.fn();
    const lazy = vi.fn(() => 'lazy-value');
    const { rerender } = render(<CopyButton value="abc-123" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith('abc-123'));
    expect(writeText).toHaveBeenCalledWith('abc-123');
    rerender(<CopyButton value={lazy} />);
    expect(lazy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('lazy-value'));
  });

  it('AC-2: falls back to a hidden textarea and execCommand, removes it and restores focus', async () => {
    setClipboard(undefined);
    let during: string | undefined;
    const exec = vi.fn(() => {
      during = document.querySelector('textarea')?.value;
      return true;
    });
    setExec(exec);
    const onCopy = vi.fn();
    render(<CopyButton value="fallback-text" onCopy={onCopy} />);
    const button = screen.getByRole('button');
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith('fallback-text'));
    expect(exec).toHaveBeenCalledWith('copy');
    expect(during).toBe('fallback-text');
    expect(document.querySelector('textarea')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('AC-2: falls back when the Clipboard API rejects', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const exec = vi.fn(() => true);
    setExec(exec);
    const onCopy = vi.fn();
    render(<CopyButton value="x" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onCopy).toHaveBeenCalled());
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('AC-3: switches label and icon, announces politely and returns to idle after the timeout', async () => {
    const { container } = render(<CopyButton value="v" timeout={60} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Copied');
    expect(container.querySelector('.ui-copy-button--copied')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument());
    expect(status).toBeEmptyDOMElement();
  });

  it('AC-3: timeout 0 keeps the copied state', async () => {
    render(<CopyButton value="v" timeout={0} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
    await act(() => new Promise((r) => setTimeout(r, 80)));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('AC-4: failure shows and announces failedLabel, calls onError and does not throw', async () => {
    setClipboard(undefined);
    setExec(vi.fn(() => false));
    const onError = vi.fn();
    render(<CopyButton value="v" onError={onError} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Could not copy' })).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Could not copy');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('AC-5: iconOnly has no visible text, a stable aria-label and still announces', async () => {
    render(<CopyButton value="v" iconOnly label="Copy invoice number" />);
    const button = screen.getByRole('button', { name: 'Copy invoice number' });
    expect(button).toHaveTextContent('');
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Copy invoice number');
  });

  it('AC-6: never renders or logs the value', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const { container } = render(<CopyButton value="s3cr3t-token" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));
    expect(container.innerHTML).not.toContain('s3cr3t-token');
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('AC-7: disabled does not copy; clicks restart the timer; unmount clears it', async () => {
    const { rerender, unmount } = render(<CopyButton value="v" disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(writeText).not.toHaveBeenCalled();
    rerender(<CopyButton value="v" timeout={100} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
    await act(() => new Promise((r) => setTimeout(r, 70)));
    fireEvent.click(screen.getByRole('button'));
    await act(() => new Promise((r) => setTimeout(r, 70)));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    const clear = vi.spyOn(window, 'clearTimeout');
    unmount();
    expect(clear).toHaveBeenCalled();
  });

  it('AC-8: defaults come from locale keys and can be overridden', async () => {
    render(
      <LocaleProvider locale="sv" messages={{ copy: 'Kopiera', copied: 'Kopierat' }}>
        <CopyButton value="v" />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kopiera' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Kopierat'));
  });

  it('AC-9: sensitive calls onCopy without the text, never renders it, and still writes it to the clipboard', async () => {
    const onCopy = vi.fn();
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const { container } = render(<CopyButton value="s3cret-token" sensitive onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
    expect(onCopy).toHaveBeenCalledWith();
    expect(onCopy.mock.calls[0]).toHaveLength(0);
    expect(writeText).toHaveBeenCalledWith('s3cret-token');
    expect(container.outerHTML).not.toContain('s3cret-token');
    for (const spy of logs) expect(spy).not.toHaveBeenCalled();
  });

  it('AC-9: without sensitive, onCopy still receives the text (signature unchanged)', async () => {
    const onCopy = vi.fn();
    render(<CopyButton value="plain" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onCopy).toHaveBeenCalledWith('plain'));
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileUpload, type UploadContext } from './FileUpload';

const png = (name = 'photo.png', size = 10) => new File([new Uint8Array(size)], name, { type: 'image/png' });
const pdf = (name = 'doc.pdf') => new File(['%PDF'], name, { type: 'application/pdf' });
const svg = () => new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], 'evil.svg', { type: 'image/svg+xml' });
const input = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;

let created: string[];
let revoked: string[];
beforeEach(() => {
  created = [];
  revoked = [];
  let n = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test/${(n += 1)}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
});
afterEach(() => vi.restoreAllMocks());

describe('FileUpload', () => {
  it('AC-1: choosing files adds them to the list', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<FileUpload multiple onChange={onChange} />);
    await user.upload(input(container), [png('a.png'), pdf('b.pdf')]);
    expect(screen.getByText('a.png')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ status: 'pending', progress: 0 }), expect.objectContaining({ status: 'pending' })]);
  });

  it('AC-1: dropping files adds them; invalid type and size are rejected with messages', () => {
    const onValidationError = vi.fn();
    render(<FileUpload multiple accept="image/*" maxFileSize={100} onValidationError={onValidationError} />);
    const zone = screen.getByRole('button', { name: /Choose files/ });
    fireEvent.drop(zone, { dataTransfer: { files: [png('ok.png'), pdf('bad.pdf'), png('big.png', 500)] } });
    expect(screen.getByText('ok.png')).toBeInTheDocument();
    expect(screen.getAllByText('bad.pdf is not an allowed file type').length).toBeGreaterThan(0);
    expect(screen.getAllByText('big.png is larger than 100 B').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('bad.pdf is not an allowed file type');
    expect(onValidationError).toHaveBeenCalledWith([expect.objectContaining({ reason: 'type' }), expect.objectContaining({ reason: 'size' })]);
  });

  it('AC-1: maxFiles limits the number of files', async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload multiple maxFiles={1} />);
    await user.upload(input(container), [png('a.png'), png('b.png')]);
    expect(screen.getByText('a.png')).toBeInTheDocument();
    expect(screen.queryByText('b.png')).not.toBeInTheDocument();
    expect(screen.getAllByText('You can add at most 1 files').length).toBeGreaterThan(0);
  });

  it('AC-2: upload is called per file with progress updates and an AbortSignal', async () => {
    const user = userEvent.setup();
    const calls: { file: File; ctx: UploadContext; resolve: () => void }[] = [];
    const upload = vi.fn((file: File, ctx: UploadContext) => new Promise<void>((resolve) => calls.push({ file, ctx, resolve })));
    const { container } = render(<FileUpload multiple upload={upload} />);
    await user.upload(input(container), [png('a.png'), pdf('b.pdf')]);
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    expect(upload).toHaveBeenCalledTimes(2);
    expect(calls[0]!.ctx.signal).toBeInstanceOf(AbortSignal);
    act(() => calls[0]!.ctx.onProgress(40));
    expect(screen.getByRole('progressbar', { name: 'Uploading a.png, 40%' })).toHaveAttribute('aria-valuenow', '40');
    await act(async () => calls[0]!.resolve());
    expect(screen.getAllByText('a.png uploaded').length).toBeGreaterThan(0);
  });

  it('AC-2: auto uploads on select; cancel aborts; failures are shown', async () => {
    const user = userEvent.setup();
    const signals: AbortSignal[] = [];
    let reject: (e: Error) => void = () => {};
    const upload = vi.fn((_file: File, { signal }: UploadContext) => {
      signals.push(signal);
      return new Promise<void>((_res, rej) => {
        reject = rej;
      });
    });
    const { container } = render(<FileUpload auto upload={upload} />);
    await user.upload(input(container), png('a.png'));
    expect(upload).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel upload of a.png' }));
    expect(signals[0]!.aborted).toBe(true);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await user.upload(input(container), png('c.png'));
    await act(async () => reject(new Error('')));
    await waitFor(() => expect(screen.getAllByText('c.png failed to upload').length).toBeGreaterThan(0));
  });

  it('AC-3: object URLs are revoked on remove and unmount; SVG previews only via <img>', async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<FileUpload multiple />);
    await user.upload(input(container), [png('a.png'), svg()]);
    expect(created).toHaveLength(2);
    const thumbs = container.querySelectorAll('img.ui-file-upload__thumb');
    expect(thumbs).toHaveLength(2);
    expect(container.querySelector('svg script')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove a.png' }));
    expect(revoked).toEqual([created[0]]);
    unmount();
    expect(revoked).toEqual(created);
  });

  it('AC-4: keyboard activation of the dropzone opens the file dialog', async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<FileUpload />);
    const zone = screen.getByRole('button', { name: 'Choose files. Drag and drop files here' });
    zone.focus();
    await user.keyboard('{Enter}');
    expect(click).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('basic mode renders a button only', () => {
    render(<FileUpload mode="basic" />);
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeInTheDocument();
  });
});

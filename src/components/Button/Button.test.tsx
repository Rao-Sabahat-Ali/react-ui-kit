import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('AC-1: renders type=button with default classes', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveClass('btn', 'btn-primary', 'ui-button');
  });

  it('AC-2: variant + appearance map to Bootstrap classes', () => {
    const { rerender } = render(<Button variant="danger" appearance="outline">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-outline-danger');
    rerender(<Button variant="secondary" appearance="text">More</Button>);
    expect(screen.getByRole('button')).toHaveClass('ui-button--text', 'ui-button--text-secondary');
    rerender(<Button variant="link">Docs</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-link');
  });

  it('AC-3: size adds btn-sm / btn-lg', () => {
    const { rerender } = render(<Button size="sm">A</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-sm');
    rerender(<Button size="lg">A</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-lg');
  });

  it('AC-4: loading sets aria-busy, shows spinner, blocks clicks, stays focusable', async () => {
    const onClick = vi.fn();
    const { container } = render(<Button loading loadingText="Saving…" onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Saving…' });
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).not.toBeDisabled();
    expect(container.querySelector('.ui-button__spinner')).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    btn.focus();
    expect(btn).toHaveFocus();
  });

  it('AC-5: disabled prevents click; anchor uses aria-disabled without href', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button disabled onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    rerender(<Button as="a" href="/x" disabled>Docs</Button>);
    const link = screen.getByText('Docs').closest('a')!;
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).not.toHaveAttribute('href');
    expect(link).toHaveAttribute('tabindex', '-1');
  });

  it('AC-6: icon-only uses aria-label and hides icon', () => {
    const { container } = render(<Button icon="settings" aria-label="Settings" />);
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveClass('ui-button--icon-only');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-7: ref resolves to the native element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Save</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('AC-8: block and rounded', () => {
    render(<Button block rounded>Go</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-100', 'rounded-pill');
  });

  it('renders as link with href', () => {
    render(<Button as="a" href="/docs">Docs</Button>);
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
  });
});

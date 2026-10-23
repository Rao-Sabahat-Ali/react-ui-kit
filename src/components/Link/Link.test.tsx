import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Link, safeLinkUrl } from './Link';

describe('Link', () => {
  it('AC-1: renders a.ui-link.link-primary with href', () => {
    render(<Link href="/users">Users</Link>);
    const a = screen.getByRole('link', { name: 'Users' });
    expect(a.tagName).toBe('A');
    expect(a).toHaveClass('ui-link', 'link-primary');
    expect(a).toHaveAttribute('href', '/users');
  });

  it('AC-2: plain click on internal link calls onNavigate and prevents default', async () => {
    const onNavigate = vi.fn();
    render(<Link href="/users/42" onNavigate={onNavigate}>Jane</Link>);
    const a = screen.getByRole('link');
    const notPrevented = fireEvent.click(a);
    expect(notPrevented).toBe(false);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate.mock.calls[0]![0]).toBe('/users/42');
    expect(onNavigate.mock.calls[0]![1].defaultPrevented).toBe(true);
  });

  it('AC-3: modified and middle clicks do not call onNavigate nor prevent default', () => {
    const onNavigate = vi.fn();
    render(<Link href="/x" onNavigate={onNavigate}>X</Link>);
    const a = screen.getByRole('link');
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      expect(fireEvent.click(a, init)).toBe(true);
    }
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('AC-4: external href opens in new tab with noopener noreferrer, no onNavigate', () => {
    const onNavigate = vi.fn();
    render(<Link href="https://example.org/docs" onNavigate={onNavigate}>Docs</Link>);
    const a = screen.getByRole('link');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(a.getAttribute('rel')).toContain('noreferrer');
    fireEvent.click(a);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('AC-5: new-tab links have aria-hidden icon and hidden text in accessible name', () => {
    const { container } = render(<Link href="https://example.org">Docs</Link>);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link')).toHaveAccessibleName(/Docs\s+\(opens in new tab\)$/);
  });

  it('AC-6: newTab={false} on external removes target, icon and hidden text', () => {
    const { container } = render(<Link href="https://example.org" newTab={false}>Docs</Link>);
    const a = screen.getByRole('link');
    expect(a).not.toHaveAttribute('target');
    expect(container.querySelector('svg')).toBeNull();
    expect(a).toHaveAccessibleName('Docs');
  });

  it('AC-7: user rel is merged', () => {
    render(<Link href="https://example.org" rel="nofollow">Docs</Link>);
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'nofollow noopener noreferrer');
  });

  it('AC-8: unsafe schemes become # and safeLinkUrl filters', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Link href="javascript:alert(1)">Bad</Link>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '#');
    warn.mockRestore();
    expect(safeLinkUrl('  JavaScript:alert(1)')).toBe('#');
    expect(safeLinkUrl('data:text/html,x')).toBe('#');
    expect(safeLinkUrl('VBScript:x')).toBe('#');
    for (const ok of ['https://a.b', 'mailto:a@b.c', 'tel:+123', '/path', '#hash']) expect(safeLinkUrl(ok)).toBe(ok);
  });

  it('AC-9: current="page" sets aria-current', () => {
    render(<Link href="/s" current="page">S</Link>);
    expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page');
  });

  it('AC-10: disabled removes href, sets aria-disabled and tabindex, ignores clicks', async () => {
    const onNavigate = vi.fn();
    render(<Link href="/s" disabled onNavigate={onNavigate}>S</Link>);
    const a = screen.getByRole('link');
    expect(a).not.toHaveAttribute('href');
    expect(a).toHaveAttribute('aria-disabled', 'true');
    expect(a).toHaveAttribute('tabindex', '-1');
    await userEvent.click(a);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('AC-11: underline none and variant classes', () => {
    render(<Link href="/s" underline="none" variant="secondary">S</Link>);
    expect(screen.getByRole('link')).toHaveClass('link-underline-opacity-0', 'link-secondary');
  });

  it('AC-12: ref resolves to the anchor', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(<Link href="/s" ref={ref}>S</Link>);
    expect(ref.current).toBe(screen.getByRole('link'));
  });
});

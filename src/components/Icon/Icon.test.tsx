import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Icon, registerIcons } from './Icon';

describe('Icon', () => {
  it('AC-1: renders an svg with currentColor and 24 viewBox', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('AC-2: decorative by default, labelled when label given', () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    render(<Icon name="alert-triangle" label="Warning" />);
    expect(screen.getByRole('img', { name: 'Warning' })).toBeInTheDocument();
  });

  it('AC-3: unknown icon renders nothing and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<><Icon name="nope" /><Icon name="nope" /></>);
    expect(container.querySelector('svg')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('AC-4: registerIcons adds icons', () => {
    registerIcons({ custom: 'M0 0h24' });
    const { container } = render(<Icon name="custom" />);
    expect(container.querySelector('path')).toHaveAttribute('d', 'M0 0h24');
  });

  it('AC-5: directional icons get the directional class', () => {
    const { container } = render(<Icon name="chevron-right" />);
    expect(container.querySelector('svg')).toHaveClass('ui-icon--directional');
  });

  it('size maps to pixels', () => {
    const { container } = render(<Icon name="check" size="lg" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '24');
  });
});

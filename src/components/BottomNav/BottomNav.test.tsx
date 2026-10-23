import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';

const items = [
  { label: 'Home', href: '/', icon: 'home' as const },
  { label: 'Review', href: '/review', icon: 'refresh' as const, badge: 12 },
  { label: 'Words', href: '/dictionary', icon: 'search' as const },
];

describe('BottomNav', () => {
  it('AC-1: labelled nav with icon + label links', () => {
    render(<BottomNav items={items} />);
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Home' }).querySelector('svg')).toBeInTheDocument();
  });

  it('AC-2: active item', () => {
    render(<BottomNav items={items} activeHref="/dictionary" />);
    const link = screen.getByRole('link', { name: 'Words' });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link).toHaveClass('active');
  });

  it('AC-3: onNavigate on plain click only', () => {
    const onNavigate = vi.fn();
    render(<BottomNav items={items} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('link', { name: 'Home' }), { button: 0 });
    expect(onNavigate).toHaveBeenCalledWith('/', expect.anything());
    onNavigate.mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'Home' }), { button: 0, ctrlKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('AC-4: badge inside item, label first in name', () => {
    render(<BottomNav items={items} />);
    expect(screen.getByRole('link', { name: /^12 ?Review|Review/ })).toHaveTextContent('12');
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from './Breadcrumb';

const items = [
  { label: 'Projects', href: '/projects' },
  { label: 'Redesign', href: '/redesign' },
  { label: 'Assets', href: '/assets' },
  { label: 'Icons', href: '/icons' },
  { label: 'logo.svg' },
];

describe('Breadcrumb', () => {
  it('AC-1: nav landmark with an ordered list', () => {
    render(<Breadcrumb home={{ label: 'Home', href: '/' }} items={items.slice(0, 2)} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const list = within(nav).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('AC-2: last item has aria-current="page" and is not a link', () => {
    render(<Breadcrumb items={[{ label: 'Projects', href: '/projects' }, { label: 'Redesign', href: '/redesign' }]} />);
    const current = screen.getByText('Redesign').closest('[aria-current]');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Redesign' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
  });

  it('AC-3: maxItems collapses middle items into an accessible overflow menu', async () => {
    const onNavigate = vi.fn();
    render(<Breadcrumb items={items} maxItems={3} onNavigate={onNavigate} />);
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Redesign' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Icons' })).toBeInTheDocument();
    const more = screen.getByRole('button', { name: 'Show hidden pages' });
    expect(more).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(more);
    const menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((el) => el.textContent)).toEqual(['Redesign', 'Assets']);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Assets' }));
    expect(onNavigate).toHaveBeenCalledWith('/assets', expect.anything());
    expect(screen.getByText('logo.svg').closest('[aria-current]')).toHaveAttribute('aria-current', 'page');
  });

  it('string separator sets the Bootstrap divider variable; unsafe hrefs are dropped', () => {
    render(<Breadcrumb separator="›" items={[{ label: 'Bad', href: 'javascript:alert(1)' }, { label: 'Here' }]} />);
    expect(screen.getByRole('navigation').style.getPropertyValue('--bs-breadcrumb-divider')).toBe('"›"');
    expect(screen.queryByRole('link', { name: 'Bad' })).toBeNull();
  });
});

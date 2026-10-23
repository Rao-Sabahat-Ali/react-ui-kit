import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('AC-1: renders h1 and slots', () => {
    render(<PageHeader title="Dictionary" description="Search 36 000 words" actions={<button type="button">Add</button>} meta={<span>Beta</span>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dictionary' })).toBeInTheDocument();
    expect(screen.getByText('Search 36 000 words')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('AC-2: back renders labelled link; breadcrumb marks current page; onNavigate intercepts', async () => {
    const onNavigate = vi.fn();
    render(<PageHeader title="skriva" back={{ href: '/dictionary', label: 'Back to dictionary' }} breadcrumb={[{ label: 'Dictionary', href: '/dictionary' }, { label: 'skriva' }]} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('link', { name: 'Back to dictionary' }));
    expect(onNavigate).toHaveBeenCalledWith('/dictionary', expect.anything());
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('skriva', { selector: 'li' })).toHaveAttribute('aria-current', 'page');
  });
});

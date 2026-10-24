import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IndexItem, IndexList } from './IndexList';

describe('IndexList', () => {
  it('AC-1: renders a list of items', () => {
    render(
      <IndexList aria-label="Modes">
        <IndexItem title="One" />
        <IndexItem title="Two" />
      </IndexList>,
    );
    expect(screen.getByRole('list', { name: 'Modes' })).toHaveClass('ui-index');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('AC-2: titleAs selects the element (default h3)', () => {
    render(
      <IndexList>
        <IndexItem title="Default" />
        <IndexItem title="Compact" titleAs="span" />
      </IndexList>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Default' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Compact' })).toBeNull();
    expect(screen.getByText('Compact').tagName).toBe('SPAN');
  });

  it('AC-3: description, meta and action render only when provided', () => {
    const { container } = render(
      <IndexList>
        <IndexItem title="A" />
        <IndexItem title="B" description="Desc" meta="3 phrases" action={<button type="button">Start</button>} />
      </IndexList>,
    );
    expect(container.querySelectorAll('.ui-index__description')).toHaveLength(1);
    expect(container.querySelectorAll('.ui-index__meta')).toHaveLength(1);
    expect(container.querySelectorAll('.ui-index__action')).toHaveLength(1);
  });

  it('AC-4: href makes a link row; onNavigate handles plain clicks', async () => {
    const onNavigate = vi.fn();
    render(
      <IndexList>
        <IndexItem title="Morgonrutin" href="/phrases/morgonrutin" lang="sv" onNavigate={onNavigate} />
      </IndexList>,
    );
    const link = screen.getByRole('link', { name: 'Morgonrutin' });
    expect(link).toHaveAttribute('href', '/phrases/morgonrutin');
    expect(link).toHaveAttribute('lang', 'sv');
    expect(screen.getByRole('listitem')).toHaveClass('ui-index__item--link');
    await userEvent.click(link);
    expect(onNavigate).toHaveBeenCalledWith('/phrases/morgonrutin');
  });

  it('AC-5: the action is a separate control outside the link', () => {
    render(
      <IndexList>
        <IndexItem title="Test" href="/t" action={<button type="button">Take</button>} />
      </IndexList>,
    );
    const button = screen.getByRole('button', { name: 'Take' });
    expect(button.closest('a')).toBeNull();
    expect(button.closest('.ui-index__action')).not.toBeNull();
  });

  it('AC-6: columns sets the modifier; invalid values fall back to 1', () => {
    const { container, rerender } = render(<IndexList columns={3} />);
    expect(container.firstElementChild).toHaveClass('ui-index--cols-3');
    rerender(<IndexList columns={9 as 1} />);
    expect(container.firstElementChild).toHaveClass('ui-index--cols-1');
  });

  it('AC-7: unsafe href values are not rendered as links', () => {
    render(
      <IndexList>
        <IndexItem title="Bad" href="javascript:alert(1)" />
      </IndexList>,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Bad')).toBeInTheDocument();
  });
});

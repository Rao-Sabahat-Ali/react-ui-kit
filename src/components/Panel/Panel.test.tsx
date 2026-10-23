import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Panel } from './Panel';

describe('Panel', () => {
  it('AC-1: renders header heading, body and footer', () => {
    render(
      <Panel header="Revenue" footer="Updated today" icons={<button>Refresh</button>}>
        Body text
      </Panel>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Revenue' })).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeVisible();
    expect(screen.getByText('Updated today')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('headerAs changes the heading level', () => {
    render(<Panel header="X" headerAs="h5">b</Panel>);
    expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
  });

  it('AC-2: toggle collapses body with aria-expanded and aria-controls in sync', async () => {
    const onToggle = vi.fn();
    render(
      <Panel header="Settings" toggleable onToggle={onToggle}>
        Body text
      </Panel>,
    );
    const btn = screen.getByRole('button', { name: 'Collapse' });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    const body = document.getElementById(btn.getAttribute('aria-controls')!)!;
    expect(body).toHaveTextContent('Body text');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Body text')).not.toBeVisible();
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Expand' })).toBe(btn);
  });

  it('supports controlled collapsed', () => {
    render(
      <Panel header="S" toggleable collapsed>
        Body text
      </Panel>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Accordion } from './Accordion';

const three = (props: React.ComponentProps<typeof Accordion> = {}) => (
  <Accordion {...props}>
    <Accordion.Item value="a" header="Alpha">Alpha body</Accordion.Item>
    <Accordion.Item value="b" header="Beta">Beta body</Accordion.Item>
    <Accordion.Item value="c" header="Gamma" disabled>Gamma body</Accordion.Item>
  </Accordion>
);

describe('Accordion', () => {
  it('AC-1: single mode keeps one open; multiple allows many', async () => {
    const single = render(three());
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-expanded', 'true');
    single.unmount();
    render(three({ multiple: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-2: aria-expanded/aria-controls correct, region labelled, collapse hides after animation', async () => {
    render(three({ defaultValue: 'a' }));
    const btn = screen.getByRole('button', { name: 'Alpha' });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(btn.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel).toHaveAttribute('aria-labelledby', btn.id);
    expect(screen.getByText('Alpha body')).toBeVisible();
    // jsdom has no animation engine, so presence unmounts at once; pretend to be a browser that animates.
    const original = document.getAnimations;
    document.getAnimations = () => [];
    try {
      await userEvent.click(btn);
      expect(btn).toHaveAttribute('aria-expanded', 'false');
      expect(panel).toHaveClass('ui-accordion__collapse--closing');
      expect(panel).toHaveAttribute('data-state', 'closed');
      expect(panel).toHaveAttribute('inert');
      await waitFor(() => expect(screen.getByText('Alpha body')).not.toBeVisible());
    } finally {
      document.getAnimations = original;
    }
  });

  it('opens with data-state and keeps the open panel free of the closing state', async () => {
    render(three());
    const btn = screen.getByRole('button', { name: 'Beta' });
    await userEvent.click(btn);
    const panel = document.getElementById(btn.getAttribute('aria-controls')!)!;
    expect(panel).toHaveAttribute('data-state', 'open');
    expect(panel).not.toHaveClass('ui-accordion__collapse--closing');
    expect(btn.querySelector('.ui-accordion__chevron')).toBeInTheDocument();
  });

  it('AC-2: reduced motion collapses instantly', async () => {
    const mm = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...mm(q), matches: q.includes('prefers-reduced-motion') })) as typeof window.matchMedia;
    try {
      render(three({ defaultValue: 'a' }));
      await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));
      expect(screen.getByText('Alpha body')).not.toBeVisible();
    } finally {
      window.matchMedia = mm;
    }
  });

  it('AC-3: disabled item cannot toggle', async () => {
    const onChange = vi.fn();
    render(three({ onChange }));
    const btn = screen.getByRole('button', { name: 'Gamma' });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onChange).not.toHaveBeenCalled();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('keyboard: arrows, Home and End move between headers', async () => {
    render(three());
    const alpha = screen.getByRole('button', { name: 'Alpha' });
    alpha.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveFocus(); // Gamma disabled
    await userEvent.keyboard('{Home}');
    expect(alpha).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveFocus();
  });

  it('headingLevel and controlled value with items prop', async () => {
    const Harness = () => {
      const [v, setV] = useState<string | string[] | null>(null);
      return <Accordion headingLevel={4} value={v} onChange={setV} items={[{ value: 'x', header: 'X', content: 'X body' }]} />;
    };
    render(<Harness />);
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'X' }));
    expect(screen.getByRole('button', { name: 'X' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('omits region role with more than six items', () => {
    render(<Accordion items={Array.from({ length: 7 }, (_, i) => ({ value: String(i), header: `H${i}`, content: 'c' }))} />);
    expect(screen.queryAllByRole('region', { hidden: true })).toHaveLength(0);
  });
});

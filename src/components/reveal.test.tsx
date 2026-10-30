// Expand/collapse of Tree, OrganizationChart and OrderSummary reveals with clip-path + opacity (the Accordion recipe), never height.
import { readFileSync } from 'node:fs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderSummary } from './OrderSummary/OrderSummary';
import { OrganizationChart } from './OrganizationChart/OrganizationChart';
import { Tree } from './Tree/Tree';
import type { TreeNode } from './Tree/treeUtils';

const read = (path: string) => readFileSync(`${process.cwd()}/src/components/${path}`, 'utf8');
const nodes: TreeNode[] = [
  { key: 'a', label: 'Alpha', children: [{ key: 'a1', label: 'Apple' }] },
  { key: 'b', label: 'Beta', children: [{ key: 'b1', label: 'Banana' }] },
];

beforeEach(() => {
  (document as unknown as { getAnimations: unknown }).getAnimations = () => [];
});
afterEach(() => {
  delete (document as unknown as { getAnimations?: unknown }).getAnimations;
  vi.restoreAllMocks();
});

describe('Tree reveal', () => {
  it('a group open at the first paint plays nothing; collapsing leaves it inert and closed, then unmounts; expanding reveals', async () => {
    render(<Tree aria-label="Food" value={nodes} defaultExpandedKeys={new Set(['a'])} />);
    const group = document.querySelector('.ui-tree__group')!;
    expect(group).not.toHaveAttribute('data-state');
    const alpha = screen.getByRole('treeitem', { name: 'Alpha' });
    await userEvent.click(alpha.querySelector('.ui-tree__toggler')!);
    expect(group).toHaveAttribute('data-state', 'closed');
    expect(group).toHaveAttribute('inert');
    await waitFor(() => expect(group).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('treeitem', { name: 'Beta' }).querySelector('.ui-tree__toggler')!);
    const opened = document.querySelector('.ui-tree__group')!;
    expect(opened).toHaveAttribute('data-state', 'open');
    expect(opened).not.toHaveAttribute('inert');
  });

  it('collapses at once without animation support (reduced motion path)', async () => {
    delete (document as unknown as { getAnimations?: unknown }).getAnimations;
    render(<Tree aria-label="Food" value={nodes} defaultExpandedKeys={new Set(['a'])} />);
    await userEvent.click(screen.getByRole('treeitem', { name: 'Alpha' }).querySelector('.ui-tree__toggler')!);
    await waitFor(() => expect(document.querySelector('.ui-tree__group')).toBeNull());
  });

  it('uses the shared reveal recipe, not a height animation', () => {
    const scss = read('Tree/Tree.scss');
    expect(scss).toContain('@include panels.reveal');
    expect(scss).not.toMatch(/ui-reveal-down|transition:[^;]*height|animation:[^;]*height/);
  });
});

describe('OrganizationChart reveal', () => {
  it('a branch toggled by the toggler is inert and closed while it leaves, then unmounts', async () => {
    render(<OrganizationChart aria-label="Org" collapsible value={[{ key: 'ceo', label: 'CEO', children: [{ key: 'cto', label: 'CTO' }] }]} />);
    const branch = document.querySelector('.ui-org-chart__children')!;
    expect(branch).not.toHaveAttribute('data-state');
    await userEvent.click(screen.getByRole('treeitem', { name: 'CEO' }).querySelector('.ui-org-chart__toggler')!);
    expect(branch).toHaveAttribute('data-state', 'closed');
    expect(branch).toHaveAttribute('inert');
    await waitFor(() => expect(branch).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('treeitem', { name: 'CEO' }).querySelector('.ui-org-chart__toggler')!);
    expect(document.querySelector('.ui-org-chart__children')).toHaveAttribute('data-state', 'open');
  });

  it('uses the shared reveal recipe', () => {
    expect(read('OrganizationChart/OrganizationChart.scss')).toContain('@include panels.reveal');
  });
});

describe('OrderSummary reveal', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
  });

  it('the collapsible body reveals when toggled, stays inert while it leaves, then is hidden', async () => {
    render(<OrderSummary currency="USD" locale="en-US" collapsible="always" defaultExpanded lines={[{ id: 'x', name: 'Mug', quantity: 1, unitPrice: 10 }]} />);
    const body = document.querySelector('.ui-order-summary__body')!;
    expect(body).not.toHaveAttribute('data-state');
    const toggle = screen.getByRole('button', { name: /hide/i });
    await userEvent.click(toggle);
    expect(body).toHaveAttribute('data-state', 'closed');
    expect(body).toHaveAttribute('inert');
    await waitFor(() => expect(body).toHaveAttribute('hidden'));
    await userEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(body).toHaveAttribute('data-state', 'open');
    expect(body).not.toHaveAttribute('hidden');
  });

  it('a summary that never collapses carries no presence state', () => {
    render(<OrderSummary currency="USD" locale="en-US" lines={[{ id: 'x', name: 'Mug', quantity: 1, unitPrice: 10 }]} />);
    expect(document.querySelector('.ui-order-summary__body')).not.toHaveAttribute('data-state');
  });

  it('uses the shared reveal recipe', () => {
    expect(read('OrderSummary/OrderSummary.scss')).toContain('@include panels.reveal');
  });
});

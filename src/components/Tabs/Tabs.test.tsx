import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';

function Example(props: Partial<ComponentProps<typeof Tabs>>) {
  return (
    <Tabs defaultValue="a" {...props}>
      <Tabs.List aria-label="Settings">
        <Tabs.Tab value="a">General</Tabs.Tab>
        <Tabs.Tab value="b" disabled>Billing</Tabs.Tab>
        <Tabs.Tab value="c">Security</Tabs.Tab>
        <Tabs.Tab value="d">Advanced</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">General panel</Tabs.Panel>
      <Tabs.Panel value="b">Billing panel</Tabs.Panel>
      <Tabs.Panel value="c">Security panel</Tabs.Panel>
      <Tabs.Panel value="d">Advanced panel</Tabs.Panel>
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('Tabs', () => {
  it('AC-1: roles and aria relationships', () => {
    render(<Example />);
    expect(screen.getByRole('tablist', { name: 'Settings' })).toBeInTheDocument();
    expect(tab('General')).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: 'General' });
    expect(tab('General')).toHaveAttribute('aria-controls', panel.id);
  });

  it('AC-2: click activates and fires onChange', async () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    await userEvent.click(tab('Security'));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.getByRole('tabpanel', { name: 'Security' })).toBeVisible();
    expect(screen.queryByText('General panel')).not.toBeVisible();
  });

  it('AC-3: arrows move and activate, wrap and skip disabled', async () => {
    render(<Example />);
    tab('General').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Security')).toHaveFocus();
    expect(tab('Security')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(tab('General')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(tab('Advanced')).toHaveFocus();
  });

  it('AC-4: Home and End', async () => {
    render(<Example />);
    tab('General').focus();
    await userEvent.keyboard('{End}');
    expect(tab('Advanced')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(tab('General')).toHaveFocus();
  });

  it('AC-5: manual activation requires Enter/Space', async () => {
    render(<Example activation="manual" />);
    tab('General').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Security')).toHaveFocus();
    expect(tab('Security')).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{Enter}');
    expect(tab('Security')).toHaveAttribute('aria-selected', 'true');
  });

  it('AC-6: only active tab is tabbable', () => {
    render(<Example />);
    expect(tab('General')).toHaveAttribute('tabindex', '0');
    expect(tab('Security')).toHaveAttribute('tabindex', '-1');
  });

  it('AC-7: lazy panels render only after first activation', async () => {
    render(<Example />);
    expect(screen.queryByText('Security panel')).toBeNull();
    await userEvent.click(tab('Security'));
    await userEvent.click(tab('General'));
    expect(screen.getByText('Security panel')).toBeInTheDocument();
  });

  it('AC-8: items API', () => {
    render(<Tabs aria-label="Data" items={[{ value: 'x', label: 'X', content: 'X content' }, { value: 'y', label: 'Y', content: 'Y content' }]} />);
    expect(screen.getByRole('tablist', { name: 'Data' })).toBeInTheDocument();
    expect(tab('X')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('X content')).toBeInTheDocument();
  });

  it('AC-9: variant maps to nav classes', () => {
    render(<Example variant="pills" />);
    expect(screen.getByRole('tablist')).toHaveClass('nav-pills');
  });
});

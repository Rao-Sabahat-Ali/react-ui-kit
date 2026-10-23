import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SplitButton, type SplitButtonProps } from './SplitButton';

function setup(props: Partial<SplitButtonProps> = {}) {
  const onClick = vi.fn();
  const command = vi.fn();
  render(
    <>
      <SplitButton label="Save" onClick={onClick} items={[{ label: 'Save as draft', command }, { label: 'Save and close', command }]} {...props} />
      <button type="button">Next</button>
    </>,
  );
  return { onClick, command, main: screen.getByRole('button', { name: 'Save' }), toggle: screen.getByRole('button', { name: 'More actions' }) };
}

describe('SplitButton', () => {
  it('AC-1: main click calls onClick; toggle opens the menu', async () => {
    const { onClick, main, toggle } = setup();
    await userEvent.click(main);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(toggle);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('AC-2: menu keyboard per Menu spec; Escape returns focus to the toggle', async () => {
    const { toggle } = setup();
    await userEvent.click(toggle);
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Save and close' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Save as draft' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it('AC-3: item command runs and the menu closes', async () => {
    const { command, toggle } = setup();
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save and close' }));
    expect(command).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('AC-4: separate tab stops; toggle named by menuLabel with haspopup/expanded/controls', async () => {
    render(<SplitButton label="Save" menuLabel="Other save options" items={[{ label: 'Draft' }]} />);
    const toggle = screen.getByRole('button', { name: 'Other save options' });
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await userEvent.tab();
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-haspopup', 'menu');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', screen.getByRole('menu').id);
    expect(screen.getByRole('group')).toContainElement(toggle);
  });

  it('AC-5: Enter/Space/ArrowDown open on the first item; ArrowUp on the last', async () => {
    const { toggle } = setup();
    for (const key of ['{Enter}', ' ', '{ArrowDown}']) {
      toggle.focus();
      await userEvent.keyboard(key);
      expect(screen.getByRole('menuitem', { name: 'Save as draft' })).toHaveFocus();
      await userEvent.keyboard('{Escape}');
    }
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Save and close' })).toHaveFocus();
  });

  it('AC-6: after item activation focus returns to the toggle', async () => {
    const { toggle } = setup();
    toggle.focus();
    await userEvent.keyboard('{Enter}{Enter}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it('AC-7: Tab closes the menu and moves focus to the next tabbable', async () => {
    const { toggle } = setup();
    await userEvent.click(toggle);
    await userEvent.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  });

  it('AC-8: disabled/loading disable both parts; ArrowDown on main does not open', async () => {
    const a = setup({ disabled: true });
    expect(a.main).toBeDisabled();
    expect(a.toggle).toBeDisabled();
    await userEvent.click(a.toggle);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('AC-8: loading sets aria-busy and disables both; ArrowDown on main does nothing', async () => {
    const { main, toggle, onClick } = setup({ loading: true });
    expect(main).toHaveAttribute('aria-busy', 'true');
    expect(main).toBeDisabled();
    expect(toggle).toBeDisabled();
    await userEvent.click(main);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('ArrowDown on the main button does not open the menu', async () => {
    const { main } = setup();
    main.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

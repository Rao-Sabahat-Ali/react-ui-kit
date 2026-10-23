import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import type { Option } from '../Select/Select';
import { MultiSelect, type MultiSelectProps } from './MultiSelect';

const langs: Option<string>[] = [
  { label: 'Go', value: 'go' },
  { label: 'Python', value: 'py' },
  { label: 'Rust', value: 'rs' },
  { label: 'TypeScript', value: 'ts' },
  { label: 'Zig', value: 'zig', disabled: true },
];

function Harness(props: Partial<MultiSelectProps<string>> & { spy?: (v: string[]) => void; initial?: string[] }) {
  const { spy, initial = [], ...rest } = props;
  const [value, setValue] = useState<string[]>(initial);
  return (
    <MultiSelect
      aria-label="Languages"
      options={langs}
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        spy?.(v);
      }}
    />
  );
}

const combo = () => screen.getByRole('combobox', { name: /^Languages/ });

describe('MultiSelect', () => {
  it('AC-1: toggling options emits an array preserving option order', async () => {
    const spy = vi.fn();
    render(
      <Field label="Languages">
        <Harness spy={spy} />
      </Field>,
    );
    await userEvent.click(combo());
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'TypeScript' }));
    await userEvent.click(screen.getByRole('option', { name: 'Go' }));
    expect(spy).toHaveBeenLastCalledWith(['go', 'ts']);
    expect(screen.getByRole('option', { name: 'Go' })).toHaveAttribute('aria-selected', 'true');
    // keyboard: active descendant + Space / Enter toggles, panel stays open
    await userEvent.keyboard('{ArrowDown} ');
    expect(spy).toHaveBeenLastCalledWith(['go', 'py', 'ts']);
    await userEvent.keyboard('{Enter}');
    expect(spy).toHaveBeenLastCalledWith(['go', 'ts']);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(combo()).toHaveFocus();
    expect(combo()).toHaveTextContent('Go, TypeScript');
  });

  it('AC-2: select-all selects filtered enabled options and is indeterminate when partial', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness spy={spy} filter initial={['go']} />);
    await user.click(combo());
    const all = screen.getByRole('checkbox', { name: 'Select all' }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    await user.type(screen.getByRole('combobox', { name: 'Filter' }), 'r');
    // filtered by "r": Rust, TypeScript (Zig disabled is not selected)
    await user.click(all);
    expect(spy).toHaveBeenLastCalledWith(['go', 'rs', 'ts']);
    await user.clear(screen.getByRole('combobox', { name: 'Filter' }));
    await user.keyboard('{Control>}a{/Control}');
    expect(spy).toHaveBeenLastCalledWith(['go', 'py', 'rs', 'ts']);
    expect(all.indeterminate).toBe(false);
    expect(all.checked).toBe(true);
    expect(spy).not.toHaveBeenCalledWith(expect.arrayContaining(['zig']));
  });

  it('AC-3: maxSelectedLabels collapses the label', () => {
    const { rerender } = render(<MultiSelect aria-label="Languages" options={langs} value={['go', 'py']} maxSelectedLabels={2} />);
    expect(combo()).toHaveTextContent('Go, Python');
    rerender(<MultiSelect aria-label="Languages" options={langs} value={['go', 'py', 'rs']} maxSelectedLabels={2} />);
    expect(combo()).toHaveTextContent('3 selected');
  });

  it('AC-4: selectionLimit disables remaining options when reached', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} selectionLimit={2} />);
    await userEvent.click(combo());
    await userEvent.click(screen.getByRole('option', { name: 'Go' }));
    await userEvent.click(screen.getByRole('option', { name: 'Rust' }));
    expect(screen.getByRole('option', { name: 'Python' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'Python' }));
    expect(spy).toHaveBeenLastCalledWith(['go', 'rs']);
    await userEvent.click(screen.getByRole('option', { name: 'Go' }));
    expect(screen.getByRole('option', { name: 'Python' })).not.toHaveAttribute('aria-disabled');
  });

  it('AC-5: display="chips" renders removable chips in the trigger', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} display="chips" initial={['py', 'rs']} />);
    expect(screen.getByRole('list')).toHaveTextContent('Python');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Python' }));
    expect(spy).toHaveBeenLastCalledWith(['rs']);
    expect(screen.queryByRole('button', { name: 'Remove Python' })).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

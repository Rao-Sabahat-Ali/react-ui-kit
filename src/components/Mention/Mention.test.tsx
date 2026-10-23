import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { Mention, findMention } from './Mention';

const people = ['ada', 'alan', 'grace'];
const tags = ['react', 'rust'];

function Harness({ onSearch, onChange }: { onSearch?: (t: string, q: string) => void; onChange?: (v: string) => void }) {
  const [value, setValue] = useState('');
  const [items, setItems] = useState<string[]>([]);
  return (
    <Field label="Comment">
      <Mention
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
        triggers={['@', '#']}
        suggestions={items}
        onSearch={(trigger, query) => {
          onSearch?.(trigger, query);
          setItems((trigger === '@' ? people : tags).filter((p) => p.startsWith(query)));
        }}
      />
    </Field>
  );
}

const box = () => screen.getByLabelText('Comment') as HTMLTextAreaElement;

describe('Mention', () => {
  it('AC-1: typing a trigger opens the panel and calls onSearch with the query', async () => {
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    expect(box()).not.toHaveAttribute('role');
    await userEvent.type(box(), 'hi @a');
    expect(onSearch).toHaveBeenCalledWith('@', '');
    expect(onSearch).toHaveBeenLastCalledWith('@', 'a');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['ada', 'alan']);
    expect(box()).toHaveAttribute('role', 'combobox');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    // An email-like "x@y" does not trigger.
    expect(findMention('mail me at x@y', 14, ['@'])).toBeNull();
    await userEvent.type(box(), ' #r');
    expect(onSearch).toHaveBeenLastCalledWith('#', 'r');
  });

  it('AC-2: selecting inserts trigger + label + space at caret', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(box(), 'cc @al');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('cc @alan ');
    expect(box().selectionStart).toBe('cc @alan '.length);
    expect(screen.queryByRole('listbox')).toBeNull();
    await userEvent.type(box(), 'and @');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(box().getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'grace' }).id);
    await userEvent.click(screen.getByRole('option', { name: 'ada' }));
    expect(onChange).toHaveBeenLastCalledWith('cc @alan and @ada ');
  });

  it('AC-3: Escape closes the panel; panel positions at the caret', async () => {
    render(<Harness />);
    box().getBoundingClientRect = () => ({ top: 100, left: 40, width: 300, height: 80, right: 340, bottom: 180, x: 40, y: 100, toJSON: () => ({}) });
    await userEvent.type(box(), '@');
    const panel = screen.getByRole('listbox').parentElement!;
    expect(panel.style.position).toBe('fixed');
    expect(parseFloat(panel.style.top)).toBeGreaterThan(100);
    expect(parseFloat(panel.style.left)).toBeGreaterThanOrEqual(40);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box()).not.toHaveAttribute('role');
    expect(box()).toHaveValue('@');
  });
});

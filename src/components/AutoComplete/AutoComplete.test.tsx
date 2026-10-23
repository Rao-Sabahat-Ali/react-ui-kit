import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { AutoComplete } from './AutoComplete';

interface User {
  id: number;
  name: string;
}
const users: User[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Alan' },
  { id: 3, name: 'Grace' },
];
const name = (u: User) => u.name;

function Local({ multiple = false, spy, forceSelection = false, label = 'Users' }: { multiple?: boolean; spy?: (v: unknown) => void; forceSelection?: boolean; label?: string }) {
  const [items, setItems] = useState<User[]>([]);
  const search = (q: string) => setItems(users.filter((u) => u.name.toLowerCase().startsWith(q.toLowerCase())));
  return multiple ? (
    <AutoComplete aria-label={label} multiple delay={0} suggestions={items} onSearch={search} getOptionLabel={name} onChange={(v) => spy?.(v)} />
  ) : (
    <AutoComplete aria-label={label || undefined} delay={0} suggestions={items} onSearch={search} getOptionLabel={name} forceSelection={forceSelection} onChange={(v) => spy?.(v)} />
  );
}

const input = () => screen.getByRole('combobox');

describe('AutoComplete', () => {
  it('AC-1: typing >= minLength calls onSearch once after delay and aborts the previous signal', async () => {
    const onSearch = vi.fn();
    render(<AutoComplete aria-label="Users" suggestions={[]} onSearch={onSearch} minLength={2} delay={60} />);
    await userEvent.type(input(), 'a');
    await new Promise((r) => setTimeout(r, 90));
    expect(onSearch).not.toHaveBeenCalled(); // below minLength
    await userEvent.type(input(), 'd');
    expect(onSearch).not.toHaveBeenCalled(); // debounced
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
    expect(onSearch).toHaveBeenLastCalledWith('ad', expect.any(AbortSignal));
    const first = onSearch.mock.calls[0]![1] as AbortSignal;
    expect(first.aborted).toBe(false);
    await userEvent.type(input(), 'a');
    expect(first.aborted).toBe(true);
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(2));
    expect(onSearch).toHaveBeenLastCalledWith('ada', expect.any(AbortSignal));
  });

  it('AC-2: suggestions render as options; Arrow/Enter selects and calls onChange', async () => {
    const spy = vi.fn();
    render(
      <Field label="Assignee">
        <Local spy={spy} label="" />
      </Field>,
    );
    const box = screen.getByRole('combobox', { name: 'Assignee' });
    expect(box).toHaveAttribute('aria-autocomplete', 'list');
    await userEvent.type(box, 'a');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(box.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(box.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Alan' }).id);
    await userEvent.keyboard('{Enter}');
    expect(spy).toHaveBeenLastCalledWith({ id: 2, name: 'Alan' });
    expect(box).toHaveValue('Alan');
    expect(screen.queryByRole('listbox')).toBeNull();
    // Escape closes, second Escape clears
    await userEvent.clear(box);
    await userEvent.type(box, 'g');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box).toHaveValue('g');
    await userEvent.keyboard('{Escape}');
    expect(box).toHaveValue('');
  });

  it('AC-3: multiple renders removable chips and Backspace removes last', async () => {
    const spy = vi.fn();
    render(<Local multiple spy={spy} />);
    await userEvent.type(input(), 'a');
    await userEvent.click(await screen.findByRole('option', { name: 'Ada' }));
    await userEvent.type(input(), 'g');
    await userEvent.click(await screen.findByRole('option', { name: 'Grace' }));
    expect(spy).toHaveBeenLastCalledWith([users[0], users[2]]);
    expect(input()).toHaveValue('');
    expect(screen.getByRole('list')).toHaveTextContent('AdaGrace');
    await userEvent.keyboard('{Backspace}');
    expect(spy).toHaveBeenLastCalledWith([users[0]]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ada' }));
    expect(spy).toHaveBeenLastCalledWith([]);
    expect(input()).toHaveFocus();
  });

  it('AC-4: forceSelection clears unmatched text on blur', async () => {
    const spy = vi.fn();
    render(
      <>
        <Local forceSelection spy={spy} />
        <button type="button">next</button>
      </>,
    );
    await userEvent.type(input(), 'zz');
    await userEvent.click(screen.getByRole('button', { name: 'next' }));
    await waitFor(() => expect(input()).toHaveValue(''));
    await userEvent.type(input(), 'grace');
    await userEvent.tab();
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(users[2]));
    expect(input()).toHaveValue('Grace');
  });

  it('AC-5: result count is announced via a polite live region', async () => {
    const { rerender } = render(<AutoComplete aria-label="Users" delay={0} suggestions={[]} onSearch={() => {}} getOptionLabel={name} loading />);
    await userEvent.type(input(), 'a');
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Searching…');
    rerender(<AutoComplete aria-label="Users" delay={0} suggestions={users} onSearch={() => {}} getOptionLabel={name} />);
    expect(status).toHaveTextContent('3 results');
    rerender(<AutoComplete aria-label="Users" delay={0} suggestions={[users[0]!]} onSearch={() => {}} getOptionLabel={name} />);
    expect(status).toHaveTextContent('1 result');
  });

  it('dropdown button shows all suggestions', async () => {
    const onSearch = vi.fn();
    render(<AutoComplete aria-label="Users" dropdown suggestions={users} onSearch={onSearch} getOptionLabel={name} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show suggestions' }));
    expect(onSearch).toHaveBeenCalledWith('', expect.any(AbortSignal));
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });
});

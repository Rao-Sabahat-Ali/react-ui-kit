// Exit animations of the dropdown-type popups: each stays mounted, inert and data-state="closed" while it leaves, then unmounts.
import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutoComplete } from './AutoComplete/AutoComplete';
import { CascadeSelect } from './CascadeSelect/CascadeSelect';
import { ColorPicker } from './ColorPicker/ColorPicker';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { DatePicker } from './DatePicker/DatePicker';
import { Mention } from './Mention/Mention';
import { Menubar } from './Menubar/Menubar';
import { MultiSelect } from './MultiSelect/MultiSelect';
import { TreeSelect } from './TreeSelect/TreeSelect';

/** Pretend the browser can run exit animations so usePresence keeps closing parts mounted. */
beforeEach(() => {
  (document as unknown as { getAnimations: unknown }).getAnimations = () => [];
});
afterEach(() => {
  delete (document as unknown as { getAnimations?: unknown }).getAnimations;
});

/** Asserts the open -> closed (inert) -> unmounted lifecycle of a popup panel. */
async function expectExit(panel: () => Element | null, close: () => unknown) {
  const el = await waitFor(() => {
    const found = panel();
    expect(found).not.toBeNull();
    return found!;
  });
  expect(el).toHaveAttribute('data-state', 'open');
  expect(el).not.toHaveAttribute('inert');
  await close();
  expect(el).toHaveAttribute('data-state', 'closed');
  expect(el).toHaveAttribute('inert');
  await waitFor(() => expect(el).not.toBeInTheDocument());
}

describe('dropdown popups play their exit before unmounting', () => {
  it('MultiSelect', async () => {
    render(<MultiSelect aria-label="Languages" options={[{ label: 'Swedish', value: 'sv' }, { label: 'Urdu', value: 'ur' }]} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Languages' }));
    await expectExit(() => document.querySelector('.ui-multi-select__panel'), () => userEvent.keyboard('{Escape}'));
  });

  it('AutoComplete', async () => {
    function Host() {
      const [items, setItems] = useState<string[]>([]);
      return <AutoComplete aria-label="City" delay={0} suggestions={items} onSearch={(q) => setItems(['Oslo', 'Osaka'].filter((c) => c.toLowerCase().startsWith(q.toLowerCase())))} />;
    }
    render(<Host />);
    await userEvent.type(screen.getByRole('combobox', { name: 'City' }), 'os');
    await expectExit(() => document.querySelector('.ui-auto-complete__panel'), () => userEvent.keyboard('{Escape}'));
  });

  it('TreeSelect', async () => {
    render(<TreeSelect aria-label="Category" nodes={[{ key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }]} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Category' }));
    await expectExit(() => document.querySelector('.ui-tree-select__panel'), () => userEvent.keyboard('{Escape}'));
  });

  it('CascadeSelect', async () => {
    render(<CascadeSelect aria-label="Place" options={[{ label: 'Sweden', children: [{ label: 'Lund', value: 'lnd' }] }, { label: 'Anywhere', value: 'any' }]} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Place' }));
    await expectExit(() => document.querySelector('.ui-cascade-select__panel'), () => userEvent.keyboard('{Escape}'));
  });

  it('DatePicker', async () => {
    render(<DatePicker aria-label="Due" defaultValue={new Date(2026, 9, 23)} locale="en-US" />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose date' }));
    await expectExit(() => document.querySelector('.ui-date-picker__popup'), () => userEvent.keyboard('{Escape}'));
  });

  it('ColorPicker', async () => {
    render(<ColorPicker aria-label="Brand" defaultValue="#ff0000" />);
    await userEvent.click(screen.getByRole('button', { name: /brand/i }));
    await expectExit(() => document.querySelector('.ui-color-picker__popup'), () => userEvent.keyboard('{Escape}'));
  });

  it('Mention', async () => {
    function Host() {
      const [value, setValue] = useState('');
      return <Mention aria-label="Comment" value={value} onChange={setValue} triggers={['@']} suggestions={['ada', 'alan']} onSearch={() => {}} />;
    }
    render(<Host />);
    await userEvent.type(screen.getByLabelText('Comment'), 'hi @a');
    await expectExit(() => document.querySelector('.ui-mention__panel'), () => userEvent.keyboard('{Escape}'));
  });

  it('ContextMenu', async () => {
    function Host() {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <>
          <div ref={ref} tabIndex={0} role="region" aria-label="Row">
            Row
          </div>
          <ContextMenu target={ref} items={[{ label: 'Open', command: () => {} }]} ariaLabel="Row actions" />
        </>
      );
    }
    render(<Host />);
    fireEvent.contextMenu(screen.getByRole('region', { name: 'Row' }), { clientX: 10, clientY: 10 });
    await expectExit(() => document.querySelector('.ui-menu-popup'), () => userEvent.keyboard('{Escape}'));
  });
});

describe('Menubar submenus play their (faster) exit', () => {
  it('menubar mode: the submenu stays mounted, inert and closed, then is hidden', async () => {
    render(<Menubar ariaLabel="App" mode="menubar" items={[{ label: 'File', items: [{ label: 'New', command: () => {} }] }, { label: 'Help', command: () => {} }]} />);
    const top = screen.getByRole('menuitem', { name: 'File' });
    fireEvent.click(top);
    const sub = document.querySelector('.ui-menubar__submenu')!;
    expect(sub).not.toHaveAttribute('hidden');
    expect(sub).toHaveAttribute('data-state', 'open');
    fireEvent.click(top);
    expect(sub).toHaveAttribute('data-state', 'closed');
    expect(sub).toHaveAttribute('inert');
    expect(sub).not.toHaveAttribute('hidden');
    await waitFor(() => expect(sub).toHaveAttribute('hidden'));
  });

  it('navigation mode: the disclosure list does the same', async () => {
    render(<Menubar ariaLabel="Site" mode="navigation" items={[{ label: 'Docs', items: [{ label: 'Guide', href: '/guide' }] }, { label: 'Blog', href: '/blog' }]} />);
    const toggle = screen.getByRole('button', { name: 'Docs' });
    fireEvent.click(toggle);
    const sub = document.querySelector('.ui-menubar__submenu')!;
    expect(sub).toHaveAttribute('data-state', 'open');
    fireEvent.click(toggle);
    expect(sub).toHaveAttribute('data-state', 'closed');
    expect(sub).toHaveAttribute('inert');
    await waitFor(() => expect(sub).toHaveAttribute('hidden'));
  });

  it('the stylesheet exits faster than it enters and switches off under reduced motion', async () => {
    const { readFileSync } = await import('node:fs');
    const scss = readFileSync(`${process.cwd()}/src/components/Menubar/Menubar.scss`, 'utf8');
    expect(scss).toMatch(/\[data-state='closed'\][\s\S]*?parts\.pop-out/);
    expect(scss).toMatch(/prefers-reduced-motion[\s\S]*?\[data-state='closed'\][\s\S]*?animation: none/);
  });
});

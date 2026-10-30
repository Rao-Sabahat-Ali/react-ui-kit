import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { ToastProvider } from '../Toast/Toast';
import { KanbanBoard, type KanbanBoardProps } from './KanbanBoard';
import { applyKanbanMove } from './model';
import type { KanbanCardData, KanbanColumnDef, KanbanLane, KanbanMove } from './types';

const COLUMNS: KanbanColumnDef[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'review', title: 'Review' },
];

const CARDS: KanbanCardData[] = [
  { id: 'a', columnId: 'todo', title: 'Write spec' },
  { id: 'b', columnId: 'todo', title: 'Fix login' },
  { id: 'c', columnId: 'doing', title: 'Build board' },
  { id: 'd', columnId: 'doing', title: 'Review PR' },
  { id: 'e', columnId: 'review', title: 'Ship it' },
];

type HarnessProps = Partial<KanbanBoardProps> & { initial?: KanbanCardData[]; onMoveSpy?: (m: KanbanMove) => void | Promise<void>; lanes?: KanbanLane[] };

/** A parent that owns the cards, like a real app: it applies every move reported by `onMove`. */
function Harness({ initial = CARDS, onMoveSpy, lanes, ...props }: HarnessProps) {
  const [cards, setCards] = useState(initial);
  return (
    <ToastProvider>
      <KanbanBoard
        aria-label="Sprint 42"
        columns={COLUMNS}
        cards={cards}
        lanes={lanes}
        onMove={async (move) => {
          await onMoveSpy?.(move);
          setCards((cs) => applyKanbanMove(cs, move, lanes));
        }}
        {...props}
      />
    </ToastProvider>
  );
}

const live = (container: HTMLElement) => container.querySelector('.ui-kanban__live')!.textContent;
const card = (name: string | RegExp) => screen.getByRole('button', { name });
const titlesIn = (columnName: string) => within(screen.getByRole('region', { name: columnName })).queryAllByRole('listitem').map((li) => within(li).getByRole('button', { name: /,/ }).getAttribute('aria-label')!.split(',')[0]);

/** Header controls come first in the page, so Tab reaches the board's one card stop after them. */
async function tabToCards(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 12 && !document.activeElement?.hasAttribute('data-card-button'); i += 1) await user.tab();
}

let reduced = false;
beforeEach(() => {
  reduced = false;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduced-motion') ? reduced : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
  vi.restoreAllMocks();
});

describe('KanbanBoard', () => {
  it('AC-1: a named region, sections labelled by their header, list items with one button named title, column and position', () => {
    render(<Harness />);
    expect(screen.getByRole('region', { name: 'Sprint 42' })).toBeInTheDocument();
    const progress = screen.getByRole('region', { name: 'In progress' });
    expect(progress.tagName).toBe('SECTION');
    expect(within(progress).getByRole('heading', { name: 'In progress' })).toBeInTheDocument();
    const items = within(progress).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getAllByRole('button', { hidden: true }).length).toBeGreaterThanOrEqual(1);
    expect(card('Build board, In progress, 1 of 2')).toBeInTheDocument();
    expect(card('Fix login, To do, 2 of 2')).toBeInTheDocument();
    expect(items[0]!.closest('ul')).not.toBeNull();
  });

  it('AC-2: the header shows the stage numeral, the title and a quantity mark that follows the visible count', async () => {
    render(<Harness />);
    const todo = screen.getByRole('region', { name: 'To do' });
    expect(todo.querySelector('.ui-kanban__numeral')).toHaveTextContent('1');
    expect(screen.getByRole('region', { name: 'Review' }).querySelector('.ui-kanban__numeral')).toHaveTextContent('3');
    const count = (name: string) => screen.getByRole('region', { name }).querySelector('.ui-kanban__count .visually-hidden')!.textContent;
    expect(count('To do')).toBe('2');
    expect(todo.querySelector('.ui-qty__mark')).toHaveTextContent('×');
    const user = userEvent.setup();
    await tabToCards(user);
    await user.keyboard(' {ArrowRight}{ }');
    expect(count('To do')).toBe('1');
    expect(count('In progress')).toBe('3');
  });

  it('AC-3: one tab stop for the board; arrows, Home and End move focus; left and right mirror in RTL', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness />);
    const stops = screen.getAllByRole('button', { hidden: true }).filter((b) => b.getAttribute('tabindex') === '0' && b.hasAttribute('data-card-button'));
    expect(stops).toHaveLength(1);
    await tabToCards(user);
    expect(card('Write spec, To do, 1 of 2')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(card('Fix login, To do, 2 of 2')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(card('Review PR, In progress, 2 of 2')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(card('Build board, In progress, 1 of 2')).toHaveFocus();
    await user.keyboard('{End}');
    expect(card('Review PR, In progress, 2 of 2')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(card('Fix login, To do, 2 of 2')).toHaveFocus();
    unmount();

    render(
      <LocaleProvider locale="ar">
        <Harness />
      </LocaleProvider>,
    );
    await tabToCards(user);
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: /^Build board/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^Write spec/ })).toHaveFocus();
  });

  it('AC-4: Space picks up, arrows move across and within columns, Space drops and calls onMove; Escape restores without onMove', async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    render(<Harness onMoveSpy={onMove} />);
    await tabToCards(user);
    await user.keyboard(' {ArrowDown}{ArrowRight}');
    expect(titlesIn('To do')).toEqual(['Fix login']);
    expect(titlesIn('In progress')).toEqual(['Build board', 'Write spec', 'Review PR']);
    expect(onMove).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(titlesIn('To do')).toEqual(['Write spec', 'Fix login']);
    expect(onMove).not.toHaveBeenCalled();
    expect(card('Write spec, To do, 1 of 2')).toHaveFocus();

    await user.keyboard(' {ArrowRight}{ArrowDown}{ }');
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    expect(onMove).toHaveBeenCalledWith({ cardId: 'a', fromColumnId: 'todo', toColumnId: 'doing', fromIndex: 0, toIndex: 1 });
    expect(titlesIn('In progress')).toEqual(['Build board', 'Write spec', 'Review PR']);
    expect(card('Write spec, In progress, 2 of 3')).toHaveFocus();
  });

  it('AC-5: every pick-up, move, drop, cancel and rollback produces exactly one polite announcement with column and position', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness onMoveSpy={vi.fn()} />);
    const region = container.querySelector('.ui-kanban__live')!;
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(container.querySelectorAll('.ui-kanban [aria-live="polite"]')).toHaveLength(1);
    await tabToCards(user);
    await user.keyboard(' ');
    expect(live(container)).toBe('Picked up Write spec. To do, position 1 of 2.');
    await user.keyboard('{ArrowRight}');
    expect(live(container)).toBe('Moved to In progress, position 1 of 3.');
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('Write spec returned to To do, position 1.');
    await user.keyboard(' {ArrowRight}{ }');
    expect(live(container)).toBe('Dropped Write spec. In progress, position 1 of 3.');
    expect(region.childElementCount).toBe(1);
  });

  it('AC-6: "Move to…" in the card menu moves the card to the end of the chosen column', async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Harness onMoveSpy={onMove} />);
    await tabToCards(user);
    await user.keyboard('{Shift>}{F10}{/Shift}');
    await user.click(await screen.findByRole('menuitem', { name: 'Move to…' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Review' }));
    await waitFor(() => expect(onMove).toHaveBeenCalledWith({ cardId: 'a', fromColumnId: 'todo', toColumnId: 'review', fromIndex: 0, toIndex: 1 }));
    expect(titlesIn('Review')).toEqual(['Ship it', 'Write spec']);
    expect(live(container)).toBe('Moved to Review, position 2 of 2.');
  });

  describe('AC-7: pointer drag', () => {
    const rects = () => {
      const column = (el: Element) => {
        const index = COLUMNS.findIndex((c) => c.id === (el as HTMLElement).dataset.columnId);
        return DOMRect.fromRect({ x: index * 300, y: 0, width: 280, height: 600 });
      };
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this.tagName === 'SECTION' && this.dataset.columnId) return column(this);
        if (this.tagName === 'LI') return DOMRect.fromRect({ x: 0, y: 0, width: 260, height: 60 });
        return DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 20 });
      });
      vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
        if (this.tagName !== 'LI') return 0;
        const siblings = Array.from(this.parentElement!.children);
        return siblings.indexOf(this) * 70;
      });
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(60);
    };
    const pointer = (type: string, x: number, y: number, extra: object = {}) => {
      const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true });
      Object.assign(event, { pointerId: 1, pointerType: 'mouse', isPrimary: true }, extra);
      window.dispatchEvent(event);
    };

    it('moves a card between columns with a placeholder at the drop index', async () => {
      rects();
      const onMove = vi.fn();
      const { container } = render(<Harness onMoveSpy={onMove} />);
      fireEvent.pointerDown(card('Write spec, To do, 1 of 2'), { clientX: 20, clientY: 100, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 });
      act(() => pointer('pointermove', 330, 70));
      expect(container.querySelector('.ui-kanban__placeholder')).not.toBeNull();
      expect(screen.getByRole('region', { name: 'In progress' }).querySelector('.ui-kanban__placeholder')).not.toBeNull();
      expect(container.querySelector('.ui-kanban__item.is-dragging')).not.toBeNull();
      act(() => pointer('pointerup', 330, 70));
      await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
      expect(onMove.mock.calls[0]![0]).toMatchObject({ cardId: 'a', fromColumnId: 'todo', toColumnId: 'doing', toIndex: 1 });
      expect(container.querySelector('.ui-kanban__placeholder')).toBeNull();
      expect(live(container)).toBe('Dropped Write spec. In progress, position 2 of 3.');
    });

    it('treats a drag shorter than 4px as a click', () => {
      rects();
      const onMove = vi.fn();
      const onCardOpen = vi.fn();
      render(<Harness onMoveSpy={onMove} onCardOpen={onCardOpen} />);
      const button = card('Write spec, To do, 1 of 2');
      fireEvent.pointerDown(button, { clientX: 20, clientY: 100, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 });
      act(() => pointer('pointermove', 22, 102));
      act(() => pointer('pointerup', 22, 102));
      fireEvent.click(button);
      expect(onMove).not.toHaveBeenCalled();
      expect(onCardOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    });

    it('starts a touch drag after a 200ms hold', () => {
      rects();
      vi.useFakeTimers();
      try {
        const { container } = render(<Harness />);
        fireEvent.pointerDown(card('Write spec, To do, 1 of 2'), { clientX: 20, clientY: 100, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 });
        expect(container.querySelector('.ui-kanban__item.is-dragging')).toBeNull();
        act(() => void vi.advanceTimersByTime(210));
        expect(container.querySelector('.ui-kanban__item.is-dragging')).not.toBeNull();
        act(() => pointer('pointercancel', 20, 100));
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it('AC-8: when onMove rejects the card returns to its place and an error toast offers Retry', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const { container } = render(<Harness onMoveSpy={onMove} />);
    await tabToCards(user);
    await user.keyboard(' {ArrowRight}{ }');
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(titlesIn('To do')).toEqual(['Write spec', 'Fix login']));
    expect(titlesIn('In progress')).toEqual(['Build board', 'Review PR']);
    expect(live(container)).toBe('Write spec returned to To do, position 1.');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Write spec was not moved');
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(titlesIn('In progress')).toEqual(['Write spec', 'Build board', 'Review PR']));
  });

  it('AC-9: a warn limit marks the column over limit with text; a block limit refuses the drop and announces it', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const columns: KanbanColumnDef[] = [
      { id: 'todo', title: 'To do' },
      { id: 'doing', title: 'In progress', wipLimit: 1, wipMode: 'warn' },
      { id: 'review', title: 'Review', wipLimit: 1, wipMode: 'block' },
    ];
    const { container } = render(<Harness columns={columns} onMoveSpy={onMove} />);
    const doing = screen.getByRole('region', { name: 'In progress' });
    expect(within(doing).getByText('Over limit')).toBeInTheDocument();
    expect(within(doing).getByText('WIP 2 of 1')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Review' })).getByText('Full')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'To do' })).queryByText('Over limit')).toBeNull();

    await tabToCards(user);
    await user.keyboard('{ArrowRight}');
    await user.keyboard(' {ArrowRight}');
    expect(live(container)).toBe('Review is at its limit of 1.');
    await user.keyboard('{ }');
    expect(onMove).not.toHaveBeenCalled();
    expect(titlesIn('Review')).toEqual(['Ship it']);
  });

  it('AC-10: onCardAdd shows a quick-add field per column; Enter adds and keeps it open, Escape closes, empty titles are rejected', async () => {
    const user = userEvent.setup();
    const onCardAdd = vi.fn();
    render(<Harness onCardAdd={onCardAdd} />);
    expect(screen.getAllByRole('button', { name: /^Add a card to/ })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Add a card to To do' }));
    const input = screen.getByRole('textbox', { name: 'New card in To do' });
    expect(input).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onCardAdd).not.toHaveBeenCalled();
    expect(within(screen.getByRole('region', { name: 'Sprint 42' })).getByRole('alert')).toHaveTextContent('Enter a title');
    await user.type(input, 'Plan release{Enter}');
    expect(onCardAdd).toHaveBeenCalledWith('todo', 'Plan release');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    await user.type(input, 'Second{Enter}');
    expect(onCardAdd).toHaveBeenLastCalledWith('todo', 'Second');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox', { name: 'New card in To do' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add a card to To do' })).toHaveFocus();
  });

  it('AC-11: onCardRename enables F2 inline rename; Enter saves, Escape cancels', async () => {
    const user = userEvent.setup();
    const onCardRename = vi.fn();
    render(<Harness onCardRename={onCardRename} />);
    await tabToCards(user);
    await user.keyboard('{F2}');
    const input = screen.getByRole('textbox', { name: 'Rename Write spec' });
    expect(input).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onCardRename).not.toHaveBeenCalled();
    expect(card('Write spec, To do, 1 of 2')).toHaveFocus();
    await user.keyboard('{F2}');
    await user.clear(screen.getByRole('textbox', { name: 'Rename Write spec' }));
    await user.keyboard('Write the spec{Enter}');
    expect(onCardRename).toHaveBeenCalledWith('a', 'Write the spec');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('AC-12: filter hides non-matching cards, marks matches, shows a no-match state and counts the visible cards', () => {
    const { container } = render(<Harness filter="build" />);
    expect(screen.getByRole('button', { name: 'Build board, In progress, 1 of 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Write spec/ })).toBeNull();
    expect(container.querySelector('mark')).toHaveTextContent(/build/i);
    const todo = screen.getByRole('region', { name: 'To do' });
    expect(within(todo).getByText('No matching cards')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'In progress' }).querySelector('.ui-kanban__count .visually-hidden')).toHaveTextContent('1');
    expect(todo.querySelector('.ui-kanban__count .visually-hidden')).toHaveTextContent('0');
  });

  it('AC-13: lanes group cards into swimlanes and a move across lanes passes laneId', async () => {
    const lanes: KanbanLane[] = [
      { id: 'web', title: 'Web' },
      { id: 'api', title: 'API' },
    ];
    const initial = CARDS.map((c, i) => ({ ...c, laneId: i % 2 === 0 ? 'web' : 'api' }));
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<Harness lanes={lanes} initial={initial} onMoveSpy={onMove} />);
    expect(screen.getByRole('region', { name: 'Web' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'API' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Web' })).getAllByRole('listitem').length).toBe(3);
    await tabToCards(user);
    await user.keyboard(' {ArrowDown}{ }');
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    expect(onMove.mock.calls[0]![0]).toMatchObject({ cardId: 'a', fromColumnId: 'todo', toColumnId: 'todo', laneId: 'api' });
  });

  it('AC-14: readOnly disables pick-up, drag, add and rename; Enter still opens cards', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const onCardOpen = vi.fn();
    const { container } = render(<Harness readOnly onMoveSpy={onMove} onCardOpen={onCardOpen} onCardAdd={vi.fn()} onCardRename={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^Add a card to/ })).toBeNull();
    await tabToCards(user);
    await user.keyboard(' {ArrowRight}{ }{F2}');
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(container.querySelector('.is-grabbed')).toBeNull();
    fireEvent.pointerDown(card('Write spec, To do, 1 of 2'), { clientX: 1, clientY: 100, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 });
    expect(container.querySelector('.is-dragging')).toBeNull();
    await user.keyboard('{Enter}');
    expect(onCardOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('AC-15: loading shows skeleton columns at final size; error shows an error state with Retry', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<Harness loading />);
    expect(container.querySelectorAll('.ui-kanban__column--skeleton')).toHaveLength(3);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText('Loading board')).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: /Write spec/ })).toBeNull();
    const onRetry = vi.fn();
    rerender(<Harness error="The server did not answer." onRetry={onRetry} />);
    expect(within(screen.getByRole('region', { name: 'Sprint 42' })).getByRole('alert')).toHaveTextContent('The board did not load');
    expect(screen.getByText('The server did not answer.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('AC-16: a collapsed column is a narrow labelled strip with its count and expands on activation', async () => {
    const user = userEvent.setup();
    const onColumnToggle = vi.fn();
    function Toggling() {
      const [collapsed, setCollapsed] = useState(true);
      return (
        <Harness
          columns={[COLUMNS[0]!, { ...COLUMNS[1]!, collapsed }, COLUMNS[2]!]}
          onColumnToggle={(id, next) => {
            onColumnToggle(id, next);
            setCollapsed(next);
          }}
        />
      );
    }
    render(<Toggling />);
    const strip = screen.getByRole('button', { name: 'Expand In progress' });
    expect(strip).toHaveAttribute('aria-expanded', 'false');
    expect(strip.closest('section')).toHaveAttribute('aria-labelledby');
    expect(within(strip).getByText('In progress')).toBeInTheDocument();
    expect(strip.querySelector('.ui-kanban__count .visually-hidden')).toHaveTextContent('2');
    expect(screen.queryByRole('button', { name: /^Build board/ })).toBeNull();
    await user.click(strip);
    expect(onColumnToggle).toHaveBeenCalledWith('doing', false);
    expect(screen.getByRole('button', { name: 'Build board, In progress, 1 of 2' })).toBeInTheDocument();
  });

  it('AC-17: virtualised columns keep keyboard navigation and announcements correct across off-screen cards', async () => {
    const user = userEvent.setup();
    const many: KanbanCardData[] = Array.from({ length: 300 }, (_, i) => ({ id: `c${i}`, columnId: 'todo', title: `Task ${i + 1}` }));
    const { container } = render(<Harness initial={many} virtualize />);
    const rendered = container.querySelectorAll('[data-card-button]').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(40);
    const first = container.querySelector('li[data-card-id="c0"]')!;
    expect(first).toHaveAttribute('aria-setsize', '300');
    expect(first).toHaveAttribute('aria-posinset', '1');
    await tabToCards(user);
    await user.keyboard('{End}');
    expect(card('Task 300, To do, 300 of 300')).toHaveFocus();
    expect(container.querySelector('li[data-card-id="c299"]')).toHaveAttribute('aria-posinset', '300');
    await user.keyboard(' ');
    expect(live(container)).toBe('Picked up Task 300. To do, position 300 of 300.');
    await user.keyboard('{Home}');
    expect(live(container)).toBe('Moved to To do, position 1 of 300.');
    expect(container.querySelectorAll('[data-card-button]').length).toBeLessThan(40);
    await user.keyboard('{Escape}');
    expect(live(container)).toBe('Task 300 returned to To do, position 300.');
    expect(card('Task 300, To do, 300 of 300')).toHaveFocus();
  });

  it('AC-18: renderCard content renders inside the kit-owned focusable card and strings are not injected as HTML', () => {
    const cards: KanbanCardData[] = [{ id: 'x', columnId: 'todo', title: '<img src=x onerror=alert(1)>' }];
    const { container } = render(
      <Harness
        initial={cards}
        renderCard={(c, state) => (
          <span data-testid="custom">
            {c.title} #{state.position}
          </span>
        )}
      />,
    );
    const button = screen.getByRole('button', { name: /^<img src=x onerror=alert\(1\)>, To do, 1 of 1$/ });
    expect(within(button).getByTestId('custom')).toHaveTextContent('<img src=x onerror=alert(1)> #1');
    expect(container.querySelector('img')).toBeNull();
    expect(button.closest('li')).not.toBeNull();
  });

  it('AC-19: under reduced motion no transform animations run and moves apply instantly with the same announcements', async () => {
    reduced = true;
    const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn(), finish: vi.fn(), addEventListener: vi.fn() }));
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = animate;
    const user = userEvent.setup();
    const { container } = render(<Harness onMoveSpy={vi.fn()} />);
    await tabToCards(user);
    await user.keyboard(' ');
    expect(live(container)).toBe('Picked up Write spec. To do, position 1 of 2.');
    await user.keyboard('{ArrowRight}');
    expect(live(container)).toBe('Moved to In progress, position 1 of 3.');
    expect(titlesIn('In progress')).toEqual(['Write spec', 'Build board', 'Review PR']);
    await user.keyboard('{ }');
    expect(live(container)).toBe('Dropped Write spec. In progress, position 1 of 3.');
    const transformFrames = (animate.mock.calls as unknown as [Keyframe[]][]).filter(([frames]) => frames.some((f) => 'transform' in f));
    expect(transformFrames).toHaveLength(0);
  });

  it('works without a ToastProvider (the live region still reports a rollback)', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockRejectedValue(new Error('x'));
    const { container } = render(<KanbanBoard aria-label="No toasts" columns={COLUMNS} defaultValue={CARDS} onMove={onMove} />);
    await tabToCards(user);
    await user.keyboard(' {ArrowRight}{ }');
    await waitFor(() => expect(live(container)).toBe('Write spec returned to To do, position 1.'));
  });

  it('uncontrolled boards keep the new order themselves', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard aria-label="Own state" columns={COLUMNS} defaultValue={CARDS} />);
    await tabToCards(user);
    await user.keyboard(' {ArrowRight}{ }');
    expect(screen.getByRole('button', { name: 'Write spec, In progress, 1 of 3' })).toBeInTheDocument();
  });
});

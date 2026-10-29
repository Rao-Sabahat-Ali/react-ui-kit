import { useRef, useState } from 'react';
import { Button } from '../Button/Button';
import { InputText } from '../InputText/InputText';
import { ToastProvider } from '../Toast/Toast';
import { KanbanBoard } from './KanbanBoard';
import { applyKanbanMove } from './model';
import type { KanbanCardData, KanbanColumnDef, KanbanLane, KanbanMove } from './types';

const COLUMNS: KanbanColumnDef[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

const SPRINT: KanbanCardData[] = [
  { id: 't1', columnId: 'todo', title: 'Write the migration plan', labels: ['Backend'], priority: 'high', due: '2026-11-03', assignees: ['Mira Lind'] },
  { id: 't2', columnId: 'todo', title: 'Audit empty states', labels: ['Design'], checklist: { done: 1, total: 4 } },
  { id: 't3', columnId: 'todo', title: 'Rate-limit the export endpoint', labels: [{ text: 'Security', severity: 'danger' }], priority: 'urgent', assignees: ['Omar Haddad'] },
  { id: 'd1', columnId: 'doing', title: 'Fix login redirect loop', labels: ['Bug'], priority: 'high', comments: 3, assignees: ['Mira Lind', 'Jon Berg'] },
  { id: 'd2', columnId: 'doing', title: 'Invoice PDF layout', due: '2026-11-05', checklist: { done: 3, total: 5 }, assignees: ['Ida Strand'] },
  { id: 'r1', columnId: 'review', title: 'Dark theme contrast pass', labels: ['Design'], comments: 2, assignees: ['Jon Berg'] },
  { id: 'x1', columnId: 'done', title: 'Set up error tracking', checklist: { done: 3, total: 3 } },
  { id: 'x2', columnId: 'done', title: 'Upgrade to Node 24', labels: ['Chore'] },
];

/** A parent that owns the cards: it applies every move the board reports. */
function useCards(initial: KanbanCardData[], lanes?: KanbanLane[]) {
  const [cards, setCards] = useState(initial);
  const apply = (move: KanbanMove) => setCards((cs) => applyKanbanMove(cs, move, lanes));
  return { cards, setCards, apply };
}

function Basic() {
  const { cards, setCards, apply } = useCards(SPRINT);
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <>
      <KanbanBoard
        aria-label="Sprint 42"
        columns={COLUMNS}
        cards={cards}
        onMove={apply}
        onCardOpen={(card) => setOpened(card.title)}
        onCardAdd={(columnId, title) => setCards((cs) => [...cs, { id: `n${cs.length}-${Date.now()}`, columnId, title }])}
        onCardRename={(id, title) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)))}
      />
      <p className="mt-3 text-body-secondary" aria-live="polite">
        {opened ? `Opened: ${opened}` : 'Space picks a card up, arrows move it, Space drops it. Right-click or Shift+F10 for Move to…'}
      </p>
    </>
  );
}

function WipLimits() {
  const { cards, apply } = useCards(SPRINT);
  const columns: KanbanColumnDef[] = [
    { id: 'todo', title: 'To do' },
    { id: 'doing', title: 'In progress', wipLimit: 1, wipMode: 'warn' },
    { id: 'review', title: 'Review', wipLimit: 1, wipMode: 'block' },
    { id: 'done', title: 'Done' },
  ];
  return <KanbanBoard aria-label="Sprint 42 with limits" columns={columns} cards={cards} onMove={apply} />;
}

const LANES: KanbanLane[] = [
  { id: 'web', title: 'Web' },
  { id: 'api', title: 'API' },
];

function Swimlanes() {
  const initial = SPRINT.map((c, i) => ({ ...c, laneId: i % 3 === 0 ? 'api' : 'web' }));
  const { cards, apply } = useCards(initial, LANES);
  return <KanbanBoard aria-label="Sprint 42 by team" columns={COLUMNS} lanes={LANES} cards={cards} onMove={apply} />;
}

function Filter() {
  const { cards, apply } = useCards(SPRINT);
  const [filter, setFilter] = useState('design');
  return (
    <KanbanBoard
      aria-label="Filtered sprint"
      columns={COLUMNS}
      cards={cards}
      onMove={apply}
      filter={filter}
      toolbar={<InputText type="search" aria-label="Filter cards" placeholder="Filter cards" value={filter} onChange={setFilter} />}
    />
  );
}

function ReadOnly() {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <>
      <KanbanBoard aria-label="Archived sprint 41" columns={COLUMNS} cards={SPRINT} readOnly onCardOpen={(card) => setOpened(card.title)} />
      <p className="mt-3 text-body-secondary" aria-live="polite">
        {opened ? `Opened: ${opened}` : 'Cards cannot move, but Enter still opens them.'}
      </p>
    </>
  );
}

function LoadingError() {
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  return (
    <>
      <div className="d-flex gap-2 mb-3">
        {(['loading', 'error', 'ready'] as const).map((s) => (
          <Button key={s} size="sm" appearance={state === s ? 'solid' : 'outline'} variant={state === s ? 'primary' : 'secondary'} onClick={() => setState(s)}>
            {s}
          </Button>
        ))}
      </div>
      <KanbanBoard
        aria-label="Sprint 42"
        columns={COLUMNS}
        cards={SPRINT}
        loading={state === 'loading'}
        error={state === 'error' ? 'The tracker did not answer. Your cards are safe.' : undefined}
        onRetry={() => setState('loading')}
      />
    </>
  );
}

function FailingMoves() {
  const { cards, apply } = useCards(SPRINT);
  const count = useRef(0);
  return (
    <ToastProvider position="bottom-end">
      <p className="text-body-secondary">Every third move fails: the card returns and a Retry toast appears.</p>
      <KanbanBoard
        aria-label="Sprint 42 with a flaky server"
        columns={COLUMNS}
        cards={cards}
        onMove={async (move) => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          count.current += 1;
          if (count.current % 3 === 0) throw new Error('offline');
          apply(move);
        }}
      />
    </ToastProvider>
  );
}

const MANY: KanbanCardData[] = Array.from({ length: 400 }, (_, i) => ({
  id: `m${i}`,
  columnId: i < 320 ? 'todo' : i < 360 ? 'doing' : 'review',
  title: `Backlog item ${i + 1}`,
  labels: i % 7 === 0 ? ['Bug'] : undefined,
  priority: i % 11 === 0 ? 'high' : undefined,
}));

function Large() {
  const { cards, apply } = useCards(MANY);
  return <KanbanBoard aria-label="Large backlog" columns={COLUMNS.slice(0, 3)} cards={cards} onMove={apply} />;
}

export const examples = [
  {
    title: 'Sprint board',
    description: 'Four stages, add and rename, a details hook. Pick a card up with Space, drag it, or use the card menu.',
    code: `<KanbanBoard\n  aria-label="Sprint 42"\n  columns={[{ id: 'todo', title: 'To do' }, { id: 'doing', title: 'In progress' }, { id: 'review', title: 'Review' }, { id: 'done', title: 'Done' }]}\n  cards={cards}\n  onMove={(move) => setCards((cs) => applyKanbanMove(cs, move))}\n  onCardOpen={(card) => setOpen(card.id)}\n  onCardAdd={(columnId, title) => addCard(columnId, title)}\n  onCardRename={(id, title) => renameCard(id, title)}\n/>`,
    render: () => <Basic />,
  },
  {
    title: 'WIP limits: warn and block',
    description: 'In progress warns when it holds more than 1 card; Review refuses drops while full and says why.',
    code: `columns={[\n  { id: 'doing', title: 'In progress', wipLimit: 1, wipMode: 'warn' },\n  { id: 'review', title: 'Review', wipLimit: 1, wipMode: 'block' },\n]}`,
    render: () => <WipLimits />,
  },
  {
    title: 'Swimlanes',
    description: 'Cards carry a laneId; moving across lanes passes it to onMove.',
    code: `<KanbanBoard\n  lanes={[{ id: 'web', title: 'Web' }, { id: 'api', title: 'API' }]}\n  columns={columns}\n  cards={cards} // each card has laneId\n  onMove={(move) => apply(move) /* move.laneId */}\n/>`,
    render: () => <Swimlanes />,
  },
  {
    title: 'Filter',
    description: 'Non-matching cards hide, matches are marked and counts follow the visible cards.',
    code: `<KanbanBoard\n  columns={columns}\n  cards={cards}\n  filter={filter}\n  toolbar={<InputText type="search" aria-label="Filter cards" value={filter} onChange={setFilter} />}\n/>`,
    render: () => <Filter />,
  },
  {
    title: 'Read-only',
    description: 'No moving, adding or renaming. Enter still opens a card.',
    code: `<KanbanBoard aria-label="Archived sprint" columns={columns} cards={cards} readOnly onCardOpen={open} />`,
    render: () => <ReadOnly />,
  },
  {
    title: 'Loading and error',
    description: 'Skeleton columns at final size, and an error state with Retry.',
    code: `<KanbanBoard\n  aria-label="Sprint 42"\n  columns={columns}\n  cards={cards}\n  loading={isLoading}\n  error={failed ? 'The tracker did not answer.' : undefined}\n  onRetry={refetch}\n/>`,
    render: () => <LoadingError />,
  },
  {
    title: 'Server that fails every third move',
    description: 'A rejected onMove rolls the card back, announces it and offers Retry.',
    code: `// Inside a <ToastProvider>: the Retry toast needs it.\n<KanbanBoard\n  columns={columns}\n  cards={cards}\n  onMove={async (move) => {\n    await api.move(move); // throws -> rollback + Retry toast\n    apply(move);\n  }}\n/>`,
    render: () => <FailingMoves />,
  },
  {
    title: 'Large virtualised column',
    description: '320 cards in one column: only the cards near the viewport are in the DOM; keyboard navigation and announcements still cover all of them.',
    code: `<KanbanBoard aria-label="Large backlog" columns={columns} cards={cards} /* virtualised above 100 cards per column, or virtualize */ onMove={apply} />`,
    render: () => <Large />,
  },
];

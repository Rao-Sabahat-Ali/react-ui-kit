import { useRef, useState, type FormEvent } from 'react';
import {
  AppShell,
  Button,
  Drawer,
  Field,
  Icon,
  InputText,
  KanbanBoard,
  PageHeader,
  Select,
  SidebarNav,
  Tag,
  ThemeToggle,
  Topbar,
  applyKanbanMove,
  useToast,
  type KanbanMove,
} from '@sabahat/react-ui-kit';
import { STAGES, TASKS, type Task } from './Board.data';
import type { WidgetState } from './shared';

/*
 * Blueprint: Task board (profile `saas`, list-detail pattern with a board in place of the list).
 * PageHeader with the single ink action; the text filter; the KanbanBoard (keyboard pick-up, "Move to…" menu,
 * pointer drag, WIP limits, Undo-by-rollback with a Retry toast); a Drawer with the task details. The board owns no data:
 * this screen applies every move to its own list, exactly as a real app would after its API call.
 */

/** Forces the board into a state; used by the docs to demo loading, empty and error. */
export interface PreviewState {
  widget: 'board' | 'all';
  state: WidgetState;
}

export interface BoardProps {
  appName?: string;
  previewState?: PreviewState;
  /** Render inside a framed container (docs): the shell and top bar do not stick to the viewport. */
  embedded?: boolean;
  /** Called for navigation items other than the board; defaults to an info toast. */
  onNavigate?: (href: string) => void;
}

const NAV = [
  { label: 'Board', href: '/board', icon: 'layers', section: 'Work' },
  { label: 'Backlog', href: '/backlog', icon: 'list', section: 'Work' },
  { label: 'Settings', href: '/settings', icon: 'settings', section: 'Team' },
] as const;

const STAGE_OPTIONS = STAGES.map((s) => ({ label: s.title, value: s.id }));
const stageTitle = (id: string) => STAGES.find((s) => s.id === id)?.title ?? id;

export function Board({ appName = 'Taskly', previewState, embedded = false, onNavigate }: BoardProps) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [filter, setFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [retried, setRetried] = useState('');
  const returnFocus = useRef<HTMLElement | null>(null);

  const previewKey = previewState ? `${previewState.widget}:${previewState.state}` : 'none';
  const base: WidgetState = previewState ? previewState.state : 'ready';
  const state: WidgetState = base === 'error' && retried === previewKey ? 'ready' : base;
  const current = tasks.find((t) => t.id === openId) ?? null;

  const move = (m: KanbanMove) => setTasks((all) => applyKanbanMove(all, m));

  const navigate = (href: string) => {
    if (href === '/board') return;
    if (onNavigate) onNavigate(href);
    else toast.info(`${NAV.find((n) => n.href === href)?.label ?? 'This page'} is not part of the blueprint`);
  };

  const open = (id: string) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpenId(id);
  };
  const close = () => {
    setOpenId(null);
    window.setTimeout(() => returnFocus.current?.focus(), 0);
  };

  return (
    <>
      <AppShell
        variant="sidebar"
        className={embedded ? 'ui-app-shell--embedded' : undefined}
        topbar={<Topbar brand={appName} sticky={!embedded} actions={<ThemeToggle size="sm" />} />}
        sidebar={<SidebarNav items={NAV.map((n) => ({ ...n }))} activeHref="/board" onNavigate={navigate} />}
      >
        <PageHeader
          title="Sprint 42"
          description="Drag a task, or press Space on it and use the arrow keys. Every move is also in the task menu."
          actions={
            <Button icon="plus" onClick={() => setCreating(true)}>
              New task
            </Button>
          }
        />
        <div role="search" aria-label="Board filter" className="d-flex align-items-center gap-2 mb-3">
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <InputText type="search" aria-label="Filter tasks" placeholder="Filter tasks" prefix={<Icon name="search" />} value={filter} onChange={setFilter} />
          </div>
          {filter && (
            <Button size="sm" appearance="text" variant="secondary" onClick={() => setFilter('')}>
              Clear filter
            </Button>
          )}
        </div>
        <KanbanBoard
          aria-label="Sprint 42 board"
          headingLevel={2}
          columns={STAGES}
          cards={state === 'empty' ? [] : tasks}
          filter={filter}
          loading={state === 'loading'}
          error={state === 'error' ? 'The tracker did not respond. Your changes are safe.' : undefined}
          onRetry={() => setRetried(previewKey)}
          onMove={move}
          onCardOpen={(card) => open(card.id)}
          onCardAdd={(columnId, title) => setTasks((all) => [...all, { id: `T-${100 + all.length + 1}`, columnId, title, description: '' }])}
          onCardRename={(id, title) => setTasks((all) => all.map((t) => (t.id === id ? { ...t, title } : t)))}
        />
      </AppShell>

      <Drawer
        open={current !== null}
        onClose={close}
        position="end"
        size="md"
        title={current ? current.title : undefined}
        footer={
          <Button appearance="outline" variant="secondary" onClick={close}>
            Close
          </Button>
        }
      >
        {current && <TaskDetail task={current} />}
      </Drawer>

      <NewTaskDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(title, columnId) => {
          setTasks((all) => [...all, { id: `T-${100 + all.length + 1}`, columnId, title, description: '' }]);
          setCreating(false);
          toast.success(`Added "${title}" to ${stageTitle(columnId)}`);
        }}
      />
    </>
  );
}

function TaskDetail({ task }: { task: Task }) {
  return (
    <div>
      <p className="d-flex flex-wrap gap-2 align-items-center">
        <Tag value={stageTitle(task.columnId)} severity="info" />
        {task.labels?.map((l) => (typeof l === 'string' ? <Tag key={l} value={l} /> : <Tag key={l.text} value={l.text} severity={l.severity} />))}
      </p>
      {task.description && <p>{task.description}</p>}
      <dl className="row gx-0 mb-0">
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Task</dt>
        <dd className="col-sm-8">{task.id}</dd>
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Priority</dt>
        <dd className="col-sm-8">{task.priority ?? 'Not set'}</dd>
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Due</dt>
        <dd className="col-sm-8">{typeof task.due === 'string' ? task.due : 'No date'}</dd>
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Assigned to</dt>
        <dd className="col-sm-8">{task.assignees?.map((a) => (typeof a === 'string' ? a : a.name)).join(', ') || 'Nobody yet'}</dd>
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Checklist</dt>
        <dd className="col-sm-8">{task.checklist ? `${task.checklist.done} of ${task.checklist.total} done` : 'None'}</dd>
      </dl>
    </div>
  );
}

function NewTaskDrawer({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (title: string, columnId: string) => void }) {
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<string>('todo');
  const [error, setError] = useState<string | undefined>();
  const input = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle('');
    setStage('todo');
    setError(undefined);
  };
  const close = () => {
    reset();
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Enter a title for the task');
      input.current?.focus();
      return;
    }
    onCreate(title.trim(), stage);
    reset();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      position="end"
      size="md"
      title="New task"
      footer={
        <>
          <Button appearance="outline" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="new-task">
            Add task
          </Button>
        </>
      }
    >
      <form id="new-task" noValidate onSubmit={submit}>
        <Field id="new-task-title" label="Title" required error={error}>
          <InputText ref={input} value={title} onChange={setTitle} />
        </Field>
        <Field id="new-task-stage" label="Stage">
          <Select<string> options={STAGE_OPTIONS} value={stage} onChange={(v) => setStage(v ?? 'todo')} />
        </Field>
      </form>
    </Drawer>
  );
}

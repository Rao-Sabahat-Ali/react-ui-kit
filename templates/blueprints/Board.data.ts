import type { KanbanCardData, KanbanColumnDef } from '@sabahat/react-ui-kit';

/** Deterministic sample data for the task board blueprint. */

export const STAGES: KanbanColumnDef[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'Doing', wipLimit: 3, wipMode: 'warn' },
  { id: 'review', title: 'Review', wipLimit: 2, wipMode: 'block' },
  { id: 'done', title: 'Done' },
];

export interface Task extends KanbanCardData {
  description: string;
}

export const TASKS: Task[] = [
  { id: 'T-101', columnId: 'todo', title: 'Write the migration plan', description: 'Cover the order of schema changes, the rollback path and who is on call during the cut-over.', labels: ['Backend'], priority: 'high', due: '2026-11-03', assignees: ['Mira Lind'] },
  { id: 'T-102', columnId: 'todo', title: 'Audit empty states', description: 'Every list needs a first-run, a no-results and an error state. Collect the gaps in one document.', labels: ['Design'], checklist: { done: 1, total: 4 } },
  { id: 'T-103', columnId: 'todo', title: 'Rate-limit the export endpoint', description: 'Exports run for minutes and can be started in a loop. Add a per-account limit and a clear 429 message.', labels: [{ text: 'Security', severity: 'danger' }], priority: 'urgent', assignees: ['Omar Haddad'] },
  { id: 'T-104', columnId: 'todo', title: 'Translate the onboarding emails', description: 'Swedish and Norwegian. Copy is final; only the strings and the preview text are missing.', labels: ['Content'], due: '2026-11-10' },
  { id: 'T-105', columnId: 'doing', title: 'Fix login redirect loop', description: 'Users with an expired session land on the sign-in page and are sent straight back. Reproduced on Safari only.', labels: ['Bug'], priority: 'high', comments: 3, assignees: ['Mira Lind', 'Jon Berg'] },
  { id: 'T-106', columnId: 'doing', title: 'Invoice PDF layout', description: 'The totals column overflows when an amount has more than seven digits.', due: '2026-11-05', checklist: { done: 3, total: 5 }, assignees: ['Ida Strand'] },
  { id: 'T-107', columnId: 'review', title: 'Dark theme contrast pass', description: 'Muted text on the sunken surface falls under 4.5:1 in two places.', labels: ['Design'], comments: 2, assignees: ['Jon Berg'] },
  { id: 'T-108', columnId: 'done', title: 'Set up error tracking', description: 'Release tags and source maps are uploaded from CI.', checklist: { done: 3, total: 3 } },
  { id: 'T-109', columnId: 'done', title: 'Upgrade to Node 24', description: 'CI, the Docker image and the engines field.', labels: ['Chore'] },
];

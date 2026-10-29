import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { cx } from '../../utils/cx';
import { Avatar, AvatarGroup } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { Highlight } from '../Highlight/Highlight';
import { Icon, type IconName } from '../Icon/Icon';
import { InputText } from '../InputText/InputText';
import { Tag } from '../Tag/Tag';
import { useKanban } from './context';
import { assigneeName, labelText } from './model';
import type { KanbanCardData, KanbanPriority } from './types';

const PRIORITY_ICON: Record<KanbanPriority, IconName> = { low: 'arrow-down', medium: 'minus', high: 'arrow-up', urgent: 'flame' };

function formatDue(due: string | Date, locale: string): string {
  const date = due instanceof Date ? due : new Date(/^\d{4}-\d{2}-\d{2}$/.test(due) ? `${due}T00:00:00` : due);
  if (Number.isNaN(date.getTime())) return String(due);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

export interface KanbanCardProps {
  card: KanbanCardData;
  /** Position among the visible cards of the cell, 0-based. */
  index: number;
  total: number;
  columnTitle: string;
  columnId: string;
  laneId?: string;
  /** Windowed lists place each row by slot. */
  style?: CSSProperties;
  setSize?: number;
  grabbed: boolean;
  dragging: boolean;
}

/** One card: a list item holding the kit-owned focusable button (and its actions button). */
export function KanbanCard({ card, index, total, columnTitle, columnId, laneId, style, setSize, grabbed, dragging }: KanbanCardProps) {
  const k = useKanban();
  const { t, tp, locale } = k;
  const metaId = useId();
  const renameInput = useRef<HTMLInputElement | null>(null);
  const renaming = k.renameId === card.id;
  useEffect(() => {
    if (renaming) {
      renameInput.current?.focus();
      renameInput.current?.select();
    }
  }, [renaming]);
  const pending = k.pendingIds.has(card.id);
  const compact = k.density === 'compact';
  const labels = card.labels ?? [];
  const assignees = card.assignees ?? [];

  const priorityText = card.priority
    ? t(card.priority === 'low' ? 'kanbanPriorityLow' : card.priority === 'medium' ? 'kanbanPriorityMedium' : card.priority === 'high' ? 'kanbanPriorityHigh' : 'kanbanPriorityUrgent')
    : undefined;
  const dueText = card.due !== undefined ? t('kanbanDue', { date: formatDue(card.due, locale) }) : undefined;
  const checklistText = card.checklist ? t('kanbanChecklist', { done: card.checklist.done, total: card.checklist.total }) : undefined;
  const commentsText = card.comments ? tp('kanbanComments', card.comments) : undefined;
  const summary = [
    labels.map(labelText).join(', '),
    priorityText,
    dueText,
    checklistText,
    commentsText,
    assignees.length ? assignees.map(assigneeName).join(', ') : undefined,
    pending ? t('kanbanPending') : undefined,
  ]
    .filter(Boolean)
    .join('. ');

  const state = { columnId, laneId, position: index + 1, total, grabbed, dragging, filter: k.filter, density: k.density };
  const body = k.renderCard ? (
    k.renderCard(card, state)
  ) : (
    <>
      <span className="ui-kanban__card-title">
        <Highlight query={k.filter}>{card.title}</Highlight>
      </span>
      {!compact && labels.length > 0 && (
        <span className="ui-kanban__card-labels">
          {labels.map((label, i) => (
            <Tag key={`${labelText(label)}-${i}`} value={<Highlight query={k.filter}>{labelText(label)}</Highlight>} severity={typeof label === 'string' ? 'secondary' : (label.severity ?? 'secondary')} />
          ))}
        </span>
      )}
      {(priorityText || dueText || checklistText || commentsText || assignees.length > 0) && (
        <span className="ui-kanban__card-meta">
          {card.priority && (
            <span className="ui-kanban__meta-item" data-priority={card.priority}>
              <Icon name={PRIORITY_ICON[card.priority]} size="sm" />
              {priorityText}
            </span>
          )}
          {dueText && (
            <span className="ui-kanban__meta-item">
              <Icon name="calendar" size="sm" />
              {dueText}
            </span>
          )}
          {checklistText && (
            <span className="ui-kanban__meta-item">
              <Icon name="check-circle" size="sm" />
              {checklistText}
            </span>
          )}
          {commentsText && !compact && <span className="ui-kanban__meta-item">{commentsText}</span>}
          {assignees.length > 0 && (
            <AvatarGroup size="sm" max={3} className="ui-kanban__assignees" aria-hidden="true">
              {assignees.map((a, i) => (typeof a === 'string' ? <Avatar key={`${a}-${i}`} name={a} /> : <Avatar key={`${a.name}-${i}`} name={a.name} image={a.image} />))}
            </AvatarGroup>
          )}
        </span>
      )}
    </>
  );

  const ariaLabel = t('kanbanCardLabel', { title: card.title, column: columnTitle, position: index + 1, total });
  const describedBy = [summary ? metaId : undefined, k.readOnly ? undefined : k.instructionsId].filter(Boolean).join(' ') || undefined;
  const dragStyle: CSSProperties | undefined = dragging && k.drag ? ({ '--ui-kanban-drag-width': `${k.drag.width}px`, '--ui-kanban-drag-height': `${k.drag.height}px` } as CSSProperties) : undefined;

  return (
    <li
      className={cx('ui-kanban__item', dragging && 'is-dragging')}
      data-card-id={card.id}
      aria-setsize={setSize}
      aria-posinset={setSize ? index + 1 : undefined}
      style={{ ...style, ...dragStyle }}
    >
      <div className={cx('ui-kanban__card', grabbed && 'is-grabbed', dragging && 'is-dragging', pending && 'is-pending')} data-grabbed={grabbed || undefined} aria-busy={pending || undefined}>
        {renaming ? (
          <InputText
            className="ui-kanban__rename"
            size="sm"
            aria-label={t('kanbanRenameLabel', { title: card.title })}
            defaultValue={card.title}
            ref={renameInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                k.commitRename(card, e.currentTarget.value);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                k.cancelRename(card, true);
              }
            }}
            onBlur={() => k.cancelRename(card, false)}
          />
        ) : (
          <>
            <button type="button"
              className="ui-kanban__card-button"
              data-card-button={card.id}
              tabIndex={k.tabStopId === card.id ? 0 : -1}
              aria-label={ariaLabel}
              aria-describedby={describedBy}
              onKeyDown={(e) => k.onCardKeyDown(e, card)}
              onKeyUp={k.onCardKeyUp}
              onPointerDown={(e) => k.onCardPointerDown(e, card)}
              onClick={() => k.onCardClick(card)}
              onFocus={() => k.onCardFocus(card)}
              onBlur={() => k.onCardBlur(card)}
              onContextMenu={(e) => {
                e.preventDefault();
                k.onCardContextMenu(e.nativeEvent, card);
              }}
              onDragStart={(e) => e.preventDefault()}
            >
              {body}
            </button>
            {summary && (
              <span id={metaId} className="visually-hidden">
                {summary}
              </span>
            )}
            {!k.readOnly && (
              <Button
                className="ui-kanban__card-more"
                size="sm"
                variant="secondary"
                appearance="text"
                icon="more-horizontal"
                tabIndex={-1}
                aria-label={t('kanbanCardActions', { title: card.title })}
                onClick={(e) => k.openCardMenu(e.currentTarget, card)}
              />
            )}
          </>
        )}
      </div>
    </li>
  );
}

/** The slot a dragged card will land in. */
export function KanbanPlaceholder({ height, style }: { height?: number; style?: CSSProperties }) {
  return <li className="ui-kanban__placeholder" aria-hidden="true" style={{ ...(height ? { blockSize: height } : undefined), ...style }} />;
}

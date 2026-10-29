import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useFlip } from '../../motion/useFlip';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import { Icon } from '../Icon/Icon';
import { InputText } from '../InputText/InputText';
import { QuantityTick } from '../QuantityTick/QuantityTick';
import { useKanban, type Row } from './context';
import { KanbanCard, KanbanPlaceholder } from './KanbanCard';
import { wipState, type Cell } from './model';
import type { KanbanColumnDef } from './types';

const ITEM_HEIGHT = { comfortable: 96, compact: 76 } as const;
const ITEM_GAP = 8;
const OVERSCAN = 4;
const FALLBACK_VIEWPORT = 480;

function Qty({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cx('ui-qty ui-kanban__count', className)}>
      <QuantityTick value={value} announce={false} />
      <span className="ui-qty__mark" aria-hidden="true">
        ×
      </span>
    </span>
  );
}

export { Qty as KanbanQty };

function QuickAdd({ column }: { column: KanbanColumnDef }) {
  const k = useKanban();
  const { t } = k;
  const [error, setError] = useState(false);
  const errorId = useId();
  const hintId = useId();
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <div className="ui-kanban__add">
      <InputText
        size="sm"
        ref={input}
        aria-label={t('kanbanAddLabel', { column: column.title })}
        aria-describedby={error ? errorId : hintId}
        placeholder={t('kanbanAddPlaceholder')}
        invalid={error}
        onChange={() => setError(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const input = e.currentTarget;
            const title = input.value.trim();
            if (!title) {
              setError(true);
              return;
            }
            k.submitAdd(column.id, title);
            input.value = '';
            setError(false);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            k.closeAdd(column.id);
          }
        }}
      />
      {error ? (
        <span id={errorId} className="ui-kanban__add-hint ui-kanban__add-hint--error" role="alert">
          {t('kanbanAddEmpty')}
        </span>
      ) : (
        <span id={hintId} className="ui-kanban__add-hint">
          {t('kanbanAddHint')}
        </span>
      )}
    </div>
  );
}

interface CellListProps {
  cell: Cell;
  rows: Row[];
  virtual: boolean;
  columnTitle: string;
  total: number;
}

/** The ordered list of one cell. Windowed (absolute rows, fixed height) when `virtual`. */
function CellList({ cell, rows, virtual, columnTitle, total }: CellListProps) {
  const k = useKanban();
  const listRef = useRef<HTMLUListElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(FALLBACK_VIEWPORT);
  const height = ITEM_HEIGHT[k.density];

  const signature = rows.map((r) => (r.kind === 'card' ? r.card.id : '·')).join('|');
  useFlip(listRef, [signature, k.drag?.cardId], { selector: ':scope > li:not(.is-dragging)', enabled: !virtual });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (virtual && el && el.clientHeight > 0) setViewport(el.clientHeight);
  }, [virtual]);

  // Slots: every row except the dragged card (it floats above the sheet and holds no slot).
  const slots = rows.filter((r) => !(r.kind === 'card' && r.card.id === k.drag?.cardId));
  const slotOf = (row: Row) => slots.indexOf(row);

  // Keep the focused / picked-up card inside the window by scrolling it into view.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!virtual || !el || !k.keepId) return;
    const slot = slots.findIndex((r) => r.kind === 'card' && r.card.id === k.keepId);
    if (slot < 0) return;
    const top = slot * height;
    const view = el.clientHeight || viewport;
    let next = el.scrollTop;
    if (top < next) next = top;
    else if (top + height > next + view) next = top + height - view;
    if (next !== el.scrollTop) {
      el.scrollTop = next;
      setScrollTop(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtual, k.keepId, signature]);

  const renderRow = (row: Row) => {
    if (row.kind === 'placeholder') {
      const h = k.drag?.height;
      if (!virtual) return <KanbanPlaceholder key="placeholder" height={h} />;
      return <KanbanPlaceholder key="placeholder" style={{ position: 'absolute', insetInline: 0, top: slotOf(row) * height, blockSize: height - ITEM_GAP }} />;
    }
    const { card, index } = row;
    const style: CSSProperties | undefined = virtual && card.id !== k.drag?.cardId ? { position: 'absolute', insetInline: 0, top: slotOf(row) * height, blockSize: height - ITEM_GAP } : undefined;
    return (
      <KanbanCard
        key={card.id}
        card={card}
        index={index}
        total={total}
        columnTitle={columnTitle}
        columnId={cell.columnId}
        laneId={cell.laneId}
        style={style}
        setSize={virtual ? total : undefined}
        grabbed={k.grabId === card.id}
        dragging={k.drag?.cardId === card.id}
      />
    );
  };

  if (!virtual) {
    return (
      <ul ref={listRef} className="ui-kanban__list" aria-label={columnTitle}>
        {rows.map(renderRow)}
      </ul>
    );
  }

  const first = Math.max(0, Math.floor(scrollTop / height) - OVERSCAN);
  const last = Math.ceil((scrollTop + viewport) / height) + OVERSCAN;
  const visibleRows = rows.filter((row) => {
    if (row.kind === 'card' && (row.card.id === k.keepId || row.card.id === k.drag?.cardId)) return true;
    const slot = slotOf(row);
    return slot >= first && slot <= last;
  });

  return (
    <div
      ref={scrollRef}
      className="ui-kanban__scroll"
      data-virtual="true"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <ul ref={listRef} className="ui-kanban__list ui-kanban__list--virtual" aria-label={columnTitle} style={{ blockSize: slots.length * height }}>
        {visibleRows.map(renderRow)}
      </ul>
    </div>
  );
}

export interface KanbanColumnProps {
  column: KanbanColumnDef;
  /** 0-based stage number. */
  stage: number;
  cell: Cell;
  /** Part of the Assemble movement (first lane only). */
  assemble: boolean;
}

export function KanbanColumn({ column, stage, cell, assemble }: KanbanColumnProps) {
  const k = useKanban();
  const { t, tp } = k;
  const titleId = useId();
  const summaryId = useId();
  const Heading = `h${Math.min(6, k.headingLevel + (k.lanes?.length ? 1 : 0))}` as 'h3';
  const { shown } = k.cellInfo(cell);
  const collapsed = k.isCollapsed(column);
  const total = k.columnCount(column.id);
  const wip = wipState(column, total);
  const mode = column.wipMode ?? 'warn';
  const rows = k.rowsFor(cell);
  const over = k.drag?.over;
  const dropHere = over && over.cell.columnId === cell.columnId && over.cell.laneId === cell.laneId ? (over.blocked ? 'blocked' : 'valid') : undefined;
  const count = shown.length;
  const virtual = k.virtualize === true || (typeof k.virtualize === 'number' ? count > k.virtualize : k.virtualize === undefined && count > 100);
  const filtering = k.filter.trim() !== '';
  const adding = k.addColumnId === column.id && k.canAdd;

  const numeral = (
    <span className="ui-kanban__numeral ui-tabular" aria-hidden="true">
      {stage + 1}
    </span>
  );

  if (collapsed) {
    return (
      <section className="ui-kanban__column ui-kanban__column--collapsed" aria-labelledby={titleId} data-column-id={column.id} data-lane-id={cell.laneId} data-collapsed="true" data-assemble={assemble || undefined}>
        <button type="button" className="ui-kanban__strip" aria-expanded="false" aria-label={t('kanbanExpand', { column: column.title })} onClick={() => k.toggleColumn(column)}>
          {numeral}
          <span id={titleId} className="ui-kanban__strip-title">
            {column.title}
          </span>
          <Qty value={count} />
          <Icon name="chevron-right" size="sm" directional className="ui-kanban__strip-icon" />
        </button>
      </section>
    );
  }

  const wipText =
    column.wipLimit !== undefined ? (
      <span className="ui-kanban__wip" data-state={wip} data-mode={mode}>
        <span className="ui-tabular">{t('kanbanWip', { count: total, limit: column.wipLimit })}</span>
        {wip === 'over' && (
          <span className="ui-kanban__wip-flag">
            <Icon name="alert-triangle" size="sm" />
            {t('kanbanOverLimit')}
          </span>
        )}
        {wip === 'full' && mode === 'block' && <span className="ui-kanban__wip-flag">{t('kanbanAtLimitShort')}</span>}
      </span>
    ) : null;

  return (
    <section
      className={cx('ui-kanban__column', wip === 'over' && 'is-over-limit')}
      aria-labelledby={titleId}
      aria-describedby={summaryId}
      data-column-id={column.id}
      data-lane-id={cell.laneId}
      data-wip={wip}
      data-drop={dropHere}
      data-color={column.color}
      data-assemble={assemble || undefined}
    >
      <header className="ui-kanban__column-header">
        {numeral}
        <Heading id={titleId} className="ui-kanban__column-title">
          {column.title}
        </Heading>
        <Qty value={count} />
        {wipText}
        <span id={summaryId} className="visually-hidden">
          {tp('kanbanCards', total)}
          {column.wipLimit !== undefined ? `. ${t('kanbanColumnSummary', { count: total, limit: column.wipLimit })}${wip === 'over' ? `. ${t('kanbanOverLimit')}` : ''}` : ''}
        </span>
        <span className="ui-kanban__column-actions">
          {k.canAdd && !k.readOnly && (
            <Button
              size="sm"
              variant="secondary"
              appearance="text"
              icon="plus"
              data-add-button={column.id}
              aria-label={t('kanbanAddCard', { column: column.title })}
              aria-expanded={adding}
              onClick={() => (adding ? k.closeAdd(column.id) : k.openAdd(column.id))}
            />
          )}
          <Button size="sm" variant="secondary" appearance="text" icon="chevron-down" aria-label={t('kanbanCollapse', { column: column.title })} aria-expanded="true" onClick={() => k.toggleColumn(column)} />
        </span>
      </header>
      <div className="ui-kanban__column-body" data-cell="true" data-column-id={cell.columnId} data-lane-id={cell.laneId}>
        {adding && <QuickAdd column={column} />}
        {dropHere === 'blocked' && (
          <p className="ui-kanban__drop-note" role="presentation">
            {t('kanbanAtLimit', { column: column.title, limit: column.wipLimit ?? 0 })}
          </p>
        )}
        <CellList cell={cell} rows={rows} virtual={virtual} columnTitle={k.placeName(cell)} total={count} />
        {rows.length === 0 && (
          <EmptyState
            size="sm"
            titleAs={`h${Math.min(4, k.headingLevel + (k.lanes?.length ? 1 : 0) + 1)}` as 'h3'}
            variant={filtering ? 'no-results' : 'empty'}
            title={filtering ? t('kanbanNoMatch') : t('kanbanEmptyColumn')}
            action={
              !filtering && k.canAdd && !k.readOnly ? (
                <Button size="sm" variant="secondary" appearance="outline" icon="plus" onClick={() => k.openAdd(column.id)}>
                  {t('kanbanAddCard', { column: column.title })}
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </section>
  );
}

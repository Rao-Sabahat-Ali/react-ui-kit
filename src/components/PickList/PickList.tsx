import { useId, useState, type ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { ItemListbox } from '../OrderList/ItemListbox';
import { makeKeyOf, makeLabelOf, moveSelected, type ListKey, type MoveAction } from '../OrderList/reorder';

export interface PickListChange<T> {
  source: T[];
  target: T[];
}

export interface PickListProps<T> {
  source: T[];
  target: T[];
  onChange: (value: PickListChange<T>) => void;
  itemTemplate?: (item: T) => ReactNode;
  dataKey?: string;
  sourceHeader?: ReactNode;
  targetHeader?: ReactNode;
  /** Adds a filter input above each list. */
  filter?: boolean;
  /** Adds move up/down/top/bottom buttons for the target list. */
  showReorder?: boolean;
  itemLabel?: (item: T) => string;
  listHeight?: string;
  disabled?: boolean;
  className?: string;
}

type Side = 'source' | 'target';

export function PickList<T>({ source, target, onChange, itemTemplate, dataKey = 'id', sourceHeader, targetHeader, filter = false, showReorder = false, itemLabel, listHeight = '16rem', disabled = false, className }: PickListProps<T>) {
  const { t } = useLocale();
  const ids = { source: useId(), target: useId() };
  const [selected, setSelected] = useState<Record<Side, Set<ListKey>>>({ source: new Set(), target: new Set() });
  const [query, setQuery] = useState<Record<Side, string>>({ source: '', target: '' });
  const [announcement, setAnnouncement] = useState('');
  const keyOf = makeKeyOf<T>(dataKey);
  const labelOf = makeLabelOf<T>(itemLabel);
  const lists = { source, target };

  const visible = (side: Side) => {
    const q = query[side].trim().toLowerCase();
    return q ? lists[side].filter((item) => labelOf(item).toLowerCase().includes(q)) : lists[side];
  };
  const selectedItems = (side: Side) => visible(side).filter((item) => selected[side].has(keyOf(item, lists[side].indexOf(item))));

  const announce = (items: T[], dest: T[]) => {
    const first = items[0];
    if (first === undefined) return;
    const position = dest.indexOf(first) + 1;
    setAnnouncement((prev) => t('itemMoved', { item: labelOf(first), position, total: dest.length }) + (prev.endsWith(' ') ? '' : ' '));
  };

  const transfer = (from: Side, items: T[]) => {
    if (items.length === 0 || disabled) return;
    const to: Side = from === 'source' ? 'target' : 'source';
    const moving = new Set(items);
    const rest = lists[from].filter((item) => !moving.has(item));
    const dest = [...lists[to], ...items];
    onChange(from === 'source' ? { source: rest, target: dest } : { source: dest, target: rest });
    const movedKeys = new Set(items.map((item) => keyOf(item, lists[from].indexOf(item))));
    setSelected((prev) => ({ ...prev, [from]: new Set([...prev[from]].filter((k) => !movedKeys.has(k))) }));
    announce(items, dest);
  };

  const reorder = (action: MoveAction) => {
    const indexes = new Set(target.flatMap((item, i) => (selected.target.has(keyOf(item, i)) ? [i] : [])));
    if (indexes.size === 0 || disabled) return;
    const next = moveSelected(target, indexes, action);
    if (next.every((item, i) => item === target[i])) return;
    onChange({ source, target: next });
    const firstIndex = Math.min(...indexes);
    const lastIndex = Math.max(...indexes);
    announce([target[action === 'down' || action === 'bottom' ? lastIndex : firstIndex]!], next);
  };

  const transferButtons: { label: 'moveToTarget' | 'moveAllToTarget' | 'moveToSource' | 'moveAllToSource'; icon: string; run: () => void; off: boolean }[] = [
    { label: 'moveToTarget', icon: 'arrow-right', run: () => transfer('source', selectedItems('source')), off: selectedItems('source').length === 0 },
    { label: 'moveAllToTarget', icon: 'chevrons-right', run: () => transfer('source', visible('source')), off: visible('source').length === 0 },
    { label: 'moveToSource', icon: 'arrow-left', run: () => transfer('target', selectedItems('target')), off: selectedItems('target').length === 0 },
    { label: 'moveAllToSource', icon: 'chevrons-left', run: () => transfer('target', visible('target')), off: visible('target').length === 0 },
  ];

  const reorderButtons: { action: MoveAction; label: 'moveTop' | 'moveUp' | 'moveDown' | 'moveBottom'; icon: string }[] = [
    { action: 'top', label: 'moveTop', icon: 'arrow-up' },
    { action: 'up', label: 'moveUp', icon: 'chevron-up' },
    { action: 'down', label: 'moveDown', icon: 'chevron-down' },
    { action: 'bottom', label: 'moveBottom', icon: 'arrow-down' },
  ];

  const renderList = (side: Side, header: ReactNode) => (
    <div className="ui-pick-list__panel">
      {header && (
        <div id={`${ids[side]}-header`} className="ui-pick-list__header">
          {header}
        </div>
      )}
      {filter && (
        <input
          type="search"
          className="form-control form-control-sm ui-pick-list__filter"
          aria-label={t('filter')}
          aria-describedby={header ? `${ids[side]}-header` : undefined}
          placeholder={t('filter')}
          value={query[side]}
          disabled={disabled}
          onChange={(e) => setQuery((prev) => ({ ...prev, [side]: e.target.value }))}
        />
      )}
      <ItemListbox
        items={visible(side)}
        keyOf={(item) => keyOf(item, lists[side].indexOf(item))}
        labelOf={labelOf}
        selected={selected[side]}
        onSelectedChange={(next) => setSelected((prev) => ({ ...prev, [side]: next }))}
        itemTemplate={itemTemplate}
        aria-labelledby={header ? `${ids[side]}-header` : undefined}
        aria-label={header ? undefined : side === 'source' ? t('moveToSource') : t('moveToTarget')}
        height={listHeight}
        disabled={disabled}
        onActivate={(item) => transfer(side, [item])}
        onMoveSelected={side === 'target' ? (delta) => reorder(delta === -1 ? 'up' : 'down') : undefined}
      />
    </div>
  );

  return (
    <div className={cx('ui-pick-list', className)}>
      {renderList('source', sourceHeader)}
      <div className="ui-pick-list__controls btn-group-vertical" role="group">
        {transferButtons.map(({ label, icon, run, off }) => (
          <Button key={label} type="button" variant="secondary" appearance="outline" size="sm" icon={icon} aria-label={t(label)} disabled={disabled || off} onClick={run} />
        ))}
      </div>
      {renderList('target', targetHeader)}
      {showReorder && (
        <div className="ui-pick-list__controls btn-group-vertical" role="group">
          {reorderButtons.map(({ action, label, icon }) => (
            <Button key={action} type="button" variant="secondary" appearance="outline" size="sm" icon={icon} aria-label={t(label)} disabled={disabled || selected.target.size === 0} onClick={() => reorder(action)} />
          ))}
        </div>
      )}
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

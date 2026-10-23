import { useId, useState, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { ItemListbox } from './ItemListbox';
import { makeKeyOf, makeLabelOf, moveItem, moveSelected, type ListKey, type MoveAction } from './reorder';

export interface OrderListProps<T> {
  value?: T[];
  defaultValue?: T[];
  onChange?: (value: T[]) => void;
  itemTemplate?: (item: T) => ReactNode;
  dataKey?: string;
  dragdrop?: boolean;
  header?: ReactNode;
  listHeight?: string;
  /** Plain-text label of an item, used in announcements and typeahead. */
  itemLabel?: (item: T) => string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

const ACTIONS: { action: MoveAction; label: 'moveTop' | 'moveUp' | 'moveDown' | 'moveBottom'; icon: string }[] = [
  { action: 'top', label: 'moveTop', icon: 'arrow-up' },
  { action: 'up', label: 'moveUp', icon: 'chevron-up' },
  { action: 'down', label: 'moveDown', icon: 'chevron-down' },
  { action: 'bottom', label: 'moveBottom', icon: 'arrow-down' },
];

export function OrderList<T>({ value: valueProp, defaultValue = [], onChange, itemTemplate, dataKey = 'id', dragdrop = false, header, listHeight = '16rem', itemLabel, disabled = false, className, ...rest }: OrderListProps<T>) {
  const { t } = useLocale();
  const headerId = useId();
  const [items, setItems] = useControllableState<T[]>(valueProp, defaultValue, onChange);
  const [selected, setSelected] = useState<Set<ListKey>>(() => new Set());
  const [announcement, setAnnouncement] = useState('');
  const keyOf = makeKeyOf<T>(dataKey);
  const labelOf = makeLabelOf<T>(itemLabel);

  const selectedIndexes = new Set(items.flatMap((item, i) => (selected.has(keyOf(item, i)) ? [i] : [])));
  const hasSelection = selectedIndexes.size > 0;

  const announce = (next: T[], key: ListKey) => {
    const index = next.findIndex((item, i) => keyOf(item, i) === key);
    const item = next[index];
    if (item === undefined) return;
    // Alternate a trailing space so identical consecutive messages are re-announced.
    setAnnouncement((prev) => t('itemMoved', { item: labelOf(item), position: index + 1, total: next.length }) + (prev.endsWith(' ') ? '' : ' '));
  };

  const move = (action: MoveAction) => {
    if (!hasSelection || disabled) return;
    const next = moveSelected(items, selectedIndexes, action);
    if (next.every((item, i) => item === items[i])) return;
    setItems(next);
    const firstKey = [...selectedIndexes].sort((a, b) => a - b).map((i) => keyOf(items[i]!, i))[action === 'down' || action === 'bottom' ? selectedIndexes.size - 1 : 0]!;
    announce(next, firstKey);
  };

  const dropItem = (from: number, to: number) => {
    const next = moveItem(items, from, to);
    if (next === items) return;
    const key = keyOf(items[from]!, from);
    setItems(next);
    setSelected(new Set([key]));
    announce(next, key);
  };

  return (
    <div className={cx('ui-order-list', className)}>
      <div className="ui-order-list__controls btn-group-vertical" role="group" aria-label={rest['aria-label'] ? `${rest['aria-label']}` : undefined}>
        {ACTIONS.map(({ action, label, icon }) => (
          <Button key={action} type="button" variant="secondary" appearance="outline" size="sm" icon={icon} aria-label={t(label)} disabled={disabled || !hasSelection} onClick={() => move(action)} />
        ))}
      </div>
      <div className="ui-order-list__main">
        {header && (
          <div id={headerId} className="ui-order-list__header">
            {header}
          </div>
        )}
        <ItemListbox
          items={items}
          keyOf={keyOf}
          labelOf={labelOf}
          selected={selected}
          onSelectedChange={setSelected}
          itemTemplate={itemTemplate}
          aria-label={header ? undefined : rest['aria-label']}
          aria-labelledby={header ? headerId : undefined}
          height={listHeight}
          disabled={disabled}
          onMoveSelected={(delta) => move(delta === -1 ? 'up' : 'down')}
          dragdrop={dragdrop}
          onDrop={dropItem}
        />
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

import { Button } from '../Button/Button';
import { Menu } from '../Menu/Menu';
import type { MenuItem } from '../Menu/types';

export interface ToggleColumn {
  id: string;
  label: string;
  hideable: boolean;
}

interface ColumnToggleProps {
  columns: ToggleColumn[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
  label: string;
}

/** "Columns" menu button with one `menuitemcheckbox` per column; the last visible column cannot be hidden. */
export function ColumnToggle({ columns, hidden, onChange, label }: ColumnToggleProps) {
  const hiddenSet = new Set(hidden);
  const visibleCount = columns.filter((c) => !hiddenSet.has(c.id)).length;
  const items: MenuItem[] = columns.map((c) => {
    const visible = !hiddenSet.has(c.id);
    return {
      key: c.id,
      label: c.label,
      checked: visible,
      disabled: !c.hideable || (visible && visibleCount <= 1),
      command: () => onChange(visible ? [...hidden, c.id] : hidden.filter((id) => id !== c.id)),
    };
  });
  return (
    <Menu
      popup
      items={items}
      placement="bottom-end"
      className="ui-data-table__column-menu"
      trigger={
        <Button size="sm" variant="secondary" appearance="outline" icon="eye">
          {label}
        </Button>
      }
    />
  );
}

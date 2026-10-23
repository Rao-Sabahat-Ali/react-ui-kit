import { cx } from '../../utils/cx';
import { MenuBase, type MenuProps } from '../Menu/Menu';

export type TieredMenuProps = MenuProps;

/** APG Menu with flyout submenus (`items[].items`). Inline by default; `popup` opens from `trigger`. */
export function TieredMenu({ className, ...props }: TieredMenuProps) {
  return <MenuBase {...props} className={cx('ui-tiered-menu', className)} tiered />;
}

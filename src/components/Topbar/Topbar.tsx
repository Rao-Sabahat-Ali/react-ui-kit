import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { isEditable } from '../../utils/dom';
import { useAppShell } from '../AppShell/AppShell';
import { Button } from '../Button/Button';

export interface TopbarProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  brand: ReactNode;
  onMenuToggle?: () => void;
  menuLabel?: string;
  search?: ReactNode;
  actions?: ReactNode;
  sticky?: boolean;
  /** Key that focuses the search slot. `null` disables. */
  searchShortcut?: string | null;
}

export function Topbar({ brand, onMenuToggle, menuLabel, search, actions, sticky = true, searchShortcut = '/', className, ...rest }: TopbarProps) {
  const { t } = useLocale();
  const shell = useAppShell();
  const searchRef = useRef<HTMLDivElement>(null);
  const toggle = onMenuToggle ?? (shell?.hasSidebar ? shell.toggleNav : undefined);
  const expanded = shell ? (shell.isMobile ? shell.mobileNavOpen : !shell.collapsed) : undefined;

  useEffect(() => {
    if (!search || !searchShortcut) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== searchShortcut || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
      const input = searchRef.current?.querySelector<HTMLElement>('input, [role="combobox"], textarea');
      if (!input) return;
      event.preventDefault();
      input.focus();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [search, searchShortcut]);

  return (
    <header className={cx('ui-topbar', sticky && 'ui-topbar--sticky', className)} {...rest}>
      {toggle && (
        <Button
          appearance="text"
          variant="secondary"
          icon="menu"
          aria-label={menuLabel ?? t('menu')}
          aria-expanded={expanded}
          aria-controls={shell?.navId}
          onClick={toggle}
          className="ui-topbar__menu"
        />
      )}
      <div className="ui-topbar__brand">{brand}</div>
      {search && (
        <div ref={searchRef} className="ui-topbar__search">
          {search}
        </div>
      )}
      {actions && <div className="ui-topbar__actions">{actions}</div>}
    </header>
  );
}

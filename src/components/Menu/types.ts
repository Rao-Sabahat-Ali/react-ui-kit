import type { MouseEvent, ReactNode, SyntheticEvent } from 'react';
import type { IconName } from '../Icon/Icon';

/** Shared item model for Menu, TieredMenu, ContextMenu, SplitButton, Menubar, PanelMenu… */
export interface MenuItem {
  key?: string;
  label: string;
  icon?: IconName;
  command?: (e: { item: MenuItem; event: SyntheticEvent }) => void;
  /** Renders `<a>`; passed through `safeUrl()` (unsafe URLs are dropped). */
  href?: string;
  /** `_blank` adds `rel="noopener noreferrer"`. */
  target?: '_blank';
  disabled?: boolean;
  danger?: boolean;
  /** Display only, e.g. "⌘S". */
  shortcut?: string;
  badge?: ReactNode;
  /** Submenu (TieredMenu/Menubar/ContextMenu) or group (Menu). */
  items?: MenuItem[];
  separator?: boolean;
  /** Renders `menuitemcheckbox` (or `menuitemradio` with `group`). */
  checked?: boolean;
  /** Radio group name → `menuitemradio`, exclusive within the group. */
  group?: string;
  visible?: boolean;
}

export type MenuCloseReason = 'activate' | 'escape' | 'tab' | 'outside';

export type NavigateHandler = (href: string, event: MouseEvent<HTMLAnchorElement>) => void;

export interface FocusRequest {
  position: 'first' | 'last';
  /** Increment to re-request focus. */
  seq: number;
}

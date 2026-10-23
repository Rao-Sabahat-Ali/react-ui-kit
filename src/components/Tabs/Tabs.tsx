import { createContext, useContext, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';

interface TabsContextValue {
  value: string | undefined;
  select: (value: string) => void;
  baseId: string;
  variant: 'tabs' | 'pills' | 'underline';
  orientation: 'horizontal' | 'vertical';
  activation: 'auto' | 'manual';
  lazy: boolean;
  visited: Set<string>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Tabs>.`);
  return ctx;
}

const slug = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');
const tabId = (base: string, value: string) => `${base}-tab-${slug(value)}`;
const panelId = (base: string, value: string) => `${base}-panel-${slug(value)}`;

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  icon?: IconName;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: 'tabs' | 'pills' | 'underline';
  orientation?: 'horizontal' | 'vertical';
  activation?: 'auto' | 'manual';
  fill?: 'none' | 'fill' | 'justified';
  lazy?: boolean;
  items?: TabItem[];
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
}

export function Tabs({ value: valueProp, defaultValue, onChange, variant = 'tabs', orientation = 'horizontal', activation = 'auto', fill = 'none', lazy = true, items, className, children, ...rest }: TabsProps) {
  const baseId = useId();
  const firstEnabled = items?.find((i) => !i.disabled)?.value;
  const [value, setValue] = useControllableState<string | undefined>(valueProp, defaultValue ?? firstEnabled, onChange as ((v: string | undefined) => void) | undefined);
  const [visited] = useState(() => new Set<string>());
  if (value !== undefined) visited.add(value);

  const ctx: TabsContextValue = { value, select: (v) => setValue(v), baseId, variant, orientation, activation, lazy, visited };

  const body = items ? (
    <>
      <TabList fill={fill} aria-label={rest['aria-label']}>
        {items.map((item) => (
          <Tab key={item.value} value={item.value} disabled={item.disabled} icon={item.icon}>
            {item.label}
          </Tab>
        ))}
      </TabList>
      {items.map((item) => (
        <TabPanel key={item.value} value={item.value}>
          {item.content}
        </TabPanel>
      ))}
    </>
  ) : (
    children
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={cx('ui-tabs', orientation === 'vertical' && 'ui-tabs--vertical d-flex gap-3', className)}>{body}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  fill?: 'none' | 'fill' | 'justified';
  className?: string;
  'aria-label'?: string;
}

function TabList({ children, fill = 'none', className, ...rest }: TabListProps) {
  const ctx = useTabs('Tabs.List');
  const listRef = useRef<HTMLDivElement>(null);
  const vertical = ctx.orientation === 'vertical';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? []);
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;
    const rtl = getComputedStyle(listRef.current!).direction === 'rtl';
    const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    let target: number | null = null;
    if (event.key === nextKey) target = (current + 1) % tabs.length;
    else if (event.key === prevKey) target = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = tabs.length - 1;
    if (target === null) return;
    event.preventDefault();
    const tab = tabs[target]!;
    tab.focus();
    if (ctx.activation === 'auto') ctx.select(tab.dataset.value!);
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={ctx.orientation}
      className={cx(
        'nav ui-tabs__list',
        `nav-${ctx.variant}`,
        vertical && 'flex-column',
        fill === 'fill' && 'nav-fill',
        fill === 'justified' && 'nav-justified',
        className,
      )}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  icon?: IconName;
  badge?: ReactNode;
  className?: string;
}

function Tab({ value, children, disabled = false, icon, badge, className }: TabProps) {
  const ctx = useTabs('Tabs.Tab');
  const selected = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(ctx.baseId, value)}
      aria-selected={selected}
      aria-controls={panelId(ctx.baseId, value)}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      data-value={value}
      className={cx('nav-link ui-tabs__tab', selected && 'active', className)}
      onClick={() => ctx.select(value)}
      onKeyDown={(event) => {
        if (ctx.activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          ctx.select(value);
        }
      }}
    >
      {icon && <Icon name={icon} className="ui-tabs__icon" />}
      {children}
      {badge !== undefined && <span className="badge rounded-pill text-bg-secondary ui-tabs__badge">{badge}</span>}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function TabPanel({ value, children, className }: TabPanelProps) {
  const ctx = useTabs('Tabs.Panel');
  const selected = ctx.value === value;
  if (ctx.lazy && !ctx.visited.has(value)) return null;
  return (
    <div
      role="tabpanel"
      id={panelId(ctx.baseId, value)}
      aria-labelledby={tabId(ctx.baseId, value)}
      tabIndex={0}
      hidden={!selected}
      className={cx('ui-tabs__panel', className)}
    >
      {children}
    </div>
  );
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

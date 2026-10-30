import { useMemo, useState } from 'react';
import {
  AppShell,
  Button,
  Chart,
  DataTable,
  EmptyState,
  Icon,
  InputText,
  Menu,
  PageHeader,
  Section,
  Select,
  SelectButton,
  SidebarNav,
  Skeleton,
  StatCard,
  StatGroup,
  Tag,
  ThemeToggle,
  Timeline,
  Topbar,
  useToast,
  type Column,
  type Intent,
} from '@sabahat/react-ui-kit';
import {
  ACTIVITY,
  CHANNELS,
  ORDERS,
  PERIOD_OPTIONS,
  formatDate,
  formatDateTime,
  formatDay,
  kpisFor,
  windowOf,
  type Order,
  type OrderStatus,
  type Period,
} from './AnalyticsDashboard.data';
import { SECTION_GAP, StateBlock, type WidgetState } from './shared';

/*
 * Blueprint: Analytics dashboard (profile `dashboard`, patterns `dashboard-grid` and `overview`).
 * Rules it demonstrates: one ink button, StatGroup instead of KPI tiles, Section instead of titled cards,
 * every chart with a text summary and table fallback, independent loading/empty/error per widget,
 * identical row actions in one overflow menu, status as Tag with text.
 */

export type DashboardWidget = 'kpis' | 'revenue' | 'channels' | 'orders' | 'activity';
/** Forces a widget (or all) into a state; used by the docs to demo loading, empty and error. */
export interface PreviewState {
  widget: DashboardWidget | 'all';
  state: WidgetState;
}
export const DASHBOARD_WIDGETS: { value: DashboardWidget; label: string }[] = [
  { value: 'kpis', label: 'Key metrics' },
  { value: 'revenue', label: 'Revenue chart' },
  { value: 'channels', label: 'Orders by channel' },
  { value: 'orders', label: 'Recent orders' },
  { value: 'activity', label: 'Activity' },
];

export interface AnalyticsDashboardProps {
  /** Product name shown in the top bar. */
  appName?: string;
  previewState?: PreviewState;
  /** Render inside a framed container (docs): the shell and top bar do not stick to the viewport. */
  embedded?: boolean;
  /** Called for navigation items other than the overview; defaults to an info toast. */
  onNavigate?: (href: string) => void;
}

const NAV = [
  { label: 'Overview', href: '/', icon: 'home', section: 'Sales' },
  { label: 'Orders', href: '/orders', icon: 'filter', section: 'Sales' },
  { label: 'Customers', href: '/customers', icon: 'user', section: 'Sales' },
  { label: 'Reports', href: '/reports', icon: 'calendar', section: 'Insights' },
  { label: 'Settings', href: '/settings', icon: 'settings', section: 'Account' },
] as const;

const STATUS_TONE: Record<OrderStatus, Intent> = { Paid: 'success', Pending: 'warning', Shipped: 'info', Refunded: 'secondary', Failed: 'danger' };
const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
const count = new Intl.NumberFormat('en-GB');
const percent = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 });

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export function AnalyticsDashboard({ appName = 'Nordic Tools', previewState, embedded = false, onNavigate }: AnalyticsDashboardProps) {
  const toast = useToast();
  const [period, setPeriod] = useState<Period>(30);
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [query, setQuery] = useState('');
  const [retried, setRetried] = useState<Record<string, string>>({});

  const previewKey = previewState ? `${previewState.widget}:${previewState.state}` : 'none';
  const stateOf = (widget: DashboardWidget): WidgetState => {
    const base = previewState && (previewState.widget === 'all' || previewState.widget === widget) ? previewState.state : 'ready';
    return base === 'error' && retried[widget] === previewKey ? 'ready' : base;
  };
  const retry = (widget: DashboardWidget) => () => setRetried((r) => ({ ...r, [widget]: previewKey }));

  const kpis = useMemo(() => kpisFor(period), [period]);
  const { current, previous } = useMemo(() => windowOf(period), [period]);
  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)!.label.toLowerCase();

  const series = current.map((d) => d[metric]);
  const previousSeries = previous.map((d) => d[metric]);
  const total = sum(series);
  const change = (total - sum(previousSeries)) / sum(previousSeries);
  const best = current.reduce((a, b) => (b[metric] > a[metric] ? b : a));
  const metricLabel = metric === 'revenue' ? 'Revenue' : 'Orders';
  const fmt = (n: number) => (metric === 'revenue' ? money.format(n) : count.format(n));
  const revenueSummary = `${metricLabel} totalled ${metric === 'revenue' ? money.format(total) : count.format(total)} over the ${periodLabel}, ${change >= 0 ? 'up' : 'down'} ${percent.format(Math.abs(change))} on the previous period. The best day was ${formatDay(best.date)} with ${fmt(best[metric])}.`;

  const totalOrders = sum(current.map((d) => d.orders));
  const channelValues = CHANNELS.map((c) => Math.round(totalOrders * c.share));
  const channelSummary = `${CHANNELS[0].name} is the largest channel with ${count.format(channelValues[0]!)} of ${count.format(totalOrders)} orders (${percent.format(CHANNELS[0].share)}). ${CHANNELS[4].name} is the smallest.`;

  const columns: Column<Order>[] = [
    { field: 'id', header: 'Order', sortable: true, width: '7.5rem', className: 'text-nowrap' },
    { field: 'customer', header: 'Customer', sortable: true },
    {
      field: 'channel',
      header: 'Channel',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: CHANNELS.map((c) => ({ label: c.name, value: c.name })),
    },
    {
      field: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: (Object.keys(STATUS_TONE) as OrderStatus[]).map((s) => ({ label: s, value: s })),
      body: (r) => <Tag value={r.status} severity={STATUS_TONE[r.status]} />,
    },
    { field: 'date', header: 'Date', sortable: true, body: (r) => formatDate(r.date), className: 'text-nowrap' },
    { field: 'amount', header: 'Amount', sortable: true, align: 'end', body: (r) => money.format(r.amount), className: 'text-nowrap' },
    {
      id: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      align: 'end',
      width: '3.5rem',
      body: (r) => (
        <Menu
          popup
          placement="bottom-end"
          trigger={<Button size="sm" appearance="text" variant="secondary" icon="more-horizontal" aria-label={`Actions for ${r.id}`} />}
          items={[
            { label: 'View order', command: () => toast.info(`Opened ${r.id}`) },
            { label: 'Send receipt', command: () => toast.success(`Receipt for ${r.id} sent to ${r.customer}`) },
            { separator: true, label: '' },
            { label: 'Refund order', danger: true, command: () => toast.warning(`Refund for ${r.id} needs approval`) },
          ]}
        />
      ),
    },
  ];

  const orderState = stateOf('orders');
  const navigate = (href: string) => {
    if (href === '/') return;
    if (onNavigate) onNavigate(href);
    else toast.info(`${NAV.find((n) => n.href === href)?.label ?? 'This page'} is not part of the blueprint`);
  };
  const items = NAV.map((n) => ({ ...n }));

  return (
    <div data-ui-density={density}>
      <AppShell
        variant="sidebar"
        className={embedded ? 'ui-app-shell--embedded' : undefined}
        topbar={
          <Topbar
            brand={appName}
            sticky={!embedded}
            search={
              // On phones the table's own search is enough; the top bar keeps room for the brand and actions.
              <div className="d-none d-md-block">
                <InputText type="search" aria-label="Search orders" placeholder="Search orders" prefix={<Icon name="search" />} value={query} onChange={setQuery} />
              </div>
            }
            actions={
              <>
                <Menu
                  popup
                  placement="bottom-end"
                  ariaLabel="Density"
                  trigger={<Button size="sm" appearance="text" variant="secondary" icon="maximize" aria-label="Density" />}
                  items={[
                    { label: 'Comfortable', group: 'density', checked: density === 'comfortable', command: () => setDensity('comfortable') },
                    { label: 'Compact', group: 'density', checked: density === 'compact', command: () => setDensity('compact') },
                  ]}
                />
                <ThemeToggle size="sm" />
              </>
            }
          />
        }
        sidebar={<SidebarNav items={items} activeHref="/" onNavigate={navigate} />}
      >
        <PageHeader
          title="Overview"
          description="Sales performance for Nordic Tools AB, compared with the previous period."
          actions={
            <>
              <div>
                <Select<Period> aria-label="Date range" options={PERIOD_OPTIONS} value={period} onChange={(v) => v && setPeriod(v)} />
              </div>
              <Button icon="download" onClick={() => toast.success('Report queued. We will email it when it is ready.')}>
                Export report
              </Button>
            </>
          }
        />

        {stateOf('kpis') === 'ready' ? (
          <StatGroup aria-label="Key metrics" style={SECTION_GAP}>
            {kpis.map((k) => (
              <StatCard
                key={k.id}
                label={k.label}
                value={k.value}
                format={k.format}
                delta={k.delta}
                deltaLabel="vs previous period"
                invertDelta={k.invert}
                quantity={k.id === 'orders'}
              />
            ))}
          </StatGroup>
        ) : (
          <section aria-label="Key metrics" style={SECTION_GAP}>
            <StateBlock
              name="Key metrics"
              headingAs="h2"
              state={stateOf('kpis')}
              onRetry={retry('kpis')}
              empty="No metrics for this period"
              skeleton={
                <StatGroup aria-label="Key metrics loading">
                  {kpis.map((k) => (
                    <StatCard key={k.id} label={k.label} value="" loading />
                  ))}
                </StatGroup>
              }
            >
              {null}
            </StateBlock>
          </section>
        )}

        <div className="row gx-3 gx-lg-5">
          <div className="col-12 col-xl-8">
            <Section
              title="Revenue over time"
              actions={
                <SelectButton<'revenue' | 'orders'>
                  aria-label="Metric"
                  size="sm"
                  variant="secondary"
                  value={metric}
                  onChange={(v) => v && setMetric(v)}
                  options={[
                    { label: 'Revenue', value: 'revenue' },
                    { label: 'Orders', value: 'orders' },
                  ]}
                />
              }
            >
              <StateBlock
                name="Revenue chart"
                state={stateOf('revenue')}
                onRetry={retry('revenue')}
                empty="No revenue in this period"
                skeleton={<Skeleton shape="rect" height="19rem" />}
              >
                <Chart
                  type="line"
                  title={`${metricLabel} over time`}
                  hideTitle
                  summary={revenueSummary}
                  data={{
                    labels: current.map((d) => formatDay(d.date)),
                    series: [
                      { name: metricLabel, values: series },
                      { name: 'Previous period', values: previousSeries },
                    ],
                  }}
                  patterns
                  showTable
                  yAxis={{ label: metric === 'revenue' ? 'SEK' : 'Orders', format: (n) => compact.format(n) }}
                  formatValue={fmt}
                />
                <p className="small text-body-secondary mt-2 mb-0">{revenueSummary}</p>
              </StateBlock>
            </Section>
          </div>
          <div className="col-12 col-xl-4">
            <Section title="Orders by channel">
              <StateBlock
                name="Orders by channel"
                state={stateOf('channels')}
                onRetry={retry('channels')}
                empty="No orders in this period"
                skeleton={<Skeleton shape="rect" height="19rem" />}
              >
                <Chart
                  type="bar"
                  horizontal
                  title="Orders by channel"
                  hideTitle
                  summary={channelSummary}
                  legend="none"
                  showTable
                  height={260}
                  data={{ labels: CHANNELS.map((c) => c.name), series: [{ name: 'Orders', values: channelValues }] }}
                  yAxis={{ label: 'Orders' }}
                />
                <p className="small text-body-secondary mt-2 mb-0">{channelSummary}</p>
              </StateBlock>
            </Section>
          </div>
        </div>

        <Section title="Recent orders" description={orderState === 'empty' ? 'Orders across all channels appear here.' : 'Latest 64 orders across all channels. Sort, filter or search to narrow the list.'}>
          <StateBlock name="Recent orders" state={orderState === 'loading' ? 'ready' : orderState} onRetry={retry('orders')} empty="No orders in this period" skeleton={null}>
            <DataTable<Order>
              caption="Recent orders"
              captionHidden
              data={orderState === 'ready' || orderState === 'loading' ? ORDERS : []}
              columns={columns}
              dataKey="id"
              loading={orderState === 'loading'}
              loadingRows={6}
              paginator
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50]}
              defaultSort={[{ field: 'date', order: -1 }]}
              globalFilterFields={['id', 'customer', 'channel', 'status']}
              globalFilter={query}
              onGlobalFilterChange={setQuery}
              emptyMessage={
                <EmptyState
                  size="sm"
                  titleAs="h3"
                  variant={orderState === 'empty' ? 'empty' : 'no-results'}
                  title={orderState === 'empty' ? 'No orders in this period' : 'No orders match'}
                  description={orderState === 'empty' ? 'New orders appear here as soon as they are placed.' : 'Try another search or clear the filters.'}
                />
              }
            />
          </StateBlock>
        </Section>

        <Section title="Activity" description="What changed in the shop in the last five days.">
          <StateBlock name="Activity" state={stateOf('activity')} onRetry={retry('activity')} empty="No activity yet" skeleton={<Skeleton lines={5} />}>
            <div style={{ maxWidth: '44rem' }}>
              <Timeline
                aria-label="Recent activity"
                value={ACTIVITY}
                date={(e) => e.at}
                opposite={(e) => formatDateTime(e.at)}
                content={(e) => (
                  <>
                    <strong>{e.title}</strong>
                    <div className="small text-body-secondary">{e.detail}</div>
                  </>
                )}
              />
            </div>
          </StateBlock>
        </Section>
      </AppShell>
    </div>
  );
}

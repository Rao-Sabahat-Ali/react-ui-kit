/** Deterministic sample data for the analytics dashboard blueprint (no randomness, no clock). */

/** The "current date" of the sample data set. */
export const TODAY = Date.UTC(2026, 9, 24);
const DAY_MS = 86_400_000;

export type Period = 7 | 30 | 90;
export const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
];

export interface DayPoint {
  /** ISO date, UTC. */
  date: string;
  revenue: number;
  orders: number;
  returns: number;
}

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return s / 4_294_967_296;
  };
}

/** 180 days ending today: 90 current plus 90 previous for comparisons. */
export const DAYS: DayPoint[] = (() => {
  const rand = lcg(2026);
  return Array.from({ length: 180 }, (_, i) => {
    const date = new Date(TODAY - (179 - i) * DAY_MS);
    const weekday = date.getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.8 : 1;
    const trend = 1 + i * 0.0021;
    const season = 1 + 0.08 * Math.sin(i / 9);
    const orders = Math.round(34 * weekend * trend * season * (0.94 + rand() * 0.12));
    const aov = 1180 + 140 * Math.sin(i / 23) + rand() * 160;
    return {
      date: date.toISOString().slice(0, 10),
      orders,
      revenue: Math.round(orders * aov),
      returns: Math.round(orders * (0.028 + rand() * 0.02)),
    };
  });
})();

export interface Kpi {
  id: 'revenue' | 'orders' | 'aov' | 'returns';
  label: string;
  value: number;
  format: Intl.NumberFormatOptions;
  delta: number;
  /** Lower is better. */
  invert?: boolean;
}

const sum = (rows: DayPoint[], key: 'revenue' | 'orders' | 'returns') => rows.reduce((total, r) => total + r[key], 0);
const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);
const change = (now: number, before: number) => (before === 0 ? 0 : (now - before) / before);

export function windowOf(period: Period) {
  return { current: DAYS.slice(180 - period), previous: DAYS.slice(180 - 2 * period, 180 - period) };
}

export function kpisFor(period: Period): Kpi[] {
  const { current, previous } = windowOf(period);
  const rev = sum(current, 'revenue');
  const ord = sum(current, 'orders');
  const ret = sum(current, 'returns');
  const prevRev = sum(previous, 'revenue');
  const prevOrd = sum(previous, 'orders');
  const prevRet = sum(previous, 'returns');
  return [
    {
      id: 'revenue',
      label: 'Revenue',
      value: rev,
      format: { style: 'currency', currency: 'SEK', notation: 'compact', maximumFractionDigits: 1 },
      delta: change(rev, prevRev),
    },
    { id: 'orders', label: 'Orders', value: ord, format: { maximumFractionDigits: 0 }, delta: change(ord, prevOrd) },
    {
      id: 'aov',
      label: 'Average order value',
      value: Math.round(ratio(rev, ord)),
      format: { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 },
      delta: change(ratio(rev, ord), ratio(prevRev, prevOrd)),
    },
    {
      id: 'returns',
      label: 'Return rate',
      value: ratio(ret, ord),
      format: { style: 'percent', maximumFractionDigits: 1 },
      delta: change(ratio(ret, ord), ratio(prevRet, prevOrd)),
      invert: true,
    },
  ];
}

export const CHANNELS = [
  { name: 'Web shop', share: 0.41 },
  { name: 'Marketplace', share: 0.23 },
  { name: 'Retail partners', share: 0.17 },
  { name: 'Direct sales', share: 0.13 },
  { name: 'Phone', share: 0.06 },
] as const;

export type OrderStatus = 'Paid' | 'Pending' | 'Shipped' | 'Refunded' | 'Failed';
export interface Order {
  id: string;
  customer: string;
  channel: (typeof CHANNELS)[number]['name'];
  status: OrderStatus;
  /** ISO date, UTC. */
  date: string;
  amount: number;
}

const CUSTOMERS = [
  'Lindqvist Bygg AB',
  'Norrlands Maskin AB',
  'Östra Hamnen Café',
  'Berg & Söner',
  'Svea Kontorsservice',
  'Kullen Design Studio',
  'Mälardalens Frukt',
  'Skärgårdsbryggeriet',
  'Dalarna Trä AB',
  'Västerhavet Fisk',
  'Stockholm Cykelverkstad',
  'Göteborgs Kaffekultur',
  'Malmö Möbelhus',
  'Uppsala Lab Supply',
  'Jönköping Plåt AB',
  'Örebro Elteknik',
];
const STATUSES: OrderStatus[] = ['Paid', 'Paid', 'Shipped', 'Paid', 'Pending', 'Paid', 'Shipped', 'Refunded', 'Paid', 'Failed', 'Pending', 'Paid'];

/** 64 recent orders, newest first. */
export const ORDERS: Order[] = Array.from({ length: 64 }, (_, i) => ({
  id: `ORD-${2587 - i}`,
  customer: CUSTOMERS[(i * 5 + 3) % CUSTOMERS.length]!,
  channel: CHANNELS[(i * 3 + (i % 4)) % CHANNELS.length]!.name,
  status: STATUSES[(i * 7 + 2) % STATUSES.length]!,
  date: new Date(TODAY - Math.floor(i / 2.3) * DAY_MS).toISOString().slice(0, 10),
  amount: 640 + ((i * 7919) % 14_300) + (i % 5) * 35,
}));

export interface ActivityEvent {
  id: string;
  at: string;
  title: string;
  detail: string;
}

export const ACTIVITY: ActivityEvent[] = [
  { id: 'a1', at: '2026-10-24T08:42:00Z', title: 'Order ORD-2587 paid', detail: 'Lindqvist Bygg AB paid SEK 8,420 by invoice.' },
  { id: 'a2', at: '2026-10-23T15:10:00Z', title: 'Refund issued for ORD-2561', detail: 'Östra Hamnen Café, damaged item returned.' },
  { id: 'a3', at: '2026-10-23T09:05:00Z', title: 'Stock low on Birch shelf 120', detail: '14 units left, reorder point is 20.' },
  { id: 'a4', at: '2026-10-22T13:30:00Z', title: 'Marketplace payout received', detail: 'SEK 112,300 for 17 to 21 October.' },
  { id: 'a5', at: '2026-10-21T10:15:00Z', title: 'New retail partner added', detail: 'Göteborgs Kaffekultur joined Retail partners.' },
  { id: 'a6', at: '2026-10-20T07:55:00Z', title: 'Monthly report sent', detail: 'September summary delivered to 6 recipients.' },
];

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dateYearFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
export const formatDay = (iso: string) => dateFormat.format(new Date(iso));
export const formatDate = (iso: string) => dateYearFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

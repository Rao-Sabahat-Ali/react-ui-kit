/** Deterministic sample data for the admin list-detail blueprint. */

/** "Today" in the sample data set. */
export const TODAY = Date.UTC(2026, 9, 24);
const DAY_MS = 86_400_000;

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  status: InvoiceStatus;
  /** ISO date, UTC. */
  issued: string;
  /** ISO date, UTC. */
  due: string;
  terms: string;
  lines: InvoiceLine[];
  /** Sum of the lines, kept on the row so the table can sort and export it. */
  total: number;
}

export const CLIENTS = [
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
];

const CATALOG: InvoiceLine[] = [
  { description: 'Consulting, senior hour', quantity: 1, unitPrice: 1450 },
  { description: 'Workshop, half day', quantity: 1, unitPrice: 9800 },
  { description: 'Support plan, monthly', quantity: 1, unitPrice: 2900 },
  { description: 'Site licence, annual', quantity: 1, unitPrice: 18_500 },
  { description: 'Travel and accommodation', quantity: 1, unitPrice: 3150 },
  { description: 'Training material', quantity: 1, unitPrice: 1200 },
];

const STATUS_CYCLE: InvoiceStatus[] = ['Paid', 'Sent', 'Paid', 'Overdue', 'Draft', 'Paid', 'Sent', 'Paid', 'Void', 'Overdue'];
const TERMS = ['30 days net', '14 days net', '10 days net', '30 days net'];

const isoDay = (offset: number) => new Date(TODAY + offset * DAY_MS).toISOString().slice(0, 10);

/** 48 invoices, newest first. */
export const INVOICES: Invoice[] = Array.from({ length: 48 }, (_, i) => {
  const lineCount = 1 + (i % 3);
  const lines = Array.from({ length: lineCount }, (_, k) => {
    const base = CATALOG[(i + k * 2) % CATALOG.length]!;
    return { ...base, quantity: base.unitPrice < 3000 ? 2 + ((i + k) % 7) : 1 + ((i + k) % 2) };
  });
  const terms = TERMS[i % TERMS.length]!;
  const days = Number.parseInt(terms, 10);
  const issuedOffset = -(i * 3 + 1);
  const dueOffset = issuedOffset + days;
  let status = STATUS_CYCLE[(i * 3 + 1) % STATUS_CYCLE.length]!;
  // Keep status consistent with the dates: open invoices past due are overdue, overdue ones not yet due are sent.
  if (status === 'Sent' && dueOffset < 0) status = 'Overdue';
  else if (status === 'Overdue' && dueOffset >= 0) status = 'Sent';
  // Most old invoices have been settled by now.
  if ((status === 'Sent' || status === 'Overdue') && dueOffset < -20 && i % 4 !== 0) status = 'Paid';
  return {
    id: String(1048 - i),
    number: `INV-${1048 - i}`,
    client: CLIENTS[(i * 7 + 2) % CLIENTS.length]!,
    status,
    issued: isoDay(issuedOffset),
    due: isoDay(dueOffset),
    terms,
    lines,
    total: lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
  };
});

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 });

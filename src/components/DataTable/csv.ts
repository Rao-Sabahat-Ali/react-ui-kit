import { getByPath } from '../../utils/object';
import type { Column } from './types';

/** Characters that make spreadsheet apps evaluate a cell as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** RFC 4180 field encoding plus a formula-injection guard (numbers are exempt). */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let text = value instanceof Date ? (Number.isNaN(value.getTime()) ? '' : value.toISOString()) : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Plain text of a ReactNode header (strings, numbers and nested element children). */
export function nodeText(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (typeof node === 'object' && 'props' in node) return nodeText((node as { props: { children?: unknown } }).props.children);
  return '';
}

export function toCsv<T>(rows: T[], columns: Column<T>[], headerTexts?: string[]): string {
  const cols = columns.filter((c) => c.exportable !== false);
  const header = cols.map((c) => escapeCsvValue(headerTexts?.[columns.indexOf(c)] ?? nodeText(c.header)));
  const lines = rows.map((row) => cols.map((c) => escapeCsvValue(c.exportValue ? c.exportValue(row) : c.field ? getByPath(row, c.field) : '')).join(','));
  return [header.join(','), ...lines].join('\r\n');
}

/** Download as UTF-8 CSV with BOM (so spreadsheet apps detect the encoding). */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

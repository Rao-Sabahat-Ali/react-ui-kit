import { describe, expect, it } from 'vitest';
import { addMonths, firstDayOfWeek, monthGrid, parseDate, toIsoDate, weekdayNames } from './date';
import { applyMask, compileMask, unmask } from './mask';
import { parseNumber, roundToStep } from './number';
import { isSafeHref, sanitizeHtml, textToHtml } from './sanitize';

describe('date', () => {
  it('addMonths clamps day', () => {
    expect(toIsoDate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
    expect(toIsoDate(addMonths(new Date(2024, 0, 31), 1))).toBe('2024-02-29');
  });
  it('month grid has 42 days starting on first day of week', () => {
    const grid = monthGrid(2026, 9, 1);
    expect(grid).toHaveLength(42);
    expect(grid[0]!.getDay()).toBe(1);
    expect(grid.some((d) => toIsoDate(d) === '2026-10-01')).toBe(true);
  });
  it('first day of week by locale', () => {
    expect(firstDayOfWeek('sv-SE')).toBe(1);
    expect(firstDayOfWeek('en-US')).toBe(0);
  });
  it('weekday names start at first day', () => {
    expect(weekdayNames('en-GB', 1, 'short')[0]).toMatch(/Mon/);
  });
  it('parses locale order and ISO, rejects invalid', () => {
    expect(toIsoDate(parseDate('23/10/2026', 'en-GB')!)).toBe('2026-10-23');
    expect(toIsoDate(parseDate('10/23/2026', 'en-US')!)).toBe('2026-10-23');
    expect(toIsoDate(parseDate('2026-10-23', 'sv-SE')!)).toBe('2026-10-23');
    expect(parseDate('31/02/2026', 'en-GB')).toBeNull();
    expect(parseDate('nope', 'en-GB')).toBeNull();
  });
});

describe('number', () => {
  it('parses localised input', () => {
    expect(parseNumber('1,234.5', 'en-US')).toBe(1234.5);
    expect(parseNumber('1 234,5', 'sv-SE')).toBe(1234.5);
    expect(parseNumber('', 'en-US')).toBeNull();
    expect(parseNumber('abc', 'en-US')).toBeNull();
  });
  it('rounds float noise to step precision', () => {
    expect(roundToStep(0.1 + 0.2, 0.1)).toBe(0.3);
    expect(roundToStep(3, 1)).toBe(3);
  });
});

describe('mask', () => {
  const slots = compileMask('(999) 999-9999');
  it('fills slots skipping literals and rejecting invalid chars', () => {
    expect(applyMask('555a12', slots).masked).toBe('(555) 12_-____');
  });
  it('reports completion and raw value', () => {
    const r = applyMask('5551234567', slots);
    expect(r.complete).toBe(true);
    expect(r.raw).toBe('5551234567');
    expect(unmask(r.masked, slots)).toBe('5551234567');
  });
  it('optional tail', () => {
    const opt = compileMask('99?99');
    expect(applyMask('12', opt).complete).toBe(true);
  });
});

describe('sanitizeHtml (security rules)', () => {
  it('removes scripts, event handlers and javascript: urls', () => {
    const out = sanitizeHtml('<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src=x onerror=alert(1)>');
    expect(out).toBe('<p>Hi</p><a>x</a>');
  });
  it('keeps allowed formatting and hardens links', () => {
    const out = sanitizeHtml('<h1>T</h1><b>b</b><a href="https://example.com">l</a><div>d</div>');
    expect(out).toBe('<h2>T</h2><strong>b</strong><a href="https://example.com" rel="noopener noreferrer" target="_blank">l</a><p>d</p>');
  });
  it('drops style/iframe with content and unwraps unknown tags', () => {
    expect(sanitizeHtml('<style>p{}</style><iframe src="x"></iframe><custom>text</custom>')).toBe('text');
  });
  it('safe href checks', () => {
    expect(isSafeHref('/docs')).toBe(true);
    expect(isSafeHref(' java\tscript:alert(1)')).toBe(false);
    expect(isSafeHref('data:text/html,x')).toBe(false);
  });
  it('textToHtml escapes and paragraphs', () => {
    expect(textToHtml('a <b>\n\nc')).toBe('<p>a &lt;b&gt;</p><p>c</p>');
  });
});

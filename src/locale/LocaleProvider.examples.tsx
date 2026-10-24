import { useState } from 'react';
import { DateFormat } from '../components/DateFormat/DateFormat';
import { Message } from '../components/Message/Message';
import { NumberFormat } from '../components/NumberFormat/NumberFormat';
import { Paginator } from '../components/Paginator/Paginator';
import { SelectButton } from '../components/SelectButton/SelectButton';
import { LocaleProvider, useLocale } from './LocaleProvider';

const SV = { nextPage: 'Nästa sida', previousPage: 'Föregående sida', firstPage: 'Första sidan', lastPage: 'Sista sidan', pagination: 'Sidnumrering', paginationReport: '{first}–{last} av {total}', rowsPerPage: 'Rader per sida', dismiss: 'Stäng', severityInfo: 'Info:' };

function Strings() {
  const { t, tp, locale, dir } = useLocale();
  return (
    <ul className="small text-body-secondary mb-3">
      <li>locale <code>{locale}</code>, dir <code>{dir}</code></li>
      <li><code>t('selectRow', {'{ index: 3 }'})</code>: {t('selectRow', { index: 3 })}</li>
      <li><code>t('close')</code>: {t('close')}</li>
      <li><code>tp('resultsCount', 1)</code>: {tp('resultsCount', 1)}; <code>tp('resultsCount', 12)</code>: {tp('resultsCount', 12)}</li>
    </ul>
  );
}

function Overrides() {
  const [sv, setSv] = useState(true);
  const [page, setPage] = useState(1);
  return (
    <div className="d-flex flex-column gap-3">
      <SelectButton<boolean>
        aria-label="Messages"
        variant="secondary"
        value={sv}
        onChange={(v) => v !== null && setSv(v)}
        options={[{ label: 'Swedish overrides', value: true }, { label: 'English defaults', value: false }]}
      />
      <LocaleProvider locale={sv ? 'sv' : 'en'} messages={sv ? SV : undefined}>
        <Strings />
        <Message severity="info" dismissible>Missing keys fall back to English, so a partial translation is safe.</Message>
        <Paginator page={page} pageSize={10} total={95} onPageChange={(p) => setPage(p)} />
      </LocaleProvider>
    </div>
  );
}

const LOCALES = [{ label: 'English (US)', value: 'en-US' }, { label: 'Svenska', value: 'sv-SE' }, { label: 'Deutsch', value: 'de-DE' }, { label: 'العربية', value: 'ar-EG' }];
const SAMPLE_DATE = new Date(Date.UTC(2026, 9, 24, 14, 30));

function Formatting() {
  const [locale, setLocale] = useState('sv-SE');
  return (
    <div className="d-flex flex-column gap-3">
      <SelectButton<string> aria-label="Locale" variant="secondary" value={locale} onChange={(v) => v && setLocale(v)} options={LOCALES} />
      <LocaleProvider locale={locale}>
        <dl className="mb-0 d-grid gap-2" style={{ gridTemplateColumns: 'max-content 1fr', columnGap: 'var(--ui-space-4)' }}>
          <dt className="fw-normal text-body-secondary">Number</dt>
          <dd className="mb-0"><NumberFormat value={1234567.891} maximumFractionDigits={2} /></dd>
          <dt className="fw-normal text-body-secondary">Currency</dt>
          <dd className="mb-0"><NumberFormat value={4999.5} format="currency" currency="SEK" /></dd>
          <dt className="fw-normal text-body-secondary">Percent</dt>
          <dd className="mb-0"><NumberFormat value={0.256} format="percent" /></dd>
          <dt className="fw-normal text-body-secondary">Date</dt>
          <dd className="mb-0"><DateFormat value={SAMPLE_DATE} format="datetime" dateStyle="long" timeStyle="short" timeZone="UTC" /></dd>
          <dt className="fw-normal text-body-secondary">Relative</dt>
          <dd className="mb-0"><DateFormat value={SAMPLE_DATE} format="relative" now={Date.UTC(2026, 9, 26, 14, 30)} /></dd>
        </dl>
      </LocaleProvider>
    </div>
  );
}

export const examples = [
  {
    title: 'Message overrides',
    description: 'Pass only the keys you translate; everything else falls back to English. Components read strings through `useLocale()`.',
    code: `<LocaleProvider locale="sv" messages={{ nextPage: 'Nästa sida', paginationReport: '{first}–{last} av {total}' }}>\n  <Paginator page={page} pageSize={10} total={95} onPageChange={setPage} />\n</LocaleProvider>`,
    render: () => <Overrides />,
  },
  {
    title: 'Number and date formatting, direction',
    description: 'NumberFormat and DateFormat follow the provider locale through Intl; RTL languages set `dir="rtl"` on the wrapper automatically.',
    code: `<LocaleProvider locale="ar-EG">\n  <NumberFormat value={1234567.891} />\n  <DateFormat value={date} format="datetime" dateStyle="long" timeStyle="short" />\n</LocaleProvider>`,
    render: () => <Formatting />,
  },
];

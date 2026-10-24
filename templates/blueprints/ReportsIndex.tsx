import { useState } from 'react';
import { Button, IndexItem, IndexList, PageHeader, Section, Skeleton, Tag, useToast } from '@sabahat/react-ui-kit';
import { StateBlock, type WidgetState } from './shared';

/*
 * Blueprint: Index page (profile `saas`, pattern `index-page`).
 * A ruled list per Section instead of a grid of cards: serif row titles, one line of description, optional meta, and the
 * same outline action on every row. A finished row swaps the action for a success Tag; it is never removed.
 */

export interface ReportsIndexPreviewState {
  widget: 'reports' | 'all';
  state: WidgetState;
}
export const REPORTS_WIDGETS: { value: 'reports'; label: string }[] = [{ value: 'reports', label: 'Report lists' }];

export interface ReportsIndexProps {
  previewState?: ReportsIndexPreviewState;
}

interface Report {
  id: string;
  title: string;
  description: string;
  meta: string;
  /** Present when the report is already filed: shows a Tag instead of the action. */
  doneLabel?: string;
  action: string;
}

const GROUPS: { id: string; title: string; description: string; reports: Report[] }[] = [
  {
    id: 'tax',
    title: 'Tax and filings',
    description: 'Deadlines that carry a penalty when missed.',
    reports: [
      { id: 'vat', title: 'VAT return', description: 'Output and input VAT for September.', meta: 'Due 12 Nov 2026', action: 'Prepare' },
      { id: 'employer', title: 'Employer contributions', description: 'Salaries and social fees for September.', meta: 'Due 12 Nov 2026', action: 'Prepare' },
      { id: 'income', title: 'Income tax declaration', description: 'Filed for the 2025 financial year.', meta: 'Filed 29 Apr 2026', doneLabel: 'Submitted', action: 'Prepare' },
    ],
  },
  {
    id: 'management',
    title: 'Management reports',
    description: 'How the business is doing, for you and your accountant.',
    reports: [
      { id: 'pnl', title: 'Profit and loss', description: 'Income and costs by month, year to date.', meta: 'Updated today', action: 'Open' },
      { id: 'cash', title: 'Cash flow', description: 'Money in and out per week, with a 90 day forecast.', meta: 'Updated today', action: 'Open' },
      { id: 'ageing', title: 'Ageing receivables', description: 'Unpaid invoices grouped by how late they are.', meta: 'Updated yesterday', action: 'Open' },
    ],
  },
];

export function ReportsIndex({ previewState }: ReportsIndexProps) {
  const toast = useToast();
  const [retried, setRetried] = useState('');
  const previewKey = previewState ? `${previewState.widget}:${previewState.state}` : 'none';
  const base: WidgetState = previewState ? previewState.state : 'ready';
  const state: WidgetState = base === 'error' && retried === previewKey ? 'ready' : base;

  return (
    <>
      <PageHeader title="Reports" description="Filings and management reports for Nordic Tools AB." />
      {GROUPS.map((group) => (
        <Section key={group.id} title={group.title} description={group.description}>
          <StateBlock
            name={group.title}
            state={state}
            onRetry={() => setRetried(previewKey)}
            empty="No reports yet"
            emptyDescription="Reports appear after your first bookkeeping entry."
            skeleton={<Skeleton lines={6} />}
          >
            <IndexList>
              {group.reports.map((report) => (
                <IndexItem
                  key={report.id}
                  title={report.title}
                  description={report.description}
                  meta={report.meta}
                  action={
                    report.doneLabel ? (
                      <Tag value={report.doneLabel} severity="success" icon="check" />
                    ) : (
                      <Button
                        size="sm"
                        appearance="outline"
                        variant="secondary"
                        aria-label={`${report.action} ${report.title}`}
                        onClick={() => toast.info(`${report.title} is not part of the blueprint`)}
                      >
                        {report.action}
                      </Button>
                    )
                  }
                />
              ))}
            </IndexList>
          </StateBlock>
        </Section>
      ))}
    </>
  );
}

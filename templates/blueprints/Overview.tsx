import { useState } from 'react';
import { Button, IndexItem, IndexList, PageHeader, Section, Skeleton, StatCard, StatGroup, Tag, useToast } from '@sabahat/react-ui-kit';
import { SECTION_GAP, StateBlock, type WidgetState } from './shared';

/*
 * Blueprint: Overview screen (profile `saas`, pattern `overview`).
 * Answers three questions in seconds: how am I doing (numbers as type), what should I do next (ruled list with identical
 * outline actions), what else is there (compact multi-column index). One ink action; no tiles, no icon bubbles.
 */

export type OverviewWidget = 'numbers' | 'today' | 'all';
export interface OverviewPreviewState {
  widget: OverviewWidget;
  state: WidgetState;
}
export const OVERVIEW_WIDGETS: { value: 'numbers' | 'today'; label: string }[] = [
  { value: 'numbers', label: 'Numbers' },
  { value: 'today', label: 'Today list' },
];

export interface OverviewProps {
  previewState?: OverviewPreviewState;
  /** Called with the href of a browse row; defaults to an info toast. */
  onNavigate?: (href: string) => void;
}

const TODAY_TASKS = [
  { id: 'match', title: 'Match receipts', description: '8 receipts from October have no matching bank transaction.', action: 'Review' },
  { id: 'approve', title: 'Approve supplier invoices', description: '3 invoices from Svea Kontorsservice and Dalarna Trä are waiting for approval.', action: 'Approve' },
  { id: 'remind', title: 'Remind overdue customers', description: '2 customers are more than 14 days late: Berg & Söner and Malmö Möbelhus.', action: 'Send' },
] as const;

const BROWSE = [
  { title: 'Invoices', description: 'Create, send and follow up.', href: '/invoices' },
  { title: 'Expenses', description: 'Receipts and card spending.', href: '/expenses' },
  { title: 'Customers', description: 'Contacts and payment history.', href: '/customers' },
  { title: 'Suppliers', description: 'Bills and payment terms.', href: '/suppliers' },
  { title: 'Bank accounts', description: 'Balances and transactions.', href: '/bank' },
  { title: 'Reports', description: 'Tax, profit and cash flow.', href: '/reports' },
] as const;

export function Overview({ previewState, onNavigate }: OverviewProps) {
  const toast = useToast();
  const [retried, setRetried] = useState<Record<string, string>>({});
  const previewKey = previewState ? `${previewState.widget}:${previewState.state}` : 'none';
  const stateOf = (widget: 'numbers' | 'today'): WidgetState => {
    const base = previewState && (previewState.widget === 'all' || previewState.widget === widget) ? previewState.state : 'ready';
    return base === 'error' && retried[widget] === previewKey ? 'ready' : base;
  };
  const retry = (widget: 'numbers' | 'today') => () => setRetried((r) => ({ ...r, [widget]: previewKey }));
  const numbers = stateOf('numbers');
  const today = stateOf('today');
  // Never promise tasks the regions below do not show.
  const deadline = today === 'ready' ? 'Three things need you before the VAT return is due on 12 November.' : today === 'empty' ? 'Nothing needs you before the VAT return is due on 12 November.' : 'The VAT return is due on 12 November.';

  return (
    <>
      <PageHeader
        title="God morgon, Alva"
        description={deadline}
        actions={
          <Button icon="plus" onClick={() => toast.info('New expense is not part of the blueprint')}>
            New expense
          </Button>
        }
      />

      {numbers === 'ready' ? (
        <StatGroup aria-label="Business at a glance" style={SECTION_GAP}>
          <StatCard label="Cash balance (SEK)" value={184_300} delta={0.042} deltaLabel="since September" />
          <StatCard label="Invoices due" value={5} footer="SEK 62,400 outstanding" />
          <StatCard label="Receipts to match" value={8} />
          <StatCard label="VAT to report (SEK)" value={21_450} />
        </StatGroup>
      ) : (
        <section aria-label="Business at a glance" style={SECTION_GAP}>
          <StateBlock
            name="Numbers"
            headingAs="h2"
            state={numbers}
            onRetry={retry('numbers')}
            empty="No numbers yet"
            emptyDescription="Connect a bank account to see your balance."
            skeleton={
              <StatGroup aria-label="Loading numbers">
                {['Cash balance', 'Invoices due', 'Receipts to match', 'VAT to report'].map((label) => (
                  <StatCard key={label} label={label} value="" loading />
                ))}
              </StatGroup>
            }
          >
            {null}
          </StateBlock>
        </section>
      )}

      <div className="row gx-3 gx-lg-5">
        <div className="col-12 col-lg-8">
          <Section title="Today" description="Pick one and it is done in a couple of minutes.">
            <StateBlock
              name="Today list"
              state={today}
              onRetry={retry('today')}
              empty="Nothing needs you today"
              emptyDescription="New tasks show up here as invoices and receipts arrive."
              skeleton={<Skeleton lines={6} />}
            >
              <IndexList>
                {TODAY_TASKS.map((task) => (
                  <IndexItem
                    key={task.id}
                    title={task.title}
                    description={task.description}
                    action={
                      <Button
                        size="sm"
                        appearance="outline"
                        variant="secondary"
                        aria-label={`${task.action}: ${task.title}`}
                        onClick={() => toast.info(`${task.title} is not part of the blueprint`)}
                      >
                        {task.action}
                      </Button>
                    }
                  />
                ))}
              </IndexList>
            </StateBlock>
          </Section>
        </div>
        <div className="col-12 col-lg-4">
          <Section title="Next deadline">
            <p className="mb-2">
              <strong>VAT return for September</strong>
            </p>
            <p className="text-body-secondary">Due 12 November. Reported VAT so far: SEK 21,450.</p>
            <Tag value="19 days left" severity="warning" />
          </Section>
        </div>
      </div>

      <Section title="Browse">
        <IndexList columns={3}>
          {BROWSE.map((item) => (
            <IndexItem
              key={item.href}
              title={item.title}
              description={item.description}
              href={item.href}
              onNavigate={(href) => (onNavigate ? onNavigate(href) : toast.info(`${item.title} is not part of the blueprint`))}
            />
          ))}
        </IndexList>
      </Section>
    </>
  );
}

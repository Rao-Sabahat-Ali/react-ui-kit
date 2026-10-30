import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AppShell,
  Button,
  ConfirmDialog,
  DataTable,
  DatePicker,
  Drawer,
  EmptyState,
  Field,
  Icon,
  InputNumber,
  InputText,
  Menu,
  Message,
  PageHeader,
  Section,
  Select,
  SidebarNav,
  StatCard,
  StatGroup,
  Tag,
  ThemeToggle,
  Toolbar,
  Topbar,
  useToast,
  type Column,
  type Intent,
  type RowKey,
  type SelectionValue,
} from '@sabahat/react-ui-kit';
import { CLIENTS, INVOICES, TODAY, formatDate, money, type Invoice, type InvoiceStatus } from './AdminListDetail.data';
import { SECTION_GAP, type WidgetState } from './shared';

/*
 * Blueprint: Admin list to detail (profile `admin`, pattern `list-detail`).
 * DataTable with sort, search, status filter and pagination; row click opens a Drawer (the list keeps its place);
 * selecting rows swaps the filter bar for a bulk Toolbar; destructive actions go through ConfirmDialog with the object name;
 * creating an invoice reuses the Drawer with a form and an error summary.
 */

export type ListState = WidgetState;
/** Forces the invoice list into a state; used by the docs to demo loading, empty and error. */
export interface PreviewState {
  widget: 'invoices' | 'all';
  state: ListState;
}

export interface AdminListDetailProps {
  appName?: string;
  previewState?: PreviewState;
  /** Render inside a framed container (docs): the shell and top bar do not stick to the viewport. */
  embedded?: boolean;
  /** Called for navigation items other than Invoices; defaults to an info toast. */
  onNavigate?: (href: string) => void;
}

const NAV = [
  { label: 'Invoices', href: '/invoices', icon: 'download', section: 'Billing' },
  { label: 'Clients', href: '/clients', icon: 'user', section: 'Billing' },
  { label: 'Payments', href: '/payments', icon: 'check-circle', section: 'Billing' },
  { label: 'Settings', href: '/settings', icon: 'settings', section: 'Admin' },
] as const;

const TONE: Record<InvoiceStatus, Intent> = { Draft: 'secondary', Sent: 'info', Paid: 'success', Overdue: 'danger', Void: 'secondary' };
const STATUSES = Object.keys(TONE) as InvoiceStatus[];
const STATUS_FILTER = [{ label: 'All statuses', value: 'all' }, ...STATUSES.map((s) => ({ label: s, value: s }))];

interface NewInvoiceErrors {
  client?: string;
  amount?: string;
  due?: string;
}

export function AdminListDetail({ appName = 'Back office', previewState, embedded = false, onNavigate }: AdminListDetailProps) {
  const toast = useToast();
  const [rows, setRows] = useState<Invoice[]>(INVOICES);
  const [selection, setSelection] = useState<SelectionValue>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);
  const [retried, setRetried] = useState('');

  const previewKey = previewState ? `${previewState.widget}:${previewState.state}` : 'none';
  const base: ListState = previewState ? previewState.state : 'ready';
  const state: ListState = base === 'error' && retried === previewKey ? 'ready' : base;

  const selected = Array.isArray(selection) ? (selection as RowKey[]).map(String) : [];
  const visible = useMemo(() => (status === 'all' ? rows : rows.filter((r) => r.status === status)), [rows, status]);
  const current = rows.find((r) => r.id === openId) ?? null;

  // First run: no invoices, so the totals and the count say 0 as well (not the sample data behind the empty table).
  const counted = state === 'empty' ? [] : rows;
  const outstanding = counted.filter((r) => r.status === 'Sent' || r.status === 'Overdue').reduce((s, r) => s + r.total, 0);
  const overdue = counted.filter((r) => r.status === 'Overdue');
  const paid = counted.filter((r) => r.status === 'Paid');

  const update = (ids: string[], next: InvoiceStatus) => {
    setRows((all) => all.map((r) => (ids.includes(r.id) ? { ...r, status: next } : r)));
  };
  const remove = (ids: string[]) => {
    setRows((all) => all.filter((r) => !ids.includes(r.id)));
    setSelection((sel) => (Array.isArray(sel) ? sel.filter((k) => !ids.includes(String(k))) : sel));
    if (openId && ids.includes(openId)) setOpenId(null);
  };
  const label = (ids: string[]) => (ids.length === 1 ? `invoice ${rows.find((r) => r.id === ids[0])?.number}` : `${ids.length} invoices`);

  const rowItems = (r: Invoice) => [
    { label: 'Open invoice', command: () => setOpenId(r.id) },
    { label: 'Send reminder', command: () => toast.success(`Reminder for ${r.number} sent to ${r.client}`) },
    { label: 'Download PDF', command: () => toast.info(`Preparing ${r.number}.pdf`) },
    { separator: true, label: '' },
    { label: 'Delete invoice', danger: true, command: () => setConfirm({ ids: [r.id] }) },
  ];

  const columns: Column<Invoice>[] = [
    { field: 'number', header: 'Number', sortable: true, width: '7rem', className: 'text-nowrap' },
    { field: 'client', header: 'Client', sortable: true },
    { field: 'status', header: 'Status', sortable: true, body: (r) => <Tag value={r.status} severity={TONE[r.status]} /> },
    { field: 'issued', header: 'Issued', sortable: true, body: (r) => formatDate(r.issued), className: 'text-nowrap' },
    { field: 'due', header: 'Due', sortable: true, body: (r) => formatDate(r.due), className: 'text-nowrap' },
    { field: 'total', header: 'Total', sortable: true, align: 'end', body: (r) => money.format(r.total), className: 'text-nowrap' },
    {
      id: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      align: 'end',
      width: '3.5rem',
      body: (r) => (
        <Menu
          popup
          placement="bottom-end"
          trigger={<Button size="sm" appearance="text" variant="secondary" icon="more-horizontal" aria-label={`Actions for ${r.number}`} />}
          items={rowItems(r)}
        />
      ),
    },
  ];

  const navigate = (href: string) => {
    if (href === '/invoices') return;
    if (onNavigate) onNavigate(href);
    else toast.info(`${NAV.find((n) => n.href === href)?.label ?? 'This page'} is not part of the blueprint`);
  };

  const filtersActive = query !== '' || status !== 'all';
  const clearFilters = () => {
    setQuery('');
    setStatus('all');
  };

  return (
    <>
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
                <InputText type="search" aria-label="Search invoices" placeholder="Search invoices" prefix={<Icon name="search" />} value={query} onChange={setQuery} />
              </div>
            }
            actions={<ThemeToggle size="sm" />}
          />
        }
        sidebar={<SidebarNav items={NAV.map((n) => ({ ...n }))} activeHref="/invoices" onNavigate={navigate} />}
      >
        <PageHeader
          breadcrumb={[{ label: 'Billing', href: '/billing' }, { label: 'Invoices' }]}
          onNavigate={(href, e) => {
            e.preventDefault();
            navigate(href);
          }}
          title="Invoices"
          description="Create, send and follow up invoices for Nordic Tools AB."
          actions={
            <Button icon="plus" onClick={() => setCreating(true)}>
              New invoice
            </Button>
          }
        />

        <StatGroup aria-label="Invoice totals" style={SECTION_GAP}>
          <StatCard label="Outstanding" value={outstanding} format={{ style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }} />
          <StatCard label="Overdue invoices" value={overdue.length} />
          <StatCard label="Paid invoices" value={paid.length} />
          <StatCard label="Drafts" value={counted.filter((r) => r.status === 'Draft').length} />
        </StatGroup>

        <Section title="All invoices" description={`${state === 'empty' ? 0 : visible.length} of ${counted.length} invoices`}>
          {state === 'error' && (
            <Message
              severity="danger"
              title="Invoices did not load"
              live="assertive"
              actions={
                <Button size="sm" appearance="outline" variant="danger" onClick={() => setRetried(previewKey)}>
                  Retry
                </Button>
              }
            >
              The billing service did not respond. Your filters are kept.
            </Message>
          )}
          {state !== 'error' && (
            <>
              <Toolbar
                ariaLabel={selected.length > 0 ? 'Bulk actions' : 'Filters'}
                className="mb-3"
                start={
                  selected.length > 0 ? (
                    <>
                      <span role="status" className="fw-semibold">
                        {selected.length} selected
                      </span>
                      <Button
                        size="sm"
                        appearance="outline"
                        variant="secondary"
                        onClick={() => {
                          update(selected, 'Paid');
                          toast.success(`Marked ${label(selected)} as paid`);
                          setSelection([]);
                        }}
                      >
                        Mark as paid
                      </Button>
                      <Button size="sm" appearance="outline" variant="secondary" onClick={() => toast.success(`Reminders sent for ${label(selected)}`)}>
                        Send reminders
                      </Button>
                      <Button size="sm" appearance="outline" variant="danger" onClick={() => setConfirm({ ids: selected })}>
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <div>
                        <Select<string> aria-label="Filter by status" size="sm" options={STATUS_FILTER} value={status} onChange={(v) => setStatus(v ?? 'all')} />
                      </div>
                      {filtersActive && (
                        <Button size="sm" appearance="text" variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      )}
                    </>
                  )
                }
                end={
                  selected.length > 0 ? (
                    <Button size="sm" appearance="text" variant="secondary" onClick={() => setSelection([])}>
                      Clear selection
                    </Button>
                  ) : undefined
                }
              />
              <DataTable<Invoice>
                caption="Invoices"
                captionHidden
                size="sm"
                stickyHeader
                data={state === 'empty' ? [] : visible}
                columns={columns}
                dataKey="id"
                loading={state === 'loading'}
                paginator
                defaultPageSize={10}
                pageSizeOptions={[10, 25, 50, 100]}
                defaultSort={[{ field: 'issued', order: -1 }]}
                selectionMode="multiple"
                selection={selection}
                onSelectionChange={setSelection}
                onRowClick={(row) => setOpenId(row.id)}
                globalFilterFields={['number', 'client', 'status']}
                globalFilter={query}
                onGlobalFilterChange={setQuery}
                emptyMessage={
                  state === 'empty' ? (
                    <EmptyState
                      size="sm"
                      titleAs="h3"
                      variant="first-run"
                      title="No invoices yet"
                      description="Invoices you create appear here with their payment status."
                      action={
                        <Button size="sm" appearance="outline" variant="secondary" onClick={() => setCreating(true)}>
                          Create your first invoice
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      size="sm"
                      titleAs="h3"
                      variant="no-results"
                      title="No invoices match"
                      description="Try a different search or status."
                      action={
                        <Button size="sm" appearance="outline" variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      }
                    />
                  )
                }
              />
            </>
          )}
        </Section>
      </AppShell>

      <Drawer
        open={current !== null}
        onClose={() => setOpenId(null)}
        position="end"
        size="lg"
        title={current ? `Invoice ${current.number}` : undefined}
        footer={
          current && (
            <>
              <Button appearance="outline" variant="danger" className="me-auto" onClick={() => setConfirm({ ids: [current.id] })}>
                Delete invoice
              </Button>
              <Button appearance="outline" variant="secondary" onClick={() => setOpenId(null)}>
                Close
              </Button>
              <Button
                disabled={current.status === 'Paid' || current.status === 'Void'}
                onClick={() => {
                  update([current.id], 'Paid');
                  toast.success(`Invoice ${current.number} marked as paid`);
                }}
              >
                Mark as paid
              </Button>
            </>
          )
        }
      >
        {current && <InvoiceDetail invoice={current} />}
      </Drawer>

      <NewInvoiceDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(invoice) => {
          setRows((all) => [invoice, ...all]);
          setCreating(false);
          toast.success(`Invoice ${invoice.number} saved`);
        }}
        nextNumber={`INV-${Math.max(...rows.map((r) => Number(r.id))) + 1}`}
      />

      <ConfirmDialog
        open={confirm !== null}
        severity="danger"
        title={confirm && confirm.ids.length === 1 ? 'Delete invoice?' : 'Delete invoices?'}
        message={confirm ? `This permanently deletes ${label(confirm.ids)}. This cannot be undone.` : undefined}
        acceptLabel={confirm && confirm.ids.length === 1 ? 'Delete invoice' : `Delete ${confirm?.ids.length ?? 0} invoices`}
        onReject={() => setConfirm(null)}
        onAccept={() => {
          if (!confirm) return;
          remove(confirm.ids);
          toast.success(`Deleted ${label(confirm.ids)}`);
          setConfirm(null);
        }}
      />
    </>
  );
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  return (
    <div>
      <p className="d-flex flex-wrap gap-2 align-items-center">
        <Tag value={invoice.status} severity={TONE[invoice.status]} />
        <span className="text-body-secondary">{invoice.terms}</span>
      </p>
      <dl className="row gx-0 mb-4">
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Client</dt>
        <dd className="col-sm-8">{invoice.client}</dd>
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Issued</dt>
        <dd className="col-sm-8">{formatDate(invoice.issued)}</dd>
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Due</dt>
        <dd className="col-sm-8">{formatDate(invoice.due)}</dd>
        <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Total</dt>
        <dd className="col-sm-8">{money.format(invoice.total)}</dd>
      </dl>
      <Section title="Lines" titleAs="h3">
        <div className="table-responsive" role="region" aria-label={`Lines on invoice ${invoice.number}`} tabIndex={0}>
          <table className="table table-sm">
            <caption className="visually-hidden">Lines on invoice {invoice.number}</caption>
            <thead>
              <tr>
                <th scope="col">Description</th>
                <th scope="col" className="text-end">
                  Qty
                </th>
                <th scope="col" className="text-end">
                  Unit price
                </th>
                <th scope="col" className="text-end">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.description}>
                  <td>{l.description}</td>
                  <td className="text-end">{l.quantity}</td>
                  <td className="text-end">{money.format(l.unitPrice)}</td>
                  <td className="text-end">{money.format(l.quantity * l.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function NewInvoiceDrawer({ open, onClose, onCreate, nextNumber }: { open: boolean; onClose: () => void; onCreate: (invoice: Invoice) => void; nextNumber: string }) {
  const [client, setClient] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [due, setDue] = useState<Date | null>(null);
  const [errors, setErrors] = useState<NewInvoiceErrors>({});
  const summary = useRef<HTMLDivElement>(null);
  const problems = Object.entries(errors) as [keyof NewInvoiceErrors, string][];

  const reset = () => {
    setClient(null);
    setAmount(null);
    setDue(null);
    setErrors({});
  };
  const close = () => {
    reset();
    onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: NewInvoiceErrors = {};
    if (!client) next.client = 'Choose a client';
    if (amount === null || amount <= 0) next.amount = 'Enter an amount greater than 0';
    if (!due) next.due = 'Choose a due date';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.setTimeout(() => summary.current?.querySelector('a')?.focus(), 0);
      return;
    }
    const issued = new Date(TODAY).toISOString().slice(0, 10);
    onCreate({
      id: nextNumber.replace('INV-', ''),
      number: nextNumber,
      client: client!,
      status: 'Draft',
      issued,
      due: due!.toISOString().slice(0, 10),
      terms: 'Custom',
      lines: [{ description: 'Services', quantity: 1, unitPrice: amount! }],
      total: amount!,
    });
    reset();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      position="end"
      size="md"
      title="New invoice"
      footer={
        <>
          <Button appearance="outline" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="new-invoice">
            Save invoice
          </Button>
        </>
      }
    >
      <form id="new-invoice" noValidate onSubmit={submit}>
        {problems.length > 0 && (
          <div ref={summary}>
            <Message severity="danger" live="assertive" title={`${problems.length} ${problems.length === 1 ? 'problem needs' : 'problems need'} fixing`}>
              <ul className="mb-0 ps-3">
                {problems.map(([field, message]) => (
                  <li key={field}>
                    <a
                      href={`#new-invoice-${field}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`new-invoice-${field}`)?.focus();
                      }}
                    >
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </Message>
          </div>
        )}
        <Field id="new-invoice-client" label="Client" required error={errors.client}>
          <Select<string> options={CLIENTS.map((c) => ({ label: c, value: c }))} value={client} onChange={setClient} placeholder="Choose a client" />
        </Field>
        <Field id="new-invoice-amount" label="Amount (SEK)" required error={errors.amount} help="Total excluding VAT.">
          <InputNumber value={amount} onChange={setAmount} min={0} mode="decimal" />
        </Field>
        <Field id="new-invoice-due" label="Due date" required error={errors.due}>
          <DatePicker value={due} onChange={setDue} />
        </Field>
      </form>
    </Drawer>
  );
}

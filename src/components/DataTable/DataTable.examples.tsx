import { useCallback, useRef, useState } from 'react';
import { Button } from '../Button/Button';
import { InputNumber } from '../InputNumber/InputNumber';
import { InputText } from '../InputText/InputText';
import { Tag } from '../Tag/Tag';
import { DataTable, type Column, type DataTableHandle, type LazyLoadEvent, type RowKey } from './DataTable';
import { filterRows } from './filters';
import { sortRows } from './sort';

interface Invoice {
  id: number;
  customer: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  amount: number;
  due: Date;
}

const STATUS = { Paid: 'success', Pending: 'warning', Overdue: 'danger' } as const;
const customers = ['Acme AB', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark Ltd', 'Wayne Co', 'Wonka'];
const invoices: Invoice[] = Array.from({ length: 57 }, (_, i) => ({
  id: 1000 + i,
  customer: customers[i % customers.length]!,
  status: (['Paid', 'Pending', 'Overdue'] as const)[i % 3]!,
  amount: Math.round(((i * 7919) % 5000) + 120) + 0.5,
  due: new Date(2026, i % 12, (i % 27) + 1),
}));

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' });
const columns: Column<Invoice>[] = [
  { field: 'id', header: 'Invoice', sortable: true, width: '8rem' },
  { field: 'customer', header: 'Customer', sortable: true },
  { field: 'status', header: 'Status', sortable: true, body: (r) => <Tag value={r.status} severity={STATUS[r.status]} /> },
  { field: 'due', header: 'Due', sortable: true, body: (r) => r.due.toLocaleDateString() },
  { field: 'amount', header: 'Amount', sortable: true, align: 'end', body: (r) => money.format(r.amount) },
];

function Demo() {
  const [selection, setSelection] = useState<RowKey | RowKey[] | null>([]);
  const count = Array.isArray(selection) ? selection.length : 0;
  return (
    <DataTable
      caption="Invoices"
      data={invoices}
      columns={columns}
      paginator
      defaultPageSize={10}
      selectionMode="multiple"
      selection={selection}
      onSelectionChange={setSelection}
      sortMode="multiple"
      striped
      header={
        <>
          <span className="small text-body-secondary">{count > 0 ? `${count} selected` : 'Shift+click headers for multi-sort'}</span>
          <Button size="sm" variant="danger" appearance="outline" icon="trash" disabled={count === 0}>
            Delete selected
          </Button>
        </>
      }
    />
  );
}

const filterColumns: Column<Invoice>[] = [
  { field: 'id', header: 'Invoice', sortable: true, width: '8rem', frozen: true, hideable: false },
  { field: 'customer', header: 'Customer', sortable: true, filterable: true },
  {
    field: 'status',
    header: 'Status',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: (['Paid', 'Pending', 'Overdue'] as const).map((s) => ({ label: s, value: s })),
    body: (r) => <Tag value={r.status} severity={STATUS[r.status]} />,
  },
  { field: 'due', header: 'Due', sortable: true, filterable: true, filterType: 'date', body: (r) => r.due.toLocaleDateString() },
  { field: 'amount', header: 'Amount', sortable: true, align: 'end', filterable: true, filterType: 'number', body: (r) => money.format(r.amount), exportValue: (r) => r.amount },
];

function FiltersDemo() {
  const table = useRef<DataTableHandle>(null);
  return (
    <DataTable
      ref={table}
      caption="Invoices (filters, columns, export)"
      data={invoices}
      columns={filterColumns}
      paginator
      defaultPageSize={10}
      globalFilterFields={['customer', 'status']}
      columnToggle
      resizableColumns
      reorderableColumns
      rowExpansionTemplate={(r) => (
        <span className="small">
          Invoice {r.id} for {r.customer} is {r.status.toLowerCase()}, due {r.due.toLocaleDateString()}.
        </span>
      )}
      stateKey="docs:invoices"
      exportFilename="invoices"
      header={
        <span className="d-flex gap-2">
          <Button size="sm" variant="secondary" appearance="outline" icon="download" onClick={() => table.current?.exportCsv()}>
            Export CSV
          </Button>
          <Button size="sm" variant="secondary" appearance="text" icon="refresh" onClick={() => table.current?.resetState()}>
            Reset
          </Button>
        </span>
      }
    />
  );
}

/** Simulated server: filters, sorts and slices on a timer. */
function LazyDemo() {
  const [state, setState] = useState<{ rows: Invoice[]; total: number; loading: boolean }>({ rows: [], total: 0, loading: true });
  const timer = useRef(0);
  const load = useCallback((e: LazyLoadEvent) => {
    setState((s) => ({ ...s, loading: true }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const matched = sortRows(filterRows(invoices, { filters: e.filters, columns: filterColumns, globalFilter: e.globalFilter, globalFilterFields: ['customer'] }), e.sort, filterColumns);
      setState({ rows: matched.slice(e.first, e.first + e.rows), total: matched.length, loading: false });
    }, 400);
  }, []);
  return (
    <DataTable
      caption="Invoices (server mode)"
      data={state.rows}
      columns={filterColumns.slice(0, 3)}
      lazy
      onLazyLoad={load}
      totalRecords={state.total}
      loading={state.loading}
      loadingRows={10}
      paginator
      defaultPageSize={10}
      pageSizeOptions={[10, 20]}
      globalFilterFields={['customer']}
      filterDisplay="row"
      size="sm"
    />
  );
}

function EditingDemo() {
  const [rows, setRows] = useState(() => invoices.slice(0, 6));
  const update = (row: Invoice, patch: Partial<Invoice>) => setRows((all) => all.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
  const columns: Column<Invoice>[] = [
    { field: 'id', header: 'Invoice' },
    { field: 'customer', header: 'Customer', editor: (ctx) => <InputText size="sm" aria-label={ctx['aria-label']} invalid={ctx.invalid} value={String(ctx.value ?? '')} onChange={(v) => ctx.onChange(v)} /> },
    {
      field: 'amount',
      header: 'Amount',
      align: 'end',
      body: (r) => money.format(r.amount),
      editor: (ctx) => <InputNumber size="sm" aria-label={ctx['aria-label']} invalid={ctx.invalid} value={typeof ctx.value === 'number' ? ctx.value : null} onValueInput={(v) => ctx.onChange(v)} />,
    },
    { field: 'status', header: 'Status', body: (r) => <Tag value={r.status} severity={STATUS[r.status]} /> },
  ];
  return (
    <DataTable
      caption="Editable invoices (Enter / F2 to edit, Tab to move on, Escape to cancel)"
      data={rows}
      columns={columns}
      editMode="cell"
      cellNavigation
      onCellEditComplete={({ row, field, newValue }) => {
        if (field === 'customer' && String(newValue).trim() === '') return false;
        if (field === 'amount' && (typeof newValue !== 'number' || newValue < 0)) return false;
        update(row, { [field]: newValue } as Partial<Invoice>);
      }}
      contextMenu={(row) => [
        { label: `Mark ${row.id} paid`, icon: 'check', command: ({ row: r }) => update(r, { status: 'Paid' }) },
        { label: 'Mark overdue', icon: 'alert-triangle', command: ({ row: r }) => update(r, { status: 'Overdue' }) },
      ]}
      size="sm"
    />
  );
}

const bigData: Invoice[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: 100_000 + i,
  customer: customers[i % customers.length]!,
  status: (['Paid', 'Pending', 'Overdue'] as const)[i % 3]!,
  amount: ((i * 7919) % 5000) + 120,
  due: new Date(2026, i % 12, (i % 27) + 1),
}));

export const examples = [
  {
    title: 'Sorting, pagination, selection',
    code: `<DataTable\n  caption="Invoices"\n  data={invoices}\n  columns={[\n    { field: 'id', header: 'Invoice', sortable: true },\n    { field: 'customer', header: 'Customer', sortable: true },\n    { field: 'status', header: 'Status', body: (r) => <Tag value={r.status} severity={STATUS[r.status]} /> },\n    { field: 'amount', header: 'Amount', sortable: true, align: 'end', body: (r) => money.format(r.amount) },\n  ]}\n  paginator\n  selectionMode="multiple"\n  selection={selection}\n  onSelectionChange={setSelection}\n/>`,
    render: () => <Demo />,
  },
  {
    title: 'Loading and empty',
    code: `<DataTable caption="Loading" data={[]} columns={columns} loading loadingRows={3} />\n<DataTable caption="Empty" data={[]} columns={columns} emptyMessage="No invoices yet." />`,
    render: () => (
      <div className="d-flex flex-column gap-3">
        <DataTable caption="Loading" captionHidden data={[]} columns={columns} loading loadingRows={3} size="sm" />
        <DataTable caption="Empty" captionHidden data={[]} columns={columns} emptyMessage="No invoices yet." size="sm" />
      </div>
    ),
  },
  {
    title: 'Filters, global search, columns, resize/reorder, expansion and CSV export',
    code: `const table = useRef<DataTableHandle>(null);\n<DataTable\n  ref={table}\n  data={invoices}\n  columns={[\n    { field: 'customer', header: 'Customer', filterable: true },\n    { field: 'status', header: 'Status', filterable: true, filterType: 'select', filterOptions },\n    { field: 'due', header: 'Due', filterable: true, filterType: 'date' },\n    { field: 'amount', header: 'Amount', filterable: true, filterType: 'number' },\n  ]}\n  globalFilterFields={['customer', 'status']}\n  columnToggle resizableColumns reorderableColumns\n  rowExpansionTemplate={(r) => <Details invoice={r} />}\n  stateKey="invoices"\n  header={<Button onClick={() => table.current?.exportCsv()}>Export CSV</Button>}\n/>`,
    render: () => <FiltersDemo />,
  },
  {
    title: 'Lazy (server) mode',
    code: `<DataTable\n  lazy\n  data={pageRows}\n  totalRecords={total}\n  loading={loading}\n  onLazyLoad={({ first, rows, sort, filters, globalFilter }) => fetchPage(...)}\n  paginator\n  filterDisplay="row"\n  globalFilterFields={['customer']}\n/>`,
    render: () => <LazyDemo />,
  },
  {
    title: 'Inline editing, grid keyboard navigation and context menu',
    code: `<DataTable\n  data={rows}\n  columns={[{ field: 'customer', header: 'Customer', editor: (ctx) => <InputText aria-label={ctx['aria-label']} value={ctx.value} onChange={ctx.onChange} /> }]}\n  editMode="cell"\n  cellNavigation\n  onCellEditComplete={({ row, field, newValue }) => (valid(newValue) ? save(row, field, newValue) : false)}\n  contextMenu={(row) => [{ label: 'Mark paid', command: ({ row }) => markPaid(row) }]}\n/>`,
    render: () => <EditingDemo />,
  },
  {
    title: 'Virtual scroll (10 000 rows)',
    code: `<DataTable data={tenThousandRows} columns={columns} virtualScroll={{ itemSize: 40 }} scrollHeight="400px" />`,
    render: () => <DataTable caption="10 000 invoices" data={bigData} columns={columns} virtualScroll={{ itemSize: 40 }} scrollHeight="400px" sortMode="multiple" />,
  },
  {
    title: 'Row grouping',
    code: `<DataTable data={invoices} columns={columns} groupBy="status" expandableGroups groupHeaderTemplate={(v, rows) => \`\${v} (\${rows.length})\`} />`,
    render: () => (
      <DataTable
        caption="Invoices by status"
        data={invoices.slice(0, 15)}
        columns={columns.filter((c) => c.field !== 'status')}
        groupBy="status"
        expandableGroups
        groupHeaderTemplate={(v, rows) => `${String(v)} (${rows.length})`}
        groupFooterTemplate={(_, rows) => `Total ${money.format(rows.reduce((sum, r) => sum + r.amount, 0))}`}
        size="sm"
      />
    ),
  },
];

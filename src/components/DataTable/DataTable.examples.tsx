import { useState } from 'react';
import { Button } from '../Button/Button';
import { Tag } from '../Tag/Tag';
import { DataTable, type Column, type RowKey } from './DataTable';

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
];

import { Button } from '../Button/Button';
import { Tag } from '../Tag/Tag';
import { PageHeader } from './PageHeader';

export const examples = [
  {
    title: 'Title, breadcrumb, meta, actions',
    code: `<PageHeader\n  title="Invoices"\n  description="All invoices across customers."\n  breadcrumb={[{ label: 'Billing', href: '#' }, { label: 'Invoices' }]}\n  meta={<Tag value="57 open" severity="warning" />}\n  actions={<><Button variant="secondary" appearance="outline" icon="download">Export</Button><Button icon="plus">New invoice</Button></>}\n/>`,
    render: () => (
      <PageHeader
        title="Invoices"
        description="All invoices across customers."
        breadcrumb={[{ label: 'Billing', href: '#' }, { label: 'Invoices' }]}
        meta={<Tag value="57 open" severity="warning" />}
        actions={
          <>
            <Button variant="secondary" appearance="outline" icon="download">Export</Button>
            <Button icon="plus">New invoice</Button>
          </>
        }
      />
    ),
  },
];

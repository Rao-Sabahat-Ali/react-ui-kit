import { DataTable, Tag, type Column } from '@sabahat/react-ui-kit';
import { InlineMarkdown } from '../components/InlineMarkdown';
import { href } from '../router';
import { CATEGORY_LABELS, components, isImplemented, type CatalogComponent } from '../registry';

type Row = CatalogComponent & { implemented: string };

const columns: Column<Row>[] = [
  { field: 'name', header: 'Component', sortable: true, body: (c) => <a href={href('components', c.slug)}>{c.name}</a> },
  { field: 'category', header: 'Category', sortable: true, body: (c) => CATEGORY_LABELS[c.category] ?? c.category },
  { field: 'implemented', header: 'Status', sortable: true, body: (c) => <Tag value={c.implemented} severity={c.implemented === 'Implemented' ? 'success' : 'warning'} /> },
  { field: 'purpose', header: 'Purpose', body: (c) => <InlineMarkdown text={c.purpose} /> },
];

export function RoadmapPage() {
  const rows: Row[] = components.map((c) => ({ ...c, implemented: isImplemented(c) ? 'Implemented' : 'Specified' }));
  return (
    <>
      <header className="docs-page-header">
        <h1>Roadmap</h1>
        <p className="lead text-body-secondary">Every component in the spec. Implementation order lives in <code>tasks.md</code>.</p>
      </header>
      <DataTable caption="All components" captionHidden data={rows} dataKey="slug" columns={columns} paginator defaultPageSize={25} defaultSort={[{ field: 'implemented', order: 1 }]} striped size="sm" />
    </>
  );
}

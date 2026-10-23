import { useState } from 'react';
import { SelectButton } from '../SelectButton/SelectButton';
import { DataView, type DataViewLayout } from './DataView';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

const products: Product[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: 10 + ((i * 7) % 50),
  category: ['Books', 'Games', 'Home'][i % 3]!,
}));

const template = (p: Product, layout: DataViewLayout) => (
  <article className={layout === 'grid' ? 'card h-100 p-3' : 'd-flex justify-content-between align-items-center'}>
    <div>
      <h3 className="h6 mb-1">{p.name}</h3>
      <p className="text-body-secondary small mb-0">{p.category}</p>
    </div>
    <p className="fw-semibold mb-0">${p.price}</p>
  </article>
);

function LayoutDemo() {
  const [layout, setLayout] = useState<DataViewLayout>('grid');
  return (
    <DataView
      aria-label="Products"
      data={products}
      layout={layout}
      paginator
      defaultPageSize={6}
      sortField="price"
      sortOrder={-1}
      itemTemplate={template}
      header={
        <SelectButton
          aria-label="Layout"
          value={layout}
          onChange={(v) => v && setLayout(v as DataViewLayout)}
          options={[
            { label: 'Grid', value: 'grid' },
            { label: 'List', value: 'list' },
          ]}
        />
      }
    />
  );
}

export const examples = [
  {
    title: 'Grid / list with pagination and sorting',
    code: `<DataView data={products} layout={layout} paginator defaultPageSize={6} sortField="price" sortOrder={-1} itemTemplate={(p, layout) => <article>…</article>} />`,
    render: () => <LayoutDemo />,
  },
  {
    title: 'Loading and empty',
    code: `<DataView data={[]} loading itemTemplate={…} />\n<DataView data={[]} itemTemplate={…} />`,
    render: () => (
      <div className="d-grid gap-4">
        <DataView data={[] as Product[]} loading loadingItems={3} itemTemplate={template} />
        <DataView data={[] as Product[]} itemTemplate={template} />
      </div>
    ),
  },
];

import { Spinner } from './Spinner';

export const examples = [
  {
    title: 'Types and sizes',
    code: `<Spinner />\n<Spinner type="grow" variant="primary" />\n<Spinner size="sm" />\n<Spinner size="lg" variant="success" label="Loading orders" />`,
    render: () => (
      <div className="d-flex align-items-center gap-3">
        <Spinner />
        <Spinner type="grow" variant="primary" />
        <Spinner size="sm" />
        <Spinner size="lg" variant="success" label="Loading orders" />
      </div>
    ),
  },
];

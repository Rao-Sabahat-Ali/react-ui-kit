import { useState } from 'react';
import { Paginator } from './Paginator';

function Demo() {
  const [page, setPage] = useState(4);
  const [size, setSize] = useState(25);
  return <Paginator page={page} pageSize={size} total={1234} onPageChange={(p, s) => { setPage(p); setSize(s); }} />;
}

export const examples = [
  {
    title: 'With report and page size',
    code: `const [page, setPage] = useState(0);\nconst [size, setSize] = useState(25);\n<Paginator page={page} pageSize={size} total={1234} onPageChange={(p, s) => { setPage(p); setSize(s); }} />`,
    render: () => <Demo />,
  },
];

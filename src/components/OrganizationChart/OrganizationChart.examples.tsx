import { useState } from 'react';
import type { TreeKey, TreeNode } from '../Tree/treeUtils';
import { OrganizationChart } from './OrganizationChart';

interface Person {
  role: string;
}

const org: TreeNode<Person>[] = [
  {
    key: 'ceo',
    label: 'Ada Lovelace',
    data: { role: 'CEO' },
    children: [
      { key: 'cto', label: 'Grace Hopper', data: { role: 'CTO' }, children: [{ key: 'dev1', label: 'Linus', data: { role: 'Engineer' } }, { key: 'dev2', label: 'Margaret', data: { role: 'Engineer' } }] },
      { key: 'cfo', label: 'Warren', data: { role: 'CFO' }, children: [{ key: 'acc', label: 'Pat', data: { role: 'Accountant' } }] },
      { key: 'coo', label: 'Tim', data: { role: 'COO' } },
    ],
  },
];

const template = (node: TreeNode<Person>) => (
  <>
    <strong>{node.label}</strong>
    <span className="small text-body-secondary">{node.data?.role}</span>
  </>
);

function Demo() {
  const [selection, setSelection] = useState<TreeKey | TreeKey[] | null>(null);
  return <OrganizationChart aria-label="Company structure" value={org} nodeTemplate={template} selectionMode="single" selection={selection} onSelectionChange={setSelection} collapsible />;
}

export const examples = [
  { title: 'Collapsible and selectable', code: `<OrganizationChart value={org} nodeTemplate={…} selectionMode="single" collapsible />`, render: () => <Demo /> },
];

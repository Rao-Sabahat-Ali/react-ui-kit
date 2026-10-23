import { useState } from 'react';
import { TreeSelect, type TreeSelectValue } from './TreeSelect';
import type { TreeNode } from '../Tree/treeUtils';

const categories: TreeNode[] = [
  { key: 'electronics', label: 'Electronics', children: [{ key: 'phones', label: 'Phones' }, { key: 'laptops', label: 'Laptops' }, { key: 'audio', label: 'Audio', children: [{ key: 'headphones', label: 'Headphones' }, { key: 'speakers', label: 'Speakers' }] }] },
  { key: 'home', label: 'Home', children: [{ key: 'kitchen', label: 'Kitchen' }, { key: 'garden', label: 'Garden' }] },
  { key: 'books', label: 'Books' },
];

function Demo({ mode, display }: { mode: 'single' | 'multiple' | 'checkbox'; display?: 'comma' | 'chips' }) {
  const [value, setValue] = useState<TreeSelectValue>(mode === 'single' ? null : []);
  return <TreeSelect aria-label={`Category (${mode})`} nodes={categories} selectionMode={mode} display={display} value={value} onChange={setValue} filter placeholder="Pick a category" clearable />;
}

export const examples = [
  { title: 'Single', code: `<TreeSelect nodes={categories} value={value} onChange={setValue} filter />`, render: () => <Demo mode="single" /> },
  { title: 'Checkbox with chips', code: `<TreeSelect nodes={categories} selectionMode="checkbox" display="chips" value={value} onChange={setValue} />`, render: () => <Demo mode="checkbox" display="chips" /> },
  { title: 'Multiple', code: `<TreeSelect nodes={categories} selectionMode="multiple" value={value} onChange={setValue} />`, render: () => <Demo mode="multiple" /> },
];

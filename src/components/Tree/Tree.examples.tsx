import { useState } from 'react';
import { Tree } from './Tree';
import type { TreeNode, TreeSelectionValue } from './treeUtils';

export const sampleNodes: TreeNode[] = [
  {
    key: 'docs',
    label: 'Documents',
    icon: 'home',
    children: [
      { key: 'work', label: 'Work', children: [{ key: 'report', label: 'Report.docx' }, { key: 'budget', label: 'Budget.xlsx' }] },
      { key: 'personal', label: 'Personal', children: [{ key: 'cv', label: 'CV.pdf' }] },
    ],
  },
  { key: 'pictures', label: 'Pictures', children: [{ key: 'holiday', label: 'Holiday.png' }, { key: 'locked', label: 'Locked.png', disabled: true }] },
  { key: 'readme', label: 'README.md' },
];

function Controlled() {
  const [selection, setSelection] = useState<TreeSelectionValue>({ checked: [], partial: [] });
  return (
    <div>
      <Tree aria-label="Files (checkbox)" value={sampleNodes} selectionMode="checkbox" selection={selection} onSelectionChange={setSelection} defaultExpandedKeys={new Set(['docs'])} />
      <p className="small text-body-secondary mt-2 mb-0">Checked: {typeof selection === 'object' && selection !== null && 'checked' in selection ? selection.checked.join(', ') || 'none' : 'none'}</p>
    </div>
  );
}

function Lazy() {
  const root: TreeNode[] = [{ key: 'remote', label: 'Remote folder' }, { key: 'remote2', label: 'Another folder' }];
  return (
    <Tree
      aria-label="Lazy tree"
      value={root}
      onLoadChildren={(node) => new Promise((resolve) => setTimeout(() => resolve([{ key: `${node.key}-1`, label: `${node.label} / file 1`, leaf: true }, { key: `${node.key}-2`, label: `${node.label} / file 2`, leaf: true }]), 800))}
    />
  );
}

function Draggable() {
  const [nodes, setNodes] = useState<TreeNode[]>(sampleNodes);
  return <Tree aria-label="Drag and drop" value={nodes} dragdrop onNodeDrop={({ value }) => setNodes(value)} defaultExpandedKeys={new Set(['docs'])} />;
}

export const examples = [
  {
    title: 'Single selection',
    code: `<Tree aria-label="Files" value={nodes} selectionMode="single" />`,
    render: () => <Tree aria-label="Files" value={sampleNodes} selectionMode="single" defaultExpandedKeys={new Set(['docs'])} />,
  },
  { title: 'Checkbox with partial state', code: `<Tree value={nodes} selectionMode="checkbox" selection={selection} onSelectionChange={setSelection} />`, render: () => <Controlled /> },
  { title: 'Filter', code: `<Tree value={nodes} filter selectionMode="multiple" />`, render: () => <Tree aria-label="Filterable" value={sampleNodes} filter selectionMode="multiple" /> },
  { title: 'Lazy loading', code: `<Tree value={roots} onLoadChildren={(node) => fetchChildren(node.key)} />`, render: () => <Lazy /> },
  { title: 'Drag and drop', description: 'Pointer-event based; drop before, after or inside a node.', code: `<Tree value={nodes} dragdrop onNodeDrop={({ value }) => setNodes(value)} />`, render: () => <Draggable /> },
];

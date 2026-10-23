import { useState } from 'react';
import type { Column } from '../DataTable/DataTable';
import type { TreeNode, TreeSelectionValue } from '../Tree/treeUtils';
import { TreeTable } from './TreeTable';

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

const files: TreeNode<FileInfo>[] = [
  {
    key: 'docs',
    label: 'Documents',
    data: { name: 'Documents', size: 3200, type: 'Folder' },
    children: [
      { key: 'report', label: 'Report.docx', data: { name: 'Report.docx', size: 1200, type: 'Word' } },
      { key: 'budget', label: 'Budget.xlsx', data: { name: 'Budget.xlsx', size: 800, type: 'Excel' } },
      { key: 'notes', label: 'Notes.txt', data: { name: 'Notes.txt', size: 1200, type: 'Text' } },
    ],
  },
  { key: 'pics', label: 'Pictures', data: { name: 'Pictures', size: 5400, type: 'Folder' }, children: [{ key: 'holiday', label: 'Holiday.png', data: { name: 'Holiday.png', size: 5400, type: 'Image' } }] },
  { key: 'readme', label: 'README.md', data: { name: 'README.md', size: 12, type: 'Markdown' } },
];

const columns: Column<FileInfo>[] = [
  { field: 'name', header: 'Name', sortable: true },
  { field: 'size', header: 'Size (KB)', sortable: true, align: 'end' },
  { field: 'type', header: 'Type', sortable: true },
];

function Selectable() {
  const [selection, setSelection] = useState<TreeSelectionValue>({ checked: [], partial: [] });
  return <TreeTable caption="Files (checkbox)" value={files} columns={columns} selectionMode="checkbox" selection={selection} onSelectionChange={setSelection} defaultExpandedKeys={new Set(['docs'])} />;
}

export const examples = [
  {
    title: 'Sortable file tree',
    code: `<TreeTable caption="Files" value={files} columns={columns} defaultExpandedKeys={new Set(['docs'])} />`,
    render: () => <TreeTable caption="Files" value={files} columns={columns} defaultExpandedKeys={new Set(['docs'])} />,
  },
  { title: 'Checkbox selection', code: `<TreeTable value={files} columns={columns} selectionMode="checkbox" selection={selection} onSelectionChange={setSelection} />`, render: () => <Selectable /> },
  {
    title: 'Lazy children',
    code: `<TreeTable value={roots} columns={columns} onLoadChildren={(node) => load(node.key)} />`,
    render: () => (
      <TreeTable
        caption="Lazy"
        value={[{ key: 'remote', label: 'Remote', data: { name: 'Remote', size: 0, type: 'Folder' } }]}
        columns={columns}
        onLoadChildren={() => new Promise<TreeNode<FileInfo>[]>((resolve) => setTimeout(() => resolve([{ key: 'r1', label: 'a.txt', data: { name: 'a.txt', size: 1, type: 'Text' } }]), 600))}
      />
    ),
  },
];

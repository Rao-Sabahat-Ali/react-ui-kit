import { Splitter } from './Splitter';

export const examples = [
  {
    title: 'Editor / preview with nested split',
    description: 'Drag the gutter or focus it and use arrows (Shift = 10%), Home/End and Enter to collapse. `stateKey` persists sizes.',
    code: `<Splitter stateKey="docs-demo" style={{ height: 240 }}>\n  <Splitter.Panel size={35} minSize={15}>List</Splitter.Panel>\n  <Splitter.Panel>\n    <Splitter layout="vertical">…</Splitter>\n  </Splitter.Panel>\n</Splitter>`,
    render: () => (
      <Splitter stateKey="docs-demo" className="border rounded" style={{ height: 240 }}>
        <Splitter.Panel size={35} minSize={15} className="p-3">List</Splitter.Panel>
        <Splitter.Panel>
          <Splitter layout="vertical">
            <Splitter.Panel className="p-3" minSize={20}>Editor</Splitter.Panel>
            <Splitter.Panel className="p-3" minSize={20}>Preview</Splitter.Panel>
          </Splitter>
        </Splitter.Panel>
      </Splitter>
    ),
  },
];

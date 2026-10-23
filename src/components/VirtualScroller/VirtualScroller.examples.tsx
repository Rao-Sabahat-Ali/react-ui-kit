import { useRef, useState } from 'react';
import { Button } from '../Button/Button';
import { VirtualScroller, type VirtualScrollerHandle } from './VirtualScroller';

const items = Array.from({ length: 100000 }, (_, i) => `Item ${i + 1}`);

function JumpDemo() {
  const ref = useRef<VirtualScrollerHandle>(null);
  return (
    <div className="d-grid gap-2">
      <Button size="sm" variant="secondary" onClick={() => ref.current?.scrollToIndex(5000)}>
        Jump to item 5001
      </Button>
      <VirtualScroller ref={ref} aria-label="Large list" items={items} itemSize={36} height="240px" itemTemplate={(item) => <div className="px-3 py-2 border-bottom">{item}</div>} />
    </div>
  );
}

function LazyDemo() {
  const [range, setRange] = useState('none');
  return (
    <div className="d-grid gap-2">
      <p className="mb-0 small">Loaded range: {range}</p>
      <VirtualScroller aria-label="Lazy list" lazy onLazyLoad={({ first, last }) => setRange(`${first}–${last}`)} items={items} itemSize={36} height="200px" itemTemplate={(item) => <div className="px-3 py-2">{item}</div>} />
    </div>
  );
}

export const examples = [
  {
    title: '100,000 items',
    description: 'Only the visible window plus overscan is in the DOM.',
    code: `<VirtualScroller items={items} itemSize={36} height="240px" itemTemplate={(item) => <div>{item}</div>} />`,
    render: () => <JumpDemo />,
  },
  {
    title: 'Lazy loading',
    code: `<VirtualScroller lazy onLazyLoad={({ first, last }) => load(first, last)} … />`,
    render: () => <LazyDemo />,
  },
  {
    title: 'Horizontal and grid',
    code: `<VirtualScroller orientation="horizontal" itemSize={120} height="100%" … />\n<VirtualScroller orientation="both" itemSize={[100, 60]} height="240px" … />`,
    render: () => (
      <div className="d-grid gap-3">
        <VirtualScroller aria-label="Horizontal list" orientation="horizontal" items={items} itemSize={120} height="100%" style={{ height: 56 }} itemTemplate={(item) => <div className="px-3 py-3 border-end">{item}</div>} />
        <VirtualScroller aria-label="Grid" orientation="both" items={items} itemSize={[100, 60]} height="240px" itemTemplate={(item) => <div className="p-2 small border">{item}</div>} />
      </div>
    ),
  },
];

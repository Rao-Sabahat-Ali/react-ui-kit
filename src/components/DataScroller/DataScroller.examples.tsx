import { useState } from 'react';
import { DataScroller } from './DataScroller';

interface Entry {
  id: number;
  title: string;
}

const TOTAL = 60;
const makeChunk = (from: number, size = 10): Entry[] => Array.from({ length: Math.min(size, TOTAL - from) }, (_, i) => ({ id: from + i + 1, title: `Event ${from + i + 1}` }));
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const row = (e: Entry) => (
  <div className="d-flex justify-content-between">
    <span>{e.title}</span>
    <span className="text-body-secondary small">#{e.id}</span>
  </div>
);

function Feed({ loadMode, failFirst = false }: { loadMode: 'auto' | 'manual'; failFirst?: boolean }) {
  const [items, setItems] = useState<Entry[]>(() => makeChunk(0));
  const [failed, setFailed] = useState(failFirst);
  const loadMore = async () => {
    await delay(600);
    if (failed) {
      setFailed(false);
      throw new Error('network');
    }
    setItems((prev) => [...prev, ...makeChunk(prev.length)]);
  };
  return <DataScroller aria-label="Activity" height="14rem" loadMode={loadMode} dataKey="id" items={items} hasMore={items.length < TOTAL} loadMore={loadMore} itemTemplate={row} />;
}

export const examples = [
  {
    title: 'Infinite list in a scroll box',
    description: 'Loads the next chunk as the end nears; "Load more" is always available for keyboard users.',
    code: `<DataScroller aria-label="Activity" height="14rem" items={items} hasMore={hasMore} loadMore={fetchNext} itemTemplate={(e) => <Row entry={e} />} />`,
    render: () => <Feed loadMode="auto" />,
  },
  {
    title: 'Manual loading with an error and retry',
    description: 'The first request fails; Retry asks again and the loaded rows stay.',
    code: `<DataScroller loadMode="manual" items={items} hasMore={hasMore} loadMore={fetchNext} itemTemplate={…} />`,
    render: () => <Feed loadMode="manual" failFirst />,
  },
  {
    title: 'Empty',
    code: `<DataScroller items={[]} hasMore={false} loadMore={noop} itemTemplate={…} />`,
    render: () => <DataScroller aria-label="Empty list" height="8rem" items={[] as Entry[]} hasMore={false} loadMore={() => {}} itemTemplate={row} />,
  },
];

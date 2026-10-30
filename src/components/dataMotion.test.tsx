import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExitGhosts } from '../motion/useExitGhosts';
import { Chart } from './Chart/Chart';
import { DataTable, type Column } from './DataTable/DataTable';
import { DataView } from './DataView/DataView';
import { FileUpload, type UploadFile } from './FileUpload/FileUpload';
import { Paginator } from './Paginator/Paginator';
import { PickList } from './PickList/PickList';
import { Sparkline } from './Sparkline/Sparkline';
import { Timeline } from './Timeline/Timeline';
import { Tree } from './Tree/Tree';

// Wave 3 (data) motion and v2 markup: the motion hooks only run where Web Animations exist, so these tests stub
// `document.getAnimations` where a ghost / intro is expected and leave it unset for the "jsdom = instant" cases.
const original = document.getAnimations;
afterEach(() => {
  if (original) document.getAnimations = original;
  else delete (document as { getAnimations?: unknown }).getAnimations;
  vi.useRealTimers();
});

function Ghosts({ items }: { items: { id: string }[] }) {
  const ghosts = useExitGhosts(items, items, (i) => i.id);
  return (
    <ul>
      {items.map((i) => (
        <li key={i.id}>{i.id}</li>
      ))}
      {ghosts.map((g) => (
        <li key={`g-${g.key}`} data-state="closed">
          {g.key}
        </li>
      ))}
    </ul>
  );
}

describe('useExitGhosts', () => {
  it('without Web Animations a removed item is simply gone', () => {
    const { rerender } = render(<Ghosts items={[{ id: 'a' }, { id: 'b' }]} />);
    rerender(<Ghosts items={[{ id: 'a' }]} />);
    expect(screen.queryByText('b')).not.toBeInTheDocument();
  });

  it('leaves a ghost for the exit duration, then drops it', () => {
    vi.useFakeTimers();
    document.getAnimations = () => [];
    const { rerender } = render(<Ghosts items={[{ id: 'a' }, { id: 'b' }]} />);
    rerender(<Ghosts items={[{ id: 'a' }]} />);
    const ghost = screen.getByText('b');
    expect(ghost).toHaveAttribute('data-state', 'closed');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByText('b')).not.toBeInTheDocument();
  });

  it('items that only leave the display (paging, filtering) do not ghost', () => {
    document.getAnimations = () => [];
    function Paged({ shown }: { shown: { id: string }[] }) {
      const all = [{ id: 'a' }, { id: 'b' }];
      const ghosts = useExitGhosts(all, shown, (i) => i.id);
      return <span data-testid="count">{ghosts.length}</span>;
    }
    const { rerender } = render(<Paged shown={[{ id: 'a' }, { id: 'b' }]} />);
    rerender(<Paged shown={[{ id: 'a' }]} />);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});

describe('Paginator', () => {
  it('draws the sliding accent mark under the current page', () => {
    const { container } = render(<Paginator page={2} total={200} onPageChange={() => {}} />);
    const list = container.querySelector<HTMLElement>('ul.ui-paginator__list')!;
    expect(list.style.getPropertyValue('--ui-mark-size')).not.toBe('');
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('DataTable v2', () => {
  interface Row {
    id: number;
    name: string;
  }
  const cols: Column<Row>[] = [{ field: 'name', header: 'Name', sortable: true }];
  const rows: Row[] = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Bo' },
    { id: 3, name: 'Cy' },
  ];

  it('sort indicator is a chevron in the accent state and the selected row carries the marker class', async () => {
    const user = userEvent.setup();
    const { container } = render(<DataTable data={rows} columns={cols} selectionMode="single" caption="People" />);
    await user.click(screen.getByRole('button', { name: /Name/ }));
    expect(container.querySelector('.ui-data-table__sort--active')).toBeInTheDocument();
    await user.click(screen.getByText('Bo'));
    expect(screen.getByText('Bo').closest('tr')).toHaveClass('ui-data-table__row--selected');
  });

  it('a removed row leaves an inert ghost row when Web Animations are available', () => {
    vi.useFakeTimers();
    document.getAnimations = () => [];
    const { rerender } = render(<DataTable data={rows} columns={cols} caption="People" />);
    rerender(<DataTable data={rows.slice(0, 2)} columns={cols} caption="People" />);
    const ghost = screen.getByText('Cy').closest('tr')!;
    expect(ghost).toHaveAttribute('data-state', 'closed');
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost).not.toHaveAttribute('data-row-key');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByText('Cy')).not.toBeInTheDocument();
  });

  it('without Web Animations a removed row is gone at once', () => {
    const { rerender } = render(<DataTable data={rows} columns={cols} caption="People" />);
    rerender(<DataTable data={rows.slice(0, 2)} columns={cols} caption="People" />);
    expect(screen.queryByText('Cy')).not.toBeInTheDocument();
  });
});

describe('Tree guide line', () => {
  it('a group carries its level so the dashed guide line sits under the parent chevron', () => {
    const { container } = render(<Tree value={[{ key: 'a', label: 'A', children: [{ key: 'a1', label: 'A1' }] }]} defaultExpandedKeys={new Set(['a'])} aria-label="t" />);
    const group = container.querySelector<HTMLElement>('.ui-tree__group')!;
    expect(group.style.getPropertyValue('--ui-tree-level')).toBe('1');
  });
});

describe('Timeline', () => {
  const events = [{ t: 'One' }, { t: 'Two' }, { t: 'Three' }];
  it('numbered markers carry the order', () => {
    const { container } = render(<Timeline value={events} numbered content={(e) => e.t} />);
    const markers = [...container.querySelectorAll('.ui-timeline__marker--number')].map((m) => m.textContent);
    expect(markers).toEqual(['1', '2', '3']);
  });

  it('default markers stay plain dots', () => {
    const { container } = render(<Timeline value={events} content={(e) => e.t} />);
    expect(container.querySelectorAll('.ui-timeline__marker--number')).toHaveLength(0);
    expect(container.querySelectorAll('.ui-timeline__marker')).toHaveLength(3);
  });
});

describe('Chart intro', () => {
  const data = { labels: ['a', 'b'], series: [{ name: 'S', values: [3, -2] }] };
  beforeEach(() => vi.useFakeTimers());

  it('plays on first render only: the figure is marked done after the draw-in', () => {
    const { container } = render(<Chart type="bar" data={data} title="Bars" />);
    const figure = container.querySelector('figure')!;
    expect(figure).not.toHaveAttribute('data-intro');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(figure).toHaveAttribute('data-intro', 'done');
  });

  it('bars carry their stagger index and negative bars grow from the top', () => {
    const { container } = render(<Chart type="bar" data={data} title="Bars" />);
    const bars = container.querySelectorAll<SVGElement>('.ui-chart__bar');
    expect(bars[0]!.style.getPropertyValue('--ui-i')).toBe('0');
    expect(bars[1]!.style.getPropertyValue('--ui-i')).toBe('1');
    expect(bars[1]).toHaveClass('ui-chart__bar--neg');
    expect(bars[0]).not.toHaveClass('ui-chart__bar--neg');
  });
});

describe('Sparkline bars', () => {
  it('negative bars grow from the zero line downwards', () => {
    const { container } = render(<Sparkline type="bar" values={[2, -1, 3]} />);
    expect(container.querySelectorAll('.ui-sparkline__bar--neg')).toHaveLength(1);
  });
});

describe('DataView', () => {
  it('switching layout keeps the items (FLIP is purely visual)', () => {
    const data = [{ id: 1, n: 'A' }, { id: 2, n: 'B' }];
    const { rerender } = render(<DataView aria-label="x" data={data} layout="grid" itemTemplate={(i) => <b>{i.n}</b>} />);
    rerender(<DataView aria-label="x" data={data} layout="list" itemTemplate={(i) => <b>{i.n}</b>} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('PickList transfer arrows', () => {
  it('moves the selected item with the arrow buttons', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PickList source={[{ id: 1, name: 'A' }]} target={[]} onChange={onChange} itemLabel={(i) => i.name} itemTemplate={(i) => i.name} />);
    await user.click(screen.getByRole('option', { name: 'A' }));
    await user.click(screen.getByRole('button', { name: 'Move to target' }));
    expect(onChange).toHaveBeenCalledWith({ source: [], target: [{ id: 1, name: 'A' }] });
  });
});

describe('FileUpload rows', () => {
  const file = (id: string): UploadFile => ({ id, file: new File(['x'], `${id}.txt`, { type: 'text/plain' }), status: 'pending', progress: 0 });

  it('rows present on first render sit still; a removed row leaves a ghost, then is gone', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    document.getAnimations = () => [];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<FileUpload defaultValue={[file('a'), file('b')]} />);
    expect(container.querySelectorAll('.ui-file-upload__item--new')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Remove a.txt' }));
    const ghost = container.querySelector('.ui-file-upload__item--ghost');
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost).toHaveTextContent('a.txt');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(container.querySelector('.ui-file-upload__item--ghost')).toBeNull();
    expect(container.querySelectorAll('.ui-file-upload__item')).toHaveLength(1);
  });
});

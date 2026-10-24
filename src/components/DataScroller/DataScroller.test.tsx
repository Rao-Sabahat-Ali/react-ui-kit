import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { DataScroller } from './DataScroller';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let observers: { cb: Callback; options?: IntersectionObserverInit; disconnected: boolean }[] = [];
const fakeIO = () =>
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      entry: (typeof observers)[number];
      constructor(cb: Callback, options?: IntersectionObserverInit) {
        this.entry = { cb, ...(options ? { options } : {}), disconnected: false };
        observers.push(this.entry);
      }
      observe() {}
      unobserve() {}
      disconnect() {
        this.entry.disconnected = true;
      }
    },
  );
const live = () => observers.filter((o) => !o.disconnected);
const intersect = () => act(() => live().at(-1)!.cb([{ isIntersecting: true }]));

const rows = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ id: from + i + 1, name: `Row ${from + i + 1}` }));
const template = (r: { name: string }) => <span>{r.name}</span>;

beforeEach(() => {
  observers = [];
});
afterEach(() => vi.unstubAllGlobals());

describe('DataScroller', () => {
  it('AC-1: renders items as list items inside a labelled region', () => {
    render(<DataScroller aria-label="Activity" items={rows(3)} itemTemplate={template} loadMore={() => {}} />);
    const region = screen.getByRole('region', { name: 'Activity' });
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(region).toContainElement(screen.getByRole('list'));
    expect(screen.getByText('Row 2')).toBeInTheDocument();
  });

  it('AC-2: Load more button calls loadMore once via click and keyboard', async () => {
    const loadMore = vi.fn();
    render(<DataScroller aria-label="A" loadMode="manual" items={rows(2)} itemTemplate={template} loadMore={loadMore} />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
    screen.getByRole('button', { name: 'Load more' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(loadMore).toHaveBeenCalledTimes(2);
    await userEvent.keyboard(' ');
    expect(loadMore).toHaveBeenCalledTimes(3);
  });

  it('AC-3: auto mode loads when the sentinel intersects; manual does not observe', () => {
    fakeIO();
    const loadMore = vi.fn();
    const { unmount } = render(<DataScroller aria-label="A" items={rows(2)} itemTemplate={template} loadMore={loadMore} />);
    expect(loadMore).not.toHaveBeenCalled();
    intersect();
    expect(loadMore).toHaveBeenCalledTimes(1);
    unmount();
    observers = [];
    render(<DataScroller aria-label="A" loadMode="manual" items={rows(2)} itemTemplate={template} loadMore={loadMore} />);
    expect(observers).toHaveLength(0);
  });

  it('AC-4: no overlapping loads; button is aria-disabled, relabelled and stays focusable', async () => {
    let resolve!: () => void;
    const loadMore = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<DataScroller aria-label="A" loadMode="manual" items={rows(2)} itemTemplate={template} loadMore={loadMore} />);
    const button = screen.getByRole('button', { name: 'Load more' });
    await userEvent.click(button);
    const busy = screen.getByRole('button', { name: 'Loading more…' });
    expect(busy).toBe(button);
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    busy.focus();
    expect(busy).toHaveFocus();
    await userEvent.click(busy);
    expect(loadMore).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    expect(screen.getByRole('button', { name: 'Load more' })).not.toHaveAttribute('aria-disabled');
  });

  it('AC-5: initial loading with no items shows skeleton rows and aria-busy', () => {
    render(<DataScroller aria-label="A" items={[]} loading loadingItems={4} itemTemplate={template} loadMore={() => {}} />);
    expect(screen.getByRole('region', { name: 'A', busy: true })).toBeInTheDocument();
    expect(document.querySelectorAll('.ui-data-scroller__skeleton')).toHaveLength(4);
  });

  it('AC-6: empty, not loading and no more shows emptyMessage', () => {
    const { rerender } = render(<DataScroller aria-label="A" items={[]} hasMore={false} itemTemplate={template} loadMore={() => {}} />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
    rerender(<DataScroller aria-label="A" items={[]} hasMore={false} emptyMessage="Nothing yet" itemTemplate={template} loadMore={() => {}} />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('AC-7: rejected loadMore shows alert + Retry; items are kept', async () => {
    const loadMore = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    render(<DataScroller aria-label="A" loadMode="manual" items={rows(2)} itemTemplate={template} loadMore={loadMore} />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load more items');
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(loadMore).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('button', { name: 'Load more' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('AC-8: announces added items and the end of the list, then removes the button', () => {
    const { rerender } = render(<DataScroller aria-label="A" items={rows(2)} itemTemplate={template} loadMore={() => {}} />);
    rerender(<DataScroller aria-label="A" items={rows(5)} itemTemplate={template} loadMore={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('3 items loaded');
    rerender(<DataScroller aria-label="A" items={rows(6)} hasMore={false} itemTemplate={template} loadMore={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('1 item loaded. End of list');
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('AC-9: focus moves to the viewport when the list ends while the button is focused', async () => {
    function Harness() {
      const [items, setItems] = useState(rows(2));
      const [more, setMore] = useState(true);
      return (
        <DataScroller
          aria-label="A"
          loadMode="manual"
          items={items}
          hasMore={more}
          itemTemplate={template}
          loadMore={() => {
            setItems(rows(4));
            setMore(false);
          }}
        />
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(screen.getByRole('region', { name: 'A' })).toHaveFocus();
  });

  it('AC-10: inline renders a focusable scroll viewport with height; window observes with the viewport as root', () => {
    fakeIO();
    const { unmount } = render(<DataScroller aria-label="A" height="160px" items={rows(2)} itemTemplate={template} loadMore={() => {}} />);
    const region = screen.getByRole('region', { name: 'A' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveStyle({ height: "160px" });
    expect(live().at(-1)!.options?.root).toBe(region);
    unmount();
    observers = [];
    render(<DataScroller aria-label="A" scrollTarget="window" items={rows(2)} itemTemplate={template} loadMore={() => {}} />);
    const win = screen.getByRole('region', { name: 'A' });
    expect(win).toHaveAttribute('tabindex', '-1');
    expect(win.style.height).toBe('');
    expect(live().at(-1)!.options?.root).toBeNull();
  });

  it('AC-11: controlled loading/error override internal state', async () => {
    const loadMore = vi.fn();
    const { rerender } = render(<DataScroller aria-label="A" loadMode="manual" items={rows(2)} loading itemTemplate={template} loadMore={loadMore} />);
    expect(screen.getByRole('button', { name: 'Loading more…' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Loading more…' }));
    expect(loadMore).not.toHaveBeenCalled();
    rerender(<DataScroller aria-label="A" loadMode="manual" items={rows(2)} loading={false} error="Server said no" itemTemplate={template} loadMore={loadMore} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Server said no');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('AC-12: works without IntersectionObserver through the button', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const loadMore = vi.fn();
    render(<DataScroller aria-label="A" items={rows(2)} itemTemplate={template} loadMore={loadMore} />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('AC-13: dataKey keeps rows mounted when items are prepended', () => {
    const { rerender } = render(<DataScroller aria-label="A" dataKey="id" items={rows(2, 1)} itemTemplate={template} loadMore={() => {}} />);
    const second = screen.getByText('Row 2').closest('li');
    rerender(<DataScroller aria-label="A" dataKey="id" items={[{ id: 0, name: 'Row 0' }, ...rows(2, 1)]} itemTemplate={template} loadMore={() => {}} />);
    expect(screen.getByText('Row 2').closest('li')).toBe(second);
  });

  it('AC-14: strings come from LocaleProvider messages', async () => {
    render(
      <LocaleProvider locale="en" messages={{ loadMore: 'Mehr laden', loadingMore: 'Lädt…', retry: 'Nochmal', loadFailed: 'Fehler', endOfList: 'Ende', itemsLoaded_other: '{count} geladen' }}>
        <DataScroller aria-label="A" loadMode="manual" items={rows(2)} itemTemplate={template} loadMore={vi.fn().mockRejectedValue(new Error('x'))} />
      </LocaleProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mehr laden' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Fehler');
    expect(screen.getByRole('button', { name: 'Nochmal' })).toBeInTheDocument();
  });
});

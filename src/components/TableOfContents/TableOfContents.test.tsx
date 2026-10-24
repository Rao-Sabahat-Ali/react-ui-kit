import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TableOfContents } from './TableOfContents';

let callbacks: (() => void)[] = [];
class FakeIO {
  constructor(cb: () => void) {
    callbacks.push(cb);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}
const tops: Record<string, number> = {};
const setTops = (t: Record<string, number>) => {
  Object.assign(tops, t);
  act(() => callbacks.forEach((cb) => cb()));
};

const Article = ({ children }: { children?: React.ReactNode }) => (
  <>
    <article id="article">
      <h2>Intro</h2>
      <h3>Why it matters</h3>
      <h3>Café basics</h3>
      <h2 id="api">API</h2>
      <h3>Props</h3>
      <h3>Why it matters</h3>
    </article>
    {children}
  </>
);

describe('TableOfContents', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    callbacks = [];
    for (const k of Object.keys(tops)) delete tops[k];
    vi.stubGlobal('IntersectionObserver', FakeIO);
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const top = tops[this.id] ?? 2000;
      return { top, bottom: top + 20, left: 0, right: 100, width: 100, height: 20, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('AC-1: renders a nav named by label with an ordered list of links to #id', () => {
    render(<TableOfContents label="Contents" items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} />);
    const nav = screen.getByRole('navigation', { name: 'Contents' });
    expect(nav.querySelector('ol')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'A' })).toHaveAttribute('href', '#a');
    expect(screen.getByRole('link', { name: 'B' })).toHaveAttribute('href', '#b');
  });

  it('AC-1: defaults the name to the locale string', () => {
    render(<TableOfContents items={[{ id: 'a', label: 'A' }]} />);
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
  });

  it('AC-2: builds items from headings, assigns missing ids and nests by level', async () => {
    render(
      <Article>
        <TableOfContents from="#article" />
      </Article>,
    );
    const links = await screen.findAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Intro', 'Why it matters', 'Café basics', 'API', 'Props', 'Why it matters']);
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs[0]).toBe('#toc-intro');
    expect(hrefs[2]).toBe('#toc-cafe-basics');
    expect(hrefs[3]).toBe('#api');
    expect(hrefs[1]).toBe('#toc-why-it-matters');
    expect(hrefs[5]).toBe('#toc-why-it-matters-2');
    expect(document.getElementById('toc-intro')!.tagName).toBe('H2');
    const nested = screen.getByRole('link', { name: 'Café basics' }).closest('ol')!;
    expect(nested).toHaveClass('ui-toc__list--nested');
    expect(nested.parentElement!.querySelector(':scope > a')).toHaveTextContent('Intro');
  });

  it('AC-3: items with children render nested lists', () => {
    render(<TableOfContents items={[{ id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] }, { id: 'b', label: 'B' }]} />);
    const inner = screen.getByRole('link', { name: 'A1' }).closest('ol')!;
    expect(inner.parentElement!.closest('ol')).not.toBe(inner);
    expect(inner.closest('li')!.querySelector('a')).toHaveTextContent('A');
  });

  it('AC-4: exactly one link is aria-current=location and it follows the scroll; onActiveChange fires', () => {
    const onActiveChange = vi.fn();
    render(
      <Article>
        <TableOfContents from="#article" onActiveChange={onActiveChange} />
      </Article>,
    );
    setTops({ 'toc-intro': 5, 'toc-why-it-matters': 300, api: 600 });
    const current = () => screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'location');
    expect(current().map((l) => l.textContent)).toEqual(['Intro']);
    setTops({ 'toc-intro': -400, 'toc-why-it-matters': -100, 'toc-cafe-basics': 10, api: 500 });
    expect(current().map((l) => l.textContent)).toEqual(['Café basics']);
    setTops({ 'toc-cafe-basics': -200, api: 3 });
    expect(current().map((l) => l.textContent)).toEqual(['API']);
    expect(onActiveChange).toHaveBeenLastCalledWith('api');
    expect(onActiveChange).toHaveBeenCalledWith('toc-intro');
  });

  it('AC-5: click scrolls (smooth), focuses the target and updates the hash', () => {
    render(
      <Article>
        <TableOfContents from="#article" offset={24} />
      </Article>,
    );
    const link = screen.getByRole('link', { name: 'API' });
    fireEvent.click(link);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(document.getElementById('api')).toHaveFocus();
    expect(window.location.hash).toBe('#api');
    expect(document.getElementById('api')!.style.scrollMarginBlockStart).toBe('24px');
  });

  it('AC-5: uses instant scrolling under reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }));
    render(
      <Article>
        <TableOfContents from="#article" />
      </Article>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'API' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('AC-6: onNavigate replaces the hash update; modified clicks are left alone', () => {
    const onNavigate = vi.fn();
    render(
      <Article>
        <TableOfContents from="#article" onNavigate={onNavigate} />
      </Article>,
    );
    const link = screen.getByRole('link', { name: 'API' });
    const notCancelled = fireEvent.click(link);
    expect(notCancelled).toBe(false);
    expect(onNavigate).toHaveBeenCalledWith('#api', expect.anything());
    expect(window.location.hash).toBe('');
    scrollIntoView.mockClear();
    const free = fireEvent.click(link, { ctrlKey: true });
    expect(free).toBe(true);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('AC-7: sticky adds the modifier and exposes the offset', () => {
    render(<TableOfContents sticky offset={40} items={[{ id: 'a', label: 'A' }]} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('ui-toc--sticky');
    expect(nav.style.getPropertyValue('--ui-toc-offset')).toBe('40px');
  });

  it('AC-8: without IntersectionObserver nothing crashes and no link is current', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<TableOfContents items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} />);
    expect(document.querySelector('[aria-current]')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'A' }));
  });
});

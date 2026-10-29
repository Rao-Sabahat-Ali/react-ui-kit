import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Splitter } from './Splitter';

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 600, top: 0, left: 0, right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
});

const tree = (props: React.ComponentProps<typeof Splitter> = {}) => (
  <Splitter {...props}>
    <Splitter.Panel size={40} minSize={20}>Left</Splitter.Panel>
    <Splitter.Panel size={60} minSize={10}>Right</Splitter.Panel>
  </Splitter>
);

const gutter = () => screen.getByRole('separator');
const now = () => Number(gutter().getAttribute('aria-valuenow'));

describe('Splitter', () => {
  it('exposes separator semantics', () => {
    render(tree());
    const g = gutter();
    expect(g).toHaveAttribute('tabindex', '0');
    expect(g).toHaveAttribute('aria-orientation', 'vertical');
    expect(g).toHaveAttribute('aria-valuenow', '40');
    expect(g).toHaveAttribute('aria-valuemin', '20');
    expect(g).toHaveAttribute('aria-valuemax', '90');
    expect(document.getElementById(g.getAttribute('aria-controls')!)).toHaveTextContent('Left');
  });

  it('AC-1: pointer drag resizes respecting min sizes', () => {
    const onResizeEnd = vi.fn();
    render(tree({ onResizeEnd }));
    const g = gutter();
    fireEvent.pointerDown(g, { clientX: 400, button: 0, pointerId: 1 });
    fireEvent.pointerMove(g, { clientX: 500, pointerId: 1 });
    expect(now()).toBe(50);
    fireEvent.pointerMove(g, { clientX: 100, pointerId: 1 });
    expect(now()).toBe(20); // minSize of left
    fireEvent.pointerMove(g, { clientX: 990, pointerId: 1 });
    expect(now()).toBe(90); // right keeps its 10% minimum
    fireEvent.pointerUp(g, { clientX: 990, pointerId: 1 });
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd.mock.calls[0]![0]).toEqual([90, 10]);
  });

  it('AC-2: keyboard resize per key table', async () => {
    render(tree());
    gutter().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(now()).toBe(41);
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(now()).toBe(51);
    await userEvent.keyboard('{ArrowLeft}');
    expect(now()).toBe(50);
    await userEvent.keyboard('{Home}');
    expect(now()).toBe(20);
    await userEvent.keyboard('{End}');
    expect(now()).toBe(90);
    await userEvent.keyboard('{Enter}');
    expect(now()).toBe(0);
    await userEvent.keyboard('{Enter}');
    expect(now()).toBe(90);
  });

  it('vertical layout uses ArrowUp/ArrowDown and horizontal separator orientation', async () => {
    render(tree({ layout: 'vertical' }));
    expect(gutter()).toHaveAttribute('aria-orientation', 'horizontal');
    gutter().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(now()).toBe(41);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(now()).toBe(39);
  });

  it('AC-3: stateKey persists sizes in localStorage with ui: prefix and restores them', async () => {
    const first = render(tree({ stateKey: 'editor' }));
    gutter().focus();
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(JSON.parse(localStorage.getItem('ui:splitter:editor')!)).toEqual([50, 50]);
    first.unmount();
    render(tree({ stateKey: 'editor' }));
    expect(now()).toBe(50);
  });

  it('ignores corrupt stored state', () => {
    localStorage.setItem('ui:splitter:bad', '{nope');
    render(tree({ stateKey: 'bad' }));
    expect(now()).toBe(40);
  });

  it('supports nested splitters', () => {
    render(
      <Splitter>
        <Splitter.Panel>A</Splitter.Panel>
        <Splitter.Panel>
          <Splitter layout="vertical">
            <Splitter.Panel>B</Splitter.Panel>
            <Splitter.Panel>C</Splitter.Panel>
          </Splitter>
        </Splitter.Panel>
      </Splitter>,
    );
    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('the gutter is a dashed guide line with a grip, accent on focus and drag', () => {
    const scss = readFileSync(`${process.cwd()}/src/components/Splitter/Splitter.scss`, 'utf8');
    expect(scss).toMatch(/border-inline-start: var\(--ui-line-width\) dashed var\(--ui-splitter-guide\)/);
    expect(scss).toMatch(/--ui-splitter-guide: var\(--ui-color-accent\)/);
    render(tree());
    expect(document.querySelector('.ui-splitter__gutter .ui-splitter__handle')).toBeInTheDocument();
  });
});

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StepPanel, StepSheet, useStepSheet } from './StepSheet';

let reduced = false;
let animate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  reduced = false;
  animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn(), finish: vi.fn(), addEventListener: vi.fn() }));
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = animate;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduced-motion') ? reduced : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
});

function Next() {
  const { next } = useStepSheet();
  return <button onClick={next}>Continue</button>;
}

const sheet = (props: Partial<React.ComponentProps<typeof StepSheet>> = {}) => (
  <StepSheet aria-label="Session" {...props}>
    <StepPanel title="Warm up" visual="5×" action={<Next />}>
      Five words.
    </StepPanel>
    <StepPanel title="Learn" action={<Next />}>
      Three words.
    </StepPanel>
    <StepPanel title="Review" action={<button>Finish</button>}>
      Check.
    </StepPanel>
  </StepSheet>
);

describe('StepSheet', () => {
  it('AC-1: an ordered list named by aria-label with numbered items', () => {
    const { container } = render(sheet());
    const list = screen.getByRole('list', { name: 'Session' });
    expect(list.tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect([...container.querySelectorAll('.ui-step-panel__numeral')].map((n) => n.textContent)).toEqual(['1', '2', '3']);
  });

  it('AC-2: exactly one panel is aria-current="step"; earlier complete, later upcoming', () => {
    render(sheet({ defaultCurrent: 1 }));
    const items = screen.getAllByRole('listitem');
    expect(items.filter((li) => li.getAttribute('aria-current') === 'step')).toEqual([items[1]]);
    expect(items.map((li) => li.getAttribute('data-status'))).toEqual(['complete', 'current', 'upcoming']);
  });

  it('AC-3: status is also written as visually hidden text', () => {
    render(sheet({ defaultCurrent: 1 }));
    expect(screen.getByText('Step 1 of 3, completed')).toHaveClass('visually-hidden');
    expect(screen.getByText('Step 2 of 3, current')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 3, not started')).toBeInTheDocument();
  });

  it('AC-4: complete panels show the ink check; the current panel carries the accent modifier', () => {
    const { container } = render(sheet({ defaultCurrent: 1 }));
    const items = screen.getAllByRole('listitem');
    expect(items[0]!.querySelector('.ui-step-panel__check')).toBeInTheDocument();
    expect(items[1]!.querySelector('.ui-step-panel__check')).toBeNull();
    expect(container.querySelectorAll('.ui-step-panel--current')).toHaveLength(1);
  });

  it('AC-5: titles are headings (level 3 by default, configurable) and slots render', () => {
    render(
      <StepSheet aria-label="x">
        <StepPanel title="A" headingLevel={2} visual="V" action={<button>Go</button>}>
          Body
        </StepPanel>
      </StepSheet>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'A' })).toBeInTheDocument();
    expect(screen.getByText('V')).toHaveClass('ui-step-panel__visual');
    expect(screen.getByText('Body')).toHaveClass('ui-step-panel__body');
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    render(sheet());
    expect(screen.getByRole('heading', { level: 3, name: 'Warm up' })).toBeInTheDocument();
  });

  it('AC-6: the action of a non-current panel is inert', () => {
    const { container } = render(sheet());
    const actions = container.querySelectorAll('.ui-step-panel__action');
    expect(actions[0]).not.toHaveAttribute('inert');
    expect(actions[1]).toHaveAttribute('inert');
    expect(actions[2]).toHaveAttribute('inert');
  });

  it('AC-7: uncontrolled movement via useStepSheet calls onCurrentChange; controlled follows the prop', async () => {
    const onCurrentChange = vi.fn();
    const { rerender } = render(sheet({ onCurrentChange }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Continue' })[0]!);
    expect(onCurrentChange).toHaveBeenCalledWith(1);
    expect(screen.getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    rerender(sheet({ current: 2, onCurrentChange }));
    expect(screen.getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }));
  });

  it('AC-8: focus moves to the new current title when it was inside the sheet; initial render does not steal it', async () => {
    render(sheet());
    expect(document.body).toHaveFocus();
    await userEvent.click(screen.getAllByRole('button', { name: 'Continue' })[0]!);
    expect(screen.getByRole('heading', { name: 'Learn' })).toHaveFocus();
  });

  it('AC-9: a panel that becomes current assembles its parts; assemble={false} and reduced motion calm it', async () => {
    const first = render(sheet());
    expect(animate).toHaveBeenCalled();
    const guideCalls = animate.mock.calls.filter(([frames]) => 'clipPath' in (frames as Keyframe[])[0]!);
    expect(guideCalls.length).toBe(1);
    animate.mockClear();
    await userEvent.click(screen.getAllByRole('button', { name: 'Continue' })[0]!);
    expect(animate).toHaveBeenCalled();
    first.unmount();

    animate.mockClear();
    render(sheet({ assemble: false }));
    expect(animate).not.toHaveBeenCalled();
    document.body.innerHTML = '';

    reduced = true;
    animate.mockClear();
    render(sheet());
    for (const [frames] of animate.mock.calls) expect((frames as Keyframe[]).every((k) => !('transform' in k) && !('clipPath' in k))).toBe(true);
  });

  it('AC-10: a panel status prop overrides the derived status', () => {
    render(
      <StepSheet aria-label="x">
        <StepPanel title="A" status="upcoming">
          a
        </StepPanel>
        <StepPanel title="B">b</StepPanel>
      </StepSheet>,
    );
    expect(screen.getAllByRole('listitem').map((li) => li.getAttribute('data-status'))).toEqual(['upcoming', 'upcoming']);
  });

  it('AC-11: layout sets the strip/stack modifier', () => {
    const { rerender } = render(sheet());
    expect(screen.getByRole('list')).toHaveClass('ui-step-sheet--strip');
    rerender(sheet({ layout: 'stack' }));
    expect(screen.getByRole('list')).toHaveClass('ui-step-sheet--stack');
    act(() => {});
  });
});

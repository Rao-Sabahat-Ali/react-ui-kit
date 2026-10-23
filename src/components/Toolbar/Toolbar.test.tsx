import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  it('AC-1: slots render in order with wrapping layout', () => {
    render(<Toolbar ariaLabel="Actions" start={<button>Start</button>} center={<button>Center</button>} end={<button>End</button>} />);
    const bar = screen.getByRole('toolbar', { name: 'Actions' });
    expect(bar).toHaveClass('btn-toolbar');
    expect(Array.from(bar.children).map((c) => c.textContent)).toEqual(['Start', 'Center', 'End']);
    expect(bar.children[0]).toHaveClass('ui-toolbar__start');
    expect(bar.children[1]).toHaveClass('ui-toolbar__center');
    expect(bar.children[2]).toHaveClass('ui-toolbar__end');
  });

  it('AC-2: roving gives a single tab stop and arrow navigation', async () => {
    render(
      <>
        <button>Before</button>
        <Toolbar ariaLabel="Tools" roving start={<><button>One</button><button>Two</button></>} end={<><button disabled>Off</button><button>Three</button></>} />
        <button>After</button>
      </>,
    );
    const [one, two, three] = ['One', 'Two', 'Three'].map((n) => screen.getByRole('button', { name: n }));
    expect(one).toHaveAttribute('tabindex', '0');
    expect(two).toHaveAttribute('tabindex', '-1');
    await userEvent.tab();
    await userEvent.tab();
    expect(one).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(one).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(two).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(three).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(one).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(three).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(one).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(three).toHaveFocus();
    expect(three).toHaveAttribute('tabindex', '0');
    expect(one).toHaveAttribute('tabindex', '-1');
  });
});

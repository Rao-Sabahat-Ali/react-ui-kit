import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FocusTrap } from './FocusTrap';

describe('FocusTrap', () => {
  it('AC-1: Tab wraps last → first and Shift+Tab first → last', async () => {
    render(
      <FocusTrap>
        <button type="button">one</button>
        <button type="button">two</button>
      </FocusTrap>,
    );
    expect(screen.getByText('one')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByText('two')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByText('one')).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByText('two')).toHaveFocus();
  });

  it('AC-2: initialFocus wins; container focused when nothing focusable', () => {
    function WithInitial() {
      const ref = useRef<HTMLButtonElement>(null);
      return (
        <FocusTrap initialFocus={ref}>
          <button type="button">a</button>
          <button type="button" ref={ref}>b</button>
        </FocusTrap>
      );
    }
    const { unmount } = render(<WithInitial />);
    expect(screen.getByText('b')).toHaveFocus();
    unmount();
    render(<FocusTrap data-testid="empty">text only</FocusTrap>);
    expect(screen.getByTestId('empty')).toHaveFocus();
  });

  it('AC-3: restores focus on deactivate', async () => {
    function Toggle() {
      const [on, setOn] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOn(true)}>open</button>
          {on && (
            <FocusTrap>
              <button type="button" onClick={() => setOn(false)}>close</button>
            </FocusTrap>
          )}
        </>
      );
    }
    render(<Toggle />);
    await userEvent.click(screen.getByText('open'));
    expect(screen.getByText('close')).toHaveFocus();
    await userEvent.click(screen.getByText('close'));
    expect(screen.getByText('open')).toHaveFocus();
  });

  it('AC-4: only the top-most trap handles Tab', async () => {
    render(
      <FocusTrap>
        <button type="button">outer</button>
        <FocusTrap>
          <button type="button">inner1</button>
          <button type="button">inner2</button>
        </FocusTrap>
      </FocusTrap>,
    );
    expect(screen.getByText('inner1')).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByText('inner1')).toHaveFocus();
  });
});

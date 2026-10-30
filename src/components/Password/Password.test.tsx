import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Password } from './Password';

describe('Password', () => {
  it('AC-1: toggle switches input type and aria-pressed, keeping caret', async () => {
    render(<Password aria-label="Password" defaultValue="secret12" />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    input.focus();
    input.setSelectionRange(3, 3);
    await userEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(input.selectionStart).toBe(3);
    expect(input).toHaveFocus();
    await userEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('AC-1: toggleMask=false hides the button', () => {
    render(<Password aria-label="Password" toggleMask={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('AC-2: strength meter updates and announces politely', async () => {
    render(<Password aria-label="Password" feedback />);
    const input = screen.getByLabelText('Password');
    const meter = screen.getByRole('progressbar');
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    await userEvent.type(input, 'abc');
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('status')).toHaveTextContent('Password strength: Weak');
    await userEvent.clear(input);
    await userEvent.type(input, 'Abcdefgh1!xyz');
    expect(meter).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByRole('status')).toHaveTextContent('Password strength: Strong');
  });

  it('AC-2: custom strength function is used', async () => {
    render(<Password aria-label="Password" feedback strength={() => 2} />);
    await userEvent.type(screen.getByLabelText('Password'), 'a');
    expect(screen.getByRole('status')).toHaveTextContent('Password strength: Medium');
  });

  it('AC-3: requirements expose met/unmet as text', async () => {
    render(<Password aria-label="Password" requirements={[{ label: 'At least 4 chars', test: (v) => v.length >= 4 }]} />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveTextContent('At least 4 chars: not met');
    await userEvent.type(screen.getByLabelText('Password'), 'abcd');
    expect(item).toHaveTextContent('At least 4 chars: met');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(/At least 4 chars: met/);
  });

  it('AC-4: autocomplete defaults and security attributes', () => {
    const { rerender } = render(<Password aria-label="Password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('autocapitalize', 'off');
    rerender(<Password aria-label="Password" feedback />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    rerender(<Password aria-label="Password" feedback autoComplete="current-password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });
});

describe('Password (v2)', () => {
  it('AC-v2-1: the strength bar grows with transform, not with its width', () => {
    const { container } = render(<Password aria-label="Password" feedback defaultValue="Abcdef12!x" />);
    const bar = container.querySelector<HTMLElement>('.ui-password__meter-bar');
    expect(bar).toBeInTheDocument();
    expect(bar!.style.transform).toMatch(/^scaleX\(/);
    expect(bar!.style.inlineSize).toBe('');
  });
});

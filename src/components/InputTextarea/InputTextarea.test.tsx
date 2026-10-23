import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { InputTextarea } from './InputTextarea';

describe('InputTextarea', () => {
  afterEach(() => vi.restoreAllMocks());

  it('AC-1: autoResize adjusts height on input and caps at maxRows', async () => {
    let scroll = 60;
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => scroll);
    render(<InputTextarea aria-label="Bio" autoResize maxRows={3} />);
    const box = screen.getByRole('textbox', { name: 'Bio' });
    expect(box).toHaveStyle({ height: '60px' });
    scroll = 70;
    await userEvent.type(box, 'a');
    expect(box).toHaveStyle({ height: '70px', overflowY: 'hidden' });
    scroll = 500;
    await userEvent.type(box, 'b');
    // 3 rows * 24px fallback line height
    expect(box).toHaveStyle({ height: '72px', overflowY: 'auto' });
  });

  it('AC-2: counter shows length and is linked via aria-describedby', async () => {
    render(<InputTextarea aria-label="Bio" maxLength={10} showCount defaultValue="abc" />);
    const box = screen.getByRole('textbox', { name: 'Bio' });
    expect(box).toHaveAccessibleDescription('3 / 10');
    await userEvent.type(box, 'defghi');
    expect(box).toHaveAccessibleDescription('9 / 10');
    expect(screen.getByRole('status')).toHaveTextContent('9 / 10');
  });

  it('AC-2: counter keeps Field help in describedby', () => {
    render(
      <Field label="Bio" help="Short bio">
        <InputTextarea showCount maxLength={5} />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Bio' })).toHaveAccessibleDescription('Short bio 0 / 5');
  });

  it('AC-3: uncontrolled emits value first and updates', async () => {
    const onChange = vi.fn();
    render(<InputTextarea aria-label="Note" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'hi');
    expect(onChange).toHaveBeenLastCalledWith('hi', expect.anything());
    expect(screen.getByRole('textbox')).toHaveValue('hi');
  });

  it('AC-3: controlled value follows the prop', async () => {
    function Harness() {
      const [v, setV] = useState('x');
      return <InputTextarea aria-label="Note" value={v} onChange={(n) => setV(n.toUpperCase())} />;
    }
    render(<Harness />);
    await userEvent.type(screen.getByRole('textbox'), 'y');
    expect(screen.getByRole('textbox')).toHaveValue('XY');
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { Rating } from './Rating';

describe('Rating', () => {
  it('AC-1: click sets value; clicking the current value clears when cancel', async () => {
    const onChange = vi.fn();
    render(<Rating onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: '4 of 5 stars' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole('radio', { name: '4 of 5 stars' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '4 of 5 stars' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('radio', { checked: true })).toBeNull();
  });

  it('AC-1: cancel=false keeps the value on repeat click', async () => {
    const onChange = vi.fn();
    render(<Rating cancel={false} defaultValue={2} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: '2 of 5 stars' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: '2 of 5 stars' })).toBeChecked();
  });

  it('AC-2: arrow keys change the value; Delete clears', async () => {
    function Harness() {
      const [v, setV] = useState<number | null>(2);
      return <Rating value={v} onChange={setV} />;
    }
    render(<Harness />);
    screen.getByRole('radio', { name: '2 of 5 stars' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '3 of 5 stars' })).toBeChecked();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('radio', { name: '1 of 5 stars' })).toBeChecked();
    await userEvent.keyboard('{Delete}');
    expect(screen.queryByRole('radio', { checked: true })).toBeNull();
  });

  it('is a labelled radio group (Field label wins over default)', () => {
    render(
      <Field label="Quality">
        <Rating stars={3} />
      </Field>,
    );
    expect(screen.getByRole('radiogroup', { name: 'Quality' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('standalone radio group has the default name', () => {
    render(<Rating />);
    expect(screen.getByRole('radiogroup', { name: 'Rating' })).toBeInTheDocument();
  });

  it('AC-3: read-only renders fractional fill and accessible text', () => {
    const { container } = render(<Rating readOnly value={4.5} />);
    expect(screen.getByRole('img', { name: '4.5 of 5 stars' })).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
    const fills = Array.from(container.querySelectorAll<HTMLElement>('.ui-rating__star-fill')).map((n) => n.style.inlineSize);
    expect(fills).toEqual(['100%', '100%', '100%', '100%', '50%']);
  });

  it('disabled radios cannot be changed', async () => {
    const onChange = vi.fn();
    render(<Rating disabled onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: '3 of 5 stars' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

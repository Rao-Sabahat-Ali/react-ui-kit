import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { compileScss } from '../../../test/scss';
import { InputText } from '../InputText/InputText';
import { InputTextarea } from '../InputTextarea/InputTextarea';
import { Select } from '../Select/Select';
import { IftaLabel } from './IftaLabel';

const countries = [{ label: 'Sweden', value: 'se' }, { label: 'Norway', value: 'no' }];

describe('IftaLabel', () => {
  it('AC-1: label before the control inside the box; the label names the control', () => {
    const { container } = render(<IftaLabel label="Email"><InputText type="email" /></IftaLabel>);
    const box = container.querySelector('.ui-ifta__box')!;
    const label = box.querySelector('label')!;
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(box.firstElementChild).toBe(label);
    expect(label.htmlFor).toBe(input.id);
    expect(box.contains(input)).toBe(true);
  });

  it('AC-2: works with InputText, InputTextarea, custom Select and native Select; keeps a given id', () => {
    render(
      <>
        <IftaLabel label="Name"><InputText id="my-name" /></IftaLabel>
        <IftaLabel label="Bio"><InputTextarea /></IftaLabel>
        <IftaLabel label="Country"><Select options={countries} /></IftaLabel>
        <IftaLabel label="Region"><Select native options={countries} /></IftaLabel>
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('id', 'my-name');
    expect(screen.getByRole('textbox', { name: 'Bio' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Country/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Region' })).toBeInTheDocument();
  });

  it('AC-3: help and error are linked; error marks the control and the box invalid', () => {
    const { container } = render(
      <IftaLabel label="Email" help="We never share it" error="Enter a valid address"><InputText /></IftaLabel>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('We never share it Enter a valid address');
    expect(container.querySelector('.ui-ifta__box')).toHaveClass('ui-ifta__box--invalid');
  });

  it('AC-4: required adds an aria-hidden asterisk and sets required on the control', () => {
    const { container } = render(<IftaLabel label="Email" required><InputText /></IftaLabel>);
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeRequired();
    expect(container.querySelector('.ui-ifta__required')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-5: the label does not move when filled; clicking it focuses the control', async () => {
    const { container } = render(<IftaLabel label="Email"><InputText defaultValue="a@b.se" /></IftaLabel>);
    const label = container.querySelector('label')!;
    expect(label.nextElementSibling).toBe(screen.getByRole('textbox'));
    expect(label).toHaveClass('ui-ifta__label');
    await userEvent.click(label);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('AC-6: the box owns the 2px ink line; a disabled control marks the box disabled', () => {
    const { container } = render(<IftaLabel label="Email"><InputText disabled /></IftaLabel>);
    expect(container.querySelector('.ui-ifta__box')).toHaveClass('ui-ifta__box--disabled');
    const css = compileScss('src/components/IftaLabel/IftaLabel.scss');
    expect(css).toMatch(/\.ui-ifta__box\s*\{[^}]*border:[^;}]*--ui-color-line/);
    expect(css).toMatch(/\.ui-ifta__box \.form-control[^{]*\{[^}]*border:\s*0/);
  });
});

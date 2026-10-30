import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Stepper, useStepper } from './Stepper';

function Controls() {
  const { next, prev, goTo, isFirst, isLast } = useStepper();
  return (
    <div>
      <button onClick={prev} disabled={isFirst}>Back</button>
      <button onClick={next} disabled={isLast}>Continue</button>
      <button onClick={() => goTo('c')}>Jump to c</button>
    </div>
  );
}

const tree = (props: React.ComponentProps<typeof Stepper> = {}) => (
  <Stepper {...props}>
    <Stepper.Step value="a" label="Account" description="Your details"><p>Account panel</p><Controls /></Stepper.Step>
    <Stepper.Step value="b" label="Address" optional><p>Address panel</p><Controls /></Stepper.Step>
    <Stepper.Step value="c" label="Confirm" error="Card was declined"><p>Confirm panel</p><Controls /></Stepper.Step>
  </Stepper>
);

describe('Stepper', () => {
  it('AC-1: navigating changes panel and moves focus to its heading', async () => {
    const onChange = vi.fn();
    render(tree({ onChange }));
    expect(screen.getByText('Account panel')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Account');
    await userEvent.click(screen.getByRole('button', { name: /Address/ }));
    expect(screen.getByText('Address panel')).toBeInTheDocument();
    expect(screen.queryByText('Account panel')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Address' })).toHaveFocus();
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.getByRole('button', { name: /Account.*Completed/ })).toBeInTheDocument();
  });

  it('does not steal focus on first render', () => {
    render(tree());
    expect(screen.getByRole('heading', { name: 'Account' })).not.toHaveFocus();
  });

  it('useStepper next/prev and first/last flags', async () => {
    render(tree());
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Address panel')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Address panel')).toBeInTheDocument();
  });

  it('AC-2: linear mode blocks future steps', async () => {
    render(tree({ linear: true }));
    expect(screen.queryByRole('button', { name: /Address/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Confirm/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Jump to c' }));
    expect(screen.getByText('Account panel')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Address panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Account/ })).toBeInTheDocument();
  });

  it('AC-3: error state shows text on the step', () => {
    render(tree());
    expect(screen.getByText('Card was declined')).toBeInTheDocument();
    expect(screen.getByText('Card was declined').closest('li')).toHaveClass('ui-stepper__step--error');
  });

  it('controlled value, optional text and orientation', () => {
    render(tree({ value: 'b', orientation: 'vertical' }));
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByText('Address panel')).toBeInTheDocument();
    expect(document.querySelector('.ui-stepper')).toHaveClass('ui-stepper--vertical');
  });

  it('uses the StepSheet numeral language: numerals, an ink check for complete steps, a guide line on the panel', async () => {
    render(tree({ linear: false, defaultValue: 'b' }));
    const steps = screen.getAllByRole('listitem');
    expect(steps[0]!.querySelector('.ui-stepper__marker svg')).toBeInTheDocument(); // complete: check icon
    expect(steps[1]!.querySelector('.ui-stepper__marker')).toHaveTextContent('2');
    expect(steps[1]).toHaveClass('ui-stepper__step--current');
    const panel = document.querySelector('.ui-stepper__panel')!;
    expect(panel.querySelector('[data-assemble-guide]')).toBeInTheDocument();
    expect(panel.querySelectorAll('[data-assemble]').length).toBeGreaterThanOrEqual(2);
  });
});

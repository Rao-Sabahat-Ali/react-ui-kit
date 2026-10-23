import { Button } from '../Button/Button';
import { Stepper, useStepper } from './Stepper';

function Nav() {
  const { next, prev, isFirst, isLast } = useStepper();
  return (
    <div className="d-flex gap-2">
      <Button appearance="outline" onClick={prev} disabled={isFirst}>Back</Button>
      <Button onClick={next} disabled={isLast}>Continue</Button>
    </div>
  );
}

export const examples = [
  {
    title: 'Linear checkout wizard',
    description: 'In linear mode future steps are not navigable; the panel heading receives focus on step change.',
    code: `<Stepper linear>\n  <Stepper.Step value="cart" label="Cart">…<Nav /></Stepper.Step>\n  <Stepper.Step value="pay" label="Payment">…</Stepper.Step>\n</Stepper>`,
    render: () => (
      <Stepper linear>
        <Stepper.Step value="cart" label="Cart" description="Review items"><p>Your cart.</p><Nav /></Stepper.Step>
        <Stepper.Step value="ship" label="Shipping" optional><p>Where should we ship?</p><Nav /></Stepper.Step>
        <Stepper.Step value="pay" label="Payment"><p>Pay securely.</p><Nav /></Stepper.Step>
      </Stepper>
    ),
  },
];

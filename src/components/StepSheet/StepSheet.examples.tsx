import { Button } from '../Button/Button';
import { QuantityTick } from '../QuantityTick/QuantityTick';
import { StepPanel, StepSheet, useStepSheet } from './StepSheet';

function Next({ label = 'Continue' }: { label?: string }) {
  const { next } = useStepSheet();
  return <Button onClick={next}>{label}</Button>;
}

function Back() {
  const { prev } = useStepSheet();
  return (
    <Button variant="secondary" appearance="outline" onClick={prev}>
      Back
    </Button>
  );
}

function Demo() {
  return (
    <StepSheet aria-label="Daily session">
      <StepPanel
        title="Warm up"
        visual={
          <span className="ui-qty">
            <QuantityTick value={5} />
            <span className="ui-qty__mark" aria-hidden="true">
              ×
            </span>
          </span>
        }
        action={<Next label="Start" />}
      >
        Five words you already know.
      </StepPanel>
      <StepPanel title="Learn" visual="3 new words" action={<Next />}>
        Say each word out loud, then use it in a sentence.
      </StepPanel>
      <StepPanel title="Review" visual="8 due" action={<Back />}>
        Check what stuck from the last days.
      </StepPanel>
    </StepSheet>
  );
}

export const examples = [
  {
    title: 'Session as step panels',
    code: `<StepSheet aria-label="Daily session">\n  <StepPanel title="Warm up" visual="5×" action={<Next />}>Five words you already know.</StepPanel>\n  <StepPanel title="Learn" visual="3 new words" action={<Next />}>Say each word out loud.</StepPanel>\n  <StepPanel title="Review" visual="8 due">Check what stuck.</StepPanel>\n</StepSheet>`,
    render: () => <Demo />,
  },
  {
    title: 'Vertical stack',
    code: `<StepSheet aria-label="Checkout" layout="stack" current={1}>\n  <StepPanel title="Cart" visual="3 items">Review your order.</StepPanel>\n  <StepPanel title="Address">Where should it go?</StepPanel>\n  <StepPanel title="Pay">Choose a method.</StepPanel>\n</StepSheet>`,
    render: () => (
      <StepSheet aria-label="Checkout" layout="stack" current={1}>
        <StepPanel title="Cart" visual="3 items">
          Review your order.
        </StepPanel>
        <StepPanel title="Address">Where should it go?</StepPanel>
        <StepPanel title="Pay">Choose a method.</StepPanel>
      </StepSheet>
    ),
  },
];

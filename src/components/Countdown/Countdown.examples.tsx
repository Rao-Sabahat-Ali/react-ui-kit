import { useState } from 'react';
import { Button } from '../Button/Button';
import { Countdown } from './Countdown';

const hours = (h: number) => h * 3600 * 1000;

function Demo() {
  const [end] = useState(() => Date.now() + hours(50) + 125_000);
  const [since] = useState(() => Date.now() - hours(1) - 61_000);
  const [paused, setPaused] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <span className="text-body-secondary me-2">Offer ends in</span>
        <Countdown label="Offer ends in" target={end} className="fs-4" />
      </div>
      <div>
        <span className="text-body-secondary me-2">Compact</span>
        <Countdown label="Time left" target={end} format="words" />
      </div>
      <div>
        <span className="text-body-secondary me-2">Elapsed</span>
        <Countdown label="Running for" mode="elapsed" since={since} format="hh:mm:ss" paused={paused} />{' '}
        <Button size="sm" appearance="outline" variant="secondary" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>
      <div>
        <span className="text-body-secondary me-2">Resend code in</span>
        <Countdown key={round} label="Resend code in" duration={8000} format="mm:ss" announceAt={[5]} completedContent={<Button size="sm" onClick={() => setRound((r) => r + 1)}>Resend</Button>} />
      </div>
    </div>
  );
}

export const examples = [
  {
    title: 'Countdown, compact words, elapsed (pausable) and a resend timer',
    description: 'Role timer, silent by default. The resend timer announces once at 5 seconds and on completion; hidden tabs stop ticking.',
    code: `<Countdown label="Offer ends in" target={endsAt} />\n<Countdown label="Time left" target={endsAt} format="words" />\n<Countdown label="Running for" mode="elapsed" since={startedAt} format="hh:mm:ss" paused={paused} />\n<Countdown label="Resend code in" duration={8000} format="mm:ss" announceAt={[5]} completedContent={<Button>Resend</Button>} />`,
    render: () => <Demo />,
  },
];

import { ToggleButton } from './ToggleButton';

export const examples = [
  {
    title: 'Follow button with label swap',
    description: 'The accessible name stays "Follow"; `aria-pressed` carries the state.',
    code: `<ToggleButton offLabel="Follow" onLabel="Following" offIcon="plus" onIcon="check" />`,
    render: () => <ToggleButton offLabel="Follow" onLabel="Following" offIcon="plus" onIcon="check" />,
  },
  {
    title: 'Icon-only toolbar toggle',
    code: `<ToggleButton aria-label="Favourite" offIcon="star" onIcon="star-filled" variant="primary" />`,
    render: () => <ToggleButton aria-label="Favourite" offIcon="star" onIcon="star-filled" variant="primary" />,
  },
];

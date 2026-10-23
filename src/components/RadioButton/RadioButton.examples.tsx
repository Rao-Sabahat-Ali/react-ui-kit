import { RadioGroup } from './RadioButton';

export const examples = [
  {
    title: 'Radio group',
    code: `<RadioGroup legend="Difficulty" defaultValue="easy" options={[\n  { label: 'Easy', value: 'easy' },\n  { label: 'Medium', value: 'medium', description: 'Most common 3000 words' },\n  { label: 'Hard', value: 'hard' },\n]} />`,
    render: () => (
      <>
        <RadioGroup
          legend="Difficulty"
          defaultValue="easy"
          options={[
            { label: 'Easy', value: 'easy' },
            { label: 'Medium', value: 'medium', description: 'Most common 3000 words' },
            { label: 'Hard', value: 'hard' },
          ]}
        />
        <RadioGroup legend="Inline" inline defaultValue={1} options={[{ label: 'One', value: 1 }, { label: 'Two', value: 2 }, { label: 'Three', value: 3, disabled: true }]} />
      </>
    ),
  },
];

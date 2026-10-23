import { SelectButton } from './SelectButton';

export const examples = [
  {
    title: 'Single and multiple',
    code: `<SelectButton aria-label="Period" defaultValue="30d" options={[{ label: '7 days', value: '7d' }, { label: '30 days', value: '30d' }, { label: '90 days', value: '90d' }]} />\n<SelectButton multiple aria-label="Levels" defaultValue={['easy']} options={[…]} variant="secondary" />`,
    render: () => (
      <div className="d-flex flex-column gap-3 align-items-start">
        <SelectButton aria-label="Period" defaultValue="30d" options={[{ label: '7 days', value: '7d' }, { label: '30 days', value: '30d' }, { label: '90 days', value: '90d' }]} />
        <SelectButton multiple aria-label="Levels" variant="secondary" defaultValue={['easy']} options={[{ label: 'Easy', value: 'easy' }, { label: 'Medium', value: 'medium' }, { label: 'Hard', value: 'hard' }]} />
        <SelectButton size="lg" block aria-label="Category" defaultValue="drinks" options={[{ label: 'Drinks', value: 'drinks' }, { label: 'Food', value: 'food' }, { label: 'Dessert', value: 'dessert' }]} />
      </div>
    ),
  },
];

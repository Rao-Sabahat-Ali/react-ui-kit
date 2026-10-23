import { useState } from 'react';
import { MultiStateCheckbox } from './MultiStateCheckbox';

type Visibility = 'public' | 'private' | 'shared';

function Demo() {
  const [value, setValue] = useState<Visibility | null>('private');
  return (
    <MultiStateCheckbox<Visibility>
      label="Visibility"
      value={value}
      onChange={setValue}
      empty={false}
      options={[
        { value: 'public', label: 'Public', icon: 'eye' },
        { value: 'private', label: 'Private', icon: 'eye-off' },
        { value: 'shared', label: 'Shared', icon: 'user' },
      ]}
    />
  );
}

export const examples = [
  {
    title: 'Visibility cycle with icons',
    code: `<MultiStateCheckbox label="Visibility" empty={false} value={value} onChange={setValue}\n  options={[{ value: 'public', label: 'Public', icon: 'eye' }, { value: 'private', label: 'Private', icon: 'eye-off' }, { value: 'shared', label: 'Shared', icon: 'user' }]} />`,
    render: () => <Demo />,
  },
];

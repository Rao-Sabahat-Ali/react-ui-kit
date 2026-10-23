import { useState } from 'react';
import { Chip } from './Chip';

function Filters() {
  const [tags, setTags] = useState(['Design', 'Frontend', 'Docs']);
  return (
    <div className="d-flex flex-wrap gap-2">
      {tags.map((t) => <Chip key={t} label={t} removable onRemove={() => setTags((x) => x.filter((y) => y !== t))} />)}
      <Chip label="Mine" onClick={() => {}} />
      <Chip label="With icon" icon="star" defaultSelected onClick={() => {}} />
    </div>
  );
}

export const examples = [
  {
    title: 'Removable and filter chips',
    description: 'Clickable chips are toggle buttons with `aria-pressed`; remove buttons are named "Remove {label}".',
    code: `<Chip label="Design" removable onRemove={…} />\n<Chip label="Mine" onClick={…} />`,
    render: () => <Filters />,
  },
];

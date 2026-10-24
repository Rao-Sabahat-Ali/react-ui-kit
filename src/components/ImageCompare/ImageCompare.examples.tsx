import { useState } from 'react';
import { ImageCompare } from './ImageCompare';

const BEFORE = 'https://picsum.photos/id/1018/800/450?grayscale';
const AFTER = 'https://picsum.photos/id/1018/800/450';

function Demo({ dir }: { dir?: 'rtl' }) {
  const [value, setValue] = useState(50);
  return (
    <div dir={dir} style={{ maxWidth: 560 }}>
      <ImageCompare beforeSrc={BEFORE} afterSrc={AFTER} beforeAlt="Mountain lake in greyscale" afterAlt="The same lake in colour" ratio="16x9" value={value} onChange={setValue} />
      <p className="mt-2 mb-0 small text-body-secondary">Drag the divider, or focus it and use the arrow keys, Home, End and Page Up/Down. Showing {Math.round(value)}% of the before image.</p>
    </div>
  );
}

export const examples = [
  {
    title: 'Before and after',
    description: 'Pointer and keyboard (role="slider"), corner labels, controlled value and a fixed aspect ratio.',
    code: `<ImageCompare\n  beforeSrc="/room-old.jpg" beforeAlt="Living room before the renovation"\n  afterSrc="/room-new.jpg" afterAlt="Living room after the renovation"\n  ratio="16x9"\n/>`,
    render: () => <Demo />,
  },
  {
    title: 'Right to left',
    description: 'The before image sits at the inline-start (right) edge and the arrow keys mirror.',
    code: `<div dir="rtl">\n  <ImageCompare … />\n</div>`,
    render: () => <Demo dir="rtl" />,
  },
];

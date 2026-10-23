import { ScrollPanel } from './ScrollPanel';

export const examples = [
  {
    title: 'Themed scrollbars',
    description: 'Pure CSS scrollbars from tokens. Without focusable content the region is keyboard-scrollable.',
    code: `<ScrollPanel height={160} ariaLabel="Release notes">…</ScrollPanel>`,
    render: () => (
      <ScrollPanel height={160} ariaLabel="Release notes" className="border rounded p-3">
        {Array.from({ length: 20 }, (_, i) => <p key={i} className="mb-2">Release note line {i + 1}</p>)}
      </ScrollPanel>
    ),
  },
];

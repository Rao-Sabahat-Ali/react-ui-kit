import { ScrollTop } from './ScrollTop';

export const examples = [
  {
    title: 'Scrollable container',
    description: 'With `target="parent"` the button follows the nearest scroll container and shows after `threshold` px.',
    code: `<div style={{ height: 160, overflow: 'auto' }}>\n  …long content…\n  <ScrollTop target="parent" threshold={80} />\n</div>`,
    render: () => (
      <div className="border rounded p-3" style={{ height: 160, overflow: 'auto' }}>
        {Array.from({ length: 20 }, (_, i) => <p key={i} className="mb-2">Line {i + 1}</p>)}
        <ScrollTop target="parent" threshold={80} />
      </div>
    ),
  },
];

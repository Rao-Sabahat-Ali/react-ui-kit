import { Button } from '../Button/Button';
import { EmptyState } from './EmptyState';

export const examples = [
  {
    title: 'Variants',
    code: `<EmptyState title="No saved words yet" description="Tap the star on any word to save it here." action={<Button>Browse dictionary</Button>} />\n<EmptyState variant="no-results" size="sm" title="No matches" description="Try another spelling." />\n<EmptyState variant="error" title="Couldn't load data" action={<Button variant="secondary" appearance="outline">Retry</Button>} />`,
    render: () => (
      <div className="row g-3">
        <div className="col-md-4"><EmptyState variant="first-run" title="No saved words yet" description="Tap the star on any word to save it here." action={<Button>Browse dictionary</Button>} /></div>
        <div className="col-md-4"><EmptyState variant="no-results" size="sm" title="No matches" description="Try another spelling." /></div>
        <div className="col-md-4"><EmptyState variant="error" title="Couldn't load data" action={<Button variant="secondary" appearance="outline">Retry</Button>} /></div>
      </div>
    ),
  },
  {
    title: 'Media slot',
    description: 'The media replaces the icon and is sized by the empty state. Use a line-art Image, or a Scene3D variant="empty-state" from @sabahat/react-ui-kit-3d (see the Scene3D page).',
    code: `<EmptyState\n  media={<svg viewBox="0 0 96 96" role="img" aria-label="An open flat-pack box">…</svg>}\n  title="No parts yet"\n  description="Add the first part to start the sheet."\n  action={<Button>Add a part</Button>}\n/>`,
    render: () => (
      <EmptyState
        variant="first-run"
        media={
          <svg viewBox="0 0 96 96" role="img" aria-label="An open flat-pack box" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <path vectorEffect="non-scaling-stroke" d="M12 36 48 22l36 14v38L48 88 12 74z" />
            <path vectorEffect="non-scaling-stroke" d="M12 36l36 14 36-14M48 50v38" />
            <path vectorEffect="non-scaling-stroke" d="M30 29l-10-9 24-8 12 7M66 29l10-9-24-8" />
          </svg>
        }
        title="No parts yet"
        description="Add the first part to start the sheet."
        action={<Button>Add a part</Button>}
      />
    ),
  },
];

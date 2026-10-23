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
];

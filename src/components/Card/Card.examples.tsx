import { Button } from '../Button/Button';
import { Card } from './Card';

export const examples = [
  {
    title: 'Variants',
    code: `<Card title="Default" subtitle="Border only">…</Card>\n<Card variant="elevated" title="Elevated">…</Card>\n<Card variant="subtle" title="Subtle">…</Card>`,
    render: () => (
      <div className="row g-3">
        {(['default', 'elevated', 'subtle'] as const).map((variant) => (
          <div className="col-md-4" key={variant}>
            <Card variant={variant} title={variant[0]!.toUpperCase() + variant.slice(1)} subtitle="Last 30 days" actions={<Button size="sm" appearance="text" icon="more-horizontal" aria-label="More actions" />}>
              <p className="mb-0">Cards group related content on a surface.</p>
            </Card>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Interactive with footer',
    code: `<Card title="Getting started" href="#/components/button" footer={<small className="text-body-secondary">5 min read</small>}>…</Card>`,
    render: () => (
      <div style={{ maxWidth: 360 }}>
        <Card title="Getting started" href="#/components/button" footer={<small className="text-body-secondary">5 min read</small>}>
          <p className="mb-0">The whole card is one link via the title.</p>
        </Card>
      </div>
    ),
  },
];

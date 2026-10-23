import { Icon } from './Icon';
import { builtInIcons } from './icons';

export const examples = [
  {
    title: 'Built-in icons',
    description: 'Decorative by default. Pass `label` when the icon carries meaning on its own.',
    code: `<Icon name="search" />\n<Icon name="alert-triangle" label="Warning" size="lg" />`,
    render: () => (
      <div className="d-flex flex-wrap gap-3">
        {Object.keys(builtInIcons).map((name) => (
          <span key={name} className="d-inline-flex flex-column align-items-center gap-1 small text-body-secondary" style={{ width: 88 }}>
            <Icon name={name} size="lg" />
            {name}
          </span>
        ))}
      </div>
    ),
  },
];

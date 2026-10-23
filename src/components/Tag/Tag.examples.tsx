import { Tag } from './Tag';
import { INTENTS } from '../../types';

export const examples = [
  {
    title: 'Status tags',
    description: 'Always text; colour reinforces meaning but never carries it alone.',
    code: `<Tag value="Paid" severity="success" icon="check" />\n<Tag value="Overdue" severity="danger" />\n<Tag value="Draft" />\n<Tag value="New" severity="info" appearance="solid" rounded />`,
    render: () => (
      <div className="d-flex flex-wrap gap-2">
        <Tag value="Paid" severity="success" icon="check" />
        <Tag value="Overdue" severity="danger" />
        <Tag value="Draft" />
        <Tag value="New" severity="info" appearance="solid" rounded />
        {INTENTS.map((s) => <Tag key={s} value={s} severity={s} appearance="outline" />)}
      </div>
    ),
  },
];

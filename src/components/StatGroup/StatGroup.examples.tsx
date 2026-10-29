import { StatCard } from '../StatCard/StatCard';
import { StatGroup } from './StatGroup';

export const examples = [
  {
    title: 'Parts list',
    code: `<StatGroup aria-label="Your progress">\n  <StatCard icon="flame" label="Day streak" value={12} footer="Best 21" />\n  <StatCard icon="book" label="Words learned" value={212} />\n  <StatCard icon="clock" label="Due for review" value={8} href="#review" />\n</StatGroup>`,
    render: () => (
      <StatGroup aria-label="Your progress">
        <StatCard icon="flame" label="Day streak" value={12} footer="Best 21" />
        <StatCard icon="book" label="Words learned" value={212} />
        <StatCard icon="clock" label="Due for review" value={8} href="#review" />
      </StatGroup>
    ),
  },
];

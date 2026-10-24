import { StatCard } from '../StatCard/StatCard';
import { StatGroup } from './StatGroup';

export const examples = [
  {
    title: 'Headline numbers',
    code: `<StatGroup aria-label="Your progress">\n  <StatCard label="Day streak" value={12} footer="Best 21" />\n  <StatCard label="Words learned" value={212} />\n  <StatCard label="Due for review" value={8} href="#review" />\n</StatGroup>`,
    render: () => (
      <StatGroup aria-label="Your progress">
        <StatCard label="Day streak" value={12} footer="Best 21" />
        <StatCard label="Words learned" value={212} />
        <StatCard label="Due for review" value={8} href="#review" />
      </StatGroup>
    ),
  },
];

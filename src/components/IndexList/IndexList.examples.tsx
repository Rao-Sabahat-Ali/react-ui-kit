import { Button } from '../Button/Button';
import { Tag } from '../Tag/Tag';
import { IndexItem, IndexList } from './IndexList';

export const examples = [
  {
    title: 'Rows with actions',
    code: `<IndexList aria-label="Challenges">\n  <IndexItem title="Daily challenge" description="Ten mixed questions, the same for everyone today." action={<Tag value="Done today" severity="success" icon="check" />} />\n  <IndexItem title="Speed round" description="How many meanings in 60 seconds?" meta="Best: Easy 14" action={<Button appearance="outline">Start</Button>} />\n</IndexList>`,
    render: () => (
      <IndexList aria-label="Challenges">
        <IndexItem title="Daily challenge" description="Ten mixed questions, the same for everyone today." action={<Tag value="Done today" severity="success" icon="check" />} />
        <IndexItem title="Speed round" description="How many meanings in 60 seconds?" meta="Best: Easy 14" action={<Button appearance="outline">Start</Button>} />
        <IndexItem title="Tense trainer" description="Put the verb in the right form." action={<Button appearance="outline">Start</Button>} />
      </IndexList>
    ),
  },
  {
    title: 'Compact link index',
    code: `<IndexList columns={3} aria-label="Topics">\n  <IndexItem titleAs="span" title="Morgonrutin" description="Morning routine" href="#morning" lang="sv" />\n</IndexList>`,
    render: () => (
      <IndexList columns={3} aria-label="Topics">
        <IndexItem titleAs="span" title="Morgonrutin" description="Morning routine" href="#morning" lang="sv" />
        <IndexItem titleAs="span" title="Mat och fika" description="Food and café" href="#food" lang="sv" />
        <IndexItem titleAs="span" title="Handla" description="Shopping" href="#shopping" lang="sv" />
      </IndexList>
    ),
  },
];

import { Accordion } from './Accordion';

export const examples = [
  {
    title: 'Single and multiple',
    description: 'Headers are buttons inside headings; arrow keys, Home and End move between them.',
    code: `<Accordion defaultValue="a">\n  <Accordion.Item value="a" header="Shipping">…</Accordion.Item>\n  <Accordion.Item value="b" header="Returns">…</Accordion.Item>\n</Accordion>\n<Accordion multiple flush items={[{ value: 'x', header: 'X', content: 'Body' }]} />`,
    render: () => (
      <div className="d-flex flex-column gap-4">
        <Accordion defaultValue="a">
          <Accordion.Item value="a" header="Shipping">Ships within two business days.</Accordion.Item>
          <Accordion.Item value="b" header="Returns">30 day returns.</Accordion.Item>
          <Accordion.Item value="c" header="Warranty" disabled>Not available.</Accordion.Item>
        </Accordion>
        <Accordion multiple flush defaultValue={['x']} items={[{ value: 'x', header: 'Filters', content: 'Filter controls' }, { value: 'y', header: 'Sort', content: 'Sort controls' }]} />
      </div>
    ),
  },
];

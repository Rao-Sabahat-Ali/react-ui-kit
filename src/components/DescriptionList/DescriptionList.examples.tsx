import { Tag } from '../Tag/Tag';
import { DescriptionItem, DescriptionList } from './DescriptionList';

export const examples = [
  {
    title: 'Record details, two columns, ruled',
    description: 'A real <dl>. Long ids wrap, empty values get a placeholder, ids can be copied.',
    code: `<DescriptionList columns={2} ruled>\n  <DescriptionItem term="Invoice">INV-2026-0042</DescriptionItem>\n  <DescriptionItem term="Status"><Tag severity="success" value="Paid" /></DescriptionItem>\n  <DescriptionItem term="Customer id" copyable>c_8f1e0a52-7a1d-4a39-b1c3-93d7f0a6c1e2</DescriptionItem>\n  <DescriptionItem term="Phone">{null}</DescriptionItem>\n  <DescriptionItem term="Notes" span={2}>Net 30. Deliver to the loading dock at the rear entrance.</DescriptionItem>\n</DescriptionList>`,
    render: () => (
      <DescriptionList columns={2} ruled>
        <DescriptionItem term="Invoice">INV-2026-0042</DescriptionItem>
        <DescriptionItem term="Status">
          <Tag severity="success" value="Paid" />
        </DescriptionItem>
        <DescriptionItem term="Customer id" copyable>
          c_8f1e0a52-7a1d-4a39-b1c3-93d7f0a6c1e2
        </DescriptionItem>
        <DescriptionItem term="Phone">{null}</DescriptionItem>
        <DescriptionItem term="Notes" span={2}>
          Net 30. Deliver to the loading dock at the rear entrance.
        </DescriptionItem>
      </DescriptionList>
    ),
  },
  {
    title: 'Inline layout',
    code: `<DescriptionList layout="inline" ruled>…</DescriptionList>`,
    render: () => (
      <DescriptionList layout="inline" ruled>
        <DescriptionItem term="Plan">Team</DescriptionItem>
        <DescriptionItem term="Seats">12</DescriptionItem>
        <DescriptionItem term="Renews">1 March 2027</DescriptionItem>
      </DescriptionList>
    ),
  },
  {
    title: 'Three columns, stacked',
    code: `<DescriptionList columns={3}>…</DescriptionList>`,
    render: () => (
      <DescriptionList columns={3}>
        <DescriptionItem term="Region">Stockholm</DescriptionItem>
        <DescriptionItem term="Created">12 Jan 2026</DescriptionItem>
        <DescriptionItem term="Owner">Ada Lovelace</DescriptionItem>
      </DescriptionList>
    ),
  },
];

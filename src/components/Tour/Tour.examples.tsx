import { useState } from 'react';
import { Button } from '../Button/Button';
import { InputText } from '../InputText/InputText';
import { Tour } from './Tour';

function Demo() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState('');
  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <Button id="tour-demo-new">New invoice</Button>
        <div id="tour-demo-search" style={{ minWidth: 200 }}>
          <InputText aria-label="Search invoices" placeholder="Search invoices" />
        </div>
        <Button id="tour-demo-export" appearance="outline" variant="secondary">
          Export
        </Button>
      </div>
      <Button appearance="outline" variant="secondary" onClick={() => setOpen(true)}>
        Start tour
      </Button>
      {last && <p className="mt-3 mb-0 text-body-secondary">Tour closed: {last}</p>}
      <Tour
        open={open}
        onClose={(reason) => {
          setOpen(false);
          setLast(reason);
        }}
        steps={[
          { target: '#tour-demo-new', title: 'Create an invoice', content: 'Start here to bill a customer.', placement: 'bottom-start' },
          { target: '#tour-demo-search', title: 'Find anything', content: 'Search by customer, number or amount.' },
          { target: '#tour-demo-export', title: 'Export', content: 'Download the list as CSV.', placement: 'bottom-end' },
        ]}
      />
    </div>
  );
}

export const examples = [
  {
    title: 'Three-step tour',
    description: 'Non-modal: the page stays usable, Escape or Skip closes, Tab leaves the panel towards the highlighted element. Focus returns to "Start tour".',
    code: `<Tour open={open} onClose={() => setOpen(false)} steps={[\n  { target: '#new-invoice', title: 'Create an invoice', content: 'Start here.' },\n  { target: searchRef, title: 'Find anything', content: 'Search by customer.' },\n]} />`,
    render: () => <Demo />,
  },
];

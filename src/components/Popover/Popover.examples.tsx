import { useRef } from 'react';
import { Button } from '../Button/Button';
import { Popover } from './Popover';

function InitialFocusExample() {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Popover title="Rename" initialFocus={inputRef} trigger={<Button variant="secondary" appearance="outline">Rename</Button>}>
      <input ref={inputRef} className="form-control form-control-sm" aria-label="Name" defaultValue="Quarterly report" />
    </Popover>
  );
}

export const examples = [
  {
    title: 'Basic',
    description: 'Non-modal panel anchored to its trigger. Escape or an outside click closes it.',
    code: `<Popover title="Filters" trigger={<Button variant="secondary">Filters</Button>}>\n  <label className="form-check"><input type="checkbox" className="form-check-input" /> Only active</label>\n</Popover>`,
    render: () => (
      <Popover title="Filters" trigger={<Button variant="secondary">Filters</Button>}>
        <label className="form-check">
          <input type="checkbox" className="form-check-input" /> Only active
        </label>
      </Popover>
    ),
  },
  {
    title: 'Initial focus and placement',
    code: `<Popover title="Rename" initialFocus={inputRef} trigger={<Button>Rename</Button>}>…</Popover>\n<Popover ariaLabel="Details" placement="end" trigger={<Button>Details</Button>}>…</Popover>`,
    render: () => (
      <div className="d-flex gap-2">
        <InitialFocusExample />
        <Popover ariaLabel="Details" placement="end" trigger={<Button variant="secondary" appearance="text">Details</Button>}>
          Created 3 days ago by Alex.
        </Popover>
      </div>
    ),
  },
];

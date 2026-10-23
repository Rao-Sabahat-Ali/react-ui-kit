import { useState } from 'react';
import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { InputText } from '../InputText/InputText';
import { Dialog } from './Dialog';

function Demo({ size }: { size?: 'sm' | 'lg' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button appearance={size ? 'outline' : 'solid'} onClick={() => setOpen(true)}>
        {size ? `Open ${size}` : 'Edit user'}
      </Button>
      <Dialog
        open={open}
        size={size}
        onClose={() => setOpen(false)}
        title="Edit user"
        footer={
          <>
            <Button variant="secondary" appearance="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Save changes</Button>
          </>
        }
      >
        <Field label="Full name"><InputText defaultValue="Jane Doe" /></Field>
        <Field label="Email"><InputText type="email" defaultValue="jane@example.com" /></Field>
      </Dialog>
    </>
  );
}

export const examples = [
  {
    title: 'Form dialog',
    description: 'Focus is trapped, Escape and backdrop close, focus returns to the trigger.',
    code: `const [open, setOpen] = useState(false);\n<Button onClick={() => setOpen(true)}>Edit user</Button>\n<Dialog open={open} onClose={() => setOpen(false)} title="Edit user"\n  footer={<><Button variant="secondary" appearance="outline" onClick={() => setOpen(false)}>Cancel</Button><Button>Save changes</Button></>}>\n  …\n</Dialog>`,
    render: () => (
      <div className="d-flex gap-2">
        <Demo />
        <Demo size="sm" />
        <Demo size="lg" />
      </div>
    ),
  },
];

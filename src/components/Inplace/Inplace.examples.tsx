import { useState } from 'react';
import { Inplace } from './Inplace';

function Title() {
  const [title, setTitle] = useState('Quarterly report');
  return (
    <Inplace display={title} label="title">
      {(close) => (
        <form onSubmit={(e) => { e.preventDefault(); close(); }} className="d-flex gap-2">
          <input aria-label="Title" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn btn-primary" type="submit">Save</button>
        </form>
      )}
    </Inplace>
  );
}

export const examples = [
  {
    title: 'Inline title editing',
    description: 'The display is a button; activating it moves focus into the editor, Escape returns it.',
    code: `<Inplace display={title} label="title">\n  {(close) => <input … />}\n</Inplace>`,
    render: () => <Title />,
  },
];

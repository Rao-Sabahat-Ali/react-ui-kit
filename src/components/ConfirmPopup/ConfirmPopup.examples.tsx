import { useState, type MouseEvent } from 'react';
import { Button } from '../Button/Button';
import { ConfirmPopupProvider, useConfirmPopup } from './ConfirmPopup';

function DeleteRow() {
  const confirmPopup = useConfirmPopup();
  const [result, setResult] = useState('—');
  const onDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    const ok = await confirmPopup({ target: event.currentTarget, message: 'Delete this invoice?', acceptLabel: 'Delete', severity: 'danger' });
    setResult(ok ? 'Deleted' : 'Kept');
  };
  return (
    <div className="d-flex align-items-center gap-3">
      <Button variant="danger" appearance="outline" icon="trash" onClick={onDelete}>
        Delete
      </Button>
      <span>Result: {result}</span>
    </div>
  );
}

export const examples = [
  {
    title: 'Confirm a row action',
    description: 'Anchored alert dialog. Danger severity focuses the reject button first; focus returns to the target.',
    code: `const confirmPopup = useConfirmPopup();\nconst ok = await confirmPopup({ target: event.currentTarget, message: 'Delete this invoice?', acceptLabel: 'Delete', severity: 'danger' });\n// wrap the app in <ConfirmPopupProvider>`,
    render: () => (
      <ConfirmPopupProvider>
        <DeleteRow />
      </ConfirmPopupProvider>
    ),
  },
];

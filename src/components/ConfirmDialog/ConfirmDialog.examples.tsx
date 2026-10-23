import { Button } from '../Button/Button';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

function Demo() {
  const confirm = useConfirm();
  return (
    <Button
      variant="danger"
      appearance="outline"
      icon="trash"
      onClick={async () => {
        await confirm({ title: 'Delete invoice INV-1042?', message: 'This cannot be undone.', acceptLabel: 'Delete invoice', severity: 'danger' });
      }}
    >
      Delete invoice
    </Button>
  );
}

export const examples = [
  {
    title: 'Promise API',
    description: 'Wrap the app in ConfirmProvider; accept label repeats the action.',
    code: `const confirm = useConfirm();\nconst ok = await confirm({ title: 'Delete invoice INV-1042?', message: 'This cannot be undone.', acceptLabel: 'Delete invoice', severity: 'danger' });`,
    render: () => (
      <ConfirmProvider>
        <Demo />
      </ConfirmProvider>
    ),
  },
];

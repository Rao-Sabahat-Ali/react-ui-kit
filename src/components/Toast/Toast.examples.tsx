import { Button } from '../Button/Button';
import { ToastProvider, useToast } from './Toast';

function Demo() {
  const toast = useToast();
  return (
    <div className="d-flex flex-wrap gap-2">
      <Button onClick={() => toast.success('Progress saved.')}>Success</Button>
      <Button variant="secondary" appearance="outline" onClick={() => toast.info('New words unlocked', { title: 'Level up' })}>Info</Button>
      <Button variant="warning" onClick={() => toast.warning('You are offline. Changes are saved locally.')}>Warning</Button>
      <Button variant="danger" onClick={() => toast.error("Couldn't import file.")}>Error (sticky)</Button>
      <Button appearance="text" onClick={() => toast.show({ message: 'Word removed from list.', action: { label: 'Undo', onClick: () => {} } })}>With undo</Button>
    </div>
  );
}

export const examples = [
  {
    title: 'Imperative API',
    code: `// <ToastProvider position="top-end"> at the app root\nconst toast = useToast();\ntoast.success('Progress saved.');\ntoast.error("Couldn't import file."); // sticky\ntoast.show({ message: 'Word removed from list.', action: { label: 'Undo', onClick: undo } });`,
    render: () => (
      <ToastProvider position="bottom-end">
        <Demo />
      </ToastProvider>
    ),
  },
];

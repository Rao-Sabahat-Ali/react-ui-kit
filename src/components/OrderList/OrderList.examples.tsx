import { useState } from 'react';
import { OrderList } from './OrderList';

interface Task {
  id: number;
  name: string;
}

const initial: Task[] = ['Write spec', 'Implement', 'Review', 'Test', 'Ship', 'Celebrate'].map((name, i) => ({ id: i + 1, name }));

function Demo({ dragdrop }: { dragdrop?: boolean }) {
  const [tasks, setTasks] = useState(initial);
  return <OrderList header="Task order" value={tasks} onChange={setTasks} dragdrop={dragdrop} itemTemplate={(t) => t.name} listHeight="14rem" />;
}

export const examples = [
  {
    title: 'Buttons and keyboard',
    description: 'Select items, then use the buttons or Alt+Arrow keys.',
    code: `<OrderList header="Task order" value={tasks} onChange={setTasks} itemTemplate={(t) => t.name} />`,
    render: () => <Demo />,
  },
  { title: 'Drag and drop', code: `<OrderList value={tasks} onChange={setTasks} dragdrop … />`, render: () => <Demo dragdrop /> },
];

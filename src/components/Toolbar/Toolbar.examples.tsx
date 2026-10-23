import { Button } from '../Button/Button';
import { Toolbar } from './Toolbar';

export const examples = [
  {
    title: 'Start / center / end slots with roving focus',
    description: 'With `roving`, Tab enters the toolbar once and arrow keys move between controls.',
    code: `<Toolbar ariaLabel="Table actions" roving start={<Button>New</Button>} end={<Button>Export</Button>} />`,
    render: () => (
      <Toolbar
        ariaLabel="Table actions"
        roving
        start={<><Button size="sm">New</Button><Button size="sm" appearance="outline">Edit</Button></>}
        center={<span className="text-body-secondary">3 selected</span>}
        end={<Button size="sm" appearance="outline">Export</Button>}
      />
    ),
  },
];

import { SpeedDial, type SpeedDialItem } from './SpeedDial';

const items: SpeedDialItem[] = [
  { label: 'Upload file', icon: 'upload', command: () => undefined },
  { label: 'New folder', icon: 'plus', command: () => undefined },
  { label: 'Share', icon: 'external-link', command: () => undefined },
];

export const examples = [
  {
    title: 'Linear',
    description: 'Arrow keys away from the trigger move to the next action. Labels show as tooltips (visible text on touch).',
    code: `<SpeedDial items={items} ariaLabel="Create" position="static" direction="right" />`,
    render: () => (
      <div className="d-flex gap-5 p-4" style={{ minHeight: '10rem', alignItems: 'flex-end' }}>
        <SpeedDial items={items} ariaLabel="Create" position="static" direction="up" />
        <SpeedDial items={items} ariaLabel="Create (right)" position="static" direction="right" />
      </div>
    ),
  },
  {
    title: 'Circular types',
    code: `<SpeedDial items={items} ariaLabel="Actions" type="semi-circle" position="static" />`,
    render: () => (
      <div className="d-flex gap-5 p-5 justify-content-center" style={{ minHeight: '14rem', alignItems: 'center' }}>
        <SpeedDial items={items} ariaLabel="Circle" type="circle" position="static" />
        <SpeedDial items={items} ariaLabel="Semi-circle" type="semi-circle" position="static" />
        <SpeedDial items={items} ariaLabel="Quarter" type="quarter-circle" direction="left" position="static" />
      </div>
    ),
  },
];

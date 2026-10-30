import type { ReactNode } from 'react';
import { SpeedDial, type SpeedDialItem } from './SpeedDial';

const items: SpeedDialItem[] = [
  { label: 'Upload file', icon: 'upload', command: () => undefined },
  { label: 'New folder', icon: 'plus', command: () => undefined },
  { label: 'Share', icon: 'external-link', command: () => undefined },
];

/**
 * One demo per cell. A cell is sized for the farthest an action travels (three actions at 3.25rem each plus the 3.5rem trigger
 * is about 14rem; a circular fan reaches 6rem from the trigger centre), so nothing leaves its frame at 1280 or 390.
 */
function Cell({ label, align = 'center', height, children }: { label: string; align?: 'start' | 'center' | 'end'; height: string; children: ReactNode }) {
  return (
    <figure className="m-0 d-flex flex-column gap-2">
      <figcaption className="small text-body-secondary">{label}</figcaption>
      <div className={`d-flex align-items-end justify-content-${align} border rounded p-3`} style={{ minBlockSize: height }}>
        {children}
      </div>
    </figure>
  );
}

const GRID = 'd-grid gap-4';
const grid = { gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))' } as const;

export const examples = [
  {
    title: 'Linear',
    description: 'Arrow keys away from the trigger move to the next action. Labels show as tooltips (visible text on touch).',
    code: `<SpeedDial items={items} ariaLabel="Create" position="static" direction="up" />\n<SpeedDial items={items} ariaLabel="Create (right)" position="static" direction="right" />`,
    render: () => (
      <div className={GRID} style={grid}>
        <Cell label="Up" height="15rem" align="start">
          <SpeedDial items={items} ariaLabel="Create (up)" position="static" direction="up" />
        </Cell>
        <Cell label="Right" height="6rem" align="start">
          <SpeedDial items={items} ariaLabel="Create (right)" position="static" direction="right" />
        </Cell>
        <Cell label="Left" height="6rem" align="end">
          <SpeedDial items={items} ariaLabel="Create (left)" position="static" direction="left" />
        </Cell>
        <Cell label="Down" height="15rem" align="start">
          <div className="align-self-start">
            <SpeedDial items={items} ariaLabel="Create (down)" position="static" direction="down" />
          </div>
        </Cell>
      </div>
    ),
  },
  {
    title: 'Circular types',
    code: `<SpeedDial items={items} ariaLabel="Actions" type="semi-circle" position="static" />`,
    render: () => (
      <div className={GRID} style={grid}>
        <Cell label="Circle" height="15rem">
          <div className="align-self-center">
            <SpeedDial items={items} ariaLabel="Circle" type="circle" position="static" />
          </div>
        </Cell>
        <Cell label="Semi-circle" height="9rem">
          <SpeedDial items={items} ariaLabel="Semi-circle" type="semi-circle" position="static" />
        </Cell>
        <Cell label="Quarter circle" height="15rem" align="end">
          <div className="align-self-center">
            <SpeedDial items={items} ariaLabel="Quarter" type="quarter-circle" direction="left" position="static" />
          </div>
        </Cell>
      </div>
    ),
  },
];

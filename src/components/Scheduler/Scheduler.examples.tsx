import { useState } from 'react';
import { Scheduler, type SchedulerView } from './Scheduler';
import type { SchedulerEvent } from './schedulerUtils';

const base = new Date();
const y = base.getFullYear();
const m = base.getMonth();
const at = (day: number, h = 0, min = 0) => new Date(y, m, day, h, min);

const events: SchedulerEvent[] = [
  { id: '1', title: 'Team standup', start: at(5, 9), end: at(5, 9, 30), variant: 'primary' },
  { id: '2', title: 'Design review', start: at(5, 9, 15), end: at(5, 10, 30), variant: 'info', description: 'Review the new dashboard mockups' },
  { id: '3', title: 'Lunch with client', start: at(5, 12), end: at(5, 13), variant: 'success' },
  { id: '4', title: 'Release', start: at(5, 15), end: at(5, 16), variant: 'danger' },
  { id: '5', title: 'Conference', start: at(12), end: at(15), allDay: true, variant: 'warning' },
  { id: '6', title: 'Planning', start: at(18, 10), end: at(18, 11, 30), variant: 'primary' },
  { id: '7', title: 'Offsite', start: at(25), end: at(26), allDay: true, variant: 'secondary' },
];

function Demo() {
  const [last, setLast] = useState('Nothing clicked yet');
  const [view, setView] = useState<SchedulerView>('month');
  return (
    <div className="d-grid gap-2">
      <p className="small text-body-secondary mb-0" role="status">
        {last}
      </p>
      <Scheduler events={events} view={view} onViewChange={setView} onEventClick={(e) => setLast(`Event: ${e.title}`)} onDateSelect={(d) => setLast(`Date: ${d.toDateString()}`)} maxEventsPerDay={3} />
    </div>
  );
}

export const examples = [
  {
    title: 'Month and week views',
    code: `<Scheduler events={events} onRangeChange={({ start, end }) => load(start, end)} onEventClick={(e) => open(e.id)} onDateSelect={(d) => draft(d)} />`,
    render: () => <Demo />,
  },
  {
    title: 'Week view, 15-minute slots, working hours',
    code: `<Scheduler defaultView="week" slotDuration={15} dayStartHour={7} dayEndHour={20} events={events} />`,
    render: () => <Scheduler defaultView="week" slotDuration={15} dayStartHour={7} dayEndHour={20} scrollToHour={9} events={events} />,
  },
  {
    title: 'Loading state',
    code: `<Scheduler loading events={[]} />`,
    render: () => <Scheduler loading events={[]} views={['month']} />,
  },
];

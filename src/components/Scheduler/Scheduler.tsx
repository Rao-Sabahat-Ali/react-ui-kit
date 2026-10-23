import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { interpolate, useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { addDays, addMonths, addYears, daysInMonth, isSameDay, isSameMonth, startOfDay, startOfWeek, toIsoDate } from '../../utils/date';
import { Button } from '../Button/Button';
import { Portal } from '../Portal/Portal';
import { SelectButton } from '../SelectButton/SelectButton';
import {
  assignLanes,
  defaultFirstDay,
  dayEnd,
  minutesOf,
  normalizeEvents,
  overlapsDay,
  parseIsoDay,
  sortDayEvents,
  toZoned,
  type NormalizedEvent,
  type SchedulerEvent,
} from './schedulerUtils';

export type SchedulerView = 'month' | 'week';

export interface SchedulerLabels {
  today: string;
  previous: string;
  next: string;
  month: string;
  week: string;
  /** Template with `{count}`. */
  more: string;
  allDay: string;
  noEvents: string;
}

export interface SchedulerProps {
  events?: SchedulerEvent[];
  view?: SchedulerView;
  defaultView?: SchedulerView;
  onViewChange?: (view: SchedulerView) => void;
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: SchedulerEvent, e: MouseEvent<HTMLElement>) => void;
  onDateSelect?: (date: Date, slot?: { start: Date; end: Date }) => void;
  onRangeChange?: (range: { start: Date; end: Date }) => void;
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Minutes per slot (week view). */
  slotDuration?: number;
  dayStartHour?: number;
  dayEndHour?: number;
  scrollToHour?: number;
  maxEventsPerDay?: number;
  timeZone?: string;
  eventTemplate?: (event: SchedulerEvent, ctx: { view: SchedulerView; start: Date; end: Date }) => ReactNode;
  loading?: boolean;
  labels?: Partial<SchedulerLabels>;
  views?: SchedulerView[];
  className?: string;
}

const DEFAULT_VIEWS: SchedulerView[] = ['month', 'week'];
const NO_EVENTS: SchedulerEvent[] = [];

export function Scheduler({
  events = NO_EVENTS,
  view: viewProp,
  defaultView = 'month',
  onViewChange,
  date: dateProp,
  defaultDate,
  onDateChange,
  onEventClick,
  onDateSelect,
  onRangeChange,
  firstDayOfWeek: firstDayProp,
  slotDuration = 30,
  dayStartHour = 0,
  dayEndHour = 24,
  scrollToHour = 8,
  maxEventsPerDay = 3,
  timeZone,
  eventTemplate,
  loading = false,
  labels,
  views = DEFAULT_VIEWS,
  className,
}: SchedulerProps) {
  const { t, tp, locale, dir } = useLocale();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const [view, setView] = useControllableState<SchedulerView>(viewProp, defaultView, onViewChange);
  const initialDate = useRef(defaultDate ?? new Date()).current;
  const [rawDate, setDate] = useControllableState<Date>(dateProp, initialDate, onDateChange);
  const date = startOfDay(rawDate);
  const fdw = firstDayProp ?? defaultFirstDay(locale);

  const [focus, setFocus] = useState<Date>(date);
  // Spec profile note: below md, month view shows dots and an agenda for the selected day.
  const compact = useMediaQuery('(max-width: 767.98px)');
  const [focusMinutes, setFocusMinutes] = useState(() => Math.max(dayStartHour, Math.min(scrollToHour, dayEndHour - 1)) * 60);
  const [more, setMore] = useState<{ day: Date } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [, setTick] = useState(0);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const moreAnchor = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef(false);
  const onRangeRef = useRef(onRangeChange);
  onRangeRef.current = onRangeChange;

  const L: SchedulerLabels = {
    today: labels?.today ?? t('today'),
    previous: labels?.previous ?? (view === 'month' ? t('previousMonth') : t('previousWeek')),
    next: labels?.next ?? (view === 'month' ? t('nextMonth') : t('nextWeek')),
    month: labels?.month ?? t('month'),
    week: labels?.week ?? t('week'),
    more: labels?.more ?? t('moreEvents'),
    allDay: labels?.allDay ?? t('allDay'),
    noEvents: labels?.noEvents ?? t('noEvents'),
  };

  const now = toZoned(new Date(), timeZone);
  const today = startOfDay(now);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const normalized = useMemo(
    () =>
      normalizeEvents(events, timeZone, (event) => {
        if (import.meta.env?.DEV) console.warn(`[react-ui-kit] Scheduler: skipped event "${event.id}" with an invalid start or end date.`);
      }),
    [events, timeZone],
  );

  // ---- Visible range ----
  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(date, fdw);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const start = startOfWeek(first, fdw);
    const offset = Math.round((first.getTime() - start.getTime()) / 86_400_000);
    const weeks = Math.ceil((offset + daysInMonth(date.getFullYear(), date.getMonth())) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, date.getTime(), fdw]);
  const rangeStart = days[0]!;
  const rangeEnd = addDays(days[days.length - 1]!, 1);

  useEffect(() => {
    onRangeRef.current?.({ start: rangeStart, end: rangeEnd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, NormalizedEvent[]>();
    for (const day of days) map.set(toIsoDate(day), sortDayEvents(normalized.filter((e) => overlapsDay(e, day))));
    return map;
  }, [days, normalized]);

  // ---- Formatters ----
  const fmt = useMemo(
    () => ({
      title: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
      range: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
      full: new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
      weekdayDay: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }),
      time: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }),
      dateTime: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    }),
    [locale],
  );

  const title = view === 'month' ? fmt.title.format(date) : fmt.range.formatRange(days[0]!, days[6]!);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setAnnouncement(title);
  }, [title]);

  const samePeriod = (a: Date, b: Date) => (view === 'month' ? isSameMonth(a, b) : isSameDay(startOfWeek(a, fdw), startOfWeek(b, fdw)));
  // Focus follows the anchor date whenever the period changes from outside the grid.
  const activeDay = samePeriod(focus, date) ? startOfDay(focus) : date;

  const slotMinutes = Math.max(1, slotDuration);
  const startMin = dayStartHour * 60;
  const endMin = dayEndHour * 60;
  const slotCount = Math.max(1, Math.floor((endMin - startMin) / slotMinutes));
  const activeMinutes = Math.min(Math.max(focusMinutes, startMin), startMin + (slotCount - 1) * slotMinutes);
  const activeSlot = Math.floor((activeMinutes - startMin) / slotMinutes);

  // Initial scroll to `scrollToHour` in the week view.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (view !== 'week' || !el) return;
    const slot = el.querySelector<HTMLElement>('.ui-scheduler__slot');
    const slotHeight = slot?.offsetHeight || 40;
    el.scrollTop = Math.max(0, ((scrollToHour * 60 - startMin) / slotMinutes) * slotHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')?.focus();
  });

  useClickOutside([panelRef, moreAnchor], () => setMore(null), more !== null);
  const position = useFloating(moreAnchor, panelRef, { open: more !== null, placement: 'bottom-start' });
  useEffect(() => {
    if (more) panelRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [more]);

  // ---- Navigation ----
  const focusCell = () => {
    pendingFocus.current = true;
  };

  const moveFocus = (next: Date, minutes = activeMinutes) => {
    const nd = startOfDay(next);
    setFocus(nd);
    setFocusMinutes(minutes);
    focusCell();
    if (!samePeriod(nd, date)) setDate(nd);
  };

  const shift = (direction: 1 | -1) => {
    const next = view === 'month' ? addMonths(date, direction) : addDays(date, 7 * direction);
    setFocus(next);
    setDate(next);
  };

  const goToday = () => {
    setFocus(today);
    setDate(today);
    focusCell();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-scheduler-event]')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        gridRef.current?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')?.focus();
      }
      return;
    }
    if (target.getAttribute('role') !== 'gridcell' || !target.dataset.date) return;
    const isRtl = dir === 'rtl' || Boolean(event.currentTarget.closest('[dir="rtl"]'));
    const base = activeDay;
    const { key } = event;
    const mod = event.ctrlKey || event.metaKey;
    let handled = true;
    if (mod && key === 'Home') {
      goToday();
    } else if (event.altKey || mod) {
      handled = false;
    } else {
      switch (key) {
        case 'ArrowLeft':
          moveFocus(addDays(base, isRtl ? 1 : -1));
          break;
        case 'ArrowRight':
          moveFocus(addDays(base, isRtl ? -1 : 1));
          break;
        case 'ArrowUp':
        case 'ArrowDown': {
          const sign = key === 'ArrowDown' ? 1 : -1;
          if (view === 'month') moveFocus(addDays(base, 7 * sign));
          else moveFocus(base, Math.min(Math.max(activeMinutes + sign * slotMinutes, startMin), startMin + (slotCount - 1) * slotMinutes));
          break;
        }
        case 'Home':
          moveFocus(startOfWeek(base, fdw));
          break;
        case 'End':
          moveFocus(addDays(startOfWeek(base, fdw), 6));
          break;
        case 'PageUp':
        case 'PageDown': {
          const sign = key === 'PageDown' ? 1 : -1;
          if (view === 'month') moveFocus(event.shiftKey ? addYears(base, sign) : addMonths(base, sign));
          else moveFocus(addDays(base, 7 * sign));
          break;
        }
        case 'Enter':
        case ' ':
          selectDate(parseIsoDay(target.dataset.date), target.dataset.minutes ? Number(target.dataset.minutes) : undefined);
          break;
        default:
          handled = false;
      }
    }
    if (handled) event.preventDefault();
  };

  const selectDate = (day: Date, minutes?: number) => {
    if (minutes === undefined) {
      onDateSelect?.(day);
      return;
    }
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
    onDateSelect?.(day, { start, end: new Date(start.getTime() + slotMinutes * 60_000) });
  };

  const handleCellClick = (event: MouseEvent<HTMLElement>, day: Date, minutes?: number) => {
    if ((event.target as HTMLElement).closest('button')) return;
    setFocus(day);
    if (minutes !== undefined) setFocusMinutes(minutes);
    selectDate(day, minutes);
  };

  // ---- Event rendering ----
  const rangeLabel = (e: NormalizedEvent) => {
    if (e.allDay) return L.allDay;
    const f = e.multiDay ? fmt.dateTime : fmt.time;
    return `${f.format(e.start)} – ${f.format(e.end)}`;
  };

  const handleEventClick = (event: MouseEvent<HTMLElement>, ne: NormalizedEvent) => {
    event.stopPropagation();
    setMore(null);
    onEventClick?.(ne.event, event);
  };

  const renderEvent = (ne: NormalizedEvent, tabbable: boolean, style?: React.CSSProperties, extra?: Record<string, string | number>) => {
    const descId = ne.event.description ? `${baseId}-desc-${ne.event.id}` : undefined;
    const label = rangeLabel(ne);
    return (
      <button
        key={ne.event.id}
        type="button"
        data-scheduler-event=""
        tabIndex={tabbable ? 0 : -1}
        aria-label={`${ne.event.title}, ${label}`}
        aria-describedby={descId}
        className={cx('ui-scheduler__event', `ui-scheduler__event--${ne.event.variant ?? 'primary'}`)}
        style={style}
        onClick={(e) => handleEventClick(e, ne)}
        {...extra}
      >
        {eventTemplate ? (
          eventTemplate(ne.event, { view, start: ne.start, end: ne.end })
        ) : (
          <>
            {!ne.allDay && view === 'week' && <span className="ui-scheduler__event-time">{fmt.time.format(ne.start)}</span>}
            <span className="ui-scheduler__event-title">{ne.event.title}</span>
          </>
        )}
        {descId && (
          <span id={descId} className="visually-hidden">
            {ne.event.description}
          </span>
        )}
      </button>
    );
  };

  const countLabel = (n: number) => (n === 0 ? L.noEvents : tp('eventCount', n));
  const dayName = (d: Date) => fmt.full.format(d);

  // ---- Month ----
  const renderMonth = () => {
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    const heads = days.slice(0, 7).map((d) => fmt.weekday.format(d));
    return (
      <>
        <div role="row" className="ui-scheduler__weekdays">
          {heads.map((name, i) => (
            <div key={i} role="columnheader" className="ui-scheduler__weekday">
              {name}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={toIsoDate(week[0]!)} role="row" className="ui-scheduler__week">
            {week.map((day) => {
              const list = eventsByDay.get(toIsoDate(day)) ?? [];
              const isActive = isSameDay(day, activeDay);
              const shown = list.slice(0, maxEventsPerDay);
              const hidden = list.length - shown.length;
              return (
                // Keyboard is handled on the grid root (APG grid); the cell adds pointer selection.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <div
                  key={toIsoDate(day)}
                  role="gridcell"
                  data-date={toIsoDate(day)}
                  tabIndex={isActive ? 0 : -1}
                  aria-label={`${dayName(day)}, ${countLabel(list.length)}`}
                  aria-current={isSameDay(day, today) ? 'date' : undefined}
                  className={cx(
                    'ui-scheduler__day',
                    !isSameMonth(day, date) && 'ui-scheduler__day--outside',
                    isSameDay(day, today) && 'ui-scheduler__day--today',
                    day.getTime() < today.getTime() && 'ui-scheduler__day--past',
                  )}
                  onClick={(e) => handleCellClick(e, day)}
                >
                  <span className="ui-scheduler__day-number" aria-hidden="true">
                    {day.getDate()}
                  </span>
                  {compact && list.length > 0 && (
                    <span className="ui-scheduler__dots" aria-hidden="true">
                      {list.slice(0, 3).map((ne, i) => (
                        <span key={i} className={cx('ui-scheduler__dot', `ui-scheduler__dot--${ne.event.variant ?? 'primary'}`)} />
                      ))}
                    </span>
                  )}
                  <div className="ui-scheduler__day-events" hidden={compact}>
                    {shown.map((ne) => renderEvent(ne, isActive))}
                    {hidden > 0 && (
                      <button
                        type="button"
                        tabIndex={isActive ? 0 : -1}
                        className="ui-scheduler__more"
                        data-scheduler-event=""
                        onClick={(e) => {
                          e.stopPropagation();
                          moreAnchor.current = e.currentTarget;
                          setFocus(day);
                          setMore({ day });
                        }}
                      >
                        {interpolate(L.more, { count: hidden })}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </>
    );
  };

  // ---- Week ----
  const renderWeek = () => {
    const timeLabel = (minutes: number) => fmt.time.format(new Date(2000, 0, 1, 0, minutes));
    const slots = Array.from({ length: slotCount }, (_, i) => startMin + i * slotMinutes);
    const nowMinutes = minutesOf(now);
    const nowSlot = Math.floor((nowMinutes - startMin) / slotMinutes);

    // Timed single-day segments per day, laid out in lanes.
    const timed = new Map<string, { ne: NormalizedEvent; start: Date; end: Date; lane: number; lanes: number }[]>();
    for (const day of days) {
      const list = (eventsByDay.get(toIsoDate(day)) ?? []).filter((e) => !e.allDay && !e.multiDay);
      const segments = list.map((ne) => ({ ne, start: ne.start, end: ne.end }));
      timed.set(
        toIsoDate(day),
        assignLanes(segments).map(({ item, lane, lanes }) => ({ ...item, lane, lanes })),
      );
    }

    return (
      <div ref={scrollerRef} className="ui-scheduler__scroller">
        <div role="row" className="ui-scheduler__weekdays ui-scheduler__week-head">
          <div role="presentation" className="ui-scheduler__corner" />
          {days.map((day) => (
            <div key={toIsoDate(day)} role="columnheader" aria-current={isSameDay(day, today) ? 'date' : undefined} className={cx('ui-scheduler__weekday', isSameDay(day, today) && 'ui-scheduler__weekday--today')}>
              {fmt.weekdayDay.format(day)}
            </div>
          ))}
        </div>
        <div role="row" className="ui-scheduler__all-day">
          <div role="rowheader" className="ui-scheduler__time-axis">
            {L.allDay}
          </div>
          {days.map((day) => {
            const list = (eventsByDay.get(toIsoDate(day)) ?? []).filter((e) => e.allDay || e.multiDay);
            const isActiveDay = isSameDay(day, activeDay);
            return (
              <div key={toIsoDate(day)} role="gridcell" tabIndex={-1} data-date={toIsoDate(day)} aria-label={`${dayName(day)}, ${L.allDay}`} className="ui-scheduler__all-day-cell">
                {list.map((ne) => renderEvent(ne, isActiveDay))}
              </div>
            );
          })}
        </div>
        {slots.map((minutes, slotIndex) => (
          <div key={minutes} role="row" className="ui-scheduler__slot-row">
            <div role="rowheader" className={cx('ui-scheduler__time-axis', minutes % 60 !== 0 && 'ui-scheduler__time-axis--minor')}>
              {minutes % 60 === 0 ? timeLabel(minutes) : <span className="visually-hidden">{timeLabel(minutes)}</span>}
            </div>
            {days.map((day) => {
              const iso = toIsoDate(day);
              const isActive = isSameDay(day, activeDay) && slotIndex === activeSlot;
              const starting = (timed.get(iso) ?? []).filter((s) => {
                const sMin = Math.max(minutesOf(s.start) * Number(isSameDay(s.start, day)), startMin);
                return Math.floor((sMin - startMin) / slotMinutes) === slotIndex && sMin < endMin && endOf(s.end, day) > startMin;
              });
              return (
                // Keyboard is handled on the grid root (APG grid); the slot adds pointer selection.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <div
                  key={iso}
                  role="gridcell"
                  data-date={iso}
                  data-minutes={minutes}
                  tabIndex={isActive ? 0 : -1}
                  aria-label={`${dayName(day)}, ${timeLabel(minutes)}`}
                  className={cx('ui-scheduler__slot', isSameDay(day, today) && 'ui-scheduler__slot--today', minutes % 60 === 0 && 'ui-scheduler__slot--hour')}
                  onClick={(e) => handleCellClick(e, day, minutes)}
                >
                  {starting.map((s) => {
                    const sMin = Math.max(isSameDay(s.start, day) ? minutesOf(s.start) : 0, startMin);
                    const eMin = Math.min(endOf(s.end, day), endMin);
                    const offset = ((sMin - startMin) % slotMinutes) / slotMinutes;
                    const span = (eMin - sMin) / slotMinutes;
                    return renderEvent(
                      s.ne,
                      isSameDay(day, activeDay),
                      { '--ui-slot-offset': offset, '--ui-slot-span': span, '--ui-lane': s.lane, '--ui-lanes': s.lanes } as React.CSSProperties,
                      { 'data-slot-start': slotIndex, 'data-slot-span': span },
                    );
                  })}
                  {isSameDay(day, today) && nowSlot === slotIndex && nowMinutes >= startMin && nowMinutes < endMin && (
                    <div className="ui-scheduler__now" aria-hidden="true" style={{ '--ui-slot-offset': ((nowMinutes - startMin) % slotMinutes) / slotMinutes } as React.CSSProperties} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const moreEvents = more ? (eventsByDay.get(toIsoDate(more.day)) ?? []) : [];

  return (
    <div className={cx('ui-scheduler', compact && 'ui-scheduler--compact', `ui-scheduler--${view}`, className)}>
      <div className="ui-scheduler__toolbar">
        <div className="ui-scheduler__nav btn-group">
          <Button type="button" variant="secondary" appearance="outline" size="sm" onClick={goToday}>
            {L.today}
          </Button>
          <Button type="button" variant="secondary" appearance="outline" size="sm" icon="chevron-left" aria-label={L.previous} onClick={() => shift(-1)} />
          <Button type="button" variant="secondary" appearance="outline" size="sm" icon="chevron-right" aria-label={L.next} onClick={() => shift(1)} />
        </div>
        <h2 id={titleId} className="ui-scheduler__title">
          {title}
        </h2>
        {views.length > 1 && (
          <SelectButton<SchedulerView>
            size="sm"
            variant="secondary"
            aria-label={t('schedulerView')}
            value={view}
            options={views.map((v) => ({ label: v === 'month' ? L.month : L.week, value: v }))}
            onChange={(v) => v && setView(v)}
          />
        )}
        <span className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </span>
      </div>
      {/* Keyboard navigation for the grid (APG) is handled on the grid root. */}
      {/* Focus lives on the roving gridcell, not the grid element itself. */}
      {/* eslint-disable jsx-a11y/interactive-supports-focus */}
      <div ref={gridRef} role="grid" aria-labelledby={titleId} aria-readonly="true" aria-busy={loading || undefined} className="ui-scheduler__grid" onKeyDown={handleKeyDown}>
        {view === 'month' ? renderMonth() : renderWeek()}
      </div>
      {/* eslint-enable jsx-a11y/interactive-supports-focus */}
      {compact && view === 'month' && (
        <section className="ui-scheduler__agenda" aria-label={dayName(focus)}>
          <h3 className="ui-scheduler__agenda-title">{dayName(focus)}</h3>
          {(eventsByDay.get(toIsoDate(focus)) ?? []).length === 0 ? (
            <p className="ui-scheduler__agenda-empty">{L.noEvents}</p>
          ) : (
            <div className="ui-scheduler__agenda-list">{(eventsByDay.get(toIsoDate(focus)) ?? []).map((ne) => renderEvent(ne, true))}</div>
          )}
        </section>
      )}
      {more && (
        <Portal>
          {/* Escape handling for the popover; focus is managed programmatically. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={panelRef}
            role="dialog"
            aria-label={dayName(more.day)}
            className="ui-scheduler__popover"
            style={{ position: 'fixed', top: position.top, left: position.left }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setMore(null);
                setFocus(more.day);
                pendingFocus.current = true;
              }
            }}
          >
            <div className="ui-scheduler__popover-title">{dayName(more.day)}</div>
            <div className="ui-scheduler__popover-list">{moreEvents.map((ne) => renderEvent(ne, true))}</div>
          </div>
        </Portal>
      )}
    </div>
  );
}

/** Minutes from the start of `day` at which `end` falls (1440 when it ends on a later day). */
function endOf(end: Date, day: Date): number {
  return end.getTime() >= dayEnd(day).getTime() ? 1440 : end.getHours() * 60 + end.getMinutes();
}

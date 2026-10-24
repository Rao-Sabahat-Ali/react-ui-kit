import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';

export interface TerminalProps {
  /** Receives the trimmed, non-empty line. Return text or a node to print; throw or reject to print the error text. */
  onCommand: (command: string) => ReactNode | Promise<ReactNode>;
  prompt?: string;
  welcome?: ReactNode;
  /** Commands remembered for ArrowUp/ArrowDown and entries kept in the log. */
  maxHistory?: number;
  placeholder?: string;
  'aria-label'?: string;
  inputLabel?: string;
  height?: string | number;
  disabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface Entry {
  id: number;
  command: string;
  output: ReactNode;
  state: 'running' | 'done' | 'error';
}

/** Command console: input line, command history (ArrowUp/Down) and an announced, scrollable log. `clear` is built in. */
export function Terminal({ onCommand, prompt = '$', welcome, maxHistory = 100, placeholder, inputLabel, height = '20rem', disabled = false, className, ref, ...rest }: TerminalProps) {
  const { t } = useLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const history = useRef<string[]>([]);
  // -1 = typing a new line; otherwise an index into history (0 = newest).
  const cursor = useRef(-1);
  const typed = useRef('');
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const label = rest['aria-label'] ?? t('terminal');

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries]);

  const patch = (id: number, change: Partial<Entry>) => setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...change } : e)));

  const run = (line: string) => {
    history.current = [line, ...history.current.filter((_, i) => !(i === 0 && history.current[0] === line))].slice(0, maxHistory);
    cursor.current = -1;
    typed.current = '';
    if (line === 'clear') {
      setEntries([]);
      return;
    }
    const id = nextId.current++;
    const finish = (output: ReactNode) => patch(id, { output, state: 'done' });
    const fail = () => patch(id, { output: t('terminalError'), state: 'error' });
    let result: ReactNode | Promise<ReactNode>;
    try {
      result = onCommand(line);
    } catch {
      setEntries((list) => [...list, { id, command: line, output: t('terminalError'), state: 'error' as const }].slice(-maxHistory));
      return;
    }
    if (result instanceof Promise) {
      setEntries((list) => [...list, { id, command: line, output: t('terminalRunning'), state: 'running' as const }].slice(-maxHistory));
      result.then(finish, fail);
    } else {
      setEntries((list) => [...list, { id, command: line, output: result, state: 'done' as const }].slice(-maxHistory));
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const line = draft.trim();
      setDraft('');
      if (line) run(line);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.current.length === 0) return;
      if (cursor.current === -1) typed.current = draft;
      cursor.current = Math.min(cursor.current + 1, history.current.length - 1);
      setDraft(history.current[cursor.current] ?? '');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (cursor.current === -1) return;
      cursor.current -= 1;
      setDraft(cursor.current === -1 ? typed.current : (history.current[cursor.current] ?? ''));
    } else if (event.key === 'Escape') {
      setDraft('');
      cursor.current = -1;
    }
  };

  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    // Do not steal the click when the user is selecting output text.
    if (window.getSelection()?.toString()) return;
    if ((event.target as HTMLElement).closest('input, a, button')) return;
    inputRef.current?.focus();
  };

  return (
    // The click only forwards focus to the input, which is itself keyboard reachable.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div ref={ref} role="group" aria-label={label} className={cx('ui-terminal', disabled && 'ui-terminal--disabled', className)} onClick={focusInput}>
      {/* The log scrolls, so it must be keyboard scrollable (WCAG 2.1.1); role=log announces additions politely. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={logRef} role="log" aria-label={label} aria-relevant="additions" tabIndex={0} className="ui-terminal__log" style={{ height } as CSSProperties}>
        {welcome && <div className="ui-terminal__welcome">{welcome}</div>}
        {entries.map((entry) => (
          <div key={entry.id} className="ui-terminal__entry">
            <div className="ui-terminal__command">
              <span className="ui-terminal__prompt" aria-hidden="true">
                {prompt}
              </span>{' '}
              <span dir="auto">{entry.command}</span>
            </div>
            {entry.output !== null && entry.output !== undefined && entry.output !== '' && (
              <div dir="auto" className={cx('ui-terminal__output', entry.state === 'error' && 'ui-terminal__output--error', entry.state === 'running' && 'ui-terminal__output--running')}>
                {entry.output}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="ui-terminal__form">
        <span className="ui-terminal__prompt" aria-hidden="true">
          {prompt}
        </span>
        <input
          ref={inputRef}
          type="text"
          dir="auto"
          className="ui-terminal__input"
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={inputLabel ?? t('terminalInput')}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => {
            setDraft(event.target.value);
            cursor.current = -1;
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}

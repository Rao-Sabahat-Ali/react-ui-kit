import { useCallback, useEffect, useImperativeHandle, useRef, useState, type HTMLAttributes, type Ref } from 'react';
import { readMotionMs } from '../../motion/tokens';
import { useExitGhosts, withGhosts } from '../../motion/useExitGhosts';
import { useFlip } from '../../motion/useFlip';
import { cx } from '../../utils/cx';
import { Message, type MessageProps } from '../Message/Message';

export interface MessageItem extends Omit<MessageProps, 'onDismiss'> {
  id?: string;
  /** Auto-remove after this many ms (ignored when `sticky`). */
  life?: number;
  sticky?: boolean;
}

export interface MessagesHandle {
  show: (message: MessageItem | MessageItem[]) => void;
  replace: (message: MessageItem | MessageItem[]) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export interface MessagesProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Controlled list; omit for imperative use through `ref`. */
  value?: MessageItem[];
  onRemove?: (id: string) => void;
  ref?: Ref<MessagesHandle>;
}

type StoredItem = MessageItem & { id: string };

export function Messages({ value, onRemove, className, ref, ...rest }: MessagesProps) {
  const [items, setItems] = useState<StoredItem[]>([]);
  const counter = useRef(0);
  const controlled = value !== undefined;
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  const withIds = useCallback((m: MessageItem | MessageItem[]): StoredItem[] => (Array.isArray(m) ? m : [m]).map((item) => ({ ...item, id: item.id ?? `ui-message-${++counter.current}` })), []);

  const remove = useCallback(
    (id: string) => {
      if (!controlled) setItems((prev) => prev.filter((m) => m.id !== id));
      onRemoveRef.current?.(id);
    },
    [controlled],
  );

  useImperativeHandle(
    ref,
    () => ({
      show: (m) => !controlled && setItems((prev) => [...prev, ...withIds(m)]),
      replace: (m) => !controlled && setItems(withIds(m)),
      remove,
      clear: () => {
        if (controlled) return;
        setItems((prev) => {
          prev.forEach((m) => onRemoveRef.current?.(m.id));
          return [];
        });
      },
    }),
    [controlled, remove, withIds],
  );

  const list: StoredItem[] = controlled ? value.map((m, i) => ({ ...m, id: m.id ?? `ui-message-c${i}` })) : items;

  // Auto-removal timers for non-sticky messages with a `life`.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const live = new Set(list.map((m) => m.id));
    for (const [id, timer] of timers.current) {
      if (!live.has(id)) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
    }
    for (const m of list) {
      if (m.life && !m.sticky && !timers.current.has(m.id)) {
        timers.current.set(
          m.id,
          setTimeout(() => {
            timers.current.delete(m.id);
            remove(m.id);
          }, m.life),
        );
      }
    }
  });
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  // Removed notes stay as inert ghosts while they leave; the rest slide into the gap (FLIP).
  const ghosts = useExitGhosts(list, list, (m) => m.id);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useFlip(containerRef, [list.map((m) => m.id).join(), ghosts.map((g) => g.key).join()], { selector: '.ui-message', duration: readMotionMs(typeof document === 'undefined' ? null : document.documentElement, 'part') });

  const nodes = list.map(({ id, life: _life, sticky, live, dismissible, ...message }) => (
    <Message key={id} live={live ?? (message.severity === 'danger' ? 'assertive' : 'off')} dismissible={dismissible ?? true} onDismiss={() => remove(id)} {...message} />
  ));
  const withLeaving = withGhosts(nodes, ghosts, ({ item }) => {
    const { id, life: _life, sticky: _sticky, live: _live, dismissible: _dismissible, ...message } = item as StoredItem;
    return [<Message key={`ghost-${id}`} {...message} live="off" dismissible={false} aria-hidden="true" inert data-state="closed" />];
  });

  return (
    <div ref={containerRef} className={cx('ui-messages', className)} aria-live="polite" aria-relevant="additions text" {...rest}>
      {withLeaving}
    </div>
  );
}

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useAssemble } from '../../motion/useAssemble';
import { cx } from '../../utils/cx';
import { Skeleton } from '../Skeleton/Skeleton';

export interface DeferredContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onLoad'> {
  children?: ReactNode;
  onLoad?: () => void;
  placeholder?: ReactNode;
  rootMargin?: string;
  ref?: Ref<HTMLDivElement>;
}

export function DeferredContent({ children, onLoad, placeholder, rootMargin = '200px', className, ref, ...rest }: DeferredContentProps) {
  const [loaded, setLoaded] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const firedRef = useRef(false);
  // The real content assembles in (translate + opacity along the guide line) when it replaces the placeholder.
  useAssemble(elRef, { enabled: loaded, trigger: loaded });

  useEffect(() => {
    if (loaded) return;
    const reveal = () => setLoaded(true);
    if (typeof IntersectionObserver === 'undefined') {
      // No IntersectionObserver (SSR hydration, old browsers): render immediately.
      reveal();
      return;
    }
    const el = elRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          reveal();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded, rootMargin]);

  useEffect(() => {
    if (loaded && !firedRef.current) {
      firedRef.current = true;
      onLoadRef.current?.();
    }
  }, [loaded]);

  return (
    <div
      ref={(node) => {
        elRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx('ui-deferred-content', loaded && 'ui-deferred-content--loaded', className)}
      aria-busy={loaded ? undefined : true}
      {...rest}
    >
      {loaded ? (
        <div className="ui-deferred-content__body" data-assemble>
          {children}
        </div>
      ) : (
        (placeholder ?? <Skeleton shape="rect" width="100%" height="6rem" />)
      )}
    </div>
  );
}

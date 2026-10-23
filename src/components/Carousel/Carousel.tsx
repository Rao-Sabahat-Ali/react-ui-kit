import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref, type TouchEvent } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { useLocale } from '../../locale/LocaleProvider';
import { canUseDOM } from '../../utils/dom';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';

export interface CarouselResponsiveOption {
  /** Max viewport width the option applies to, e.g. `'768px'`. */
  breakpoint: string;
  numVisible: number;
  numScroll: number;
}

export interface CarouselProps<T> extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onChange'> {
  value: T[];
  itemTemplate: (item: T, index: number) => ReactNode;
  numVisible?: number;
  numScroll?: number;
  /** Applied when the viewport is at most `breakpoint` wide (smallest matching wins). */
  responsiveOptions?: CarouselResponsiveOption[];
  circular?: boolean;
  /** Autoplay interval in ms. Off by default; never runs with reduced motion. */
  autoplayInterval?: number;
  orientation?: 'horizontal' | 'vertical';
  /** Viewport height for the vertical orientation. */
  verticalViewportHeight?: string;
  showIndicators?: boolean;
  showNavigators?: boolean;
  /** Controlled page index. */
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** Accessible name (defaults to the localised "Carousel"). */
  'aria-label'?: string;
  ref?: Ref<HTMLElement>;
}

const SWIPE_THRESHOLD = 40;

function useResponsive(numVisible: number, numScroll: number, options: CarouselResponsiveOption[] | undefined) {
  const sorted = useMemo(() => [...(options ?? [])].sort((a, b) => parseFloat(a.breakpoint) - parseFloat(b.breakpoint)), [options]);
  const key = useSyncExternalStore(
    (notify) => {
      if (!canUseDOM || sorted.length === 0) return () => {};
      const mqls = sorted.map((o) => window.matchMedia(`(max-width: ${o.breakpoint})`));
      mqls.forEach((m) => m.addEventListener('change', notify));
      return () => mqls.forEach((m) => m.removeEventListener('change', notify));
    },
    () => (canUseDOM ? sorted.findIndex((o) => window.matchMedia(`(max-width: ${o.breakpoint})`).matches) : -1),
    () => -1,
  );
  const match = key >= 0 ? sorted[key] : undefined;
  return { visible: Math.max(1, match?.numVisible ?? numVisible), scroll: Math.max(1, match?.numScroll ?? numScroll) };
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false" className="ui-icon">
      <path d={playing ? 'M7 5h3v14H7zM14 5h3v14h-3z' : 'M8 5v14l11-7z'} />
    </svg>
  );
}

export function Carousel<T>({
  value,
  itemTemplate,
  numVisible = 1,
  numScroll = 1,
  responsiveOptions,
  circular = false,
  autoplayInterval,
  orientation = 'horizontal',
  verticalViewportHeight = '300px',
  showIndicators = true,
  showNavigators = true,
  page: pageProp,
  defaultPage = 0,
  onPageChange,
  className,
  style,
  'aria-label': ariaLabel,
  ref,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: CarouselProps<T>) {
  const { t } = useLocale();
  const slidesId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const { visible, scroll } = useResponsive(numVisible, numScroll, responsiveOptions);
  const count = value.length;
  const visibleCount = Math.min(visible, Math.max(count, 1));
  const totalPages = count <= visibleCount ? 1 : Math.ceil((count - visibleCount) / scroll) + 1;
  const [rawPage, setPage] = useControllableState(pageProp, defaultPage, onPageChange);
  const page = Math.min(Math.max(rawPage, 0), totalPages - 1);
  const first = Math.min(page * scroll, Math.max(count - visibleCount, 0));

  const canAutoplay = autoplayInterval !== undefined && autoplayInterval > 0 && !reducedMotion && totalPages > 1;
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const running = canAutoplay && playing && !hovered && !focused;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback((next: number) => setPage(Math.min(Math.max(next, 0), totalPages - 1)), [setPage, totalPages]);
  const canPrev = circular || page > 0;
  const canNext = circular || page < totalPages - 1;
  const prev = () => {
    if (page > 0) goTo(page - 1);
    else if (circular) goTo(totalPages - 1);
  };
  const next = useCallback(() => {
    if (page < totalPages - 1) goTo(page + 1);
    else if (circular || canAutoplay) goTo(0);
  }, [page, totalPages, goTo, circular, canAutoplay]);

  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => nextRef.current(), autoplayInterval);
    return () => window.clearInterval(timer);
  }, [running, autoplayInterval]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const delta = orientation === 'vertical' ? touch.clientY - start.y : touch.clientX - start.x;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    const rtl = orientation === 'horizontal' && event.currentTarget.closest('[dir="rtl"]') !== null;
    const forward = rtl ? delta > 0 : delta < 0;
    if (forward) {
      if (canNext) next();
    } else if (canPrev) prev();
  };

  // Positive offset; the stylesheet applies the direction (LTR/RTL/vertical).
  const trackStyle = { '--ui-carousel-offset': `${(first * 100) / visibleCount}%` } as CSSProperties;
  const rootStyle = { ...style, '--ui-carousel-visible': visibleCount, ...(orientation === 'vertical' ? { '--ui-carousel-height': verticalViewportHeight } : {}) } as CSSProperties;
  const vertical = orientation === 'vertical';

  return (
    <section
      ref={ref}
      aria-roledescription="carousel"
      aria-label={ariaLabel ?? t('carousel')}
      className={cx('carousel ui-carousel', vertical && 'ui-carousel--vertical', className)}
      style={rootStyle}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    >
      <div className="ui-carousel__controls">
        {canAutoplay && (
          <button type="button" className="btn btn-sm ui-carousel__play" aria-label={playing ? t('pauseAutoplay') : t('startAutoplay')} onClick={() => setPlaying((p) => !p)}>
            <PlayPauseIcon playing={playing} />
          </button>
        )}
      </div>
      <div className="ui-carousel__body">
        {showNavigators && (
          <button type="button" className="ui-carousel__nav ui-carousel__nav--prev" aria-label={t('previousSlide')} aria-controls={slidesId} disabled={!canPrev} onClick={prev}>
            <Icon name={vertical ? 'chevron-up' : 'chevron-left'} />
          </button>
        )}
        <div className="carousel-inner ui-carousel__viewport" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div id={slidesId} className="ui-carousel__track" aria-live={running ? 'off' : 'polite'} style={trackStyle}>
            {value.map((item, index) => {
              const shown = index >= first && index < first + visibleCount;
              return (
                <div
                  key={index}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={t('carouselSlide', { index: index + 1, total: count })}
                  aria-hidden={shown ? undefined : true}
                  inert={!shown}
                  className={cx('carousel-item ui-carousel__item', shown && 'active ui-carousel__item--active')}
                >
                  {itemTemplate(item, index)}
                </div>
              );
            })}
          </div>
        </div>
        {showNavigators && (
          <button type="button" className="ui-carousel__nav ui-carousel__nav--next" aria-label={t('nextSlide')} aria-controls={slidesId} disabled={!canNext} onClick={next}>
            <Icon name={vertical ? 'chevron-down' : 'chevron-right'} />
          </button>
        )}
      </div>
      {showIndicators && totalPages > 1 && (
        <div className="ui-carousel__indicators">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              className={cx('ui-carousel__indicator', i === page && 'ui-carousel__indicator--active')}
              aria-label={t('goToSlide', { index: i + 1 })}
              aria-current={i === page ? 'true' : undefined}
              aria-controls={slidesId}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

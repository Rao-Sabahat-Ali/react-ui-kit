import { useEffect, useId, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { useRovingFocus } from '../../hooks/useRovingFocus';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Dialog } from '../Dialog/Dialog';
import { Icon } from '../Icon/Icon';
import { safeImageSrc } from '../Image/Image';

export interface GalleriaItem {
  src: string;
  /** Required: describes the image (use `''` only for purely decorative images). */
  alt: string;
  thumbnail?: string;
  caption?: ReactNode;
}

export interface GalleriaProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onChange'> {
  value: GalleriaItem[];
  activeIndex?: number;
  defaultActiveIndex?: number;
  onIndexChange?: (index: number) => void;
  showThumbnails?: boolean;
  thumbnailsPosition?: 'bottom' | 'top' | 'start' | 'end';
  showItemNavigators?: boolean;
  showIndicators?: boolean;
  /** Show a button that opens the gallery in a fullscreen dialog. */
  fullscreen?: boolean;
  circular?: boolean;
  /** Autoplay interval in ms (or `true` for 4000). Off by default; never with reduced motion. */
  autoplay?: boolean | number;
  'aria-label'?: string;
  ref?: Ref<HTMLElement>;
}

const DEFAULT_INTERVAL = 4000;

export function Galleria({
  value,
  activeIndex,
  defaultActiveIndex = 0,
  onIndexChange,
  showThumbnails = true,
  thumbnailsPosition = 'bottom',
  showItemNavigators = true,
  showIndicators = false,
  fullscreen = false,
  circular = false,
  autoplay = false,
  className,
  'aria-label': ariaLabel,
  ref,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: GalleriaProps) {
  const { t } = useLocale();
  const stageId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const count = value.length;
  const [rawIndex, setIndex] = useControllableState(activeIndex, defaultActiveIndex, onIndexChange);
  const index = count === 0 ? 0 : Math.min(Math.max(rawIndex, 0), count - 1);
  const [isFullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const vertical = thumbnailsPosition === 'start' || thumbnailsPosition === 'end';
  const roving = useRovingFocus(thumbsRef, { selector: '.ui-galleria__thumb', orientation: vertical ? 'vertical' : 'horizontal', loop: circular });

  const interval = autoplay === true ? DEFAULT_INTERVAL : typeof autoplay === 'number' ? autoplay : 0;
  const canAutoplay = interval > 0 && !reducedMotion && count > 1;
  const running = canAutoplay && playing && !hovered && !isFullscreen;

  const canPrev = circular || index > 0;
  const canNext = circular || index < count - 1;
  const go = (next: number) => {
    if (count === 0) return;
    if (next < 0) setIndex(circular ? count - 1 : 0);
    else if (next >= count) setIndex(circular ? 0 : count - 1);
    else setIndex(next);
  };
  const goRef = useRef(() => {});
  goRef.current = () => setIndex(index + 1 >= count ? 0 : index + 1);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => goRef.current(), interval);
    return () => window.clearInterval(timer);
  }, [running, interval]);

  const handleThumbKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = roving(event);
    if (target >= 0) setIndex(target);
  };
  const handleStageKey = (event: KeyboardEvent<HTMLElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
      event.preventDefault();
      go(index - 1);
    }
  };

  const item = value[index];
  const slideLabel = t('carouselSlide', { index: index + 1, total: count });

  const renderStage = (inDialog: boolean) => (
    // Arrow keys on the focused stage step through images (Carousel pattern).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className="ui-galleria__stage"
      role="group"
      aria-roledescription="slide"
      aria-label={slideLabel}
      id={inDialog ? undefined : stageId}
      onKeyDown={handleStageKey}
    >
      {item && (
        <figure className="ui-galleria__figure">
          <img src={safeImageSrc(item.src)} alt={item.alt} className="ui-galleria__image" />
          {item.caption !== undefined && <figcaption className="ui-galleria__caption" aria-live={running ? 'off' : 'polite'}>{item.caption}</figcaption>}
        </figure>
      )}
      {showItemNavigators && count > 1 && (
        <>
          <button type="button" className="ui-galleria__nav ui-galleria__nav--prev" aria-label={t('previousSlide')} disabled={!canPrev} onClick={() => go(index - 1)}>
            <Icon name="chevron-left" />
          </button>
          <button type="button" className="ui-galleria__nav ui-galleria__nav--next" aria-label={t('nextSlide')} disabled={!canNext} onClick={() => go(index + 1)}>
            <Icon name="chevron-right" />
          </button>
        </>
      )}
    </div>
  );

  return (
    <section
      ref={ref}
      aria-roledescription="carousel"
      aria-label={ariaLabel ?? t('carousel')}
      className={cx('ui-galleria', `ui-galleria--thumbs-${thumbnailsPosition}`, className)}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      <div className="ui-galleria__main">
        {renderStage(false)}
        {(canAutoplay || fullscreen) && (
          <div className="ui-galleria__actions">
            {canAutoplay && (
              <button type="button" className="ui-galleria__action" aria-label={playing ? t('pauseAutoplay') : t('startAutoplay')} onClick={() => setPlaying((p) => !p)}>
                <Icon name={playing ? 'pause' : 'play'} />
              </button>
            )}
            {fullscreen && item && (
              <button type="button" className="ui-galleria__action" aria-label={t('viewLarger', { alt: item.alt || slideLabel })} aria-haspopup="dialog" onClick={() => setFullscreen(true)}>
                <Icon name="maximize" />
              </button>
            )}
          </div>
        )}
        {showIndicators && count > 1 && (
          <div className="ui-galleria__indicators">
            {value.map((_, i) => (
              <button
                key={i}
                type="button"
                className={cx('ui-galleria__indicator', i === index && 'ui-galleria__indicator--active')}
                aria-label={t('goToSlide', { index: i + 1 })}
                aria-current={i === index ? 'true' : undefined}
                aria-controls={stageId}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
      {showThumbnails && count > 0 && (
        // Arrow keys move between thumbnail buttons (roving tabindex) and select them.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div ref={thumbsRef} className="ui-galleria__thumbs" onKeyDown={handleThumbKey}>
          {value.map((thumb, i) => (
            <button
              key={i}
              type="button"
              className={cx('ui-galleria__thumb', i === index && 'ui-galleria__thumb--active')}
              aria-current={i === index ? 'true' : undefined}
              aria-controls={stageId}
              aria-label={thumb.alt || t('goToSlide', { index: i + 1 })}
              tabIndex={i === index ? 0 : -1}
              onClick={() => setIndex(i)}
            >
              <img src={safeImageSrc(thumb.thumbnail ?? thumb.src)} alt="" loading="lazy" className="ui-galleria__thumb-img" />
            </button>
          ))}
        </div>
      )}
      {fullscreen && (
        <Dialog open={isFullscreen} onClose={() => setFullscreen(false)} size="fullscreen" aria-label={ariaLabel ?? t('carousel')} className="ui-galleria__dialog">
          {renderStage(true)}
        </Dialog>
      )}
    </section>
  );
}

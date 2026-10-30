import { useEffect, useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode, type Ref, type SyntheticEvent } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { safeUrl } from '../../utils/url';
import { Dialog } from '../Dialog/Dialog';
import { Icon } from '../Icon/Icon';

export type ImageRatio = '1x1' | '4x3' | '16x9' | '21x9';

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height' | 'placeholder' | 'loading'> {
  src: string;
  /** Required. Use `''` for decorative images. */
  alt: string;
  width?: number | string;
  height?: number | string;
  ratio?: ImageRatio;
  fit?: 'cover' | 'contain';
  loading?: 'lazy' | 'eager';
  /** Used once when `src` fails to load. */
  fallbackSrc?: string;
  /** Shown until the image has loaded (e.g. `<Skeleton shape="rect" />`). */
  placeholder?: ReactNode;
  /** Wrap in a button that opens a zoom/rotate preview dialog. */
  preview?: boolean;
  rounded?: boolean;
  thumbnail?: boolean;
  /** Class for the outer wrapper. */
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  ref?: Ref<HTMLImageElement>;
}

/** Images may use object/data URLs created by the app in addition to safeUrl protocols. */
export function safeImageSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const trimmed = src.trim();
  if (/^blob:/i.test(trimmed) || /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(trimmed)) return trimmed;
  return safeUrl(trimmed);
}

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

export function Image({
  src,
  alt,
  width,
  height,
  ratio,
  fit = 'cover',
  loading = 'lazy',
  fallbackSrc,
  placeholder,
  preview = false,
  rounded = false,
  thumbnail = false,
  className,
  wrapperClassName,
  wrapperStyle,
  onLoad,
  onError,
  ref,
  ...rest
}: ImageProps) {
  const { t } = useLocale();
  const [currentSrc, setCurrentSrc] = useState(src);
  const [usedFallback, setUsedFallback] = useState(false);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset when the source changes.
  useEffect(() => {
    setCurrentSrc(src);
    setUsedFallback(false);
    setStatus('loading');
  }, [src]);

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    if (fallbackSrc && !usedFallback) {
      setUsedFallback(true);
      setCurrentSrc(fallbackSrc);
      setStatus('loading');
    } else {
      setStatus('error');
    }
    onError?.(event);
  };
  const handleLoad = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    setStatus('loaded');
    onLoad?.(event);
  };

  const resolved = safeImageSrc(currentSrc);
  const showPlaceholder = placeholder !== undefined && status === 'loading';
  const img = (
    <img
      ref={ref}
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      className={cx('ui-image__img', `ui-image__img--${fit}`, ratio === undefined && 'img-fluid', rounded && 'rounded', thumbnail && 'img-thumbnail', showPlaceholder && 'ui-image__img--hidden', className)}
      onLoad={handleLoad}
      onError={handleError}
      {...rest}
    />
  );

  const closePreview = () => {
    setOpen(false);
    setZoom(1);
    setRotation(0);
  };

  return (
    <span
      className={cx('ui-image', ratio && `ui-image--ratio ui-image--ratio-${ratio}`, status === 'error' && 'ui-image--error', wrapperClassName)}
      style={wrapperStyle}
      data-status={status}
    >
      {showPlaceholder && <span className="ui-image__placeholder">{placeholder}</span>}
      {preview ? (
        <button type="button" className="ui-image__trigger" aria-label={alt ? t('viewLarger', { alt }) : t('imagePreview')} onClick={() => setOpen(true)}>
          {img}
        </button>
      ) : (
        img
      )}
      {preview && (
        <Dialog open={open} onClose={closePreview} aria-label={alt || t('imagePreview')} size="xl" className="ui-image__dialog">
          <div className="ui-image__toolbar" role="group" aria-label={t('imagePreview')}>
            <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={t('zoomOut')} disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}>
              <Icon name="minus" />
            </button>
            <span className="ui-image__zoom ui-qty ui-tabular" role="status">
              {zoom}×
            </span>
            <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={t('zoomIn')} disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}>
              <Icon name="plus" />
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={t('rotate')} onClick={() => setRotation((r) => (r + 90) % 360)}>
              <Icon name="rotate" />
            </button>
          </div>
          <div className="ui-image__stage">
            <img
              src={resolved}
              alt={alt}
              className="ui-image__preview"
              data-zoom={zoom}
              data-rotation={rotation}
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            />
          </div>
        </Dialog>
      )}
    </span>
  );
}

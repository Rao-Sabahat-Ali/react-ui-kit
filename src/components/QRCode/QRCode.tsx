import { useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { useScanColorWarnings } from '../../hooks/useScanColorWarnings';
import { resolveCssColor, safeColorForXml, warnOnce } from '../../utils/scan';
import { Button } from '../Button/Button';
import { getIconDefinition, Icon, type IconName } from '../Icon/Icon';
import { safeImageSrc } from '../Image/Image';
import { Skeleton } from '../Skeleton/Skeleton';
import { Spinner } from '../Spinner/Spinner';
import { QrError, type QrEcc } from './encoder';
import {
  buildQrLayout,
  layoutToSvg,
  logoShapePath,
  textFontSize,
  LOGO_MAX_FRACTION,
  LOGO_MIN_FRACTION,
  type QrFinderShape,
  type QrLayout,
  type QrLogoContent,
  type QrLogoShape,
  type QrModuleShape,
} from './layout';
import { canDrawCanvas, canvasToBlob, drawCode, drawLogo, modulePixels, rasterize, sanitizeFilename, saveBlob, type QrColors } from './raster';

export type QRCodeStatus = 'active' | 'loading' | 'expired' | 'scanned';

export interface QRCodeLogo {
  /** Image URL (http/https/relative, `blob:` or `data:image/…;base64`); passes through `safeImageSrc`. */
  src?: string;
  icon?: IconName;
  text?: string;
  /** Fraction of the code width, clamped to 0.1–0.3. Default 0.22. */
  size?: number;
  shape?: QrLogoShape;
  /** Clear space around the logo in modules (0–4). Default 1. */
  padding?: number;
  /** Remove the modules behind the logo and draw a background plate. Default true. */
  excavate?: boolean;
  /** Required: names the logo for assistive technology. */
  alt: string;
}

export interface QRCodeHandle {
  toDataURL: (type?: 'png' | 'svg') => Promise<string>;
  toBlob: (type?: 'png' | 'svg') => Promise<Blob>;
  download: (filename?: string, type?: 'png' | 'svg') => Promise<void>;
}

export interface QRCodeProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'onError'> {
  value: string;
  size?: number;
  errorCorrection?: QrEcc;
  margin?: number;
  moduleShape?: QrModuleShape;
  finderShape?: QrFinderShape;
  finderInnerShape?: QrFinderShape;
  foreground?: string;
  background?: string;
  logo?: QRCodeLogo;
  renderAs?: 'svg' | 'canvas';
  label?: string;
  describedValue?: string;
  caption?: ReactNode;
  bordered?: boolean;
  title?: string;
  status?: QRCodeStatus;
  expiresAt?: Date | number;
  onExpire?: () => void;
  onRefresh?: () => void;
  onError?: (error: QrError) => void;
  ref?: Ref<QRCodeHandle>;
}

const DEFAULT_FOREGROUND = 'var(--ui-color-qr-foreground, black)';
const DEFAULT_BACKGROUND = 'var(--ui-color-qr-background, white)';
const MAX_TIMEOUT = 2 ** 31 - 1;

function toMillis(at: Date | number | undefined): number | undefined {
  if (at === undefined) return undefined;
  const ms = typeof at === 'number' ? at : at.getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

type Built = { layout: QrLayout; error?: undefined } | { layout?: undefined; error: QrError };

export function QRCode({
  value,
  size = 160,
  errorCorrection = 'M',
  margin = 4,
  moduleShape = 'square',
  finderShape = 'square',
  finderInnerShape,
  foreground,
  background,
  logo,
  renderAs = 'svg',
  label,
  describedValue,
  caption,
  bordered = false,
  title,
  status = 'active',
  expiresAt,
  onExpire,
  onRefresh,
  onError,
  className,
  style,
  ref,
  ...rest
}: QRCodeProps) {
  const { t } = useLocale();
  const uid = useId().replace(/:/g, '');
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fg = foreground ?? DEFAULT_FOREGROUND;
  const bg = background ?? DEFAULT_BACKGROUND;
  const innerShape = finderInnerShape ?? finderShape;

  // --- Logo content (unsafe or missing sources fall through to icon, then text, then no logo) -------------
  const logoSrc = logo?.src;
  const logoIcon = logo?.icon;
  const logoText = logo?.text;
  const logoContent = useMemo<QrLogoContent | undefined>(() => {
    const href = logoSrc ? safeImageSrc(logoSrc) : undefined;
    if (href) return { kind: 'image', href };
    const def = logoIcon ? getIconDefinition(logoIcon) : undefined;
    if (def) return { kind: 'icon', d: def.d, fill: def.fill };
    if (logoText) return { kind: 'text', text: logoText };
    return undefined;
  }, [logoSrc, logoIcon, logoText]);
  const hasLogo = logoContent !== undefined;
  const effectiveEcc: QrEcc = hasLogo ? 'H' : errorCorrection;
  const logoSize = logo?.size;
  const logoPadding = logo?.padding;
  const logoExcavate = logo?.excavate;
  const logoShape = logo?.shape;

  // --- Encoding, memoised by value and options (a rotating value re-renders the same SVG in place) --------
  const built = useMemo<Built>(() => {
    try {
      return {
        layout: buildQrLayout({
          value,
          ecc: effectiveEcc,
          margin,
          moduleShape,
          finderShape,
          finderInnerShape: innerShape,
          logo: hasLogo ? { fraction: logoSize, padding: logoPadding, excavate: logoExcavate, shape: logoShape } : undefined,
        }),
      };
    } catch (e) {
      return { error: e instanceof QrError ? e : new QrError('invalid-option', e instanceof Error ? e.message : 'Encoding failed') };
    }
  }, [value, effectiveEcc, margin, moduleShape, finderShape, innerShape, hasLogo, logoSize, logoPadding, logoExcavate, logoShape]);
  const { layout, error } = built;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    if (error) onErrorRef.current?.(error);
  }, [error]);

  // --- Expiry --------------------------------------------------------------------------------------------
  const expiresMs = toMillis(expiresAt);
  const [expiredFor, setExpiredFor] = useState<number | undefined>();
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  useEffect(() => {
    if (expiresMs === undefined) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      const left = expiresMs - Date.now();
      if (left <= 0) {
        setExpiredFor(expiresMs);
        onExpireRef.current?.();
        return;
      }
      timer = setTimeout(arm, Math.min(left, MAX_TIMEOUT));
    };
    arm();
    return () => clearTimeout(timer);
  }, [expiresMs]);
  const effectiveStatus: QRCodeStatus = status === 'active' && expiresMs !== undefined && expiredFor === expiresMs ? 'expired' : status;

  // --- Announcements -------------------------------------------------------------------------------------
  const previousStatus = useRef(effectiveStatus);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (previousStatus.current === effectiveStatus) return;
    previousStatus.current = effectiveStatus;
    setAnnouncement(effectiveStatus === 'expired' ? t('qrExpired') : effectiveStatus === 'scanned' ? t('qrScanned') : '');
  }, [effectiveStatus, t]);

  // --- Development warnings --------------------------------------------------------------------------------
  useScanColorWarnings('QRCode', figureRef, fg, bg);
  useEffect(() => {
    if (margin < 4) warnOnce(`QRCode: margin ${margin} is below the 4-module quiet zone in ISO/IEC 18004; some scanners need it.`);
  }, [margin]);
  useEffect(() => {
    // Ring and eye of different shapes read fine in most scanners, except with a circle, or under dot modules.
    const risky = finderShape !== innerShape && (finderShape === 'circle' || innerShape === 'circle' || moduleShape === 'dots');
    if (risky) warnOnce(`QRCode: mixing a ${finderShape} finder ring with a ${innerShape} eye${moduleShape === 'dots' ? ' under dot modules' : ''} is decorative; some scanners cannot read it. Match the two shapes.`);
  }, [finderShape, innerShape, moduleShape]);
  useEffect(() => {
    if (logoSize !== undefined && (logoSize < LOGO_MIN_FRACTION || logoSize > LOGO_MAX_FRACTION)) warnOnce(`QRCode: logo.size ${logoSize} was clamped to ${LOGO_MIN_FRACTION}–${LOGO_MAX_FRACTION} of the code width to stay scannable.`);
  }, [logoSize]);

  // --- Canvas rendering --------------------------------------------------------------------------------------
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (renderAs !== 'canvas' || !canvas || !layout || !canDrawCanvas()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    // Exactly the device pixels the box covers (no resampling); one module is `pixels / total` pixels.
    const pixels = Math.max(layout.total, Math.round(size * dpr));
    canvas.width = canvas.height = pixels;
    ctx.setTransform(pixels / layout.total, 0, 0, pixels / layout.total, 0, 0);
    const colors: QrColors = {
      foreground: safeColorForXml(resolveCssColor(figureRef.current, fg), 'black'),
      background: safeColorForXml(resolveCssColor(figureRef.current, bg), 'white'),
    };
    drawCode(ctx, layout, colors);
    if (logoContent) {
      const family = getComputedStyle(canvas).fontFamily || 'sans-serif';
      // A logo that fails to load leaves the plate in place; the code stays scannable.
      drawLogo(ctx, layout, colors, logoContent, family).catch(() => undefined);
    }
  }, [renderAs, layout, size, fg, bg, logoContent]);

  // --- Export handle -----------------------------------------------------------------------------------------
  const latest = useRef({ layout, logoContent, fg, bg, size, renderAs, name: '' });
  const baseLabel = label ?? t('qrCode');
  const accessibleName = hasLogo && logo ? t('qrWithLogo', { label: baseLabel, alt: logo.alt }) : baseLabel;
  latest.current = { layout, logoContent, fg, bg, size, renderAs, name: accessibleName };

  useImperativeHandle(
    ref,
    () => {
      const colors = (): QrColors => {
        const host = figureRef.current;
        return {
          foreground: safeColorForXml(resolveCssColor(host, latest.current.fg), 'black'),
          background: safeColorForXml(resolveCssColor(host, latest.current.bg), 'white'),
        };
      };
      const font = () => (figureRef.current ? getComputedStyle(figureRef.current).fontFamily : '') || 'sans-serif';
      const svgText = (): string => {
        const { layout: current, logoContent: content, size: px, name } = latest.current;
        if (!current) throw new Error('There is no QR code to export');
        return layoutToSvg(current, { ...colors(), fontFamily: font(), size: px, title: name }, content);
      };
      const png = async (): Promise<HTMLCanvasElement> => {
        const { layout: current, logoContent: content, size: px } = latest.current;
        if (!current) throw new Error('There is no QR code to export');
        return rasterize(current, colors(), content, modulePixels(current.total, px * 4), font());
      };
      const toBlob = async (type: 'png' | 'svg' = latest.current.renderAs === 'canvas' ? 'png' : 'svg'): Promise<Blob> =>
        type === 'svg' ? new Blob([svgText()], { type: 'image/svg+xml' }) : canvasToBlob(await png());
      return {
        toDataURL: async (type = latest.current.renderAs === 'canvas' ? 'png' : 'svg') =>
          type === 'svg' ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText())}` : (await png()).toDataURL('image/png'),
        toBlob,
        download: async (filename, type) => {
          const inferred = /\.png$/i.test(filename ?? '') ? 'png' : /\.svg$/i.test(filename ?? '') ? 'svg' : latest.current.renderAs === 'canvas' ? 'png' : 'svg';
          const kind = type ?? inferred;
          saveBlob(await toBlob(kind), sanitizeFilename(filename, kind));
        },
      };
    },
    [],
  );

  // --- Render --------------------------------------------------------------------------------------------------
  const descId = describedValue ? `${uid}-desc` : undefined;
  const faded = effectiveStatus === 'expired' || effectiveStatus === 'scanned';
  const loading = effectiveStatus === 'loading';
  const figureStyle = {
    '--ui-qr-size': `${size}px`,
    '--ui-qr-fg': fg,
    '--ui-qr-bg': bg,
    ...style,
  } as CSSProperties;

  const errorText = error ? (error.code === 'too-long' ? t('qrTooLong') : error.code === 'empty' ? t('qrEmpty') : t('qrUnavailable')) : '';

  let code: ReactNode = null;
  if (error) {
    code = (
      <div className="ui-qr__error" role="status" aria-label={baseLabel}>
        <Icon name="alert-circle" size="lg" />
        <p className="ui-qr__error-text">{errorText}</p>
      </div>
    );
  } else if (layout && !loading) {
    const common = { className: 'ui-qr__code', role: 'img' as const, 'aria-label': accessibleName, 'aria-describedby': descId };
    if (renderAs === 'canvas') {
      code = <canvas ref={canvasRef} {...common} title={title} width={size} height={size} />;
    } else {
      const { total, logo: box } = layout;
      const clipId = `${uid}-clip`;
      code = (
        <svg {...common} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${total} ${total}`} width={size} height={size} focusable="false">
          {title && <title>{title}</title>}
          <rect className="ui-qr__bg" width={total} height={total} />
          {layout.modulesPath && <path className="ui-qr__fg" d={layout.modulesPath} shapeRendering={moduleShape === 'square' ? 'crispEdges' : undefined} />}
          <path className="ui-qr__fg" d={layout.finderPath} fillRule="evenodd" />
          {box && logoContent && (
            <g className="ui-qr__logo">
              {box.excavate && <path className="ui-qr__bg" d={logoShapePath(box.shape, box.plate.x, box.plate.y, box.plate.size)} />}
              {logoContent.kind === 'image' && (
                <>
                  <clipPath id={clipId}>
                    <path d={logoShapePath(box.shape, box.content.x, box.content.y, box.content.size)} />
                  </clipPath>
                  <image href={logoContent.href} x={box.content.x} y={box.content.y} width={box.content.size} height={box.content.size} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
                </>
              )}
              {logoContent.kind === 'icon' && (
                <g transform={`translate(${box.content.x + box.content.size * 0.15} ${box.content.y + box.content.size * 0.15}) scale(${(box.content.size * 0.7) / 24})`}>
                  <path className={logoContent.fill ? 'ui-qr__fg' : 'ui-qr__stroke'} d={logoContent.d} fill={logoContent.fill ? undefined : 'none'} />
                </g>
              )}
              {logoContent.kind === 'text' && (
                <text className="ui-qr__logo-text" x={box.content.x + box.content.size / 2} y={box.content.y + box.content.size / 2} textAnchor="middle" dominantBaseline="central" fontSize={textFontSize(box.content.size, logoContent.text)}>
                  {logoContent.text}
                </text>
              )}
            </g>
          )}
        </svg>
      );
    }
  }

  let overlay: ReactNode = null;
  if (loading) {
    overlay = (
      <div className="ui-qr__overlay ui-qr__overlay--loading">
        <Skeleton shape="rect" className="ui-qr__skeleton" animation="wave" />
        <Spinner className="ui-qr__spinner" label={t('qrLoading')} />
      </div>
    );
  } else if (effectiveStatus === 'expired' && !error) {
    overlay = (
      <div className="ui-qr__overlay">
        <div className="ui-qr__status">
          <p className="ui-qr__status-text">{t('qrExpired')}</p>
          {onRefresh && (
            <Button size="sm" variant="secondary" appearance="outline" icon="refresh" onClick={onRefresh}>
              {t('qrRefresh')}
            </Button>
          )}
        </div>
      </div>
    );
  } else if (effectiveStatus === 'scanned' && !error) {
    overlay = (
      <div className="ui-qr__overlay">
        <div className="ui-qr__status ui-qr__status--success">
          <Icon name="check-circle" size="lg" />
          <p className="ui-qr__status-text">{t('qrScanned')}</p>
        </div>
      </div>
    );
  }

  return (
    <figure
      ref={figureRef}
      className={cx('ui-qr', bordered && 'ui-qr--bordered', faded && 'ui-qr--faded', className)}
      style={figureStyle}
      data-status={effectiveStatus}
      data-ecc={effectiveEcc}
      data-render-as={renderAs}
      data-module-shape={moduleShape}
      {...rest}
    >
      <div className="ui-qr__frame" aria-busy={loading || undefined}>
        {code}
        {overlay}
      </div>
      {caption !== undefined && <figcaption className="ui-qr__caption">{caption}</figcaption>}
      {describedValue && (
        <span id={descId} className="visually-hidden">
          {describedValue}
        </span>
      )}
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </figure>
  );
}

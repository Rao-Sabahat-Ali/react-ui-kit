import { Children, createContext, useContext, useEffect, useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  image?: string;
  name?: string;
  icon?: IconName;
  size?: AvatarSize;
  shape?: 'circle' | 'square';
  status?: AvatarStatus;
  alt?: string;
  ref?: Ref<HTMLSpanElement>;
}

const SIZE_PX: Record<AvatarSize, number> = { sm: 24, md: 32, lg: 48, xl: 64 };
const PALETTE_SIZE = 8;
const AvatarGroupContext = createContext<AvatarSize | undefined>(undefined);

function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new (Intl as unknown as { Segmenter: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/** Up to two letters: first letters of the first and last words (Unicode-aware). */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = graphemes(words[0]!)[0] ?? '';
  const last = words.length > 1 ? (graphemes(words[words.length - 1]!)[0] ?? '') : '';
  return (first + last).toLocaleUpperCase();
}

function paletteIndex(name: string): number {
  let hash = 5381;
  for (const ch of name) hash = ((hash << 5) + hash + (ch.codePointAt(0) ?? 0)) | 0;
  return (Math.abs(hash) % PALETTE_SIZE) + 1;
}

export function Avatar({ image, name, icon, size, shape = 'circle', status, alt, className, ref, style, ...rest }: AvatarProps) {
  const { t } = useLocale();
  const groupSize = useContext(AvatarGroupContext);
  const finalSize = size ?? groupSize ?? 'md';
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);

  const showImage = Boolean(image) && !failed;
  const initials = name ? getInitials(name) : '';
  const statusText = status ? t(status) : undefined;
  const baseLabel = showImage ? (alt ?? name ?? '') : (name ?? alt ?? '');
  const label = [baseLabel, statusText].filter(Boolean).join(', ');
  const px = SIZE_PX[finalSize];

  let content: ReactNode;
  if (showImage) content = <img className="ui-avatar__image" src={image} alt={label} onError={() => setFailed(true)} />;
  else if (initials) content = <span className="ui-avatar__initials" aria-hidden="true">{initials}</span>;
  else content = <Icon name={icon ?? 'user'} className="ui-avatar__icon" size={Math.round(px * 0.55)} />;

  return (
    <span
      ref={ref}
      role={showImage ? undefined : 'img'}
      aria-label={showImage ? undefined : label || undefined}
      className={cx(
        'ui-avatar',
        `ui-avatar--${finalSize}`,
        `ui-avatar--${shape}`,
        !showImage && initials && `ui-avatar--color-${paletteIndex(name!)}`,
        className,
      )}
      style={style}
      {...rest}
    >
      {content}
      {status && <span className={cx('ui-avatar__status', `ui-avatar__status--${status}`)} aria-hidden="true" />}
    </span>
  );
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: AvatarSize;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function AvatarGroup({ max, size = 'md', className, children, ref, ...rest }: AvatarGroupProps) {
  const { t } = useLocale();
  const items = Children.toArray(children);
  const visible = max !== undefined && items.length > max ? items.slice(0, max) : items;
  const hidden = items.length - visible.length;
  return (
    <AvatarGroupContext.Provider value={size}>
      <div ref={ref} role="group" className={cx('ui-avatar-group', className)} {...rest}>
        {visible}
        {hidden > 0 && (
          <span role="img" aria-label={t('more', { count: hidden })} className={cx('ui-avatar ui-avatar--circle ui-avatar--more', `ui-avatar--${size}`)}>
            <span className="ui-avatar__initials" aria-hidden="true">+{hidden}</span>
          </span>
        )}
      </div>
    </AvatarGroupContext.Provider>
  );
}

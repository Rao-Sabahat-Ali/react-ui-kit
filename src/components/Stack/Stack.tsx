import { Children, Fragment, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';
import { Divider } from '../Divider/Divider';
import { bpClass, responsiveEntries, type Responsive } from './responsive';

export type SpaceToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
export type StackDirection = 'vertical' | 'horizontal';

export interface StackProps extends HTMLAttributes<HTMLElement> {
  direction?: Responsive<StackDirection>;
  gap?: Responsive<SpaceToken>;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  inline?: boolean;
  divider?: boolean | ReactNode;
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

const BOOTSTRAP_GAPS = new Set<number>([0, 1, 2, 3, 4, 5]);

export function Stack({
  direction = 'vertical',
  gap = 3,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  inline = false,
  divider = false,
  as: Root = 'div',
  className,
  style,
  children,
  ref,
  ...rest
}: StackProps) {
  const dirEntries = responsiveEntries(direction);
  const hasBase = dirEntries.some(([bp]) => bp === 'xs');
  const classes: string[] = [];
  if (!hasBase) classes.push('flex-column');
  for (const [bp, v] of dirEntries) classes.push(bpClass('flex', bp, v === 'vertical' ? 'column' : 'row'));
  const horizontalAtBase = (dirEntries.find(([bp]) => bp === 'xs')?.[1] ?? 'vertical') === 'horizontal';

  const vars: Record<string, string> = {};
  const gapClasses: string[] = [];
  let customGap = false;
  for (const [bp, v] of responsiveEntries(gap)) {
    if (BOOTSTRAP_GAPS.has(v)) gapClasses.push(bpClass('gap', bp, v));
    else {
      customGap = true;
      vars[bp === 'xs' ? '--ui-stack-gap' : `--ui-stack-gap-${bp}`] = `var(--ui-space-${v})`;
    }
  }

  const items = Children.toArray(children);
  const content =
    divider === false || divider === null || divider === undefined
      ? children
      : items.map((child, i) => {
          if (i === 0) return child;
          const sep =
            divider === true ? (
              <Divider className="ui-stack__divider" orientation={horizontalAtBase ? 'vertical' : 'horizontal'} />
            ) : (
              <span className="ui-stack__divider">{divider}</span>
            );
          const sepNode = Root === 'ul' || Root === 'ol' ? <li role="presentation" className="ui-stack__divider-item">{sep}</li> : sep;
          return (
            <Fragment key={`d-${i}`}>
              {sepNode}
              {child}
            </Fragment>
          );
        });

  return (
    <Root
      ref={ref}
      className={cx(
        'ui-stack',
        inline ? 'd-inline-flex' : 'd-flex',
        ...classes,
        horizontalAtBase && 'ui-stack--horizontal',
        wrap && 'flex-wrap ui-stack--wrap',
        customGap && 'ui-stack--gap-custom',
        ...gapClasses,
        `align-items-${align}`,
        `justify-content-${justify}`,
        className,
      )}
      style={{ ...(vars as CSSProperties), ...style }}
      {...rest}
    >
      {content}
    </Root>
  );
}

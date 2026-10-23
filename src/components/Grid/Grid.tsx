import { Children, type ElementType, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';
import { bpClass, responsiveEntries, type Responsive } from '../../utils/responsive';

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 'auto';
export type GridGap = 0 | 1 | 2 | 3 | 4 | 5;

export interface GridProps extends HTMLAttributes<HTMLElement> {
  columns?: Responsive<GridColumns>;
  gap?: Responsive<GridGap>;
  gapX?: GridGap;
  gapY?: GridGap;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

export function Grid({ columns, gap = 3, gapX, gapY, align = 'stretch', justify, as: Root = 'div', className, children, ref, ...rest }: GridProps) {
  const isList = Root === 'ul' || Root === 'ol';
  const Cell: ElementType = isList ? 'li' : 'div';
  const content = columns === undefined ? children : Children.toArray(children).map((child, i) => <Cell key={i} className="col ui-grid__col">{child as ReactNode}</Cell>);
  return (
    <Root
      ref={ref}
      className={cx(
        'row ui-grid',
        isList && 'list-unstyled',
        ...responsiveEntries(columns).map(([bp, v]) => bpClass('row-cols', bp, v)),
        ...responsiveEntries(gap).map(([bp, v]) => bpClass('g', bp, v)),
        gapX !== undefined && `gx-${gapX}`,
        gapY !== undefined && `gy-${gapY}`,
        `align-items-${align}`,
        justify && `justify-content-${justify}`,
        className,
      )}
      {...rest}
    >
      {content}
    </Root>
  );
}

export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | true;
export type ColOffset = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface GridColProps extends HTMLAttributes<HTMLElement> {
  span?: Responsive<ColSpan>;
  offset?: Responsive<ColOffset>;
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

function GridCol({ span = true, offset, as: Root = 'div', className, ref, ...rest }: GridColProps) {
  return (
    <Root
      ref={ref}
      className={cx(
        'ui-grid__col',
        ...responsiveEntries(span).map(([bp, v]) => bpClass('col', bp, v === true ? true : v)),
        ...responsiveEntries(offset).map(([bp, v]) => bpClass('offset', bp, v)),
        className,
      )}
      {...rest}
    />
  );
}

Grid.Col = GridCol;

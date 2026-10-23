import { Children, cloneElement, isValidElement, useId, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';

export interface InputGroupAddonProps extends HTMLAttributes<HTMLSpanElement> {
  /** Include this addon's text in the sibling controls' `aria-describedby`. */
  describe?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

function InputGroupAddon({ describe: _describe, className, children, ref, ...rest }: InputGroupAddonProps) {
  return (
    <span ref={ref} className={cx('input-group-text ui-input-group__addon', className)} {...rest}>
      {children}
    </span>
  );
}

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  size?: Size;
  invalid?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function InputGroup({ size = 'md', invalid, className, children, ref, ...rest }: InputGroupProps) {
  const base = useId();
  const items = Children.toArray(children);
  const describeIds: string[] = [];
  const withIds = items.map((child, index) => {
    if (isValidElement<InputGroupAddonProps>(child) && child.type === InputGroupAddon && child.props.describe) {
      const id = child.props.id ?? `${base}-addon-${index}`;
      describeIds.push(id);
      return cloneElement(child, { id });
    }
    return child;
  });

  const decorated = describeIds.length
    ? withIds.map((child) => {
        if (!isValidElement(child) || child.type === InputGroupAddon || typeof child.type === 'string' && child.type !== 'input' && child.type !== 'select' && child.type !== 'textarea') return child;
        const element = child as ReactElement<{ 'aria-describedby'?: string }>;
        const existing = element.props['aria-describedby'];
        return cloneElement(element, { 'aria-describedby': [existing, ...describeIds].filter(Boolean).join(' ') });
      })
    : withIds;

  return (
    <div
      ref={ref}
      className={cx('input-group ui-input-group', size === 'sm' && 'input-group-sm', size === 'lg' && 'input-group-lg', invalid && 'has-validation', className)}
      {...rest}
    >
      {decorated}
    </div>
  );
}

InputGroup.Addon = InputGroupAddon;

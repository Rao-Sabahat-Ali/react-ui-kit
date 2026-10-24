import { createContext, useContext, type HTMLAttributes, type Ref } from 'react';
import { cx } from '../../utils/cx';

const StatGroupContext = createContext(false);

/** True inside a StatGroup: StatCard defaults to its plain variant there. */
export const useInStatGroup = () => useContext(StatGroupContext);

export interface StatGroupProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** A ruled row of 2–5 headline numbers, set as typography rather than boxes. */
export function StatGroup({ className, children, ref, ...rest }: StatGroupProps) {
  return (
    <StatGroupContext.Provider value>
      <div ref={ref} role="group" className={cx('ui-stat-group', className)} {...rest}>
        {children}
      </div>
    </StatGroupContext.Provider>
  );
}

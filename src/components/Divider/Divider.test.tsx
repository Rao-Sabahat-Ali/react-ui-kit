import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Divider } from './Divider';

describe('Divider', () => {
  it('AC-1: renders separator role and orientation', () => {
    const { rerender } = render(<Divider />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
    rerender(<Divider orientation="vertical" />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('AC-2: label is centred/aligned per prop', () => {
    const { rerender } = render(<Divider>or</Divider>);
    expect(screen.getByRole('separator')).toHaveClass('ui-divider--center');
    expect(screen.getByText('or')).toHaveClass('ui-divider__label');
    rerender(<Divider align="start">or</Divider>);
    expect(screen.getByRole('separator')).toHaveClass('ui-divider--start');
    rerender(<Divider align="end" type="dashed">or</Divider>);
    expect(screen.getByRole('separator')).toHaveClass('ui-divider--end', 'ui-divider--dashed');
  });
});

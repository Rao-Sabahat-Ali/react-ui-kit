import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tag } from './Tag';

describe('Tag', () => {
  it('AC-1: subtle appearance classes', () => {
    render(<Tag value="Paid" severity="success" />);
    expect(screen.getByText('Paid')).toHaveClass('bg-success-subtle', 'text-success-emphasis', 'border', 'border-success-subtle');
  });

  it('AC-2: solid uses text-bg', () => {
    render(<Tag value="Sale" severity="danger" appearance="solid" />);
    expect(screen.getByText('Sale')).toHaveClass('text-bg-danger');
  });
});

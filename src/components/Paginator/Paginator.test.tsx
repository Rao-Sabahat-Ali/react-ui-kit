import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Paginator, getPageItems } from './Paginator';

describe('Paginator', () => {
  it('AC-1: nav landmark and pagination list', () => {
    const { container } = render(<Paginator page={0} total={100} onPageChange={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(container.querySelector('ul.pagination')).toBeInTheDocument();
  });

  it('AC-2: current page has aria-current and active', () => {
    render(<Paginator page={1} total={100} onPageChange={() => {}} />);
    const current = screen.getByRole('button', { name: 'Page 2' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.parentElement).toHaveClass('active');
  });

  it('AC-3: prev disabled on first, next disabled on last', () => {
    const { rerender } = render(<Paginator page={0} total={50} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveAttribute('aria-disabled', 'true');
    rerender(<Paginator page={1} total={50} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('AC-4: clicking a page emits page and size', async () => {
    const onPageChange = vi.fn();
    render(<Paginator page={0} total={100} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(2, 25);
  });

  it('AC-5: ellipsis window keeps first and last', () => {
    expect(getPageItems(5, 20, 1)).toEqual([0, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 19]);
    expect(getPageItems(0, 20, 1)).toEqual([0, 1, 2, 3, 4, 'ellipsis-end', 19]);
    expect(getPageItems(19, 20, 1)).toEqual([0, 'ellipsis-start', 15, 16, 17, 18, 19]);
    expect(getPageItems(2, 5, 1)).toEqual([0, 1, 2, 3, 4]);
  });

  it('AC-6: changing page size resets to page 0', async () => {
    const onPageChange = vi.fn();
    render(<Paginator page={3} total={500} onPageChange={onPageChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
    expect(onPageChange).toHaveBeenCalledWith(0, 50);
  });

  it('AC-7: report shows range including partial last page and empty state', () => {
    const { rerender } = render(<Paginator page={12} pageSize={25} total={312} onPageChange={() => {}} />);
    expect(screen.getByText('301–312 of 312')).toBeInTheDocument();
    rerender(<Paginator page={0} total={0} onPageChange={() => {}} />);
    expect(screen.getByText('0–0 of 0')).toBeInTheDocument();
  });
});

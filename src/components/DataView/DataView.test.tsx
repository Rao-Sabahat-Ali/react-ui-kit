import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataView } from './DataView';

interface Item {
  id: number;
  name: string;
  price: number;
}
const data: Item[] = [
  { id: 1, name: 'Cherry', price: 30 },
  { id: 2, name: 'Apple', price: 10 },
  { id: 3, name: 'Banana', price: 20 },
  { id: 4, name: 'Date', price: 40 },
  { id: 5, name: 'Elder', price: 50 },
];
const template = (item: Item) => <article>{item.name}</article>;
const names = () => screen.getAllByRole('article').map((a) => a.textContent);

describe('DataView', () => {
  it('AC-1: grid layout uses responsive columns', () => {
    render(<DataView aria-label="Fruit" data={data} itemTemplate={template} />);
    const list = screen.getByRole('list', { name: 'Fruit' });
    expect(list).toHaveClass('row', 'row-cols-1', 'row-cols-sm-2', 'row-cols-lg-3', 'row-cols-xl-4');
    expect(within(list).getAllByRole('listitem')[0]).toHaveClass('col');
  });

  it('AC-1: gridColumns overrides breakpoints', () => {
    render(<DataView aria-label="Fruit" data={data} gridColumns={{ xs: 2, md: 5 }} itemTemplate={template} />);
    expect(screen.getByRole('list')).toHaveClass('row-cols-2', 'row-cols-md-5');
    expect(screen.getByRole('list')).not.toHaveClass('row-cols-xl-4');
  });

  it('AC-1: list layout stacks and passes layout to the template', () => {
    const tpl = vi.fn((item: Item, layout: string) => <article>{`${item.name}:${layout}`}</article>);
    render(<DataView aria-label="Fruit" layout="list" data={data} itemTemplate={tpl} />);
    const list = screen.getByRole('list');
    expect(list).not.toHaveClass('row');
    expect(list).toHaveClass('flex-column');
    expect(screen.getByText('Cherry:list')).toBeInTheDocument();
  });

  it('AC-2: sorts by sortField and sortOrder', () => {
    const { rerender } = render(<DataView data={data} sortField="name" itemTemplate={template} />);
    expect(names()).toEqual(['Apple', 'Banana', 'Cherry', 'Date', 'Elder']);
    rerender(<DataView data={data} sortField="price" sortOrder={-1} itemTemplate={template} />);
    expect(names()).toEqual(['Elder', 'Date', 'Cherry', 'Banana', 'Apple']);
  });

  it('AC-2: paginates and reports page changes', async () => {
    const onPageChange = vi.fn();
    render(<DataView data={data} paginator defaultPageSize={2} sortField="name" onPageChange={onPageChange} itemTemplate={template} />);
    expect(names()).toEqual(['Apple', 'Banana']);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(1, 2);
    expect(names()).toEqual(['Cherry', 'Date']);
  });

  it('AC-2: controlled page', () => {
    render(<DataView data={data} paginator page={2} pageSize={2} sortField="name" itemTemplate={template} />);
    expect(names()).toEqual(['Elder']);
  });

  it('AC-3: loading renders skeleton cards with aria-busy', () => {
    render(<DataView aria-label="Fruit" data={data} loading loadingItems={3} itemTemplate={template} />);
    expect(screen.getByRole('list', { name: 'Fruit' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('AC-3: empty state renders default and custom message', () => {
    const { rerender } = render(<DataView data={[] as Item[]} itemTemplate={template} />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
    rerender(<DataView data={[] as Item[]} emptyMessage="Nothing here" itemTemplate={template} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders header slot', () => {
    render(<DataView data={data} header={<div>Toolbar</div>} itemTemplate={template} />);
    expect(screen.getByText('Toolbar')).toBeInTheDocument();
  });
});

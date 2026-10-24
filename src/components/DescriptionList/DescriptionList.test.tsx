import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DescriptionItem, DescriptionList } from './DescriptionList';

describe('DescriptionList', () => {
  let writeText: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));

  it('AC-1: renders a dl with div groups holding one dt and one dd', () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionItem term="Invoice">INV-1</DescriptionItem>
        <DescriptionItem term="Status">Paid</DescriptionItem>
      </DescriptionList>,
    );
    const dl = container.querySelector('dl')!;
    expect(dl).toBeInTheDocument();
    const groups = Array.from(dl.children);
    expect(groups).toHaveLength(2);
    for (const g of groups) {
      expect(g.tagName).toBe('DIV');
      expect(g.querySelectorAll(':scope > dt')).toHaveLength(1);
      expect(g.querySelectorAll(':scope > dd')).toHaveLength(1);
    }
    expect(screen.getByText('Invoice').tagName).toBe('DT');
  });

  it('AC-2: columns set the modifier (clamped) and span spans columns', () => {
    const { container, rerender } = render(
      <DescriptionList columns={2}>
        <DescriptionItem term="A" span={2}>
          a
        </DescriptionItem>
      </DescriptionList>,
    );
    expect(container.querySelector('dl')).toHaveClass('ui-description-list--cols-2');
    expect(container.querySelector('.ui-description-list__item')).toHaveClass('ui-description-list__item--span-2');
    rerender(<DescriptionList columns={3} />);
    expect(container.querySelector('dl')).toHaveClass('ui-description-list--cols-3');
    rerender(<DescriptionList columns={9 as 3} />);
    expect(container.querySelector('dl')).toHaveClass('ui-description-list--cols-3');
    rerender(<DescriptionList columns={0 as 1} />);
    expect(container.querySelector('dl')).toHaveClass('ui-description-list--cols-1');
  });

  it('AC-3: layout toggles stacked and inline', () => {
    const { container, rerender } = render(<DescriptionList />);
    expect(container.querySelector('dl')).toHaveClass('ui-description-list--stacked');
    rerender(<DescriptionList layout="inline" />);
    expect(container.querySelector('dl')).toHaveClass('ui-description-list--inline');
  });

  it('AC-4: ruled adds the ruled modifier', () => {
    const { container } = render(<DescriptionList ruled />);
    expect(container.querySelector('dl')).toHaveClass('ui-description-list--ruled');
  });

  it('AC-5: empty values show the placeholder with a hidden "Empty"; filled values do not', () => {
    const { container } = render(
      <DescriptionList emptyText="n/a">
        <DescriptionItem term="Phone">{null}</DescriptionItem>
        <DescriptionItem term="Notes">{''}</DescriptionItem>
        <DescriptionItem term="Name">Ada</DescriptionItem>
      </DescriptionList>,
    );
    const values = container.querySelectorAll('dd');
    expect(values[0]).toHaveTextContent('n/aEmpty');
    expect(values[0]!.querySelector('.visually-hidden')).toHaveTextContent('Empty');
    expect(values[1]).toHaveTextContent('Empty');
    expect(values[2]).toHaveTextContent('Ada');
    expect(values[2]!.querySelector('.ui-description-list__empty')).toBeNull();
  });

  it('AC-6: copyable renders a CopyButton named by the term and copies the value or the override', async () => {
    render(
      <DescriptionList>
        <DescriptionItem term="Customer id" copyable>
          c_8f1e
        </DescriptionItem>
        <DescriptionItem term="Link" copyable="https://example.com/x">
          Open
        </DescriptionItem>
        <DescriptionItem term="Missing" copyable>
          {null}
        </DescriptionItem>
      </DescriptionList>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Copy Customer id' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('c_8f1e'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://example.com/x'));
  });

  it('AC-7: values wrap long tokens', () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionItem term="Hash">{'a'.repeat(120)}</DescriptionItem>
      </DescriptionList>,
    );
    expect(container.querySelector('dd')).toHaveClass('ui-description-list__value');
    expect(container.querySelector('.ui-description-list__text')).toBeInTheDocument();
    // The wrapping rule lives in the stylesheet; guard against regressions there.
    const scss = readFileSync(join(__dirname, 'DescriptionList.scss'), 'utf8');
    expect(scss).toMatch(/overflow-wrap:\s*anywhere/);
    expect(scss).toMatch(/min-inline-size:\s*0/);
    expect(scss).not.toMatch(/white-space:\s*nowrap/);
  });

  it('AC-8: className and attributes reach the dl; ref is the dl', () => {
    const ref = vi.fn();
    const { container } = render(<DescriptionList className="extra" data-testid="dl" aria-label="Details" ref={ref} />);
    expect(container.querySelector('dl')).toHaveClass('extra');
    expect(screen.getByTestId('dl')).toHaveAttribute('aria-label', 'Details');
    expect(ref).toHaveBeenCalledWith(container.querySelector('dl'));
  });
});

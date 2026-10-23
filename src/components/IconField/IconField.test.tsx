import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InputText } from '../InputText/InputText';
import { IconField } from './IconField';

describe('IconField', () => {
  it('AC-1: icon is decorative unless clickable', () => {
    const { container } = render(
      <IconField icon="search">
        <InputText aria-label="Search" />
      </IconField>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('.ui-icon-field__icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-1: clickable icon is a button with accessible name', async () => {
    const onIconClick = vi.fn();
    render(
      <IconField icon="search" iconLabel="Run search" onIconClick={onIconClick}>
        <InputText aria-label="Search" />
      </IconField>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Run search' }));
    expect(onIconClick).toHaveBeenCalledOnce();
  });

  it('AC-1: accepts a custom node as icon', () => {
    render(
      <IconField icon={<b data-testid="glyph">$</b>}>
        <InputText aria-label="Amount" />
      </IconField>,
    );
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
  });

  it('AC-2: root modifier reflects position so padding uses logical properties', () => {
    const { container, rerender } = render(
      <IconField icon="search">
        <InputText aria-label="A" />
      </IconField>,
    );
    expect(container.firstElementChild).toHaveClass('position-relative', 'ui-icon-field--start');
    rerender(
      <IconField icon="search" iconPosition="end">
        <InputText aria-label="A" />
      </IconField>,
    );
    expect(container.firstElementChild).toHaveClass('ui-icon-field--end');
  });
});

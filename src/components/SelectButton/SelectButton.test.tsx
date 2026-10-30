import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectButton } from './SelectButton';

const levels = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
];

describe('SelectButton', () => {
  it('AC-1: single mode behaves like a radio group', async () => {
    const onChange = vi.fn();
    render(<SelectButton aria-label="Level" options={levels} defaultValue="easy" onChange={onChange} />);
    expect(screen.getByRole('group', { name: 'Level' })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Hard'));
    expect(onChange).toHaveBeenLastCalledWith('hard');
    screen.getByLabelText('Hard').focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('medium');
  });

  it('AC-2: multiple mode toggles values in option order', async () => {
    const onChange = vi.fn();
    render(<SelectButton multiple aria-label="Levels" options={levels} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Hard'));
    await userEvent.click(screen.getByLabelText('Easy'));
    expect(onChange).toHaveBeenLastCalledWith(['easy', 'hard']);
    await userEvent.click(screen.getByLabelText('Hard'));
    expect(onChange).toHaveBeenLastCalledWith(['easy']);
  });

  it('AC-3: icon-only options use ariaLabel', () => {
    render(<SelectButton aria-label="View" options={[{ label: '', value: 'grid', icon: 'menu', ariaLabel: 'Grid' }]} />);
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeInTheDocument();
  });

  it('allowEmpty deselects in single mode', async () => {
    const onChange = vi.fn();
    render(<SelectButton aria-label="Level" options={levels} defaultValue="easy" allowEmpty onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Easy'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('SelectButton (v2)', () => {
  it('AC-v2-1: single mode slides an accent indicator to the selected segment (transform vars)', async () => {
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(80);
    const left = vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(80);
    const { container } = render(<SelectButton aria-label="Level" options={levels} defaultValue="medium" />);
    const group = screen.getByRole('group', { name: 'Level' });
    expect(container.querySelector('.ui-select-button__indicator')).toHaveAttribute('aria-hidden', 'true');
    expect(group.style.getPropertyValue('--ui-seg-pos')).toBe('80');
    expect(group.style.getPropertyValue('--ui-seg-size')).toBe('80');
    width.mockRestore();
    left.mockRestore();
  });

  it('AC-v2-2: multiple mode has no sliding indicator', () => {
    const { container } = render(<SelectButton aria-label="Level" multiple options={levels} defaultValue={['easy']} />);
    expect(container.querySelector('.ui-select-button__indicator')).toBeNull();
  });
});

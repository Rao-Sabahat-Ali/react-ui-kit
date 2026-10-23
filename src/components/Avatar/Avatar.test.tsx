import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarGroup, getInitials } from './Avatar';

describe('Avatar', () => {
  it('AC-1: initials computed from name, max 2 letters, Unicode-aware', () => {
    expect(getInitials('Jane Doe')).toBe('JD');
    expect(getInitials('Jane')).toBe('J');
    expect(getInitials('jane mary van der Berg')).toBe('JB');
    expect(getInitials('Åsa Öberg')).toBe('ÅÖ');
    expect(getInitials('李 小龍')).toBe('李小');
    render(<Avatar name="Jane Doe" />);
    const el = screen.getByRole('img', { name: 'Jane Doe' });
    expect(el).toHaveTextContent('JD');
  });

  it('status is included in the accessible name', () => {
    render(<Avatar name="Jane Doe" status="online" />);
    expect(screen.getByRole('img', { name: 'Jane Doe, online' })).toBeInTheDocument();
  });

  it('image avatars use alt (default name)', () => {
    render(<Avatar name="Jane Doe" image="/jane.png" />);
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveAttribute('src', '/jane.png');
  });

  it('AC-2: falls back to initials, then icon, when the image fails', () => {
    const first = render(<Avatar name="Jane Doe" image="/broken.png" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveTextContent('JD');
    first.unmount();
    const { container } = render(<Avatar image="/broken.png" alt="Someone" />);
    fireEvent.error(screen.getByRole('img'));
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('size and shape classes', () => {
    render(<Avatar name="A B" size="xl" shape="square" />);
    expect(screen.getByRole('img')).toHaveClass('ui-avatar--xl', 'ui-avatar--square');
  });

  it('AC-3: group shows +N with accessible "N more"', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="A One" />
        <Avatar name="B Two" />
        <Avatar name="C Three" />
        <Avatar name="D Four" />
        <Avatar name="E Five" />
      </AvatarGroup>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(3);
    const more = screen.getByRole('img', { name: '3 more' });
    expect(more).toHaveTextContent('+3');
    expect(screen.queryByRole('img', { name: 'C Three' })).toBeNull();
  });
});

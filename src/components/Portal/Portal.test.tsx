import { useEffect, useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Portal } from './Portal';

describe('Portal', () => {
  it('AC-1: renders into body by default and into container when given', () => {
    const { container } = render(<Portal><p>in body</p></Portal>);
    expect(container).not.toHaveTextContent('in body');
    expect(screen.getByText('in body').parentElement).toBe(document.body);

    const target = document.createElement('div');
    document.body.appendChild(target);
    render(<Portal container={target}><p>in target</p></Portal>);
    expect(screen.getByText('in target').parentElement).toBe(target);
    target.remove();
  });

  it('renders inline when disabled', () => {
    const { container } = render(<Portal disabled><p>inline</p></Portal>);
    expect(container).toHaveTextContent('inline');
  });

  it('AC-2: renders nothing during SSR and immediately on the client', () => {
    expect(renderToString(<div><Portal><p>overlay</p></Portal></div>)).toBe('<div></div>');

    let seen: HTMLElement | null = null;
    function Parent() {
      const ref = useRef<HTMLParagraphElement>(null);
      // Runs in the first commit: the portal child must already be attached.
      useEffect(() => {
        seen = ref.current;
      }, []);
      return (
        <Portal>
          <p ref={ref}>overlay</p>
        </Portal>
      );
    }
    render(<Parent />);
    expect(seen).not.toBeNull();
    expect(seen).toBe(screen.getByText('overlay'));
  });
});

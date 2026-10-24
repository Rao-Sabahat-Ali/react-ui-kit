import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Highlight } from './Highlight';

const marks = (c: HTMLElement) => Array.from(c.querySelectorAll('mark')).map((m) => m.textContent);

describe('Highlight', () => {
  it('AC-1: wraps matches in <mark> and keeps the text content exact', () => {
    const { container } = render(<Highlight query="quick">The quick brown fox</Highlight>);
    expect(marks(container)).toEqual(['quick']);
    expect(container.textContent).toBe('The quick brown fox');
  });

  it('AC-2: several terms, longest wins, matches never overlap', () => {
    const { container, rerender } = render(<Highlight query={['brown', 'fox']}>The quick brown fox</Highlight>);
    expect(marks(container)).toEqual(['brown', 'fox']);
    rerender(<Highlight query={['car', 'carpet']}>a carpet</Highlight>);
    expect(marks(container)).toEqual(['carpet']);
    rerender(<Highlight query={['ab', 'bc']}>abc</Highlight>);
    expect(marks(container)).toEqual(['ab']);
  });

  it('AC-3: case-insensitive by default; caseSensitive restricts', () => {
    const { container, rerender } = render(<Highlight query="FOX">The Fox and the fox</Highlight>);
    expect(marks(container)).toEqual(['Fox', 'fox']);
    rerender(
      <Highlight query="Fox" caseSensitive>
        The Fox and the fox
      </Highlight>,
    );
    expect(marks(container)).toEqual(['Fox']);
  });

  it('AC-4: diacritic-insensitive by default, preserves the original characters; diacriticSensitive restricts', () => {
    const { container, rerender } = render(<Highlight query="cafe">Un café, un CAFÉ, un cafe</Highlight>);
    expect(marks(container)).toEqual(['café', 'CAFÉ', 'cafe']);
    rerender(<Highlight query="é">Crème brûlée</Highlight>);
    expect(marks(container)).toEqual(['è', 'e', 'ée']);
    // Decomposed input (e + combining acute) is marked as one unit.
    rerender(<Highlight query="cafe">{'café'}</Highlight>);
    expect(marks(container)).toEqual(['café']);
    rerender(
      <Highlight query="cafe" diacriticSensitive>
        Un café, un cafe
      </Highlight>,
    );
    expect(marks(container)).toEqual(['cafe']);
  });

  it('AC-5: wholeWord ignores matches inside words', () => {
    const { container, rerender } = render(<Highlight query="cat">cat concatenate Cat, cat_x</Highlight>);
    expect(marks(container)).toHaveLength(4);
    rerender(
      <Highlight query="cat" wholeWord>
        cat concatenate Cat, cat_x
      </Highlight>,
    );
    expect(marks(container)).toEqual(['cat', 'Cat']);
  });

  it('AC-6: regex metacharacters match literally and never throw', () => {
    const { container } = render(<Highlight query={['a.c(', '[x', '*', '\\', '(?<=']}>{'abc a.c( [x * \\ (?<= a.c'}</Highlight>);
    expect(marks(container)).toEqual(['a.c(', '[x', '*', '\\', '(?<=', '*'].slice(0, 5));
    expect(container.textContent).toBe('abc a.c( [x * \\ (?<= a.c');
  });

  it('AC-7: HTML-looking text is rendered as text', () => {
    const { container } = render(<Highlight query="b">{'<img src=x onerror=alert(1)> <b>bold</b>'}</Highlight>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<img src=x onerror=alert(1)> <b>bold</b>');
  });

  it('AC-8: text beyond maxLength is not scanned, matches are capped, terms are capped at 20', () => {
    const { container, rerender } = render(
      <Highlight query="x" maxLength={5}>
        abxcd xxxx
      </Highlight>,
    );
    expect(marks(container)).toEqual(['x']);
    expect(container.textContent).toBe('abxcd xxxx');
    rerender(
      <Highlight query="x" maxMatches={3}>
        {'x'.repeat(50)}
      </Highlight>,
    );
    expect(marks(container)).toHaveLength(1); // adjacent matches merge into one mark, but only the first 3 chars
    expect(marks(container)![0]).toBe('xxx');
    const terms = Array.from({ length: 25 }, (_, i) => `t${String.fromCharCode(97 + i)}`);
    rerender(<Highlight query={terms}>{terms.join(' ')}</Highlight>);
    expect(marks(container)).toHaveLength(20);
    const big = 'lorem ipsum '.repeat(50_000);
    const t0 = performance.now();
    rerender(<Highlight query="ipsum">{big}</Highlight>);
    expect(performance.now() - t0).toBeLessThan(1000);
  });

  it('AC-9: an empty query renders plain text; aria and className reach the root', () => {
    const { container } = render(
      <Highlight query={['', '  ']} aria-hidden="true" className="extra" data-x="1">
        plain text
      </Highlight>,
    );
    expect(container.querySelector('mark')).toBeNull();
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveClass('ui-highlight', 'extra');
    expect(root.textContent).toBe('plain text');
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InlineMarkdown } from './InlineMarkdown';

describe('InlineMarkdown', () => {
  it('renders bold, italic and code as elements without raw asterisks or backticks', () => {
    const { container } = render(<p><InlineMarkdown text="Label **inside** the *field* using `Date` and `Intl`." /></p>);
    expect(container.querySelector('strong')).toHaveTextContent('inside');
    expect(container.querySelector('em')).toHaveTextContent('field');
    expect(container.querySelectorAll('code')).toHaveLength(2);
    expect(container.textContent).toBe('Label inside the field using Date and Intl.');
  });

  it('never creates HTML from the text', () => {
    const { container } = render(<p><InlineMarkdown text={'**<img src=x onerror=alert(1)>** & <b>bold</b>'} /></p>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(container.textContent).toContain('& <b>bold</b>');
  });

  it('leaves unmatched markers and multiplication signs alone', () => {
    const { container } = render(<p><InlineMarkdown text="2 * 3 and a ** b, 5×" /></p>);
    expect(container.textContent).toBe('2 * 3 and a ** b, 5×');
  });
});

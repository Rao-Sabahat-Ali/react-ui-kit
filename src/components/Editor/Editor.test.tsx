import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { Editor } from './Editor';

const content = () => document.querySelector<HTMLElement>('.ui-editor__content')!;

/** Select `text` (first occurrence) inside the editor. */
function select(text: string) {
  const el = content();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const index = node.data.indexOf(text);
    if (index >= 0) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + text.length);
      const sel = document.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      return;
    }
  }
  throw new Error(`text not found: ${text}`);
}
function selectAll() {
  const range = document.createRange();
  range.selectNodeContents(content());
  const sel = document.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}
const tool = (name: string) => within(screen.getByRole('toolbar', { name: 'Formatting' })).getByRole('button', { name });

describe('Editor', () => {
  it('has textbox semantics and Field labelling', () => {
    render(
      <Field label="Body">
        <Editor defaultValue="<p>Hi</p>" />
      </Field>,
    );
    const box = screen.getByRole('textbox', { name: 'Body' });
    expect(box).toHaveAttribute('aria-multiline', 'true');
    expect(box).toHaveAttribute('contenteditable', 'true');
  });

  it('AC-1: toolbar commands toggle inline formats on the selection and reflect aria-pressed', async () => {
    const user = userEvent.setup();
    render(<Editor aria-label="Body" defaultValue="<p>Hello world</p>" />);
    content().focus();
    select('world');
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'false');
    await user.click(tool('Bold'));
    expect(content().innerHTML).toBe('<p>Hello <strong>world</strong></p>');
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'true');
    await user.click(tool('Italic'));
    expect(content().querySelector('strong em, em strong')).toHaveTextContent('world');
    expect(tool('Italic')).toHaveAttribute('aria-pressed', 'true');
    await user.click(tool('Bold'));
    expect(content().querySelector('strong')).toBeNull();
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'false');
    select('Hel');
    await user.click(tool('Underline'));
    await user.click(tool('Strikethrough'));
    await user.click(tool('Code'));
    expect(content().querySelector('u s code, u code, code')).toHaveTextContent('Hel');
    expect(content()).toHaveTextContent('Hello world');
  });

  it('AC-1: block, list, quote and rule commands with aria-pressed', async () => {
    const user = userEvent.setup();
    render(<Editor aria-label="Body" defaultValue="<p>One</p><p>Two</p>" />);
    content().focus();
    select('One');
    await user.click(tool('Heading 2'));
    expect(content().querySelector('h2')).toHaveTextContent('One');
    expect(tool('Heading 2')).toHaveAttribute('aria-pressed', 'true');
    await user.click(tool('Heading 2'));
    expect(content().querySelector('h2')).toBeNull();
    expect(tool('Paragraph')).toHaveAttribute('aria-pressed', 'true');
    selectAll();
    await user.click(tool('Bulleted list'));
    expect(content().querySelectorAll('ul > li')).toHaveLength(2);
    expect(tool('Bulleted list')).toHaveAttribute('aria-pressed', 'true');
    await user.click(tool('Numbered list'));
    expect(content().querySelectorAll('ol > li')).toHaveLength(2);
    await user.click(tool('Numbered list'));
    expect(content().querySelector('ol')).toBeNull();
    select('Two');
    await user.click(tool('Quote'));
    expect(content().querySelector('blockquote')).toHaveTextContent('Two');
    await user.click(tool('Code block'));
    expect(content().querySelector('pre')).toHaveTextContent('Two');
    await user.click(tool('Horizontal rule'));
    expect(content().querySelector('hr')).not.toBeNull();
    select('One');
    await user.click(tool('Bold'));
    await user.click(tool('Clear formatting'));
    expect(content().querySelector('strong')).toBeNull();
  });

  it('AC-2: pasted HTML is sanitised (scripts, handlers, javascript: removed)', async () => {
    const onChange = vi.fn();
    render(<Editor aria-label="Body" defaultValue="<p>Start</p>" onChange={onChange} />);
    content().focus();
    select('Start');
    const html = '<p onclick="steal()">Hi <script>alert(1)</script><a href="javascript:alert(1)">bad</a> <a href="https://ok.test">ok</a><img src="x" onerror="alert(1)"><iframe src="https://evil"></iframe></p>';
    fireEvent.paste(content(), { clipboardData: { getData: (type: string) => (type === 'text/html' ? html : 'plain') } });
    const box = content();
    expect(box.querySelector('script, iframe')).toBeNull();
    expect(box.innerHTML).not.toMatch(/onclick|onerror|javascript:/i);
    expect(box.querySelector('img')).toBeNull(); // src "x" is not an allowed image URL
    expect(box.querySelector('a[href="https://ok.test"]')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(box).toHaveTextContent('Hi bad ok');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls.at(-1)![0]).not.toMatch(/script|onclick|onerror|javascript:/i);
  });

  it('AC-2: plain-text paste and initial value are sanitised', () => {
    render(<Editor aria-label="Body" defaultValue={'<p>A<img src=x onerror="alert(1)"></p><script>alert(2)</script>'} />);
    expect(content().innerHTML).toBe('<p>A</p>');
    content().focus();
    select('A');
    fireEvent.paste(content(), { clipboardData: { getData: (type: string) => (type === 'text/plain' ? '<b>x</b>\n\nline' : '') } });
    expect(content().querySelector('b, strong')).toBeNull();
    expect(content()).toHaveTextContent('<b>x</b>');
    expect(content().querySelectorAll('p').length).toBeGreaterThanOrEqual(2);
  });

  it('AC-3: undo/redo restore previous states (toolbar and shortcuts)', async () => {
    const user = userEvent.setup();
    render(<Editor aria-label="Body" defaultValue="<p>Hello world</p>" />);
    content().focus();
    expect(tool('Undo')).toBeDisabled();
    select('world');
    await user.click(tool('Bold'));
    select('Hello');
    await user.click(tool('Italic'));
    expect(content().innerHTML).toBe('<p><em>Hello</em> <strong>world</strong></p>');
    await user.click(tool('Undo'));
    expect(content().innerHTML).toBe('<p>Hello <strong>world</strong></p>');
    content().focus();
    await user.keyboard('{Control>}z{/Control}');
    expect(content().innerHTML).toBe('<p>Hello world</p>');
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(content().innerHTML).toBe('<p>Hello <strong>world</strong></p>');
    await user.click(tool('Redo'));
    expect(content().innerHTML).toBe('<p><em>Hello</em> <strong>world</strong></p>');
    expect(tool('Redo')).toBeDisabled();
  });

  it('AC-4: emits sanitised HTML via onChange (debounced)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Editor aria-label="Body" defaultValue="<p>Hello world</p>" onChange={onChange} />);
    content().focus();
    select('Hello');
    await user.click(tool('Bold'));
    await user.click(tool('Italic'));
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith('<p><strong><em>Hello</em></strong> world</p>');
  });

  it('AC-4: typing emits sanitised HTML wrapped in a paragraph', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Editor aria-label="Body" onChange={onChange} placeholder="Write…" />);
    expect(content()).toHaveAttribute('data-empty', 'true');
    await user.click(content());
    await user.type(content(), 'Hi');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Hi</p>'));
    expect(content()).not.toHaveAttribute('data-empty');
  });

  it('AC-4: controlled value updates the content (sanitised)', () => {
    const { rerender } = render(<Editor aria-label="Body" value="<p>One</p>" />);
    expect(content().innerHTML).toBe('<p>One</p>');
    rerender(<Editor aria-label="Body" value={'<p onclick="x()">Two</p>'} />);
    expect(content().innerHTML).toBe('<p>Two</p>');
  });

  it('AC-5: Ctrl+B/I/U shortcuts toggle formats', async () => {
    const user = userEvent.setup();
    render(<Editor aria-label="Body" defaultValue="<p>Hello world</p>" />);
    content().focus();
    select('world');
    await user.keyboard('{Control>}b{/Control}');
    expect(content().querySelector('strong')).toHaveTextContent('world');
    await user.keyboard('{Control>}i{/Control}');
    expect(content().querySelector('em')).toHaveTextContent('world');
    await user.keyboard('{Control>}u{/Control}');
    expect(content().querySelector('u')).toHaveTextContent('world');
    await user.keyboard('{Control>}b{/Control}');
    expect(content().querySelector('strong')).toBeNull();
  });

  it('AC-5: Ctrl+K opens the link dialog; unsafe URLs are rejected', async () => {
    const user = userEvent.setup();
    render(<Editor aria-label="Body" defaultValue="<p>Hello world</p>" />);
    content().focus();
    select('world');
    await user.keyboard('{Control>}k{/Control}');
    const input = screen.getByLabelText('Link address');
    expect(input).toHaveFocus();
    await user.type(input, 'javascript:alert(1){Enter}');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(content().querySelector('a')).toBeNull();
    await user.clear(input);
    await user.type(input, 'https://example.com{Enter}');
    const link = content().querySelector('a')!;
    expect(link).toHaveTextContent('world');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(content()).toHaveFocus();
    select('world');
    await user.click(tool('Remove link'));
    expect(content().querySelector('a')).toBeNull();
  });

  it('AC-5: Alt+F10 focuses the toolbar; arrows rove; Escape returns to content', async () => {
    const user = userEvent.setup();
    render(<Editor aria-label="Body" defaultValue="<p>Hello</p>" />);
    content().focus();
    await user.keyboard('{Alt>}{F10}{/Alt}');
    expect(tool('Bold')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(tool('Italic')).toHaveFocus();
    expect(tool('Italic')).toHaveAttribute('tabindex', '0');
    expect(tool('Bold')).toHaveAttribute('tabindex', '-1');
    await user.keyboard('{Escape}');
    expect(content()).toHaveFocus();
  });

  it('readOnly disables editing and tools; maxLength shows a counter', () => {
    render(<Editor aria-label="Body" defaultValue="<p>Hello</p>" readOnly maxLength={3} />);
    expect(content()).toHaveAttribute('contenteditable', 'false');
    expect(tool('Bold')).toBeDisabled();
    expect(screen.getByText('5 of 3 characters')).toBeInTheDocument();
    expect(content()).toHaveAttribute('aria-invalid', 'true');
  });
});

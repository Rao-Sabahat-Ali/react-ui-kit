import { Fragment, type ReactNode } from 'react';

/**
 * Renders the inline emphasis that spec text uses (`**bold**`, `*italic*` and `` `code` ``) as React elements. Nothing is parsed
 * as HTML and no string is injected: every other character, including `<` and `&`, is plain text.
 */
const TOKEN = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*)/g;

export function inlineMarkdown(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function InlineMarkdown({ text }: { text: string }) {
  return <>{inlineMarkdown(text)}</>;
}

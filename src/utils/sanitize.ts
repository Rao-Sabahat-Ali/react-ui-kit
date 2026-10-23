/**
 * Allowlist HTML sanitizer (rules/security.md). Used by Editor for input, paste and output.
 * Parses with DOMParser (inert document: scripts don't run, images don't load) and rebuilds
 * only allowed elements/attributes.
 */
const ALLOWED_TAGS = new Set(['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'hr', 'img', 'span']);
const RENAME: Record<string, string> = { b: 'strong', i: 'em', del: 's', h1: 'h2', h5: 'h4', h6: 'h4', div: 'p' };
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math', 'form', 'textarea', 'select', 'button', 'input']);
const ALLOWED_ATTRS: Record<string, string[]> = { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'] };

const SAFE_LINK = /^(https?:|mailto:|tel:|\/|#|\.{0,2}\/)/i;
const SAFE_IMG = /^(https?:|\/|data:image\/(png|jpe?g|gif|webp);base64,)/i;

export function isSafeHref(url: string): boolean {
  const u = url.trim().replace(/[\u0000-\u001f\s]/g, '');
  return SAFE_LINK.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u);
}

function cleanNode(node: Node, doc: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) return [doc.createTextNode(node.textContent ?? '')];
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as Element;
  let tag = el.tagName.toLowerCase();
  if (DROP_WITH_CONTENT.has(tag)) return [];
  tag = RENAME[tag] ?? tag;
  const children = Array.from(el.childNodes).flatMap((c) => cleanNode(c, doc));
  if (!ALLOWED_TAGS.has(tag)) return children; // unwrap unknown tags, keep text
  const out = doc.createElement(tag);
  for (const name of ALLOWED_ATTRS[tag] ?? []) {
    const value = el.getAttribute(name);
    if (value === null) continue;
    if (name === 'href' && !isSafeHref(value)) continue;
    if (name === 'src' && !SAFE_IMG.test(value.trim())) continue;
    out.setAttribute(name, value);
  }
  if (tag === 'a' && out.hasAttribute('href')) {
    out.setAttribute('rel', 'noopener noreferrer');
    if (/^https?:/i.test(out.getAttribute('href')!)) out.setAttribute('target', '_blank');
  }
  if (tag === 'img' && !out.hasAttribute('src')) return [];
  children.forEach((c) => out.appendChild(c));
  return [out];
}

export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, '');
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out = document.implementation.createHTMLDocument('');
  const container = out.createElement('div');
  Array.from(parsed.body.childNodes)
    .flatMap((n) => cleanNode(n, out))
    .forEach((n) => container.appendChild(n));
  return container.innerHTML;
}

/** Plain text → safe paragraphs (used for "paste as plain text"). */
export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

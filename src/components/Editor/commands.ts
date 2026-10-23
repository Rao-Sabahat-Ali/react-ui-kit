/**
 * Editor command layer on the Selection/Range API (no `document.execCommand`).
 * Every function takes the editable root and works on plain DOM nodes; selection is
 * restored through text offsets so DOM restructuring does not lose the caret.
 */
import { sanitizeHtml } from '../../utils/sanitize';

export const INLINE_TAGS = { bold: 'strong', italic: 'em', underline: 'u', strike: 's', code: 'code' } as const;
export type InlineFormat = keyof typeof INLINE_TAGS;
export type BlockTag = 'p' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'pre';
export type ListTag = 'ul' | 'ol';

const ZWSP = '​';
const BLOCK_TAGS = new Set(['p', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'ul', 'ol', 'hr', 'div']);
const INLINE_SET = new Set<string>(Object.values(INLINE_TAGS));

const tagOf = (node: Node | null | undefined) => (node && node.nodeType === Node.ELEMENT_NODE ? (node as Element).tagName.toLowerCase() : '');
const isBlock = (node: Node) => BLOCK_TAGS.has(tagOf(node));

/** Parse already-sanitised HTML into an inert fragment (template content never runs scripts). */
export function parseSafe(doc: Document, html: string): DocumentFragment {
  const template = doc.createElement('template');
  template.innerHTML = sanitizeHtml(html);
  return template.content;
}

export function setContent(root: HTMLElement, html: string): void {
  root.replaceChildren(parseSafe(root.ownerDocument, html));
}

/** Sanitised HTML of the editor, `''` when empty. */
export function serialize(root: HTMLElement): string {
  const html = sanitizeHtml(root.innerHTML.replace(new RegExp(ZWSP, 'g'), ''));
  const text = root.textContent?.replace(new RegExp(ZWSP, 'g'), '').trim() ?? '';
  if (!text && !root.querySelector('img,hr')) return '';
  return html;
}

export function textLength(root: HTMLElement): number {
  return (root.textContent ?? '').replace(new RegExp(ZWSP, 'g'), '').length;
}

export function getRange(root: HTMLElement): Range | null {
  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return root.contains(range.commonAncestorContainer) ? range : null;
}

export function selectRange(root: HTMLElement, range: Range): void {
  const selection = root.ownerDocument.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function textNodes(root: Node): Text[] {
  const walker = (root.ownerDocument ?? (root as Document)).createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];
  while (walker.nextNode()) out.push(walker.currentNode as Text);
  return out;
}

export function getOffsets(root: HTMLElement, range: Range): [number, number] {
  const pre = root.ownerDocument.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  pre.setEnd(range.endContainer, range.endOffset);
  return [start, pre.toString().length];
}

export function rangeFromOffsets(root: HTMLElement, start: number, end: number): Range {
  const range = root.ownerDocument.createRange();
  const nodes = textNodes(root);
  if (nodes.length === 0) {
    range.setStart(root, 0);
    range.collapse(true);
    return range;
  }
  const locate = (offset: number, forward: boolean): [Text, number] => {
    let acc = 0;
    for (const node of nodes) {
      const len = node.data.length;
      if (forward ? offset < acc + len : offset <= acc + len) return [node, offset - acc];
      acc += len;
    }
    const last = nodes[nodes.length - 1]!;
    return [last, last.data.length];
  };
  const collapsed = start === end;
  const [sNode, sOff] = locate(start, !collapsed);
  const [eNode, eOff] = collapsed ? [sNode, sOff] : locate(end, false);
  range.setStart(sNode, sOff);
  range.setEnd(eNode, eOff);
  return range;
}

function restore(root: HTMLElement, offsets: [number, number]) {
  selectRange(root, rangeFromOffsets(root, offsets[0], offsets[1]));
}

function closestTag(node: Node | null, tag: string, root: HTMLElement): Element | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (tagOf(current) === tag) return current as Element;
    current = current.parentNode;
  }
  return null;
}

/** Text nodes with at least one selected character. */
function selectedTextNodes(root: HTMLElement, range: Range): Text[] {
  return textNodes(root).filter((t) => {
    if (!t.data.length || !range.intersectsNode(t)) return false;
    if (range.endContainer === t && range.endOffset === 0) return false;
    if (range.startContainer === t && range.startOffset === t.data.length) return false;
    // Element boundary that ends right before this node.
    const probe = root.ownerDocument.createRange();
    probe.selectNodeContents(t);
    return range.compareBoundaryPoints(Range.START_TO_END, probe) > 0 && range.compareBoundaryPoints(Range.END_TO_START, probe) < 0;
  });
}

/** Split text nodes at the range boundaries so the selection covers whole text nodes. */
function isolate(root: HTMLElement, range: Range): Text[] {
  let sc = range.startContainer;
  let so = range.startOffset;
  let ec = range.endContainer;
  let eo = range.endOffset;
  if (ec.nodeType === Node.TEXT_NODE && eo > 0 && eo < (ec as Text).data.length) (ec as Text).splitText(eo);
  if (sc.nodeType === Node.TEXT_NODE && so > 0 && so < (sc as Text).data.length) {
    const tail = (sc as Text).splitText(so);
    if (ec === sc) {
      ec = tail;
      eo -= so;
    }
    sc = tail;
    so = 0;
  }
  range.setStart(sc, so);
  range.setEnd(ec, eo);
  return selectedTextNodes(root, range);
}

const hasContent = (node: Node) => (node.textContent ?? '') !== '' || (node as ParentNode).querySelector?.('img,br,hr') != null;

/** Move `inner` out of ancestor `el`, splitting `el` around it. */
function liftOut(el: Element, inner: Node) {
  const doc = el.ownerDocument;
  const r = doc.createRange();
  r.setStartAfter(inner);
  r.setEnd(el, el.childNodes.length);
  const after = r.extractContents();
  if (hasContent(after)) {
    const clone = el.cloneNode(false);
    clone.appendChild(after);
    el.after(clone);
  }
  r.setStart(el, 0);
  r.setEndBefore(inner);
  const before = r.extractContents();
  if (hasContent(before)) {
    const clone = el.cloneNode(false);
    clone.appendChild(before);
    el.before(clone);
  }
  el.replaceWith(...Array.from(el.childNodes));
}

function sameElement(a: Element, b: Element) {
  return a.tagName === b.tagName && a.getAttribute('href') === b.getAttribute('href');
}

/** Merge adjacent identical inline siblings and adjacent text nodes. */
function tidy(root: HTMLElement) {
  for (const el of Array.from(root.querySelectorAll('strong,em,u,s,code,a'))) {
    if (!el.isConnected) continue;
    if (!hasContent(el)) {
      el.remove();
      continue;
    }
    let next = el.nextSibling;
    while (next && next.nodeType === Node.ELEMENT_NODE && sameElement(el, next as Element)) {
      el.append(...Array.from(next.childNodes));
      (next as Element).remove();
      next = el.nextSibling;
    }
  }
  root.normalize();
}

export function isInlineActive(root: HTMLElement, range: Range, tag: string): boolean {
  if (range.collapsed) return closestTag(range.startContainer, tag, root) !== null;
  const nodes = selectedTextNodes(root, range).filter((t) => t.data.replace(new RegExp(ZWSP, 'g'), '').trim() !== '');
  return nodes.length > 0 && nodes.every((t) => closestTag(t, tag, root) !== null);
}

/** Wrap or unwrap the selection in an inline element. */
export function toggleInline(root: HTMLElement, range: Range, tag: string, attrs?: Record<string, string>, force?: boolean): void {
  const doc = root.ownerDocument;
  const active = force ?? !isInlineActive(root, range, tag);
  if (range.collapsed) {
    // Caret: insert a zero-width placeholder so the next keystrokes get (or lose) the format.
    if (active) {
      const el = doc.createElement(tag);
      for (const [k, v] of Object.entries(attrs ?? {})) el.setAttribute(k, v);
      const text = doc.createTextNode(ZWSP);
      el.appendChild(text);
      range.insertNode(el);
      const caret = doc.createRange();
      caret.setStart(text, 1);
      caret.collapse(true);
      selectRange(root, caret);
    } else {
      const el = closestTag(range.startContainer, tag, root);
      if (!el) return;
      const r = doc.createRange();
      r.setStart(range.startContainer, range.startOffset);
      r.setEnd(el, el.childNodes.length);
      const after = r.extractContents();
      const text = doc.createTextNode(ZWSP);
      el.after(text);
      if (hasContent(after)) {
        const clone = el.cloneNode(false);
        clone.appendChild(after);
        text.after(clone);
      }
      const caret = doc.createRange();
      caret.setStart(text, 1);
      caret.collapse(true);
      selectRange(root, caret);
    }
    return;
  }
  const offsets = getOffsets(root, range);
  const nodes = isolate(root, range);
  for (const t of nodes) {
    if (active) {
      if (closestTag(t, tag, root)) continue;
      const el = doc.createElement(tag);
      for (const [k, v] of Object.entries(attrs ?? {})) el.setAttribute(k, v);
      t.parentNode?.insertBefore(el, t);
      el.appendChild(t);
    } else {
      let ancestor = closestTag(t, tag, root);
      while (ancestor) {
        liftOut(ancestor, t);
        ancestor = closestTag(t, tag, root);
      }
    }
  }
  tidy(root);
  restore(root, offsets);
}

export function setLink(root: HTMLElement, range: Range, href: string): void {
  const attrs = { href, rel: 'noopener noreferrer', ...(/^https?:/i.test(href) ? { target: '_blank' } : {}) };
  if (range.collapsed) {
    const doc = root.ownerDocument;
    const a = doc.createElement('a');
    for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
    a.textContent = href;
    range.insertNode(a);
    const caret = doc.createRange();
    caret.setStartAfter(a);
    caret.collapse(true);
    selectRange(root, caret);
    return;
  }
  // Replace any existing link inside the selection, then wrap.
  toggleInline(root, range, 'a', undefined, false);
  const again = getRange(root);
  if (again) toggleInline(root, again, 'a', attrs, true);
}

export function removeLink(root: HTMLElement, range: Range): void {
  if (range.collapsed) {
    const a = closestTag(range.startContainer, 'a', root);
    if (!a) return;
    const offsets = getOffsets(root, range);
    a.replaceWith(...Array.from(a.childNodes));
    tidy(root);
    restore(root, offsets);
    return;
  }
  toggleInline(root, range, 'a', undefined, false);
}

/** Wrap stray top-level inline content in paragraphs; top-level `div` → `p`. */
export function ensureBlocks(root: HTMLElement): void {
  const doc = root.ownerDocument;
  let group: HTMLElement | null = null;
  for (const node of Array.from(root.childNodes)) {
    if (tagOf(node) === 'div') {
      const p = doc.createElement('p');
      p.append(...Array.from(node.childNodes));
      node.replaceWith(p);
      group = null;
    } else if (isBlock(node)) {
      group = null;
    } else {
      if (node.nodeType === Node.TEXT_NODE && !(node as Text).data.trim() && !group) {
        if (!(node as Text).data) node.remove();
        continue;
      }
      if (!group) {
        group = doc.createElement('p');
        root.insertBefore(group, node);
      }
      group.appendChild(node);
    }
  }
}

function blockOf(root: HTMLElement, node: Node): Element | null {
  let current: Node | null = node;
  while (current && current.parentNode !== root) current = current.parentNode;
  return current && current.nodeType === Node.ELEMENT_NODE ? (current as Element) : null;
}

/** Top-level blocks touched by the range. */
export function topBlocks(root: HTMLElement, range: Range): Element[] {
  if (range.collapsed) {
    const container = range.startContainer === root ? (root.childNodes[Math.min(range.startOffset, root.childNodes.length - 1)] ?? null) : range.startContainer;
    const block = container ? blockOf(root, container) : null;
    return block ? [block] : [];
  }
  return Array.from(root.children).filter((child) => {
    if (!range.intersectsNode(child)) return false;
    const probe = root.ownerDocument.createRange();
    probe.selectNodeContents(child);
    return range.compareBoundaryPoints(Range.START_TO_END, probe) > 0 && range.compareBoundaryPoints(Range.END_TO_START, probe) < 0;
  });
}

function rename(el: Element, tag: string): Element {
  const next = el.ownerDocument.createElement(tag);
  next.append(...Array.from(el.childNodes));
  el.replaceWith(next);
  return next;
}

export function getBlockTag(root: HTMLElement, range: Range): string {
  const block = topBlocks(root, range)[0];
  return tagOf(block) || 'p';
}

/** Set the block type; applying the current type again reverts to a paragraph. */
export function setBlock(root: HTMLElement, range: Range, tag: BlockTag): void {
  const offsets = getOffsets(root, range);
  ensureBlocks(root);
  const blocks = topBlocks(root, rangeFromOffsets(root, offsets[0], offsets[1]));
  if (blocks.length === 0) {
    const el = root.ownerDocument.createElement(tag);
    el.appendChild(root.ownerDocument.createElement('br'));
    root.appendChild(el);
    return;
  }
  const target = tag !== 'p' && blocks.every((b) => tagOf(b) === tag) ? 'p' : tag;
  for (const block of blocks) {
    const name = tagOf(block);
    if (name === 'hr') continue;
    if (name === 'ul' || name === 'ol') {
      const items = Array.from(block.children).map((li) => rename(li, target));
      block.replaceWith(...items);
    } else if (name !== target) rename(block, target);
  }
  restore(root, offsets);
}

export function toggleList(root: HTMLElement, range: Range, listTag: ListTag): void {
  const doc = root.ownerDocument;
  const offsets = getOffsets(root, range);
  ensureBlocks(root);
  const blocks = topBlocks(root, rangeFromOffsets(root, offsets[0], offsets[1])).filter((b) => tagOf(b) !== 'hr');
  if (blocks.length === 0) return;
  if (blocks.every((b) => tagOf(b) === listTag)) {
    for (const list of blocks) list.replaceWith(...Array.from(list.children).map((li) => rename(li, 'p')));
  } else {
    const list = doc.createElement(listTag);
    blocks[0]!.before(list);
    for (const block of blocks) {
      const name = tagOf(block);
      if (name === 'ul' || name === 'ol') {
        list.append(...Array.from(block.children));
        block.remove();
      } else {
        const li = doc.createElement('li');
        li.append(...Array.from(block.childNodes));
        list.appendChild(li);
        block.remove();
      }
    }
  }
  restore(root, offsets);
}

export function insertRule(root: HTMLElement, range: Range): void {
  const doc = root.ownerDocument;
  ensureBlocks(root);
  const block = topBlocks(root, range)[0] ?? null;
  const hr = doc.createElement('hr');
  const p = doc.createElement('p');
  p.appendChild(doc.createElement('br'));
  if (block) block.after(hr, p);
  else root.append(hr, p);
  const caret = doc.createRange();
  caret.setStart(p, 0);
  caret.collapse(true);
  selectRange(root, caret);
}

/** Remove inline formatting and links in the selection and reset blocks to paragraphs. */
export function clearFormatting(root: HTMLElement, range: Range): void {
  const offsets = getOffsets(root, range);
  for (const tag of [...INLINE_SET, 'a']) {
    const r = rangeFromOffsets(root, offsets[0], offsets[1]);
    if (!r.collapsed) toggleInline(root, r, tag, undefined, false);
  }
  const r = rangeFromOffsets(root, offsets[0], offsets[1]);
  ensureBlocks(root);
  for (const block of topBlocks(root, r)) {
    const name = tagOf(block);
    if (name === 'ul' || name === 'ol') block.replaceWith(...Array.from(block.children).map((li) => rename(li, 'p')));
    else if (name !== 'p' && name !== 'hr') rename(block, 'p');
  }
  restore(root, offsets);
}

/** Insert sanitised HTML at the range (paste, images). */
export function insertHtml(root: HTMLElement, range: Range, html: string): void {
  const doc = root.ownerDocument;
  const fragment = parseSafe(doc, html);
  if (!fragment.childNodes.length) return;
  range.deleteContents();
  const nodes = Array.from(fragment.childNodes);
  const last = nodes[nodes.length - 1]!;
  if (!nodes.some(isBlock)) {
    range.insertNode(fragment);
    const caret = doc.createRange();
    caret.setStartAfter(last);
    caret.collapse(true);
    selectRange(root, caret);
    tidy(root);
    return;
  }
  // Block content: split the current block at the caret and insert between the halves.
  ensureBlocks(root);
  const block = blockOf(root, range.startContainer === root ? (root.childNodes[range.startOffset] ?? root) : range.startContainer);
  const wrapped: Node[] = [];
  let group: HTMLElement | null = null;
  for (const node of nodes) {
    if (isBlock(node)) {
      group = null;
      wrapped.push(node);
    } else {
      if (!group) {
        group = doc.createElement('p');
        wrapped.push(group);
      }
      group.appendChild(node);
    }
  }
  if (!block || block === root) {
    root.append(...wrapped);
  } else {
    const tail = doc.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    tail.setEnd(block, block.childNodes.length);
    const rest = tail.extractContents();
    const after = block.cloneNode(false) as Element;
    after.appendChild(rest);
    block.after(...wrapped, ...(hasContent(after) ? [after] : []));
    if (!hasContent(block)) block.remove();
  }
  const end = wrapped[wrapped.length - 1]!;
  const caret = doc.createRange();
  caret.selectNodeContents(end);
  caret.collapse(false);
  selectRange(root, caret);
}

export interface ActiveState {
  inline: Record<InlineFormat, boolean>;
  link: boolean;
  block: string;
}

export function getActiveState(root: HTMLElement, range: Range | null): ActiveState {
  const inline = { bold: false, italic: false, underline: false, strike: false, code: false };
  if (!range) return { inline, link: false, block: '' };
  for (const key of Object.keys(INLINE_TAGS) as InlineFormat[]) inline[key] = isInlineActive(root, range, INLINE_TAGS[key]);
  return { inline, link: isInlineActive(root, range, 'a'), block: getBlockTag(root, range) };
}

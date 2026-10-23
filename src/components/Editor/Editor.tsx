import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type DragEvent, type FormEvent, type KeyboardEvent, type Ref } from 'react';
import { useRovingFocus } from '../../hooks/useRovingFocus';
import { interpolate, useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { isSafeHref, textToHtml } from '../../utils/sanitize';
import { useFieldControl } from '../Field/Field';
import {
  INLINE_TAGS,
  clearFormatting,
  ensureBlocks,
  getActiveState,
  getOffsets,
  getRange,
  insertHtml,
  insertRule,
  rangeFromOffsets,
  removeLink,
  selectRange,
  serialize,
  setBlock,
  setContent,
  setLink,
  textLength,
  toggleInline,
  toggleList,
  type ActiveState,
  type BlockTag,
  type InlineFormat,
} from './commands';

export type EditorTool =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'paragraph'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'link'
  | 'unlink'
  | 'hr'
  | 'image'
  | 'undo'
  | 'redo'
  | 'clear'
  | '|';

export const DEFAULT_TOOLBAR: EditorTool[] = ['bold', 'italic', 'underline', 'strike', 'code', '|', 'paragraph', 'h2', 'h3', 'h4', '|', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'hr', '|', 'link', 'unlink', 'image', '|', 'undo', 'redo', 'clear'];

/** Strings without a key in locale/en.ts yet (local English defaults). */
export interface EditorLabels {
  codeBlock: string;
  horizontalRule: string;
  image: string;
  characterCount: string;
}

export interface EditorProps {
  value?: string;
  defaultValue?: string;
  /** Sanitised HTML, debounced 150 ms. */
  onChange?: (html: string) => void;
  toolbar?: EditorTool[] | false;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  maxLength?: number;
  /** Enables the image tool; resolves to the uploaded image URL. */
  onImageUpload?: (file: File) => Promise<string>;
  id?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  labels?: Partial<EditorLabels>;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Forwarded to the editable element. */
  ref?: Ref<HTMLDivElement>;
}

interface Snapshot {
  html: string;
  sel: [number, number];
}

const DEBOUNCE = 150;
const TYPING_GROUP = 500;
const HISTORY_LIMIT = 100;
const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const INLINE_TOOLS: Partial<Record<EditorTool, InlineFormat>> = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strike', code: 'code' };
const BLOCK_TOOLS: Partial<Record<EditorTool, BlockTag>> = { paragraph: 'p', h2: 'h2', h3: 'h3', h4: 'h4', blockquote: 'blockquote', codeBlock: 'pre' };
const GLYPHS: Partial<Record<EditorTool, string>> = {
  bold: 'B',
  italic: 'I',
  underline: 'U',
  strike: 'S',
  code: '</>',
  paragraph: '¶',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  bulletList: '•≡',
  orderedList: '1≡',
  blockquote: '❝',
  codeBlock: '{ }',
  link: '🔗︎',
  unlink: '⛓︎',
  hr: '―',
  image: '▣',
  undo: '↶',
  redo: '↷',
  clear: 'T̸',
};

const EMPTY_STATE: ActiveState = { inline: { bold: false, italic: false, underline: false, strike: false, code: false }, link: false, block: '' };

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export function Editor({
  value,
  defaultValue = '',
  onChange,
  toolbar = DEFAULT_TOOLBAR,
  placeholder,
  minHeight = '12rem',
  readOnly = false,
  disabled = false,
  invalid: invalidProp,
  required: requiredProp,
  maxLength,
  onImageUpload,
  id: idProp,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  labels: labelsProp,
  onFocus,
  onBlur,
  ref,
}: EditorProps) {
  const { t } = useLocale();
  const L: EditorLabels = { codeBlock: t('editorCodeBlock'), horizontalRule: t('editorHorizontalRule'), image: t('editorImage'), characterCount: t('characterCount'), ...labelsProp };
  const field = useFieldControl({ id: idProp, invalid: invalidProp, required: requiredProp, 'aria-describedby': ariaDescribedBy });
  const counterId = useId();
  const linkInputId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const roving = useRovingFocus(toolbarRef, { selector: '.ui-editor__tool' });

  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const lastSnapshot = useRef<Snapshot>({ html: '', sel: [0, 0] });
  const lastInputAt = useRef(0);
  const savedSel = useRef<[number, number] | null>(null);
  const lastEmitted = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [active, setActive] = useState<ActiveState>(EMPTY_STATE);
  const [empty, setEmpty] = useState(true);
  const [length, setLength] = useState(0);
  const [history, setHistory] = useState({ undo: false, redo: false });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState(false);
  const [toolIndex, setToolIndex] = useState(0);

  const editable = !readOnly && !disabled;
  const tools = toolbar === false ? [] : toolbar.filter((tool) => tool !== 'image' || onImageUpload);
  const overLimit = maxLength !== undefined && length > maxLength;

  const root = () => editorRef.current;

  const syncMeta = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const len = textLength(el);
    setLength(len);
    setEmpty(len === 0 && !el.querySelector('img,hr,li'));
    setHistory({ undo: undoStack.current.length > 0, redo: redoStack.current.length > 0 });
  }, []);

  const refreshActive = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setActive(getActiveState(el, getRange(el)));
  }, []);

  const scheduleChange = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = editorRef.current;
      if (!el) return;
      const html = serialize(el);
      if (html === lastEmitted.current) return;
      lastEmitted.current = html;
      onChangeRef.current?.(html);
    }, DEBOUNCE);
  }, []);

  const currentSnapshot = (): Snapshot => {
    const el = editorRef.current!;
    const range = getRange(el);
    return { html: el.innerHTML, sel: range ? getOffsets(el, range) : (savedSel.current ?? [0, 0]) };
  };

  const pushUndo = (snapshot: Snapshot) => {
    const stack = undoStack.current;
    if (stack[stack.length - 1]?.html === snapshot.html) return;
    stack.push(snapshot);
    if (stack.length > HISTORY_LIMIT) stack.shift();
    redoStack.current = [];
  };

  // Initial content (sanitised) + external value changes.
  const initial = useRef(value ?? defaultValue);
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    setContent(el, initial.current);
    lastEmitted.current = serialize(el);
    lastSnapshot.current = { html: el.innerHTML, sel: [0, 0] };
    syncMeta();
  }, [syncMeta]);

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el || value === undefined) return;
    if (value === lastEmitted.current || value === serialize(el)) return;
    pushUndo(lastSnapshot.current);
    setContent(el, value);
    lastEmitted.current = serialize(el);
    lastSnapshot.current = { html: el.innerHTML, sel: [0, 0] };
    syncMeta();
  }, [value, syncMeta]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    const handler = () => {
      const el = editorRef.current;
      if (el && getRange(el)) refreshActive();
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [refreshActive]);

  /** Range inside the editor, or the selection saved on blur (toolbar keyboard use). */
  const workingRange = (): Range | null => {
    const el = root();
    if (!el) return null;
    const live = getRange(el);
    if (live) return live;
    if (savedSel.current) {
      const r = rangeFromOffsets(el, savedSel.current[0], savedSel.current[1]);
      selectRange(el, r);
      return r;
    }
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    selectRange(el, r);
    return r;
  };

  /** Run a DOM command with history, change notification and state refresh. */
  const run = (command: (el: HTMLDivElement, range: Range) => void) => {
    const el = root();
    if (!el || !editable) return;
    const range = workingRange();
    if (!range) return;
    const before = currentSnapshot();
    command(el, range);
    if (el.innerHTML !== before.html) {
      pushUndo(before);
      const after = currentSnapshot();
      lastSnapshot.current = after;
      savedSel.current = after.sel;
      lastInputAt.current = 0;
      scheduleChange();
    }
    syncMeta();
    refreshActive();
  };

  const restoreSnapshot = (snapshot: Snapshot) => {
    const el = root();
    if (!el) return;
    // History entries were produced from sanitised content by this editor.
    setContent(el, snapshot.html);
    selectRange(el, rangeFromOffsets(el, snapshot.sel[0], snapshot.sel[1]));
    savedSel.current = snapshot.sel;
    lastSnapshot.current = snapshot;
    lastInputAt.current = 0;
    scheduleChange();
    syncMeta();
    refreshActive();
  };

  const undo = () => {
    if (!editable) return;
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(currentSnapshot());
    restoreSnapshot(prev);
  };
  const redo = () => {
    if (!editable) return;
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(currentSnapshot());
    restoreSnapshot(next);
  };

  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    // Typing into an empty editor creates bare text nodes; keep a block structure.
    if (Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE || (n as Element).tagName === 'DIV')) {
      const range = getRange(el);
      const offsets = range ? getOffsets(el, range) : null;
      ensureBlocks(el);
      if (offsets) selectRange(el, rangeFromOffsets(el, offsets[0], offsets[1]));
    }
    const now = Date.now();
    if (now - lastInputAt.current > TYPING_GROUP) pushUndo(lastSnapshot.current);
    lastInputAt.current = now;
    lastSnapshot.current = currentSnapshot();
    scheduleChange();
    syncMeta();
    refreshActive();
  };

  const openLink = () => {
    if (!editable) return;
    const el = root();
    if (!el) return;
    const range = workingRange();
    if (range) savedSel.current = getOffsets(el, range);
    const anchor = range ? (range.startContainer.parentElement?.closest('a') ?? null) : null;
    setLinkUrl(anchor && el.contains(anchor) ? (anchor.getAttribute('href') ?? '') : '');
    setLinkError(false);
    setLinkOpen(true);
  };
  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  const focusContent = () => {
    const el = root();
    if (!el) return;
    el.focus();
    if (savedSel.current) selectRange(el, rangeFromOffsets(el, savedSel.current[0], savedSel.current[1]));
  };
  const closeLink = () => {
    setLinkOpen(false);
    focusContent();
  };
  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url || !isSafeHref(url)) {
      setLinkError(true);
      return;
    }
    setLinkOpen(false);
    focusContent();
    run((el, range) => setLink(el, range, url));
  };

  const pickImage = () => fileRef.current?.click();
  const handleImage = async (file: File | undefined) => {
    if (!file || !onImageUpload) return;
    const el = root();
    const range = el ? getRange(el) : null;
    if (el && range) savedSel.current = getOffsets(el, range);
    const url = await onImageUpload(file);
    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    // insertHtml sanitises again (src allowlist).
    run((node, r) => insertHtml(node, r, `<img src="${escape(url)}" alt="${escape(file.name)}">`));
  };

  const exec = (tool: EditorTool) => {
    const inline = INLINE_TOOLS[tool];
    if (inline) return run((el, range) => toggleInline(el, range, INLINE_TAGS[inline]));
    const block = BLOCK_TOOLS[tool];
    if (block) return run((el, range) => setBlock(el, range, block));
    switch (tool) {
      case 'bulletList':
        return run((el, range) => toggleList(el, range, 'ul'));
      case 'orderedList':
        return run((el, range) => toggleList(el, range, 'ol'));
      case 'hr':
        return run((el, range) => insertRule(el, range));
      case 'link':
        return openLink();
      case 'unlink':
        return run((el, range) => removeLink(el, range));
      case 'clear':
        return run((el, range) => clearFormatting(el, range));
      case 'undo':
        return undo();
      case 'redo':
        return redo();
      case 'image':
        return pickImage();
      default:
        return undefined;
    }
  };

  const focusToolbar = () => {
    const buttons = toolbarRef.current?.querySelectorAll<HTMLButtonElement>('.ui-editor__tool:not(:disabled)');
    const target = buttons?.[Math.min(toolIndex, buttons.length - 1)] ?? buttons?.[0];
    target?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey && event.key === 'F10') {
      event.preventDefault();
      focusToolbar();
      return;
    }
    const mod = isMac() ? event.metaKey : event.ctrlKey;
    if (!mod || event.altKey) return;
    const key = event.key.toLowerCase();
    const map: Record<string, EditorTool> = { b: 'bold', i: 'italic', u: 'underline', k: 'link' };
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if (key === 'y' && !event.shiftKey) {
      event.preventDefault();
      redo();
    } else if (map[key] && !event.shiftKey) {
      event.preventDefault();
      exec(map[key]);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!editable) return;
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    // Both paths are sanitised inside insertHtml (sanitizeHtml / textToHtml).
    const safe = html ? html : textToHtml(text);
    if (!safe) return;
    run((el, range) => insertHtml(el, range, safe));
  };

  // Dropped HTML would bypass the sanitizer: block it.
  const handleDrop = (event: DragEvent<HTMLDivElement>) => event.preventDefault();

  const handleToolbarKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      focusContent();
      return;
    }
    const index = roving(event);
    if (index >= 0) setToolIndex(index);
  };

  const pressed = (tool: EditorTool): boolean | undefined => {
    const inline = INLINE_TOOLS[tool];
    if (inline) return active.inline[inline];
    const block = BLOCK_TOOLS[tool];
    if (block) return active.block === block;
    if (tool === 'bulletList') return active.block === 'ul';
    if (tool === 'orderedList') return active.block === 'ol';
    if (tool === 'link') return active.link;
    return undefined;
  };

  const label = (tool: EditorTool): string => {
    switch (tool) {
      case 'bold':
        return t('editorBold');
      case 'italic':
        return t('editorItalic');
      case 'underline':
        return t('editorUnderline');
      case 'strike':
        return t('editorStrike');
      case 'code':
        return t('editorCode');
      case 'paragraph':
        return t('editorParagraph');
      case 'h2':
        return t('editorHeading', { level: 2 });
      case 'h3':
        return t('editorHeading', { level: 3 });
      case 'h4':
        return t('editorHeading', { level: 4 });
      case 'bulletList':
        return t('editorBulletList');
      case 'orderedList':
        return t('editorOrderedList');
      case 'blockquote':
        return t('editorBlockquote');
      case 'codeBlock':
        return L.codeBlock;
      case 'link':
        return t('editorLink');
      case 'unlink':
        return t('editorUnlink');
      case 'hr':
        return L.horizontalRule;
      case 'image':
        return L.image;
      case 'undo':
        return t('editorUndo');
      case 'redo':
        return t('editorRedo');
      case 'clear':
        return t('editorClearFormatting');
      default:
        return '';
    }
  };

  const toolDisabled = (tool: EditorTool) => !editable || (tool === 'undo' && !history.undo) || (tool === 'redo' && !history.redo);
  let buttonIndex = -1;
  const describedBy = [field.describedBy, maxLength !== undefined ? counterId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('ui-editor', field.invalid || overLimit ? 'is-invalid ui-editor--invalid' : undefined, !editable && 'ui-editor--readonly', className)} style={style}>
      {tools.length > 0 && (
        // Arrow keys move between tools (APG toolbar); Escape returns to the content.
        <div ref={toolbarRef} role="toolbar" aria-label={t('editorToolbar')} aria-controls={field.id} className="btn-toolbar ui-editor__toolbar" onKeyDown={handleToolbarKey}>
          {tools.map((tool, i) => {
            if (tool === '|') return <span key={`sep-${i}`} className="ui-editor__separator" aria-hidden="true" />;
            buttonIndex += 1;
            const isPressed = pressed(tool);
            return (
              <button
                key={tool}
                type="button"
                className={cx('btn btn-sm ui-editor__tool', isPressed && 'active')}
                aria-label={label(tool)}
                aria-pressed={isPressed}
                tabIndex={buttonIndex === toolIndex ? 0 : -1}
                disabled={toolDisabled(tool)}
                data-tool={tool}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setToolIndex(Array.from(toolbarRef.current?.querySelectorAll('.ui-editor__tool') ?? []).findIndex((b) => b.getAttribute('data-tool') === tool));
                  exec(tool);
                }}
              >
                <span aria-hidden="true" className={cx('ui-editor__glyph', `ui-editor__glyph--${tool}`)}>
                  {GLYPHS[tool]}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {linkOpen && (
        <div className="ui-editor__link" role="group" aria-label={t('editorLink')}>
          <label htmlFor={linkInputId} className="visually-hidden">
            {t('editorLinkUrl')}
          </label>
          <input
            ref={linkInputRef}
            id={linkInputId}
            type="url"
            className={cx('form-control form-control-sm', linkError && 'is-invalid')}
            placeholder="https://"
            value={linkUrl}
            aria-invalid={linkError || undefined}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              setLinkError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeLink();
              }
            }}
          />
          <button type="button" className="btn btn-sm btn-primary" onClick={applyLink}>
            {t('apply')}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeLink}>
            {t('cancel')}
          </button>
        </div>
      )}
      <div
        ref={(node) => {
          editorRef.current = node;
          assignRef(ref, node);
        }}
        id={field.id}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : (ariaLabelledBy ?? field.labelId)}
        aria-describedby={describedBy}
        aria-invalid={field.invalid || overLimit || undefined}
        aria-required={field.required || undefined}
        aria-readonly={readOnly || undefined}
        aria-disabled={disabled || undefined}
        aria-placeholder={placeholder}
        tabIndex={disabled ? -1 : 0}
        contentEditable={editable}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        data-empty={empty || undefined}
        className="form-control ui-editor__content"
        style={{ minHeight }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onFocus={() => {
          refreshActive();
          onFocus?.();
        }}
        onBlur={() => {
          const el = root();
          const range = el ? getRange(el) : null;
          if (el && range) savedSel.current = getOffsets(el, range);
          onBlur?.();
        }}
      />
      {maxLength !== undefined && (
        <div id={counterId} className={cx('ui-editor__counter', overLimit && 'text-danger')} aria-live="polite">
          {interpolate(L.characterCount, { count: length, max: maxLength })}
        </div>
      )}
      {onImageUpload && (
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void handleImage(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      )}
    </div>
  );
}

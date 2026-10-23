import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type HTMLAttributes, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';
import { ProgressBar } from '../ProgressBar/ProgressBar';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  /** 0–100. */
  progress: number;
  error?: string;
}

export interface FileValidationError {
  file: File;
  reason: 'type' | 'size' | 'count';
  message: string;
}

export interface UploadContext {
  /** Report progress as a percentage (0–100). */
  onProgress: (percent: number) => void;
  /** Aborted when the user cancels or the component unmounts. */
  signal: AbortSignal;
}

export type Uploader = (file: File, context: UploadContext) => Promise<void>;

export interface FileUploadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  mode?: 'basic' | 'advanced';
  /** MIME types / extensions, e.g. `"image/*,.pdf"`. Advisory only: the server must validate. */
  accept?: string;
  multiple?: boolean;
  /** Bytes. Advisory only: the server must validate. */
  maxFileSize?: number;
  maxFiles?: number;
  value?: UploadFile[];
  defaultValue?: UploadFile[];
  onChange?: (files: UploadFile[]) => void;
  /** App-provided transport. */
  upload?: Uploader;
  /** Upload immediately after files are added. */
  auto?: boolean;
  onValidationError?: (errors: FileValidationError[]) => void;
  /** Image thumbnails via object URLs (revoked on remove/unmount). */
  preview?: boolean;
  disabled?: boolean;
  /** Accessible name for the native input / dropzone. */
  'aria-label'?: string;
  ref?: Ref<HTMLDivElement>;
}

let counter = 0;
const nextId = () => `ui-upload-${Date.now().toString(36)}-${(counter += 1)}`;

export function formatBytes(bytes: number, locale = 'en'): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value)} ${units[unit]}`;
}

/** Client-side check against an `accept` string (`.ext`, `type/*`, `type/subtype`). */
export function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith('.')) return name.endsWith(rule);
      if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
      return type === rule;
    });
}

/** Raster/vector images are previewed only through `<img>` (never inline SVG markup). */
const isPreviewable = (file: File) => file.type.startsWith('image/');

export function FileUpload({
  mode = 'advanced',
  accept,
  multiple = false,
  maxFileSize,
  maxFiles,
  value,
  defaultValue = [],
  onChange,
  upload,
  auto = false,
  onValidationError,
  preview = true,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: FileUploadProps) {
  const { t, locale } = useLocale();
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useControllableState(value, defaultValue, onChange);
  const filesRef = useRef(files);
  filesRef.current = files;
  const controllers = useRef(new Map<string, AbortController>());
  const urls = useRef(new Map<string, string>());
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const update = (fn: (list: UploadFile[]) => UploadFile[]) => {
    const next = fn(filesRef.current);
    filesRef.current = next;
    setFiles(next);
  };
  const patch = (fileId: string, changes: Partial<UploadFile>) => update((list) => list.map((f) => (f.id === fileId ? { ...f, ...changes } : f)));

  // Keep object URLs in sync with the file list; revoke when a file disappears.
  useEffect(() => {
    const map = urls.current;
    let changed = false;
    const present = new Set(files.map((f) => f.id));
    for (const [fileId, url] of map) {
      if (!present.has(fileId) || !preview) {
        URL.revokeObjectURL(url);
        map.delete(fileId);
        changed = true;
      }
    }
    if (preview) {
      for (const f of files) {
        if (!map.has(f.id) && isPreviewable(f.file)) {
          map.set(f.id, URL.createObjectURL(f.file));
          changed = true;
        }
      }
    }
    if (changed) setPreviews(Object.fromEntries(map));
  }, [files, preview]);

  // Unmount: revoke every object URL and abort in-flight uploads.
  useEffect(() => {
    const map = urls.current;
    const inflight = controllers.current;
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url);
      map.clear();
      for (const c of inflight.values()) c.abort();
      inflight.clear();
    };
  }, []);

  const startUpload = async (item: UploadFile) => {
    if (!upload || controllers.current.has(item.id)) return;
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    patch(item.id, { status: 'uploading', progress: 0, error: undefined });
    const name = item.file.name;
    try {
      await upload(item.file, {
        signal: controller.signal,
        onProgress: (percent) => {
          if (controller.signal.aborted) return;
          patch(item.id, { progress: Math.min(100, Math.max(0, Math.round(percent))) });
        },
      });
      if (controller.signal.aborted) return;
      patch(item.id, { status: 'done', progress: 100 });
      setAnnouncement(t('uploadSuccess', { name }));
    } catch (err) {
      if (controller.signal.aborted) return;
      patch(item.id, { status: 'error', error: err instanceof Error && err.message ? err.message : t('uploadFailed', { name }) });
      setAnnouncement(t('uploadFailed', { name }));
    } finally {
      if (controllers.current.get(item.id) === controller) controllers.current.delete(item.id);
    }
  };

  const addFiles = (list: FileList | File[] | null) => {
    if (!list || disabled) return;
    const incoming = Array.from(list);
    const rejected: FileValidationError[] = [];
    const accepted: UploadFile[] = [];
    const existing = multiple ? filesRef.current : [];
    for (const file of multiple ? incoming : incoming.slice(0, 1)) {
      if (!matchesAccept(file, accept)) {
        rejected.push({ file, reason: 'type', message: t('fileTypeNotAllowed', { name: file.name }) });
      } else if (maxFileSize !== undefined && file.size > maxFileSize) {
        rejected.push({ file, reason: 'size', message: t('fileTooLarge', { name: file.name, max: formatBytes(maxFileSize, locale) }) });
      } else if (maxFiles !== undefined && existing.length + accepted.length >= maxFiles) {
        rejected.push({ file, reason: 'count', message: t('tooManyFiles', { max: maxFiles }) });
      } else {
        accepted.push({ id: nextId(), file, status: 'pending', progress: 0 });
      }
    }
    const messages = [...new Set(rejected.map((r) => r.message))];
    setErrors(messages);
    setAnnouncement(messages.join('. '));
    if (rejected.length) onValidationError?.(rejected);
    if (accepted.length === 0) return;
    if (!multiple) for (const f of filesRef.current) controllers.current.get(f.id)?.abort();
    update(() => [...existing, ...accepted]);
    if (auto && upload) accepted.forEach((item) => void startUpload(item));
  };

  const cancel = (item: UploadFile) => {
    controllers.current.get(item.id)?.abort();
    controllers.current.delete(item.id);
    patch(item.id, { status: 'pending', progress: 0 });
  };
  const remove = (item: UploadFile) => {
    controllers.current.get(item.id)?.abort();
    controllers.current.delete(item.id);
    update((list) => list.filter((f) => f.id !== item.id));
  };
  const uploadAll = () => filesRef.current.filter((f) => f.status === 'pending' || f.status === 'error').forEach((f) => void startUpload(f));

  const openDialog = () => {
    if (!disabled) inputRef.current?.click();
  };
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = '';
  };
  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!disabled) {
      event.dataTransfer.dropEffect = 'copy';
      setDragging(true);
    }
  };
  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const chooseLabel = t('chooseFiles');
  const dropLabel = t('dropFilesHere');
  const hasPending = files.some((f) => f.status === 'pending' || f.status === 'error');

  return (
    <div ref={ref} className={cx('ui-file-upload', `ui-file-upload--${mode}`, disabled && 'ui-file-upload--disabled', className)} {...rest}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="visually-hidden ui-file-upload__input"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleInput}
      />
      {mode === 'basic' ? (
        <button type="button" className="btn btn-primary ui-file-upload__choose" aria-label={ariaLabel} disabled={disabled} onClick={openDialog}>
          <Icon name="upload" /> {chooseLabel}
        </button>
      ) : (
        <button
          type="button"
          className={cx('ui-file-upload__dropzone', dragging && 'ui-file-upload__dropzone--active')}
          aria-label={ariaLabel ?? `${chooseLabel}. ${dropLabel}`}
          disabled={disabled}
          onClick={openDialog}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Icon name="upload" size="lg" className="ui-file-upload__dropzone-icon" />
          <span className="ui-file-upload__dropzone-title">{chooseLabel}</span>
          <span className="ui-file-upload__dropzone-hint">{dropLabel}</span>
        </button>
      )}
      {errors.length > 0 && (
        <ul className="ui-file-upload__errors">
          {errors.map((message) => (
            <li key={message} className="ui-file-upload__error">
              {message}
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="list-group ui-file-upload__list">
          {files.map((item) => {
            const name = item.file.name;
            const url = preview ? previews[item.id] : undefined;
            return (
              <li key={item.id} className={cx('list-group-item ui-file-upload__item', `ui-file-upload__item--${item.status}`)}>
                {url ? <img src={url} alt="" className="ui-file-upload__thumb" /> : <span className="ui-file-upload__thumb ui-file-upload__thumb--generic" aria-hidden="true" />}
                <div className="ui-file-upload__meta">
                  {/* Filenames are rendered as text only. */}
                  <span className="ui-file-upload__name">{name}</span>
                  <span className="ui-file-upload__status">
                    {item.status === 'pending' && formatBytes(item.file.size, locale)}
                    {item.status === 'uploading' && t('uploadProgress', { name, percent: item.progress })}
                    {item.status === 'done' && t('uploadSuccess', { name })}
                    {item.status === 'error' && <span className="text-danger">{item.error ?? t('uploadFailed', { name })}</span>}
                  </span>
                  {item.status === 'uploading' && <ProgressBar size="sm" value={item.progress} label={t('uploadProgress', { name, percent: item.progress })} />}
                </div>
                {item.status === 'uploading' ? (
                  <button type="button" className="btn btn-sm ui-file-upload__action" aria-label={t('cancelUpload', { name })} onClick={() => cancel(item)}>
                    <Icon name="x" />
                  </button>
                ) : (
                  <button type="button" className="btn btn-sm ui-file-upload__action" aria-label={t('removeFile', { name })} disabled={disabled} onClick={() => remove(item)}>
                    <Icon name="trash" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {upload && !auto && hasPending && (
        <div className="ui-file-upload__footer">
          <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={uploadAll}>
            {t('upload')}
          </button>
        </div>
      )}
      <div role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </div>
    </div>
  );
}

import { useId, useLayoutEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Icon } from '../Icon/Icon';

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export interface PasswordRequirement {
  label: string;
  test: (value: string) => boolean;
}

export interface PasswordProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'autoComplete'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, event?: ChangeEvent<HTMLInputElement>) => void;
  /** Show/hide button. */
  toggleMask?: boolean;
  /** Strength meter (for new passwords). */
  feedback?: boolean;
  requirements?: PasswordRequirement[];
  strength?: (value: string) => PasswordStrength;
  autoComplete?: 'current-password' | 'new-password';
  size?: Size;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** Built-in heuristic: length tiers plus character variety. */
export function defaultPasswordStrength(value: string): PasswordStrength {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 4) as PasswordStrength;
}

export function Password({
  value: valueProp,
  defaultValue = '',
  onChange,
  toggleMask = true,
  feedback = false,
  requirements,
  strength = defaultPasswordStrength,
  autoComplete,
  size = 'md',
  invalid: invalidProp,
  className,
  id: idProp,
  required: requiredProp,
  ref,
  ...rest
}: PasswordProps) {
  const { t } = useLocale();
  const control = useFieldControl({ id: idProp, invalid: invalidProp, required: requiredProp, 'aria-describedby': rest['aria-describedby'] });
  const [value, setValue] = useControllableState<string>(valueProp, defaultValue);
  const [visible, setVisible] = useState(false);
  const innerRef = useRef<HTMLInputElement | null>(null);
  const selection = useRef<{ start: number | null; end: number | null } | null>(null);
  const feedbackId = useId();
  const requirementsId = useId();

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  // Restore caret after the type attribute flips.
  useLayoutEffect(() => {
    const el = innerRef.current;
    const saved = selection.current;
    if (!el || !saved) return;
    selection.current = null;
    if (saved.start !== null && saved.end !== null) el.setSelectionRange(saved.start, saved.end);
  }, [visible]);

  const toggle = () => {
    const el = innerRef.current;
    if (el) selection.current = { start: el.selectionStart, end: el.selectionEnd };
    setVisible((v) => !v);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    onChange?.(event.target.value, event);
  };

  const level = feedback ? strength(value) : 0;
  const levelName = level <= 1 ? t('passwordWeak') : level === 2 ? t('passwordMedium') : t('passwordStrong');
  const strengthText = t('passwordStrength', { level: levelName });
  const describedBy = [control.describedBy, feedback ? feedbackId : undefined, requirements?.length ? requirementsId : undefined].filter(Boolean).join(' ') || undefined;
  const hasToggle = toggleMask && !rest.disabled;

  return (
    <div className={cx('ui-password', className)}>
      <div className={cx('input-group ui-password__group', size === 'sm' && 'input-group-sm', size === 'lg' && 'input-group-lg', control.invalid && 'has-validation')}>
        <input
          ref={setRefs}
          id={control.id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          required={control.required || undefined}
          aria-invalid={control.invalid || undefined}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          {...rest}
          autoComplete={autoComplete ?? (feedback ? 'new-password' : 'current-password')}
          aria-describedby={describedBy}
          className={cx('form-control ui-password__input', size === 'sm' && 'form-control-sm', size === 'lg' && 'form-control-lg', control.invalid && 'is-invalid')}
        />
        {hasToggle && (
          <button
            type="button"
            className="btn ui-password__toggle"
            aria-label={t('showPassword')}
            aria-pressed={visible}
            title={visible ? t('hidePassword') : t('showPassword')}
            // Keep focus and caret in the input on pointer activation.
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggle}
          >
            <Icon name={visible ? 'eye-off' : 'eye'} />
          </button>
        )}
      </div>
      {feedback && (
        <div id={feedbackId} className="ui-password__feedback">
          <div
            className={cx('progress ui-password__meter', `ui-password__meter--${level <= 1 ? 'weak' : level === 2 ? 'medium' : 'strong'}`)}
            role="progressbar"
            aria-label={t('passwordStrength', { level: '' }).replace(/[:\s]+$/, '')}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={level}
            aria-valuetext={levelName}
          >
            <div className="progress-bar ui-password__meter-bar" style={{ transform: `scaleX(${level / 4})` }} />
          </div>
          <div className="form-text ui-password__strength-text" role="status" aria-live="polite">
            {value ? strengthText : ''}
          </div>
        </div>
      )}
      {requirements && requirements.length > 0 && (
        <ul id={requirementsId} className="list-unstyled ui-password__requirements">
          {requirements.map((requirement) => {
            const met = requirement.test(value);
            return (
              <li key={requirement.label} className={cx('ui-password__requirement', met && 'ui-password__requirement--met')}>
                <Icon name={met ? 'check' : 'x'} className="ui-password__requirement-icon" />
                <span>{requirement.label}</span>
                <span className="visually-hidden">{`: ${met ? t('requirementMet') : t('requirementNotMet')}`}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { useRef, useState, type FormEvent } from 'react';
import { Button, Card, Checkbox, Field, InputText, Message, Password } from '@sabahat/react-ui-kit';

/*
 * Blueprint: Authentication (patterns `auth`, `form-layout`): sign in, reset request, set new password.
 * Standalone page without shell navigation, one h1 (the card title), generic error copy that never reveals whether an
 * account exists, correct autocomplete for password managers, submit never disabled for validation, focus moves to the
 * first invalid field. Demo credentials: any email and password; the password "wrong-password" shows the generic error.
 */

type Mode = 'sign-in' | 'reset' | 'reset-sent' | 'new-password' | 'done';

const REQUIREMENTS = [
  { label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
  { label: 'A number', test: (v: string) => /\d/.test(v) },
  { label: 'An upper and a lower case letter', test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
];
const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);
const MEASURE = { maxWidth: '24rem' } as const;

export interface SignInProps {
  /** Called after a successful sign in; defaults to showing a confirmation. */
  onSignedIn?: (email: string) => void;
  /** Product name above the form. */
  appName?: string;
}

export function SignIn({ onSignedIn, appName = 'Nordic Tools' }: SignInProps) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const go = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFailed(false);
    setPassword('');
    setConfirm('');
  };
  const later = (fn: () => void) => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      fn();
    }, 700);
  };

  const signIn = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = 'Enter an email like name@example.com';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    setFailed(false);
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();
    later(() => {
      if (password === 'wrong-password') {
        setFailed(true);
        setPassword('');
        passwordRef.current?.focus();
        return;
      }
      if (onSignedIn) onSignedIn(email);
      else setMode('done');
    });
  };

  const requestReset = (event: FormEvent) => {
    event.preventDefault();
    if (!isEmail(email)) {
      setErrors({ email: 'Enter an email like name@example.com' });
      return emailRef.current?.focus();
    }
    setErrors({});
    later(() => setMode('reset-sent'));
  };

  const setNewPassword = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!REQUIREMENTS.every((r) => r.test(password))) next.password = 'Use at least 10 characters with a number and both letter cases';
    else if (confirm !== password) next.confirm = 'The passwords do not match';
    setErrors(next);
    if (next.password) return passwordRef.current?.focus();
    if (next.confirm) return confirmRef.current?.focus();
    later(() => {
      setMode('sign-in');
      setPassword('');
      setConfirm('');
    });
  };

  return (
    <main id="main" className="d-flex flex-column align-items-center py-5 px-3">
      <div className="w-100" style={MEASURE}>
        <p className="fs-5 fw-semibold text-center mb-4" style={{ fontFamily: 'var(--ui-font-family-heading)' }}>
          {appName}
        </p>

        {mode === 'sign-in' && (
          <Card title="Sign in" titleAs="h1" variant="outline">
            <form method="post" noValidate onSubmit={signIn} aria-label="Sign in">
              {failed && (
                <Message severity="danger" live="assertive">
                  Email or password is incorrect.
                </Message>
              )}
              <Field id="signin-email" label="Email" required error={errors.email}>
                <InputText ref={emailRef} type="email" autoComplete="username" value={email} onChange={setEmail} />
              </Field>
              <Field id="signin-password" label="Password" required error={errors.password}>
                <Password ref={passwordRef} autoComplete="current-password" value={password} onChange={setPassword} />
              </Field>
              <Checkbox label="Keep me signed in" checked={remember} onChange={setRemember} />
              <Button type="submit" block className="mt-3" loading={busy} loadingText="Signing in…">
                Sign in
              </Button>
            </form>
            <p className="mt-3 mb-0">
              <Button variant="link" className="px-0" onClick={() => go('reset')}>
                Forgot password?
              </Button>
            </p>
          </Card>
        )}

        {mode === 'reset' && (
          <Card title="Reset your password" titleAs="h1" variant="outline">
            <form method="post" noValidate onSubmit={requestReset} aria-label="Reset your password">
              <p className="text-body-secondary">Enter the email you use for {appName} and we will send a reset link.</p>
              <Field id="reset-email" label="Email" required error={errors.email}>
                <InputText ref={emailRef} type="email" autoComplete="email" value={email} onChange={setEmail} />
              </Field>
              <Button type="submit" block loading={busy} loadingText="Sending…">
                Send reset link
              </Button>
            </form>
            <p className="mt-3 mb-0">
              <Button variant="link" className="px-0" onClick={() => go('sign-in')}>
                Back to sign in
              </Button>
            </p>
          </Card>
        )}

        {mode === 'reset-sent' && (
          <Card title="Check your email" titleAs="h1" variant="outline">
            <Message severity="info" live="polite">
              If an account exists for that email, we have sent a link.
            </Message>
            <div className="d-grid gap-2 mt-3">
              <Button appearance="outline" variant="secondary" onClick={() => go('new-password')}>
                Open the link (demo)
              </Button>
              <Button appearance="text" variant="secondary" onClick={() => go('sign-in')}>
                Back to sign in
              </Button>
            </div>
          </Card>
        )}

        {mode === 'new-password' && (
          <Card title="Set a new password" titleAs="h1" variant="outline">
            <form method="post" noValidate onSubmit={setNewPassword} aria-label="Set a new password">
              <Field id="new-password" label="New password" required error={errors.password}>
                <Password ref={passwordRef} autoComplete="new-password" feedback requirements={REQUIREMENTS} value={password} onChange={setPassword} />
              </Field>
              <Field id="confirm-password" label="Confirm password" required error={errors.confirm}>
                <Password ref={confirmRef} autoComplete="new-password" value={confirm} onChange={setConfirm} />
              </Field>
              <Button type="submit" block loading={busy} loadingText="Saving…">
                Set new password
              </Button>
            </form>
          </Card>
        )}

        {mode === 'done' && (
          <Card title="You are signed in" titleAs="h1" variant="outline">
            <Message severity="success" live="polite">
              Signed in as {email}.
            </Message>
            <Button appearance="outline" variant="secondary" block className="mt-3" onClick={() => go('sign-in')}>
              Sign out
            </Button>
          </Card>
        )}
      </div>
    </main>
  );
}

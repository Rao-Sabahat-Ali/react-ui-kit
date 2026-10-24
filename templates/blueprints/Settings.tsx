import { useRef, useState, type FormEvent } from 'react';
import {
  Button,
  ConfirmDialog,
  Field,
  InputText,
  Message,
  PageHeader,
  RadioGroup,
  Section,
  Select,
  Switch,
  Tabs,
  useMediaQuery,
  useTheme,
  useToast,
  type ThemeSetting,
} from '@sabahat/react-ui-kit';

/*
 * Blueprint: Settings page (profile `saas`, pattern `settings-page`; field rules from `form-layout`).
 * Vertical Tabs from lg (scrollable row below), one Section per group, no boxes. Text fields save together with an
 * explicit Save (loading, error summary, Toast); switches apply instantly; leaving a dirty section asks first;
 * the danger zone is last and uses full wording in a ConfirmDialog.
 */

const WORKSPACE = 'Nordic Tools AB';
const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'Svenska', value: 'sv' },
];
const SECTIONS = [
  { value: 'profile', label: 'Profile' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'appearance', label: 'Appearance' },
  { value: 'account', label: 'Account' },
];
const INITIAL = { name: 'Alva Lindqvist', email: 'alva@nordictools.example', language: 'en' };

interface Errors {
  name?: string;
  email?: string;
}

export interface SettingsProps {
  /** Start on another section: `profile`, `notifications`, `appearance` or `account`. */
  defaultSection?: string;
}

export function Settings({ defaultSection = 'profile' }: SettingsProps) {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const wide = useMediaQuery('(min-width: 992px)');
  const [section, setSection] = useState(defaultSection);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  const [saved, setSaved] = useState(INITIAL);
  const [name, setName] = useState(INITIAL.name);
  const [email, setEmail] = useState(INITIAL.email);
  const [language, setLanguage] = useState<string | null>(INITIAL.language);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const dirty = name !== saved.name || email !== saved.email || language !== saved.language;

  const [weekly, setWeekly] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [news, setNews] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const problems = (Object.entries(errors) as [keyof Errors, string][]).filter(([, message]) => message);
  const focusField = (field: keyof Errors) => (field === 'name' ? nameRef : emailRef).current?.focus();

  const goTo = (value: string) => {
    if (section === 'profile' && dirty && value !== 'profile') setPendingSection(value);
    else setSection(value);
  };
  const discard = () => {
    setName(saved.name);
    setEmail(saved.email);
    setLanguage(saved.language);
    setErrors({});
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter an email like name@example.com';
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.email) return emailRef.current?.focus();
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setSaved({ name, email, language: language ?? 'en' });
      toast.success('Profile saved');
    }, 700);
  };

  const profile = (
    <Section
      title="Profile"
      description="How you appear to your team and on invoices."
      actions={
        <Button type="submit" form="profile-form" loading={saving} loadingText="Saving…">
          Save changes
        </Button>
      }
    >
      <form id="profile-form" noValidate onSubmit={save} aria-label="Profile" style={{ maxWidth: '40rem' }}>
        {problems.length > 0 && (
          <Message severity="danger" live="assertive" title={`${problems.length} ${problems.length === 1 ? 'problem needs' : 'problems need'} fixing`}>
            <ul className="mb-0 ps-3">
              {problems.map(([field, message]) => (
                <li key={field}>
                  <a
                    href={`#profile-${field}`}
                    onClick={(e) => {
                      e.preventDefault();
                      focusField(field);
                    }}
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </Message>
        )}
        <Field id="profile-name" label="Full name" required error={errors.name}>
          <InputText ref={nameRef} autoComplete="name" value={name} onChange={setName} />
        </Field>
        <Field id="profile-email" label="Email" required error={errors.email} help="We send receipts and security alerts here.">
          <InputText ref={emailRef} type="email" autoComplete="email" value={email} onChange={setEmail} />
        </Field>
        <Field id="profile-language" label="Language">
          <Select<string> options={LANGUAGES} value={language} onChange={setLanguage} />
        </Field>
        {dirty && (
          <Button type="button" appearance="text" variant="secondary" onClick={discard}>
            Discard changes
          </Button>
        )}
      </form>
    </Section>
  );

  const notifications = (
    <Section title="Notifications" description="Changes apply immediately.">
      <div className="d-grid gap-3" style={{ maxWidth: '40rem' }}>
        <Switch label="Email me a weekly summary" checked={weekly} onChange={setWeekly} />
        <Switch label="Remind me when an invoice is overdue" checked={reminders} onChange={setReminders} />
        <Switch label="Send product news" checked={news} onChange={setNews} />
      </div>
    </Section>
  );

  const appearance = (
    <Section title="Appearance" description="Applies to this device only.">
      <RadioGroup<ThemeSetting>
        legend="Theme"
        value={theme}
        onChange={setTheme}
        options={[
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
          { label: 'Match system', value: 'system', description: 'Follows your operating system setting.' },
        ]}
      />
      <p className="text-body-secondary mt-3 mb-0">Animations are reduced automatically when your system asks for reduced motion.</p>
    </Section>
  );

  const account = (
    <>
      <Section title="Workspace" description={`${WORKSPACE}, created 3 March 2022.`}>
        <p className="mb-0">Billing plan: Business, 5 seats. Next invoice on 1 November 2026.</p>
      </Section>
      <Section title="Danger zone" description="These actions cannot be undone." separated>
        <Button appearance="outline" variant="danger" onClick={() => setDeleteOpen(true)}>
          Delete workspace {WORKSPACE}
        </Button>
      </Section>
    </>
  );

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, notifications and workspace." />
      <Tabs orientation={wide ? 'vertical' : 'horizontal'} variant="pills" value={section} onChange={goTo}>
        {/* Below lg the tabs scroll sideways instead of wrapping onto a second line. */}
        <Tabs.List aria-label="Settings sections" className={wide ? undefined : 'flex-nowrap overflow-x-auto text-nowrap pb-2'}>
          {SECTIONS.map((item) => (
            <Tabs.Tab key={item.value} value={item.value} className={wide ? 'text-start' : undefined}>
              {item.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="profile">{profile}</Tabs.Panel>
        <Tabs.Panel value="notifications">{notifications}</Tabs.Panel>
        <Tabs.Panel value="appearance">{appearance}</Tabs.Panel>
        <Tabs.Panel value="account">{account}</Tabs.Panel>
      </Tabs>

      <ConfirmDialog
        open={pendingSection !== null}
        title="Discard changes?"
        message="Your profile changes have not been saved."
        acceptLabel="Discard changes"
        rejectLabel="Keep editing"
        severity="danger"
        onReject={() => setPendingSection(null)}
        onAccept={() => {
          discard();
          setSection(pendingSection!);
          setPendingSection(null);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={`Delete workspace ${WORKSPACE}?`}
        message="All invoices, receipts and reports are deleted for every member. This cannot be undone."
        acceptLabel="Delete workspace"
        severity="danger"
        onReject={() => setDeleteOpen(false)}
        onAccept={() => {
          setDeleteOpen(false);
          toast.warning('Deleting is disabled in this blueprint');
        }}
      />
    </>
  );
}

import { Button, useConsent } from '@sabahat/react-ui-kit';

const STORED: { where: string; key: string; what: string; when: string }[] = [
  { where: 'localStorage', key: 'ui:theme', what: 'Your light, dark or system theme choice.', when: 'Written when you use the theme toggle.' },
  { where: 'localStorage', key: 'docs:profile', what: 'The app profile selected in the top bar (saas, admin, pos and so on).', when: 'Written when the page loads and when you change the profile.' },
  { where: 'localStorage', key: 'ui:consent', what: 'This notice: the policy version, the date and time you acknowledged it, and the mode. No personal data.', when: 'Written when you press OK. It expires after 365 days or when the policy version changes.' },
];

const DEMOS: { where: string; key: string; what: string; when: string }[] = [
  { where: 'localStorage', key: 'ui:splitter:docs-demo', what: 'Panel sizes of the Splitter example.', when: 'Written when you drag the divider.' },
  { where: 'sessionStorage', key: 'docs:invoices', what: 'Sorting, filters and page of the DataTable example.', when: 'Written when you change the table. Gone when the tab closes.' },
  { where: 'sessionStorage', key: 'ui-scene3d:paused', what: 'Whether you paused the 3D scene.', when: 'Written when you pause or resume. Gone when the tab closes.' },
  { where: 'localStorage', key: 'docs:example:cookie-banner:*', what: 'The decision you make in a CookieBanner example (one key per example).', when: 'Written when you decide in an example. "Reset example" removes it.' },
  { where: 'cookie', key: 'ui_consent', what: 'The same kind of record, written as a first-party cookie for the "Cookie storage" CookieBanner example only.', when: 'Written only after you decide in that example, with Path=/ and SameSite=Lax. "Reset example" removes it.' },
];

function Table({ rows, caption }: { rows: typeof STORED; caption: string }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Where</th>
            <th scope="col">Key</th>
            <th scope="col">What it holds</th>
            <th scope="col">When it is written</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.where}</td>
              <th scope="row">
                <code>{r.key}</code>
              </th>
              <td>{r.what}</td>
              <td>{r.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PrivacyPage() {
  const { openSettings } = useConsent();
  return (
    <>
      <header className="docs-page-header">
        <h1>Privacy</h1>
        <p className="lead text-body-secondary">This site keeps a few choices in your browser. It sets no cookies on its own, runs no analytics and sends nothing about you to anyone.</p>
      </header>
      <section aria-labelledby="privacy-stored" className="mb-5">
        <h2 id="privacy-stored" className="h4">What the site stores</h2>
        <p>Everything below stays on your device. Nothing is sent to a server, because the docs are a static site with no backend. Fonts and scripts are loaded from the same host as the page.</p>
        <Table rows={STORED} caption="Storage the docs site always uses" />
      </section>
      <section aria-labelledby="privacy-demos" className="mb-5">
        <h2 id="privacy-demos" className="h4">What the live examples store</h2>
        <p>Some component examples keep state so you can see them work. They write these entries only if you use them.</p>
        <Table rows={DEMOS} caption="Storage written by live component examples" />
      </section>
      <section aria-labelledby="privacy-clear" className="mb-5">
        <h2 id="privacy-clear" className="h4">Look at it again or clear it</h2>
        <p>
          Show the notice again with the button below, or clear everything in your browser&apos;s site data settings for this address. The policy version is <code>2026-10</code>; when it changes the notice asks again.
        </p>
        <Button variant="secondary" appearance="outline" onClick={openSettings}>
          Cookies and storage
        </Button>
      </section>
    </>
  );
}

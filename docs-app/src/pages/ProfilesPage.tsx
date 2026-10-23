import { Button, Card, Field, InputText, Tag, Checkbox } from '@sabahat/react-ui-kit';
import { profiles } from '../registry';

/** Each card renders a mini-surface with its own data-ui-profile so profiles can be compared side by side. */
export function ProfilesPage() {
  return (
    <>
      <header className="docs-page-header">
        <h1>App profiles</h1>
        <p className="lead text-body-secondary">One profile per app (or per surface). Profiles set density, shape, accent and default theme.</p>
      </header>
      <div className="row g-3">
        {profiles.map((p) => (
          <div className="col-lg-6" key={p.name}>
            <div data-ui-profile={p.name} className="docs-profile-sample">
              <Card
                title={p.name}
                subtitle={p.description}
                footer={
                  <div className="d-flex gap-2">
                    <Tag value={`theme: ${p.defaultTheme}`} />
                    <Tag value={`density: ${p.density}`} />
                  </div>
                }
              >
                <Field label="Search" labelHidden>
                  <InputText placeholder="Search…" />
                </Field>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <Button>Primary</Button>
                  <Button appearance="outline">Outline</Button>
                  <Checkbox label="Option" defaultChecked />
                </div>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

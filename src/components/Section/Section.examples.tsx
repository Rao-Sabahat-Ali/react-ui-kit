import { Button } from '../Button/Button';
import { Section } from './Section';

export const examples = [
  {
    title: 'Titled section with action',
    code: `<Section title="Today" description="Pick up where you left off." actions={<Button appearance="outline">Start review</Button>}>\n  …\n</Section>`,
    render: () => (
      <Section title="Today" description="Pick up where you left off." actions={<Button appearance="outline">Start review</Button>}>
        <p className="mb-0">Eight words are waiting.</p>
      </Section>
    ),
  },
  {
    title: 'Separated groups',
    code: `<Section title="Learning">…</Section>\n<Section title="Appearance" separated>…</Section>`,
    render: () => (
      <>
        <Section title="Learning">
          <p className="mb-0">Translations are hidden by default.</p>
        </Section>
        <Section title="Appearance" separated>
          <p className="mb-0">Light, dark or follow the system.</p>
        </Section>
      </>
    ),
  },
];

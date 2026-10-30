import { Button, StatCard, StatGroup, StepPanel, StepSheet, Tag, useStepSheet } from '@sabahat/react-ui-kit';
import { href } from '../router';
import { components, isImplemented, profiles, specVersion } from '../registry';
import { CodeBlock } from '../components/CodeBlock';

function Continue({ label = 'Continue' }: { label?: string }) {
  const { next, current, count } = useStepSheet();
  return current === count - 1 ? (
    <Button as="a" href={href('foundations')} icon="arrow-right" iconPosition="end">
      Browse foundations
    </Button>
  ) : (
    <Button onClick={next}>{label}</Button>
  );
}

export function HomePage() {
  const implemented = components.filter(isImplemented).length;
  return (
    <>
      <header className="docs-page-header">
        <h1>react-ui-kit</h1>
        <p className="lead text-body-secondary">
          React 19 + Bootstrap 5.3 components implementing the personal design system. Specs live in <code>design-system-mcp</code> (spec v{specVersion}) and are served to agents over MCP.
        </p>
      </header>
      <StatGroup aria-label="Library at a glance" className="mb-5">
        <StatCard icon="layers" label="Components implemented" value={implemented} />
        <StatCard icon="box" label="Components specified" value={components.length} href={href('roadmap')} />
        <StatCard icon="user" label="App profiles" value={profiles.length} href={href('profiles')} />
        <StatCard icon="moon" label="Themes (light, dark)" value={2} href={href('foundations')} />
      </StatGroup>
      <h2 className="h4 mb-3">Use in an app</h2>
      <StepSheet aria-label="Use in an app" className="mb-4">
        <StepPanel title="Install" visual={<code>npm install</code>} action={<Continue />}>
          Add the package and Bootstrap as peer dependencies.
        </StepPanel>
        <StepPanel title="Load the styles" visual={<code>styles.css</code>} action={<Continue />}>
          One import brings tokens, themes and the self-hosted font.
        </StepPanel>
        <StepPanel title="Wrap the app" visual={<code>ThemeProvider</code>} action={<Continue />}>
          Pick a profile; light and dark follow the system.
        </StepPanel>
      </StepSheet>
      <CodeBlock
        code={`npm install @sabahat/react-ui-kit\n\n// main.tsx\nimport '@sabahat/react-ui-kit/styles.css';\nimport { ThemeProvider } from '@sabahat/react-ui-kit';\n\n<ThemeProvider profile="admin">\n  <App />\n</ThemeProvider>`}
      />
      <h2 className="h4 mt-4">Principles</h2>
      <ul className="docs-list">
        <li>Accessible by default (WCAG 2.2 AA), keyboard support per WAI-ARIA APG.</li>
        <li>Bootstrap-native markup, themed only through <code>--ui-*</code> tokens.</li>
        <li>Zero runtime dependencies besides React. No Bootstrap JS, no Popper.</li>
        <li>Spec first: every component has a spec with acceptance criteria; tests are named after them.</li>
      </ul>
      <p className="mt-3">
        <Tag value="Tip" severity="info" /> Switch the profile and theme in the top bar — every page re-themes live.
      </p>
    </>
  );
}

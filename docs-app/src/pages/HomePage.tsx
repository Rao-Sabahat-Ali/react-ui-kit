import { useState } from 'react';
import { Button, StatCard, StatGroup, StepPanel, StepSheet, useStepSheet } from '@sabahat/react-ui-kit';
import { href } from '../router';
import { components, isImplemented, profiles, specVersion } from '../registry';
import { CodeBlock } from '../components/CodeBlock';
import { PackageIntoFolderFigure, PartIntoSlotFigure, SheetOntoFrameFigure } from '../figures/InstallFigures';

/** The one action of the current step: it moves the sheet on; the last step links out. Other panels show none. */
function Continue() {
  const { next, current, count } = useStepSheet();
  return current === count - 1 ? (
    <Button as="a" href={href('foundations')} icon="arrow-right" iconPosition="end">
      Browse foundations
    </Button>
  ) : (
    <Button onClick={next}>Continue</Button>
  );
}

export function HomePage() {
  const [step, setStep] = useState(0);
  const implemented = components.filter(isImplemented).length;
  const action = (index: number) => (step === index ? <Continue /> : undefined);
  return (
    <>
      <header className="docs-page-header">
        <h1>react-ui-kit</h1>
        <p className="lead text-body-secondary">
          React 19 + Bootstrap 5.3 components implementing the personal design system. Specs live in <code>design-system-mcp</code> (spec v{specVersion}) and are served to agents over MCP.
        </p>
      </header>
      <h2 className="h4 mb-3">Use in an app</h2>
      <StepSheet aria-label="Use in an app" className="mb-4" current={step} onCurrentChange={setStep}>
        <StepPanel title="Install" figure={<PackageIntoFolderFigure />} visual={<code>npm install</code>} action={action(0)}>
          Add the package and Bootstrap as peer dependencies.
        </StepPanel>
        <StepPanel title="Load the styles" figure={<SheetOntoFrameFigure />} visual={<code>styles.css</code>} action={action(1)}>
          One import brings tokens, themes and the self-hosted font.
        </StepPanel>
        <StepPanel title="Wrap the app" figure={<PartIntoSlotFigure />} visual={<code>ThemeProvider</code>} action={action(2)}>
          Pick a profile; light and dark follow the system.
        </StepPanel>
      </StepSheet>
      <CodeBlock
        code={`npm install @sabahat/react-ui-kit\n\n// main.tsx\nimport '@sabahat/react-ui-kit/styles.css';\nimport { ThemeProvider } from '@sabahat/react-ui-kit';\n\n<ThemeProvider profile="admin">\n  <App />\n</ThemeProvider>`}
      />
      <h2 className="h4 mt-5 mb-3">Parts list</h2>
      <StatGroup aria-label="Parts list" className="mb-4">
        <StatCard
          label={implemented === components.length ? 'Components, each specified and built' : `Components specified, ${implemented} built`}
          value={components.length}
          href={href('roadmap')}
        />
        <StatCard label="App profiles" value={profiles.length} href={href('profiles')} />
      </StatGroup>
      <h2 className="h4 mt-4">Principles</h2>
      <ul className="docs-list">
        <li>Accessible by default (WCAG 2.2 AA), keyboard support per WAI-ARIA APG.</li>
        <li>Bootstrap-native markup, themed only through <code>--ui-*</code> tokens, in light and dark.</li>
        <li>Zero runtime dependencies besides React. No Bootstrap JS, no Popper.</li>
        <li>Spec first: every component has a spec with acceptance criteria; tests are named after them.</li>
      </ul>
      <p className="mt-3 text-body-secondary">Switch the profile and theme in the top bar; every page re-themes live.</p>
    </>
  );
}

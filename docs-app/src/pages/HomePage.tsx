import { Card, Tag } from '@sabahat/react-ui-kit';
import { href } from '../router';
import { components, isImplemented, profiles, specVersion } from '../registry';
import { CodeBlock } from '../components/CodeBlock';

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
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3"><Card title={`${implemented}`} subtitle="Components implemented" /></div>
        <div className="col-sm-6 col-lg-3"><Card title={`${components.length}`} subtitle="Components specified" href={href('roadmap')} /></div>
        <div className="col-sm-6 col-lg-3"><Card title={`${profiles.length}`} subtitle="App profiles" href={href('profiles')} /></div>
        <div className="col-sm-6 col-lg-3"><Card title="2" subtitle="Themes (light / dark)" href={href('foundations')} /></div>
      </div>
      <h2 className="h4">Use in an app</h2>
      <CodeBlock
        code={`npm install github:Rao-Sabahat-Ali/react-ui-kit#main\n\n// main.tsx\nimport '@sabahat/react-ui-kit/styles.css';\nimport { ThemeProvider } from '@sabahat/react-ui-kit';\n\n<ThemeProvider profile="admin">\n  <App />\n</ThemeProvider>`}
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

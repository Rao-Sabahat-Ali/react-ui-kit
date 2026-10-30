import { Tag } from '@sabahat/react-ui-kit';
import { CodeBlock } from '../components/CodeBlock';
import { ExampleCard } from '../components/ExampleCard';
import { examplesByName } from '../registry';
import { href } from '../router';

const INSTALL = `npm install @sabahat/react-ui-kit-3d three\n\n// once, next to the kit styles\nimport '@sabahat/react-ui-kit-3d/styles.css';`;

/** Overview of the optional 3D package: where depth belongs, what it costs, and the two showcase scenes. */
export function Depth3DPage() {
  const examples = examplesByName.get('Scene3D') ?? [];
  return (
    <>
      <header className="docs-page-header">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <Tag value="Optional package" />
          <Tag value="@sabahat/react-ui-kit-3d" />
        </div>
        <h1>Depth (3D)</h1>
        <p className="lead text-body-secondary">
          The sheet is flat. When an object earns depth, it is drawn the way the world draws things: flat paper fills with 2px ink edges, parts that travel in along dashed guide lines and click into place.
        </p>
        <p className="small text-body-secondary mb-0">
          Components: <a href={href('components', 'scene-3d')}>Scene3D</a> and <a href={href('components', 'model-3d')}>Model3D</a> · MCP: <code>get_component_spec("Scene3D")</code>
        </p>
      </header>

      <h2 className="h4">Install</h2>
      <p className="text-body-secondary">three is a peer dependency and is never in your main bundle: it loads when a scene nears the viewport.</p>
      <CodeBlock code={INSTALL} label="Install" />

      <h2 className="h4 mt-5">Where depth belongs</h2>
      <ul>
        <li>The landing hero object, one per view, assembling on first view.</li>
        <li>A game menu backdrop, shaded, on the night sheet.</li>
        <li>An empty-state illustration in the EmptyState <code>media</code> slot.</li>
        <li>A product turntable with orbit controls (ecommerce).</li>
      </ul>
      <p className="text-body-secondary">
        Never charts or any data, never content that must be read, never working screens, and never as the only carrier of information: every scene has a text alternative and a line-art poster.
      </p>

      <h2 className="h4 mt-5">What it costs</h2>
      <ul>
        <li>Apps that never import the package pay nothing; the core kit has no three import.</li>
        <li>The package is under 12 KB gzip without three; three loads once a scene is within 200px of the viewport.</li>
        <li>Frames are drawn on demand: not offscreen, not in a hidden tab, and a single still frame under reduced motion.</li>
      </ul>

      {examples.slice(0, 2).map((example) => (
        <ExampleCard key={example.title} example={example} />
      ))}
      <p className="text-body-secondary">
        More scenes — empty state, game, backdrop and the poster fallback — are on the <a href={href('components', 'scene-3d')}>Scene3D</a> page.
      </p>
    </>
  );
}

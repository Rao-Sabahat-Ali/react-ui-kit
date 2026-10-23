import { Tabs } from '@sabahat/react-ui-kit';
import type { Example } from '../registry';
import { CodeBlock } from './CodeBlock';

export function ExampleCard({ example }: { example: Example }) {
  return (
    <section className="docs-example">
      <h3 className="h5 docs-example__title">{example.title}</h3>
      {example.description && <p className="text-body-secondary">{example.description}</p>}
      <Tabs variant="underline" defaultValue="preview" lazy={false}>
        <Tabs.List aria-label={`${example.title} views`}>
          <Tabs.Tab value="preview">Preview</Tabs.Tab>
          <Tabs.Tab value="code">Code</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="preview" className="docs-example__preview">
          {example.render()}
        </Tabs.Panel>
        <Tabs.Panel value="code">
          <CodeBlock code={example.code} />
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}

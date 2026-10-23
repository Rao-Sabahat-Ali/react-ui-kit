import { Message, Tag } from '@sabahat/react-ui-kit';
import { ExampleCard } from '../components/ExampleCard';
import { CATEGORY_LABELS, components, examplesByName } from '../registry';

export function ComponentPage({ slug }: { slug: string }) {
  const component = components.find((c) => c.slug === slug);
  if (!component) return <Message severity="warning" title="Not found">No component named “{slug}”.</Message>;
  const examples = examplesByName.get(component.name);
  return (
    <>
      <header className="docs-page-header">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <Tag value={CATEGORY_LABELS[component.category] ?? component.category} />
          <Tag value={examples ? 'Implemented' : 'Specified'} severity={examples ? 'success' : 'warning'} />
        </div>
        <h1>{component.name}</h1>
        <p className="lead text-body-secondary">{component.purpose}</p>
        <p className="small text-body-secondary mb-0">
          Spec: <code>design-system-mcp/specs/components/{component.slug}.md</code> · MCP: <code>get_component_spec("{component.name}")</code>
        </p>
      </header>
      {examples ? (
        examples.map((example) => <ExampleCard key={example.title} example={example} />)
      ) : (
        <Message severity="info" title="Not implemented yet">
          This component is fully specified. Implementation is tracked in <code>tasks.md</code>.
        </Message>
      )}
    </>
  );
}

import { Message, Tag } from '@sabahat/react-ui-kit';
import { ExampleCard } from '../components/ExampleCard';
import { InlineMarkdown } from '../components/InlineMarkdown';
import { CATEGORY_LABELS, components, isImplemented, useExamples } from '../registry';

export function ComponentPage({ slug }: { slug: string }) {
  const component = components.find((c) => c.slug === slug);
  const examples = useExamples(component && isImplemented(component) ? component.name : undefined);
  if (!component) return <Message severity="warning" title="Not found">No component named “{slug}”.</Message>;
  const implemented = isImplemented(component);
  return (
    <>
      <header className="docs-page-header">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <Tag value={CATEGORY_LABELS[component.category] ?? component.category} />
          <Tag value={implemented ? 'Implemented' : 'Specified'} severity={implemented ? 'success' : 'warning'} />
        </div>
        <h1>{component.name}</h1>
        <p className="lead text-body-secondary"><InlineMarkdown text={component.purpose} /></p>
        <p className="small text-body-secondary mb-0">
          Spec: <code>design-system-mcp/specs/components/{component.slug}.md</code> · MCP: <code>get_component_spec("{component.name}")</code>
        </p>
      </header>
      {implemented ? (
        examples?.map((example) => <ExampleCard key={example.title} example={example} />)
      ) : (
        <Message severity="info" title="Not implemented yet">
          This component is fully specified. Implementation is tracked in <code>tasks.md</code>.
        </Message>
      )}
    </>
  );
}

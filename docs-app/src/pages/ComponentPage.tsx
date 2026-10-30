import { Message } from '@sabahat/react-ui-kit';
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
        <h1>{component.name}</h1>
        <p className="small text-body-secondary mb-2">
          {CATEGORY_LABELS[component.category] ?? component.category} · {implemented ? 'implemented' : 'specified'} · spec <code>specs/components/{component.slug}.md</code> · MCP <code>get_component_spec(&quot;{component.name}&quot;)</code>
        </p>
        <p className="lead text-body-secondary mb-0"><InlineMarkdown text={component.purpose} /></p>
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

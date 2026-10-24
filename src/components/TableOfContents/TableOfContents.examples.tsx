import { useRef } from 'react';
import { TableOfContents } from './TableOfContents';

function Demo() {
  const article = useRef<HTMLElement>(null);
  return (
    <div className="row g-4">
      <article ref={article} className="col-12 col-md-8">
        <h4 id="toc-demo-intro">Introduction</h4>
        <p>The contents list is built from the headings of this article. The section you are reading is marked with aria-current.</p>
        <h5>Why a contents list</h5>
        <p>Long pages need a map. Links are real anchors, so they work without scripting.</p>
        <h4>Setup</h4>
        <p>Pass a selector, an element or a ref as from. Headings without an id receive one.</p>
        <h5>Router apps</h5>
        <p>Use onNavigate to keep the router in charge of the URL.</p>
        <h4>Reference</h4>
        <p>Items can also be passed explicitly, with nested children.</p>
      </article>
      <div className="col-12 col-md-4">
        {/* Hash-routed docs: onNavigate keeps the router in charge of the URL. */}
        <TableOfContents from={article} headings="h4, h5" onNavigate={() => {}} />
      </div>
    </div>
  );
}

export const examples = [
  {
    title: 'Built from headings, with scrollspy',
    description: 'Scan the headings of a container (selector, element or ref). Scroll the page: the current section is marked. Add sticky for a side column.',
    code: `<article ref={article}>…</article>\n<TableOfContents from={article} headings="h2, h3" sticky offset={72} />`,
    render: () => <Demo />,
  },
  {
    title: 'Explicit, nested items',
    code: `<TableOfContents label="In this guide" items={[{ id: 'intro', label: 'Intro' }, { id: 'api', label: 'API', children: [{ id: 'props', label: 'Props' }] }]} />`,
    render: () => <TableOfContents label="In this guide" onNavigate={() => {}} items={[{ id: 'intro', label: 'Intro' }, { id: 'api', label: 'API', children: [{ id: 'props', label: 'Props' }, { id: 'events', label: 'Events' }] }, { id: 'a11y', label: 'Accessibility' }]} />,
  },
];

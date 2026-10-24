import { AnimateOnScroll } from './AnimateOnScroll';

const rows = ['Fast to scan', 'Easy to trust', 'Built to last'];

export const examples = [
  {
    title: 'Reveal on scroll',
    description: 'Scroll the box. Each row fades in once, staggered with `delay`. Nothing animates with reduced motion, and the text is always in the page for assistive technology.',
    code: `<AnimateOnScroll preset="slide-up" delay={80}>\n  <FeatureRow />\n</AnimateOnScroll>\n<AnimateOnScroll preset="fade" once={false} threshold={0.5}>…</AnimateOnScroll>`,
    render: () => (
      <div className="rounded border" style={{ height: 240, overflowY: 'auto' }} tabIndex={0} role="region" aria-label="Scrollable demo">
        <div style={{ height: 200 }} className="p-3 text-body-secondary">Scroll down</div>
        {rows.map((row, i) => (
          <AnimateOnScroll key={row} preset="slide-up" delay={i * 80} className="px-3 pb-4">
            <h4 className="h5 mb-1">{row}</h4>
            <p className="mb-0 text-body-secondary">Short supporting sentence for {row.toLowerCase()}.</p>
          </AnimateOnScroll>
        ))}
        <AnimateOnScroll preset="fade" once={false} threshold={0.5} className="px-3 pb-4">
          <p className="mb-0">This one hides again when it leaves the viewport (<code>once=false</code>).</p>
        </AnimateOnScroll>
        <div style={{ height: 160 }} />
      </div>
    ),
  },
];

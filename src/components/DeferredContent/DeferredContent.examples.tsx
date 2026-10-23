import { DeferredContent } from './DeferredContent';

export const examples = [
  {
    title: 'Lazy mount on scroll',
    description: 'Children mount only once the placeholder is within `rootMargin` of the viewport.',
    code: `<DeferredContent onLoad={() => console.log('loaded')} rootMargin="100px">\n  <HeavyChart />\n</DeferredContent>`,
    render: () => (
      <DeferredContent rootMargin="100px">
        <div className="border rounded p-4">Heavy widget mounted.</div>
      </DeferredContent>
    ),
  },
];

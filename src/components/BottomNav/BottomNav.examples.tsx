import { BottomNav } from './BottomNav';

export const examples = [
  {
    title: 'Mobile tab bar',
    code: `<BottomNav activeHref={path} onNavigate={navigate} items={[\n  { label: 'Home', href: '/', icon: 'home' },\n  { label: 'Learn', href: '/learn', icon: 'star' },\n  { label: 'Review', href: '/review', icon: 'refresh', badge: 12 },\n  { label: 'Words', href: '/dictionary', icon: 'search' },\n]} />`,
    render: () => (
      <div style={{ maxWidth: 400, border: '1px solid var(--ui-color-border)', borderRadius: 'var(--ui-radius-lg)', overflow: 'hidden' }}>
        <BottomNav
          ariaLabel="Example"
          activeHref="#learn"
          items={[
            { label: 'Home', href: '#home', icon: 'home' },
            { label: 'Learn', href: '#learn', icon: 'star' },
            { label: 'Review', href: '#review', icon: 'refresh', badge: 12 },
            { label: 'Words', href: '#words', icon: 'search' },
          ]}
        />
      </div>
    ),
  },
];

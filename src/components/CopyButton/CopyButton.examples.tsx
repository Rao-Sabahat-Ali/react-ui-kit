import { CopyButton } from './CopyButton';

export const examples = [
  {
    title: 'Text and icon-only',
    description: 'The outcome is announced in a polite live region; the icon-only button needs a specific label.',
    code: `<CopyButton value="sk_test_4eC39HqLyjWDarjtT1zdp7dc" label="Copy API key" />\n<CopyButton iconOnly size="sm" label="Copy invoice number" value="INV-2026-0042" />`,
    render: () => (
      <div className="d-flex flex-wrap align-items-center gap-3">
        <CopyButton value="sk_test_4eC39HqLyjWDarjtT1zdp7dc" label="Copy API key" />
        <span>
          INV-2026-0042 <CopyButton iconOnly size="sm" label="Copy invoice number" value="INV-2026-0042" />
        </span>
      </div>
    ),
  },
  {
    title: 'Custom labels, outline, lazy value',
    code: `<CopyButton value={() => window.location.href} appearance="outline" label="Copy link" copiedLabel="Link copied" timeout={3000} />`,
    render: () => <CopyButton value={() => window.location.href} appearance="outline" label="Copy link" copiedLabel="Link copied" timeout={3000} />,
  },
];

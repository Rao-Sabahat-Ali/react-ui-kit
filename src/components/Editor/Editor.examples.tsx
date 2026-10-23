import { useState } from 'react';
import { Field } from '../Field/Field';
import { Editor } from './Editor';

const initial = '<h2>Release notes</h2><p>This editor uses its own <strong>command layer</strong> on the Selection API, with <em>undo/redo</em> and a <a href="https://example.com">sanitised</a> output.</p><ul><li>Paste is sanitised</li><li>Alt+F10 focuses the toolbar</li></ul>';

function Controlled() {
  const [html, setHtml] = useState(initial);
  return (
    <>
      <Field label="Post body">
        <Editor value={html} onChange={setHtml} maxLength={2000} />
      </Field>
      <pre className="small mt-3 text-body-secondary" style={{ whiteSpace: 'pre-wrap' }}>
        {html}
      </pre>
    </>
  );
}

const fakeImageUpload = (file: File) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

export const examples = [
  {
    title: 'Controlled with sanitised output',
    description: 'onChange is debounced (150 ms) and always receives sanitised HTML.',
    code: `<Field label="Post body">\n  <Editor value={html} onChange={setHtml} maxLength={2000} />\n</Field>`,
    render: () => <Controlled />,
  },
  {
    title: 'Custom toolbar, placeholder and image upload',
    code: `<Editor aria-label="Comment" toolbar={['bold', 'italic', 'link', '|', 'bulletList', 'image', '|', 'undo', 'redo']} placeholder="Write a comment…" minHeight="6rem" onImageUpload={uploadImage} />`,
    render: () => (
      <Editor aria-label="Comment" toolbar={['bold', 'italic', 'link', '|', 'bulletList', 'image', '|', 'undo', 'redo']} placeholder="Write a comment…" minHeight="6rem" onImageUpload={fakeImageUpload} />
    ),
  },
  {
    title: 'Read-only',
    code: `<Editor aria-label="Preview" defaultValue={html} readOnly toolbar={false} minHeight="auto" />`,
    render: () => <Editor aria-label="Preview" defaultValue={initial} readOnly toolbar={false} minHeight="auto" />,
  },
];

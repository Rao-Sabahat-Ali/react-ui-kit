import { useState } from 'react';
import { FileUpload, type UploadFile, type Uploader } from './FileUpload';

/** Fake transport: reports progress every 200 ms and honours the AbortSignal. */
const fakeUpload: Uploader = (_file, { onProgress, signal }) =>
  new Promise((resolve, reject) => {
    let percent = 0;
    const timer = setInterval(() => {
      percent += 20;
      onProgress(percent);
      if (percent >= 100) {
        clearInterval(timer);
        resolve();
      }
    }, 200);
    signal.addEventListener('abort', () => {
      clearInterval(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

function Controlled() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  return (
    <>
      <FileUpload multiple accept="image/*,.pdf" maxFileSize={5 * 1024 * 1024} maxFiles={5} upload={fakeUpload} value={files} onChange={setFiles} />
      <p className="small text-body-secondary mt-2">{files.filter((f) => f.status === 'done').length} of {files.length} uploaded</p>
    </>
  );
}

export const examples = [
  {
    title: 'Advanced (dropzone, manual upload)',
    description: 'Client validation is advisory; the server must validate type and size again.',
    code: `<FileUpload multiple accept="image/*,.pdf" maxFileSize={5 * 1024 * 1024} maxFiles={5} upload={myUploader} value={files} onChange={setFiles} />`,
    render: () => <Controlled />,
  },
  {
    title: 'Auto upload',
    code: `<FileUpload auto multiple upload={myUploader} />`,
    render: () => <FileUpload auto multiple upload={fakeUpload} />,
  },
  {
    title: 'Basic',
    code: `<FileUpload mode="basic" accept=".csv" auto upload={myUploader} />`,
    render: () => <FileUpload mode="basic" accept=".csv" auto upload={fakeUpload} />,
  },
];

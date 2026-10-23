import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Explicit: src/index.ts is side-effect-free in production builds, so its stylesheet import is tree-shaken.
import '../../src/styles/index.scss';
import './docs.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

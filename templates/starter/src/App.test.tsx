import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';

it('renders the shell with a page heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'Welcome' })).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
});

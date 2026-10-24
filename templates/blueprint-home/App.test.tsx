import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';

it('renders the __SCREEN__ blueprint as the home screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: '__HOME_HEADING__' })).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
});

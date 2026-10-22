import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the maze title screen', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
});

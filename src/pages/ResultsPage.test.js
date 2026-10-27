import { render, screen } from '@testing-library/react';
import ResultsPage from './ResultsPage';
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('../archive/useCatalog', () => () => ({ status: 'error', usable: false, identity: {}, problem: {kind: 'unavailable', message: 'Archive temporarily unavailable'}, refresh: jest.fn() }));
jest.mock('../components/NavBar', () => () => null);

test('renders the exact server millisecond after recovering a saved result', () => {
  localStorage.clear();
  localStorage.setItem('selectedMazeDate', '2025-05-26');
  localStorage.setItem('lastMazeTime', '8.123');
  render(<ResultsPage />);
  expect(screen.getByText(/You finished in/)).toHaveTextContent('00:08.123');
});

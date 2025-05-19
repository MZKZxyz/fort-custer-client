import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SubProfilePage from './pages/SubProfilePage';
import MazePage from './pages/MazePage';
import ResultsPage from './pages/ResultsPage';
import CollectionsPage from './pages/CollectionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MazeCollectionPage from './pages/MazeCollectionPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profiles" element={<SubProfilePage />} />
        <Route path="/maze" element={<MazePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/collection" element={<CollectionsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/mazes" element={<MazeCollectionPage />} />
      </Routes>
    </Router>
  );
}

export default App;


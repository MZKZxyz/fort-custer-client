import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TitlePage from './pages/TitlePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SubProfilePage from './pages/SubProfilePage';
import MazePage from './pages/MazePage';
import ResultsPage from './pages/ResultsPage';
import CollectionsPage from './pages/CollectionPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MazeCollectionPage from './pages/MazeCollectionPage';
import LogoutPage from './pages/LogoutPage';
import PrivateRoute from './components/PrivateRoute';
import NotFoundPage from './pages/NotFoundPage';
import ErrorPage from './pages/ErrorPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/profiles"
          element={
            <PrivateRoute>
              <SubProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/maze"
          element={
            <PrivateRoute>
              <MazePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/results"
          element={
            <PrivateRoute>
              <ResultsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/collection"
          element={
            <PrivateRoute>
              <CollectionsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <PrivateRoute>
              <LeaderboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/mazes"
          element={
            <PrivateRoute>
              <MazeCollectionPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/logout"
          element={
            <PrivateRoute>
              <LogoutPage />
            </PrivateRoute>
          }
        />
        {/* 404 fallback */}
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/error" element={<ErrorPage />} />
      </Routes>
    </Router>
  );
}

export default App;


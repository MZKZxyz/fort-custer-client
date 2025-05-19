import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';

export default function ResultsPage() {
  const [time, setTime] = useState(null);
  const [reward, setReward] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const lastTime = localStorage.getItem('lastMazeTime');
    if (lastTime) setTime(Number(lastTime));

    const rewardData = JSON.parse(localStorage.getItem('lastReward'));
    if (rewardData) setReward(rewardData);
  }, []);

  const formatTime = (seconds) => {
    const ms = seconds * 1000;
    const date = new Date(ms);
    return date.toISOString().substr(14, 9); // mm:ss.SSS
  };

  return (
    <div style={{
      backgroundColor: '#fff66c',
      minHeight: '100vh',
      padding: '2rem 1rem',
      fontFamily: "'Arial Black', sans-serif",
      color: '#000',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Maze Complete!</h2>

      {time !== null && (
        <p style={{ fontSize: '1.25rem' }}>
          You finished in <strong>{formatTime(time)}</strong>
        </p>
      )}

      {reward ? (
        <>
          <h3 style={{ marginTop: '1.5rem' }}>You found:</h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '1rem 0'
          }}>
            <img
              src={`/images/${reward.image}`}
              alt={reward.name}
              style={{ width: '64px', height: '64px', objectFit: 'contain' }}
            />
            <span style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
              {reward.name}
            </span>
          </div>
        </>
      ) : (
        <p style={{ fontSize: '1rem', marginTop: '1.5rem' }}>
          No reward this time — looks like you’ve collected them all!
        </p>
      )}

      <button
        onClick={() => navigate('/maze')}
        style={{
          backgroundColor: '#00aef0',
          color: '#fff',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          padding: '1rem',
          width: '100%',
          border: '2px solid #000',
          marginTop: '2rem',
          boxShadow: '4px 4px 0 #000',
        }}
      >
        Play Again
      </button>

      <NavBar />
    </div>
  );
}

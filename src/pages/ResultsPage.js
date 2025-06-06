import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import '../css/ResultsPage.css';

export default function ResultsPage() {
  const [time, setTime] = useState(null);
  const [reward, setReward] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const navigate = useNavigate();

  // On mount, load lastTime/reward and ensure selectedMazeDate is set
  useEffect(() => {
    const lastTime = localStorage.getItem('lastMazeTime');
    if (lastTime) setTime(Number(lastTime));

    const rewardData = JSON.parse(localStorage.getItem('lastReward'));
    if (rewardData) setReward(rewardData);

    if (localStorage.getItem('lastNewRecord') === 'true') {
      setNewRecord(true);
      localStorage.removeItem('lastNewRecord');
    }

    // If this is first render and no selectedMazeDate exists,
    // seed it to today so Replay still works
    if (!localStorage.getItem('selectedMazeDate')) {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem('selectedMazeDate', todayStr);
    }
  }, []);

  // Helpers
  const formatTime = (seconds) => {
    const ms = seconds * 1000;
    const date = new Date(ms);
    return date.toISOString().substr(14, 9); // mm:ss.SSS
  };

  // What date did we just play?
  const lastPlayedDate = localStorage.getItem('selectedMazeDate');

  // Today in UTC (YYYY-MM-DD)
  const todayUTC = new Date().toISOString().split('T')[0];

  // Compute next-day
  const getNextDate = () => {
    const d = new Date(lastPlayedDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const nextDate = getNextDate();

  // Only playable if nextDate <= todayUTC
  const nextPlayable = nextDate <= todayUTC;

  const showActions = reward ? revealed : true;
  const actionsDisabled = reward && !revealed;

  return (
    <div style={{
      backgroundColor: '#fff66c',
      minHeight: '100vh',
      padding: '2rem 1rem',
      fontFamily: "'Arial Black', sans-serif",
      color: '#000',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        Maze Complete!
      </h2>

      {time !== null && (
        <p style={{ fontSize: '1.25rem' }}>
          You finished in <strong>{formatTime(time)}</strong>
        </p>
      )}
      {newRecord && (
        <p className="new-record" style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>
          🎉 New fastest time! 🎉
        </p>
      )}

      {reward ? (
        <>
          <h3 style={{ marginTop: '1.5rem' }}>
            {revealed ? 'You found:' : 'Tap to open:'}
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '1rem 0'
          }}>
            {revealed ? (
              <>
                <img
                  src={`/images/${reward.image}`}
                  alt={reward.name}
                  className="reveal"
                  style={{ width: 200, height: 200, objectFit: 'contain' }}
                />
              </>
            ) : (
              <img
                src="/images/crate.png"
                alt="crate"
                onClick={() => {
                  if (opening) return;
                  setOpening(true);
                  setTimeout(() => {
                    setRevealed(true);
                    setOpening(false);
                  }, 600);
                }}
                className={`crate${opening ? ' opening' : ''}`}
              />
            )}
          </div>
          {revealed && (
            <div
              style={{
                marginTop: '1rem',
                border: '2px solid black',
                background: '#fff',
                padding: '1rem',
                borderRadius: '8px',
                maxWidth: '400px',
                margin: '1rem auto 0',
                boxShadow: '4px 4px 0 #000',
              }}
            >
              {reward.emoji && (
                <div style={{ fontSize: '2rem' }}>{reward.emoji}</div>
              )}
              <h3 style={{ margin: '0.5rem 0' }}>{reward.name}</h3>
              {reward.description && <p style={{ margin: 0 }}>{reward.description}</p>}
              {(reward.category || reward.rarity) && (
                <p
                  style={{
                    fontSize: '0.9rem',
                    fontStyle: 'italic',
                    marginTop: '0.5rem',
                  }}
                >
                  {reward.category && `Category: ${reward.category}`}
                  {reward.category && reward.rarity ? ', ' : ''}
                  {reward.rarity && `Rarity: ${reward.rarity}`}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: '1rem', marginTop: '1.5rem' }}>
          No reward this time — looks like you’ve collected them all!
        </p>
      )}

      {showActions && (
        <>
          {/* Replay always available */}
          <button
            onClick={() => navigate('/maze')}
            disabled={actionsDisabled}
            style={{
              backgroundColor: actionsDisabled ? '#aaa' : '#00aef0',
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              padding: '1rem',
              width: '100%',
              border: '2px solid #000',
              marginTop: '2rem',
              boxShadow: actionsDisabled ? 'none' : '4px 4px 0 #000',
              cursor: actionsDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            Replay Maze
          </button>

          {/* Next Maze (disabled if tomorrow is not yet unlocked) */}
          <button
            onClick={() => {
              if (!nextPlayable || actionsDisabled) return;
              localStorage.setItem('selectedMazeDate', nextDate);
              navigate('/maze');
            }}
            disabled={!nextPlayable || actionsDisabled}
            style={{
              backgroundColor:
                !nextPlayable || actionsDisabled ? '#aaa' : '#4CAF50',
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              padding: '1rem',
              width: '100%',
              border: '2px solid #000',
              marginTop: '1rem',
              boxShadow:
                !nextPlayable || actionsDisabled ? 'none' : '4px 4px 0 #000',
              cursor:
                !nextPlayable || actionsDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {nextPlayable ? 'Next Maze' : 'Next Unavailable'}
          </button>
        </>
      )}

      <NavBar />
    </div>
  );
}

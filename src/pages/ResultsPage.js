import V2Results from '../session/V2Results';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import '../css/ResultsPage.css';
import useCatalog from '../archive/useCatalog';
import ArchiveNotice from '../archive/ArchiveNotice';
import { catalogFresh } from '../archive/catalog';
import { dateLabel, isDate } from '../archive/dates';
import { accountId, parsed, readIdentity, stored } from '../archive/identity';

function ResultsPage() {
  const [time, setTime] = useState(null);
  const [reward, setReward] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const navigate = useNavigate();
  const heading = useRef(null);

  const [context] = useState(() => parsed('mazeResultContext', sessionStorage));
  const [lastPlayedDate] = useState(() => context?.date || stored('selectedMazeDate'));
  const catalog = useCatalog(isDate(lastPlayedDate) ? lastPlayedDate.slice(0, 7) : null);
  const sameOwner = !context || (context.profileId === catalog.identity.profile?._id
    && (!context.accountId || context.accountId === accountId(catalog.identity.token)));
  const replayAvailable = sameOwner && catalog.usable && catalog.data.items.some(item => item.date === lastPlayedDate);
  const go = date => {
    if (!catalogFresh(catalog) || readIdentity().key !== catalog.identity.key) { catalog.refresh(); return; }
    try { localStorage.setItem('selectedMazeDate', date); navigate('/maze'); } catch { /* archive remains reachable */ }
  };
  // Saved result presentation remains independent of catalog availability.
  useEffect(() => {
    heading.current?.focus();
    const lastTime = localStorage.getItem('lastMazeTime');
    if (lastTime) setTime(Number(lastTime));

    const rewardData = parsed('lastReward');
    if (rewardData) setReward(rewardData);

    if (localStorage.getItem('lastNewRecord') === 'true') {
      setNewRecord(true);
      localStorage.removeItem('lastNewRecord');
    }

  }, []);

  // Helpers
  const formatTime = (seconds) => {
    const ms = Math.round(seconds * 1000); // Preserve the server millisecond despite floating-point rounding.
    const date = new Date(ms);
    return date.toISOString().substr(14, 9); // mm:ss.SSS
  };

  const showActions = reward ? showDetails : true;
  const actionsDisabled = reward && !showDetails;

  return (
    <div className="page-with-nav" style={{
      backgroundColor: '#fff66c',
      minHeight: '100vh',
      padding: '2rem 1rem',
      fontFamily: "'Arial Black', sans-serif",
      color: '#000',
      textAlign: 'center',
    }}>
      <h2 ref={heading} tabIndex={-1} style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        Maze Complete!
      </h2>

      {isDate(lastPlayedDate) && <p>{dateLabel(lastPlayedDate)} (UTC)</p>}
      {time !== null && (
        <p style={{ fontSize: '1.25rem' }}>
          You finished in <strong>{formatTime(time)}</strong>
        </p>
      )}
      {newRecord && (
        <p className="new-record" style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>
          🎉 New personal best time! 🎉
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
              <button type="button" className="reward-crate-button" aria-label="Open reward crate" disabled={opening}
                onClick={() => {
                  if (opening) return;
                  setOpening(true);
                  setShowDetails(false);
                  setTimeout(() => {
                    setRevealed(true);
                    setOpening(false);
                    setTimeout(() => {
                      setShowDetails(true);
                    }, 600);
                  }, 600);
                }}
              >
                <img src="/images/crate.png" alt="" className={`crate${opening ? ' opening' : ''}`} />
              </button>
            )}
          </div>
          {showDetails && (
            <div
              className="fade-in"
              style={{
                marginTop: '1rem',
                border: '2px solid black',
                background: '#fff',
                padding: '1rem',
                borderRadius: '8px',
                maxWidth: '400px',
                margin: '1rem auto 0',
                boxShadow: '4px 4px 0 #000',
                textAlign: 'left',
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
            className="fade-in"
            onClick={() => go(lastPlayedDate)}
            disabled={actionsDisabled || !replayAvailable}
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

          <button className="result-archive-action" onClick={() => navigate('/mazes')}>Browse archive</button>
          <button className="result-archive-action" disabled={!catalog.usable || !catalog.data?.todayMaze.available}
            onClick={() => go(catalog.data.today)}>Today's maze</button>
          <ArchiveNotice catalog={catalog} />
          {!sameOwner && <p>Restore the original profile to replay this result.</p>}

        </>
      )}

      <NavBar />
    </div>
  );
}

export default function ResultsRoute() {
  return new URLSearchParams(window.location.search).get('protocol') === 'session-v2' ? <V2Results /> : <ResultsPage />;
}

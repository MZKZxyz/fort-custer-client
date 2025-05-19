// src/pages/LeaderboardPage.js
import { useEffect, useState } from 'react';
import API from '../utils/api';
import NavBar from '../components/NavBar';

const TIME_FRAMES = ['daily', 'weekly', 'alltime'];
const MEMORIAL_DAY = new Date(Date.UTC(2025, 4, 26));
const LABOR_DAY    = new Date(Date.UTC(2025, 8, 1));

const getClampedToday = () => {
  const today = new Date();
  const utc = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ));
  if (utc < MEMORIAL_DAY) return MEMORIAL_DAY;
  if (utc > LABOR_DAY)  return LABOR_DAY;
  return utc;
};

const getClampedStartOfWeek = (date) => {
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  if (start < MEMORIAL_DAY) return MEMORIAL_DAY;
  if (start > LABOR_DAY)  return new Date(Date.UTC(2025,7,31));
  return start;
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const addDays = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const formatDateLabel = (tf, refDate) => {
  const opts = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  if (tf === 'daily') return refDate.toLocaleDateString('en-US', opts);
  if (tf === 'weekly') {
    const start = getClampedStartOfWeek(refDate);
    const end   = addDays(start, 6);
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  }
  return 'All Time';
};

const getTimeLabel = (tf) => tf === 'daily' ? 'Best Time' : 'Total Time';

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState('daily');
  const [refDate, setRefDate]     = useState(getClampedToday());
  const [scores, setScores]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const activeProfile             = JSON.parse(localStorage.getItem('activeSubProfile'));

  const fetchScores = async () => {
    setLoading(true);
    try {
      let qp = '';
      if (timeframe === 'daily') qp  = `?date=${formatDate(refDate)}`;
      if (timeframe === 'weekly') qp = `?start=${formatDate(refDate)}`;

      const res = await API.get(`/leaderboard/${timeframe}${qp}`);
      setScores(res.data || []);
    } catch {
      setScores([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScores();
  }, [timeframe, refDate]);

  const shiftDate = (d) => {
    const nxt = new Date(refDate);
    if (timeframe === 'daily')  nxt.setUTCDate(nxt.getUTCDate() + d);
    if (timeframe === 'weekly') nxt.setUTCDate(nxt.getUTCDate() + d * 7);
    if (nxt >= MEMORIAL_DAY && nxt <= LABOR_DAY) setRefDate(nxt);
  };

  const showControls = timeframe !== 'alltime';

  const medalFor = (idx) => ['🥇','🥈','🥉'][idx] || '';

  return (
    <div style={{
      backgroundColor: '#ee4444',
      minHeight: '100vh',
      padding: '1rem',
      boxSizing: 'border-box',
    }}>
      <h2 style={{
        textAlign: 'center',
        margin: '0 0 1rem',
        fontSize: '2rem',
        fontFamily: 'Arial Black, sans-serif',
        color: '#fff'
      }}>
        🏅 Leaderboard
      </h2>

      {/* timeframe pills */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
      }}>
        {TIME_FRAMES.map(frame => (
          <button
            key={frame}
            onClick={() => { setTimeframe(frame); setRefDate(getClampedToday()); }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '16px',
              border: timeframe === frame ? '2px solid #000' : '2px solid transparent',
              background: timeframe === frame ? '#fff' : 'rgba(255,255,255,0.7)',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif'
            }}>
            {frame.charAt(0).toUpperCase() + frame.slice(1)}
          </button>
        ))}
      </div>

      {/* date controls */}
      {showControls && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          color: '#fff',
          fontWeight: 'bold',
        }}>
          <button
            onClick={() => shiftDate(-1)}
            disabled={refDate <= MEMORIAL_DAY}
            style={{
              background: '#fff', border: '2px solid #000', borderRadius: '4px',
              padding: '0 0.5rem', cursor: 'pointer', fontWeight: 'bold'
            }}>
            ◀
          </button>
          <span>{formatDateLabel(timeframe, refDate)}</span>
          <button
            onClick={() => shiftDate(1)}
            disabled={refDate >= LABOR_DAY}
            style={{
              background: '#fff', border: '2px solid #000', borderRadius: '4px',
              padding: '0 0.5rem', cursor: 'pointer', fontWeight: 'bold'
            }}>
            ▶
          </button>
        </div>
      )}

      {/* ─── static leaderboard “card” ───────────────────────────────────────────── */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: '#fff',
        border: '4px solid #000',
        borderRadius: '8px',
        boxShadow: '4px 4px 0 #000',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#000', color: '#fff' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Rank</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Player</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>{getTimeLabel(timeframe)}</th>
            </tr>
          </thead>
          <tbody>
            {loading
              // show 5 skeleton rows while loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ background: i % 2 ? '#f9f9f9' : '#fff' }}>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{
                        width: '2rem',
                        height: '1rem',
                        background: '#ddd',
                        borderRadius: '4px',
                      }}/>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{
                        width: '6rem',
                        height: '1rem',
                        background: '#ddd',
                        borderRadius: '4px',
                      }}/>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{
                        width: '3rem',
                        height: '1rem',
                        background: '#ddd',
                        borderRadius: '4px',
                      }}/>
                    </td>
                  </tr>
                ))
              // no scores
              : scores.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{
                      textAlign: 'center',
                      padding: '2rem',
                      fontStyle: 'italic',
                    }}>
                      No scores yet for this {timeframe === 'daily' ? 'day' : 'week'}.
                    </td>
                  </tr>
                )
              // real data
              : scores.map((e, i) => {
                  const isActive = activeProfile?._id === e.subProfileId;
                  const bg = i === 0
                    ? '#ffebc8'   // gold
                    : i === 1
                      ? '#eceff1' // silver
                      : i === 2
                        ? '#f4ecec' // bronze
                        : (i % 2 ? '#f9f9f9' : '#fff');
                  return (
                    <tr key={e.subProfileId} style={{
                      backgroundColor: bg,
                      fontWeight: isActive ? 'bold' : 'normal',
                    }}>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        {medalFor(i) || `#${i+1}`}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{e.name}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        {parseFloat(e.time).toFixed(3)}s
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      <NavBar />
    </div>
  );
}

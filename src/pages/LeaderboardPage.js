import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import NavBar from '../components/NavBar';
import useCatalog from '../archive/useCatalog';
import ArchiveNotice from '../archive/ArchiveNotice';
import { dateLabel, isDate } from '../archive/dates';
import { stored } from '../archive/identity';
import '../css/LeaderboardPage.css';

// These bounds apply only to the unchanged legacy weekly endpoint.
const LEGACY_WEEK_FIRST = '2025-05-26';
const LEGACY_WEEK_LAST = '2025-09-01';
function weekLabel(date) {
  const start = new Date(`${date}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  if (start.toISOString().slice(0, 10) < LEGACY_WEEK_FIRST) start.setTime(Date.parse(`${LEGACY_WEEK_FIRST}T00:00:00Z`));
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  return `${dateLabel(start.toISOString().slice(0, 10))} – ${dateLabel(end.toISOString().slice(0, 10))} (UTC)`;
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('daily');
  const [requested] = useState(() => {
    const date = new URLSearchParams(window.location.search).get('date') || stored('selectedMazeDate');
    return isDate(date) ? date : null;
  });
  const catalog = useCatalog(requested?.slice(0, 7) || null);
  const [week, setWeek] = useState(LEGACY_WEEK_LAST);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ loading: true });
  const date = requested || (catalog.data?.todayMaze.available ? catalog.data.today : null);
  const confirmed = catalog.usable && (catalog.data.items.some(item => item.date === date)
    || (catalog.data.todayMaze.available && date === catalog.data.today));
  const scope = JSON.stringify([timeframe, date, week, catalog.identity.key, confirmed]);
  useEffect(() => {
    if (timeframe === 'daily' && !confirmed) return;
    const controller = new AbortController();
    let active = true;
    setResult({ scope, loading: true });
    const query = timeframe === 'daily' ? `?date=${date}` : timeframe === 'weekly' ? `?start=${week}` : '';
    API.get(`/leaderboard/${timeframe}${query}`, { signal: controller.signal, timeout: 10000,
      headers: { Authorization: catalog.identity.token ? `Bearer ${catalog.identity.token}` : null } })
      .then(response => {
        if (!Array.isArray(response.data) || response.data.some(entry => !entry || typeof entry.name !== 'string'
          || !Number.isFinite(Number(entry.time)) || typeof entry.subProfileId !== 'string')) throw new Error('INVALID_SCORES');
        const scores = [...response.data].sort((a, b) => timeframe === 'daily'
          ? Number(a.time) - Number(b.time) : b.completedMazes - a.completedMazes || Number(a.time) - Number(b.time));
        if (active) setResult({ scope, scores, loading: false });
      }).catch(error => {
        if (active) setResult({ scope, loading: false, error: error.response?.status === 404
          ? 'No published maze is available for this date.' : 'Leaderboard could not be loaded. Please retry.' });
      });
    return () => { active = false; controller.abort(); };
  }, [scope, timeframe, date, week, confirmed, catalog.identity.token, revision]);
  const current = result.scope === scope ? result : { loading: true };
  const shiftWeek = delta => {
    const next = new Date(`${week}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + delta * 7);
    const key = next.toISOString().slice(0, 10);
    if (key >= LEGACY_WEEK_FIRST && key <= LEGACY_WEEK_LAST) setWeek(key);
  };
  return <main className="page-with-nav legacy-leaderboard">
    <h1>Leaderboard</h1>
    <p>Legacy saved results — these are not official validated rankings.</p>
    <div className="leaderboard-views" aria-label="Leaderboard timeframe">
      {['daily', 'weekly', 'alltime'].map(frame => <button key={frame} aria-pressed={timeframe === frame}
        onClick={() => setTimeframe(frame)}>{frame === 'alltime' ? 'Alltime' : frame === 'daily' ? 'Daily' : 'Weekly'}</button>)}
    </div>
    {timeframe === 'daily' && <>
      <h2>{isDate(date) ? `${dateLabel(date)} (UTC)` : 'Choose a published date'}</h2>
      <button onClick={() => navigate('/mazes')}>Choose a date in the archive</button>
      <ArchiveNotice catalog={catalog} />
      {catalog.status === 'ready' && !confirmed && <p role="status">No published maze is available for this selection.</p>}
    </>}
    {timeframe === 'weekly' && <>
      <h2>Legacy weekly — Summer 2025</h2><p>{weekLabel(week)}</p>
      <div className="leaderboard-views"><button aria-label="Previous legacy week" disabled={week <= LEGACY_WEEK_FIRST} onClick={() => shiftWeek(-1)}>◀</button>
        <button aria-label="Next legacy week" disabled={week >= LEGACY_WEEK_LAST} onClick={() => shiftWeek(1)}>▶</button></div>
    </>}
    {timeframe === 'alltime' && <h2>All-time legacy saved results</h2>}
    {(timeframe !== 'daily' || confirmed) && <>
      {current.loading ? <p role="status">Loading saved results…</p> : current.error ? <div role="alert"><p>{current.error}</p>
        <button onClick={() => setRevision(value => value + 1)}>Retry leaderboard</button></div>
        : current.scores.length === 0 ? <p role="status">No legacy saved results yet.</p>
          : <div className="leaderboard-table"><table><caption>{timeframe === 'daily' ? `${dateLabel(date)} (UTC)` : 'Legacy aggregate results'}</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Player</th>{timeframe !== 'daily' && <th scope="col">Mazes</th>}
              <th scope="col">{timeframe === 'daily' ? 'Saved time' : 'Total time'}</th></tr></thead>
            <tbody>{current.scores.map((entry, index) => <tr key={entry.subProfileId} className={entry.subProfileId === catalog.identity.profile?._id ? 'active-player' : ''}>
              <td>{index + 1}</td><td>{entry.name}</td>{timeframe !== 'daily' && <td>{entry.completedMazes}</td>}
              <td>{Number(entry.time).toFixed(3)}s</td></tr>)}</tbody>
          </table></div>}
    </>}
    <NavBar />
  </main>;
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import NavBar from '../components/NavBar';
import useCatalog from '../archive/useCatalog';
import ArchiveNotice from '../archive/ArchiveNotice';
import { dateLabel, isDate } from '../archive/dates';
import { stored } from '../archive/identity';
import { freshRankingCatalog, shiftWeek, utcWeek, weekLabel } from '../archive/rankings';
import '../css/LeaderboardPage.css';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('daily');
  const [requested] = useState(() => {
    const date = new URLSearchParams(window.location.search).get('date') || stored('selectedMazeDate');
    return isDate(date) ? date : null;
  });
  const catalog = useCatalog(requested?.slice(0, 7) || null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ loading: true });
  const capable = freshRankingCatalog(catalog);
  // Device time and a stored daily selection never choose the current week.
  const latestWeek = utcWeek(catalog.data?.today);
  const firstWeek = utcWeek(catalog.data?.firstPublishedDate);
  const week = selectedWeek && firstWeek && latestWeek
    && selectedWeek >= firstWeek.start && selectedWeek <= latestWeek.start
    ? utcWeek(selectedWeek) : latestWeek;
  const date = requested || (catalog.data?.todayMaze.available ? catalog.data.today : null);
  const confirmed = capable && (catalog.data.items.some(item => item.date === date)
    || (catalog.data.todayMaze.available && date === catalog.data.today));
  const allowed = capable && (timeframe === 'daily' ? confirmed : timeframe !== 'weekly' || Boolean(week));
  // Revalidation and identity changes invalidate pending/cached score responses.
  const weekStart = week?.start;
  const scope = JSON.stringify([timeframe, date, weekStart, catalog.identity.key, catalog.startedAt, allowed]);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    let active = true;
    setResult({ scope, loading: true });
    const query = timeframe === 'daily' ? `?date=${date}` : timeframe === 'weekly' ? `?start=${weekStart}` : '';
    API.get(`/leaderboard/${timeframe}${query}`, { signal: controller.signal, timeout: 10000,
      headers: { Authorization: catalog.identity.token ? `Bearer ${catalog.identity.token}` : null } })
      .then(response => {
        if (!Array.isArray(response.data) || response.data.some(entry => !entry || typeof entry.name !== 'string'
          || !/^\d{1,12}(?:\.\d{1,9})?$/.test(String(entry.time)) || Number(entry.time) <= 0
          || typeof entry.subProfileId !== 'string' || !entry.subProfileId
          || !Number.isInteger(entry.completedMazes) || entry.completedMazes < 1)) throw new Error('INVALID_SCORES');
        const scores = [...response.data].sort((a, b) => timeframe === 'daily'
          ? Number(a.time) - Number(b.time) : b.completedMazes - a.completedMazes || Number(a.time) - Number(b.time));
        if (active) setResult({ scope, scores, loading: false });
      }).catch(error => {
        if (active) setResult({ scope, loading: false, error: timeframe === 'daily' && error.response?.status === 404
          ? 'No published maze is available for this date.' : 'Leaderboard could not be loaded. Please retry.' });
      });
    return () => { active = false; controller.abort(); };
  }, [scope, timeframe, date, weekStart, allowed, catalog.identity.token, revision]);
  const current = result.scope === scope ? result : { loading: true };
  const moveWeek = delta => {
    const next = shiftWeek(weekStart, delta);
    if (capable && next && firstWeek && latestWeek && next >= firstWeek.start && next <= latestWeek.start) setSelectedWeek(next);
  };
  const caption = timeframe === 'daily' ? `${dateLabel(date)} (UTC)`
    : timeframe === 'weekly' ? weekLabel(week) : 'All-time fresh archive saved times';
  return <main className="page-with-nav archive-leaderboard">
    <h1>Leaderboard</h1>
    <p>Fresh archive saved times — not official verified competitive rankings. Historical test results are excluded.</p>
    <div className="leaderboard-views" role="group" aria-label="Leaderboard timeframe">
      {['daily', 'weekly', 'alltime'].map(frame => <button key={frame} aria-pressed={timeframe === frame}
        onClick={() => setTimeframe(frame)}>{frame === 'alltime' ? 'All-time' : frame === 'daily' ? 'Daily' : 'Weekly'}</button>)}
    </div>
    <ArchiveNotice catalog={catalog} />
    {catalog.status === 'ready' && !capable && <div role="alert"><p>Fresh rankings temporarily unavailable. Published dates could not be verified.</p>
      <button onClick={catalog.refresh}>Retry</button></div>}
    {timeframe === 'daily' && <>
      <h2>{confirmed ? `${dateLabel(date)} (UTC)` : 'Choose a published date'}</h2>
      <button onClick={() => navigate('/mazes')}>Choose a date in the archive</button>
      {capable && !confirmed && <p role="status">No published maze is available for this selection.</p>}
    </>}
    {timeframe === 'weekly' && <>
      <h2>Weekly fresh archive</h2>
      {capable && (week ? <><p>{weekLabel(week)}</p><p>Sunday through Saturday, UTC. Only published mazes count.</p></>
        : <p role="status">This UTC week is outside the supported date range.</p>)}
      <div className="leaderboard-views" role="group" aria-label="UTC week navigation">
        <button aria-label="Previous UTC week" disabled={!capable || !week || !firstWeek || week.start <= firstWeek.start} onClick={() => moveWeek(-1)}>◀</button>
        <button disabled={!capable || !week || week.start === latestWeek?.start} onClick={() => setSelectedWeek(null)}>Current UTC week</button>
        <button aria-label="Next UTC week" disabled={!capable || !week || week.start >= latestWeek?.start} onClick={() => moveWeek(1)}>▶</button>
      </div>
    </>}
    {timeframe === 'alltime' && <h2>All-time fresh archive</h2>}
    {allowed && <>
      {current.loading ? <p role="status">Loading saved times…</p> : current.error ? <div role="alert"><p>{current.error}</p>
        <button onClick={() => setRevision(value => value + 1)}>Retry leaderboard</button></div>
        : current.scores.length === 0 ? <p role="status">No fresh archive saved times yet.</p>
          : <section className="leaderboard-scores" aria-label="Saved times">
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Retain VoiceOver list semantics with list-style:none. */}
            <ol className="leaderboard-list" role="list" aria-label={caption}>
              {current.scores.map((entry, index) => <li key={entry.subProfileId} className={entry.subProfileId === catalog.identity.profile?._id ? 'active-player' : ''}>
                <p><strong>{index + 1}. {entry.name}</strong></p>
                {timeframe !== 'daily' && <p>{entry.completedMazes} published {entry.completedMazes === 1 ? 'maze' : 'mazes'}</p>}
                <p>{timeframe === 'daily' ? 'Saved time' : 'Total saved time'}: {Number(entry.time).toFixed(3)}s</p>
              </li>)}
            </ol>
            <div className="leaderboard-table"><table><caption>{caption}</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Player</th>{timeframe !== 'daily' && <th scope="col">Mazes</th>}
              <th scope="col">{timeframe === 'daily' ? 'Saved time' : 'Total saved time'}</th></tr></thead>
            <tbody>{current.scores.map((entry, index) => <tr key={entry.subProfileId} className={entry.subProfileId === catalog.identity.profile?._id ? 'active-player' : ''}>
              <td>{index + 1}</td><td>{entry.name}</td>{timeframe !== 'daily' && <td>{entry.completedMazes}</td>}
              <td>{Number(entry.time).toFixed(3)}s</td></tr>)}</tbody>
          </table></div></section>}
    </>}
    <NavBar />
  </main>;
}

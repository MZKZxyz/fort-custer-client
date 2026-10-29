import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import useCatalog from '../archive/useCatalog';
import ArchiveNotice from '../archive/ArchiveNotice';
import { catalogFresh } from '../archive/catalog';
import { dateLabel, isDate, isMonth, monthDates, monthLabel, shiftMonth } from '../archive/dates';
import { parsed, pendingCompletion, pendingCompletions, readIdentity } from '../archive/identity';
import '../css/MazeCalendar.css';

const completion = (item, usable) => !usable || typeof item?.progress?.completed !== 'boolean'
  ? 'Completion status unknown' : item.progress.completed ? 'Completed' : 'Not completed';
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function MonthJump({ month, first, today, onJump }) {
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const [part, setPart] = useState(month.slice(5));
  const [error, setError] = useState('');
  useEffect(() => { setYear(Number(month.slice(0, 4))); setPart(month.slice(5)); }, [month]);
  return <form className="archive-jump" onSubmit={event => {
    event.preventDefault();
    const target = `${String(year).padStart(4, '0')}-${part}`;
    if (isMonth(target) && target >= (first?.slice(0, 7) || '0001-01') && target <= today.slice(0, 7)) {
      setError(''); onJump(target);
    } else setError('Choose a month between the first publication and today.');
  }}>
    <label>Month<select value={part} onChange={event => setPart(event.target.value)}>
      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(value =>
        <option key={value} value={value}>{monthLabel(`2000-${value}`).split(' ')[0]}</option>)}
    </select></label>
    <label>Year<input type="number" required min={first ? Number(first.slice(0, 4)) : 1}
      max={Number(today.slice(0, 4))} value={year} onChange={event => setYear(event.target.value)} /></label>
    <button type="submit">Go to month</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}

function LatestAction({ date, onPlay }) {
  const catalog = useCatalog(date.slice(0, 7));
  const item = catalog.data?.items.find(entry => entry.date === date);
  return <div>
    <p>Latest published: {dateLabel(date)} (UTC)</p>
    <ArchiveNotice catalog={catalog} />
    <button disabled={!catalog.usable || !item || !catalog.identity.profile || !catalog.identity.token}
      onClick={() => onPlay(date, catalog)}>Play latest published maze</button>
  </div>;
}

function RecoveryLinks({ identity, navigate }) {
  const dates = pendingCompletions(identity);
  if (!identity.token || !identity.profile || !dates.length) return null;
  return <section className="archive-card" aria-label="Unconfirmed results"><h2>Unconfirmed results</h2>
    <p>Recover the original saved result before starting a replacement run.</p>
    {dates.sort().map(date => <button key={date} onClick={() => {
      try { localStorage.setItem('selectedMazeDate', date); navigate('/maze'); } catch { /* storage must be restored */ }
    }}>Recover result for {dateLabel(date)} (UTC)</button>)}
  </section>;
}

export default function MazeCollectionPage() {
  const navigate = useNavigate();
  const [restore] = useState(() => parsed('mazeArchiveView', sessionStorage));
  const [month, setMonth] = useState(() => isMonth(restore?.month) ? restore.month : null);
  const [selected, setSelected] = useState(() => isDate(restore?.date) ? restore.date : null);
  const [view, setView] = useState('list');
  const [wide, setWide] = useState(false);
  const [actionError, setActionError] = useState('');
  const catalog = useCatalog(month);
  const { data, identity, usable } = catalog;
  useEffect(() => {
    const query = window.matchMedia?.('(min-width: 36rem)');
    if (!query) return;
    const sync = () => setWide(query.matches);
    sync(); query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!data || !usable) return;
    if (month && (month > data.today.slice(0, 7)
      || (data.firstPublishedDate && month < data.firstPublishedDate.slice(0, 7)))) {
      setMonth(null); setSelected(null);
    }
  }, [data, month, usable]);
  const jump = target => { setMonth(target); setSelected(null); setActionError(''); };
  const select = date => {
    // Pin a deliberate selection's month; the default server month can change at midnight.
    setMonth(data.month);
    setSelected(date);
    try { sessionStorage.setItem('mazeArchiveView', JSON.stringify({ month: data.month, date })); } catch { /* optional view */ }
  };
  const launch = (date, source = catalog) => {
    if (!catalogFresh(source) || readIdentity().key !== source.identity.key) {
      source.refresh(); setActionError('Refresh published dates before playing.'); return;
    }
    const item = source.data.items.find(entry => entry.date === date)
      || (source.data.todayMaze.available && source.data.todayMaze.date === date ? source.data.todayMaze : null);
    if (!item || !source.identity.profile || !source.identity.token) return;
    if (pendingCompletions(source.identity).some(pending => pending !== date)) {
      setActionError('Recover the original result before starting another maze.'); return;
    }
    try {
      localStorage.setItem('selectedMazeDate', date);
      sessionStorage.setItem('mazeArchiveView', JSON.stringify({ month: date.slice(0, 7), date }));
      navigate('/maze');
    } catch { setActionError('Date selection could not be saved. Restore browser storage and retry.'); }
  };
  const selectedItem = data?.items.find(item => item.date === selected);
  const recoveryDate = selected || data?.today;
  const recovering = recoveryDate && identity.profile && pendingCompletion(identity.profile._id, recoveryDate);
  const label = item => `${dateLabel(item.date)} (UTC), Published, ${completion(item, usable)}${item.date === selected ? ', Selected' : ''}`;
  const dateButton = item => <button type="button" aria-label={label(item)}
    aria-current={item.date === data.today ? 'date' : undefined} aria-pressed={selected === item.date}
    disabled={!usable} onClick={() => select(item.date)}>
    {view === 'calendar' && wide ? Number(item.date.slice(8)) : dateLabel(item.date)}
    <span className="date-status">{item.date === data.today && 'Today · '}{completion(item, usable)}</span>
  </button>;
  const calendarDays = data ? monthDates(data.month) : [];
  const offset = calendarDays.length ? new Date(`${calendarDays[0]}T00:00:00Z`).getUTCDay() : 0;
  const cells = Array.from({ length: Math.ceil((offset + calendarDays.length) / 7) * 7 }, (_, i) => calendarDays[i - offset] || null);
  return <main className="maze-calendar full-height">
    <h1 className="calendar-title">Daily Maze Archive</h1>
    <p>{identity.profile ? `Playing as ${identity.profile.name || 'selected profile'}` : 'Select a profile to play.'}
      {' '}<button onClick={() => navigate('/profiles')}>Change profile</button></p>
    <RecoveryLinks identity={identity} navigate={navigate} />
    <section className="archive-card" aria-labelledby="today-heading">
      <h2 id="today-heading">Today's maze</h2>
      {data && <>
        <p>{dateLabel(data.today)} (UTC)</p>
        <p>{data.todayMaze.available ? completion(data.todayMaze, usable) : "Today's maze is not published yet."}</p>
        <button className="play-button" disabled={!usable || !data.todayMaze.available || !identity.profile || !identity.token}
          onClick={() => launch(data.today)}>{data.todayMaze.progress?.completed ? "Replay today's maze" : "Play today's maze"}</button>
        {!data.todayMaze.available && data.lastPublishedDate && <LatestAction date={data.lastPublishedDate} onPlay={launch} />}
        <p className="archive-boundary">Dates follow UTC. {(() => {
          try { return `The daily date changes at ${new Date(data.nextDayAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', month: 'short', day: 'numeric' })} your time.`; }
          catch { return 'The daily date changes at midnight UTC.'; }
        })()} Publication may be delayed.</p>
      </>}
      <ArchiveNotice catalog={catalog} />
      {data && catalog.status !== 'ready' && <p>Previously loaded dates are stale. Refresh before playing.</p>}
    </section>
    <section className="archive-card" aria-labelledby="browse-heading">
      <h2 id="browse-heading">Browse archive</h2>
      {data && <>
        <div className="month-selector">
          <button aria-label="Previous month" disabled={!data.firstPublishedDate || data.month <= data.firstPublishedDate.slice(0, 7)}
            onClick={() => jump(shiftMonth(data.month, -1))}>◀</button>
          <h3 aria-live="polite">{monthLabel(data.month)}</h3>
          <button aria-label="Next month" disabled={data.month >= data.today.slice(0, 7)}
            onClick={() => jump(shiftMonth(data.month, 1))}>▶</button>
        </div>
        <MonthJump month={data.month} first={data.firstPublishedDate} today={data.today} onJump={jump} />
        <button onClick={() => { setMonth(null); setSelected(data.todayMaze.available ? data.today : null); catalog.refresh(); }}>Return to today</button>
        {wide && <div className="archive-view" aria-label="Archive view">
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
          <button aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</button>
        </div>}
        <p>All dates are UTC. Completed means a saved result is recorded. Unavailable dates cannot be played.</p>
        {data.items.length === 0 && <p>No published mazes this month.</p>}
        {view === 'calendar' && wide ? <table className="archive-grid"><caption>{monthLabel(data.month)} — UTC publication dates</caption>
          <thead><tr>{weekdays.map(day => <th key={day} scope="col" aria-label={day}><abbr title={day}>{day.slice(0, 2)}</abbr></th>)}</tr></thead>
          <tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>
            {cells.slice(row * 7, row * 7 + 7).map((date, col) => {
              const item = data.items.find(entry => entry.date === date);
              return <td key={date || col}>{item ? dateButton(item) : date && <span aria-label={`${dateLabel(date)} (UTC), ${date > data.today ? 'Not yet available' : 'Unavailable'}`}>
                {Number(date.slice(8))}<span className="date-status">Unavailable</span></span>}</td>;
            })}</tr>)}</tbody></table>
          : <ul className="archive-list">{data.items.map(item => <li key={item.date}>{dateButton(item)}</li>)}</ul>}
        <div className="archive-selection" aria-live="polite">
          {selectedItem ? <><h3>{dateLabel(selected)} (UTC)</h3><p>Published · {completion(selectedItem, usable)}</p>
            <button disabled={!usable || !identity.profile || !identity.token} onClick={() => launch(selected)}>
              {recovering ? 'Recover saved result' : selectedItem.progress?.completed ? 'Replay' : 'Play'} {dateLabel(selected)}</button>
            <button disabled={!usable} onClick={() => navigate(`/leaderboard?date=${selected}`)}>View this date's leaderboard</button></>
            : <p>Select a published date to play or view its leaderboard.</p>}
        </div>
      </>}
      {actionError && <p role="alert">{actionError}</p>}
    </section>
    <NavBar />
  </main>;
}

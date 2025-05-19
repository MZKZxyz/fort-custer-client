import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import NavBar from '../components/NavBar';
import '../css/MazeCalendar.css'; // Add CSS below to this file

const DEBUG_UNLOCK_ALL = true;

const formatDate = (date) => date.toISOString().slice(0, 10);

export default function MazeCollectionPage() {
  const navigate = useNavigate();
  const [completedMap, setCompletedMap] = useState({});
  const [todayStr, setTodayStr] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date(Date.UTC(2025, 4, 1))); // May 2025
  const [selectedDate, setSelectedDate] = useState(null);

  const profile = useMemo(() => {
    return JSON.parse(localStorage.getItem('activeSubProfile'));
  }, []);

  useEffect(() => {
    if (!profile) {
      navigate('/profiles');
      return;
    }

    const fetchProgress = async () => {
      try {
        const res = await API.get(`/users/subprofile/${profile._id}`);
        setCompletedMap(res.data.subProfile.progress || {});
        setTodayStr(res.data.today);
      } catch (err) {
        console.error('Failed to load progress:', err);
      }
    };

    fetchProgress();
  }, [profile, navigate]);

  useEffect(() => {
    if (!todayStr || !currentMonth || selectedDate) return;
  
    const MEMORIAL_DAY = new Date(Date.UTC(2025, 4, 26)); // May 26
    const LABOR_DAY = new Date(Date.UTC(2025, 8, 1));     // Sept 1
  
    const year = currentMonth.getUTCFullYear();
    const month = currentMonth.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  
    // Clamp todayStr within valid range
    const rawToday = new Date(todayStr);
    const clampedToday =
      rawToday < MEMORIAL_DAY ? MEMORIAL_DAY :
      rawToday > LABOR_DAY ? LABOR_DAY :
      rawToday;
  
    let closestDate = null;
    let minDiff = Infinity;
  
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month, d));
      const dateStr = formatDate(date);
  
      const isFuture = todayStr ? dateStr > todayStr : false;
      const isLocked = !DEBUG_UNLOCK_ALL && isFuture;
  
      if (isLocked) continue;
  
      const diff = Math.abs(clampedToday - date);
      if (diff < minDiff) {
        minDiff = diff;
        closestDate = date;
      }
    }
  
    if (closestDate) setSelectedDate(closestDate);
  }, [currentMonth, todayStr, selectedDate]);
  
  

  const getDaysInMonth = (year, month) =>
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const buildCalendarGrid = () => {
    const year = currentMonth.getUTCFullYear();
    const month = currentMonth.getUTCMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = new Date(Date.UTC(year, month, 1)).getUTCDay();

    const grid = [];
    let dayCounter = 1 - startDay;

    for (let row = 0; row < 6; row++) {
      const week = [];
      for (let col = 0; col < 7; col++) {
        const date = new Date(Date.UTC(year, month, dayCounter));
        week.push({
          date,
          dateStr: formatDate(date),
          inMonth: dayCounter > 0 && dayCounter <= daysInMonth,
        });
        dayCounter++;
      }
      grid.push(week);
    }

    return grid;
  };

  const handleSelectDate = (date) => {
    const dateStr = formatDate(date);
    const isFuture = todayStr ? dateStr > todayStr : false;
    if (DEBUG_UNLOCK_ALL || !isFuture) {
      setSelectedDate(date);
    }
  };

  const handlePlay = () => {
    const dateStr = formatDate(selectedDate);
    localStorage.setItem('selectedMazeDate', dateStr);
    navigate('/maze');
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + delta, 1));
    const minMonth = new Date(Date.UTC(2025, 4, 1)); // May 2025
    const maxMonth = new Date(Date.UTC(2025, 8, 1)); // Sept 2025
  
    if (newMonth < minMonth || newMonth > maxMonth) return;
    setCurrentMonth(newMonth);
    setSelectedDate(null); // Reset selection when switching months
  };
  
  const grid = buildCalendarGrid();

  const minMonth = new Date(Date.UTC(2025, 4, 1)); // May
  const maxMonth = new Date(Date.UTC(2025, 8, 1)); // Sept
  const isAtMinMonth = currentMonth.getUTCFullYear() === minMonth.getUTCFullYear() && currentMonth.getUTCMonth() === minMonth.getUTCMonth();
  const isAtMaxMonth = currentMonth.getUTCFullYear() === maxMonth.getUTCFullYear() && currentMonth.getUTCMonth() === maxMonth.getUTCMonth();

  return (
    <div className="maze-calendar full-height">
      <h2 className="calendar-title">Daily Maze Archive</h2>

      <div className="month-selector">
        <button onClick={() => changeMonth(-1)} disabled={isAtMinMonth} className="month-arrow">
          ◀
        </button>
        <span className="month-label">
          {currentMonth.toLocaleString('en-US', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </span>
        <button onClick={() => changeMonth(1)} disabled={isAtMaxMonth} className="month-arrow">
          ▶
        </button>
      </div>

      <div className="calendar-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="calendar-cell header">{d}</div>
        ))}
        {grid.flat().map(({ date, dateStr, inMonth }) => {
          const isDone = !!completedMap[dateStr]?.completed;
          const isFuture = todayStr ? dateStr > todayStr : false;
          const isSelected = selectedDate && formatDate(selectedDate) === dateStr;
          const isLocked = !DEBUG_UNLOCK_ALL && isFuture;

          const MEMORIAL_DAY = new Date(Date.UTC(2025, 4, 26)); // May 26
          const LABOR_DAY = new Date(Date.UTC(2025, 8, 1));     // Sept 1
          const isOutOfBounds = date < MEMORIAL_DAY || date > LABOR_DAY;

          let className = 'calendar-cell';
          if (!inMonth) className += ' inactive';
          else if (isOutOfBounds) className += ' out-of-bounds';
          else if (isLocked) className += ' locked';
          else if (isSelected) className += ' selected';
          else if (isDone) className += ' complete';

          return (
            <div
              key={dateStr}
              className={className}
              onClick={() =>
                inMonth && !isLocked && !isOutOfBounds && handleSelectDate(date)
              }
            >
              <span className="date-number">{date.getUTCDate()}</span>
              {isDone && <span className="checkmark">✔</span>}
            </div>
          );
        })}

      </div>

      <button className="play-button" onClick={handlePlay} disabled={!selectedDate}>
        {selectedDate
          ? `Play ${selectedDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}`
          : 'Loading...'}
      </button>


      <NavBar />
    </div>
  );
}

import { useRef, useMemo, useEffect, useState, useCallback  } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { move, findStart, formatElapsed } from '../game/movement';
import '../css/MazePage.css'; // Add CSS below to this file
const PUBLIC = process.env.PUBLIC_URL;

const MazePage = () => {
  const navigate = useNavigate();
  const profile = useMemo(() => {
    return JSON.parse(localStorage.getItem('activeSubProfile'));
  }, []);
  const selectedDate = useMemo(() => new Date(
    localStorage.getItem('selectedMazeDate') || new Date().toISOString()
  ).toISOString().slice(0, 10), []);

  // --- your existing state ---
  const [mazeData, setMazeData]     = useState(null);
  const [mazeGrid, setMazeGrid]     = useState([]);
  const [playerPos, setPlayerPos]   = useState([0, 0]);
  const [inventory, setInventory]   = useState([]);
  const gameRef = useRef(null);
  const startRequestRef = useRef(null);
  const completionPendingRef = useRef(false);
  const [completionError, setCompletionError] = useState(null);

  // hint when bumping into fire without extinguisher
  const [showFireHint, setShowFireHint] = useState(false);
  const hintTimeoutRef = useRef(null);

  // --- quit modal & finished flag ---
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [finished, setFinished]           = useState(false);

  // pick one teepee image for the goal when the component mounts
  const teepeeImages = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) =>
        `${PUBLIC}/images/teepee_${String(i + 1).padStart(2, '0')}.png`
      ),
    []
  );
  const goalImg = useMemo(
    () => teepeeImages[Math.floor(Math.random() * teepeeImages.length)],
    [teepeeImages]
  );

  const VISION_RADIUS = 1; // can be 1 or 2

  // radius of the visible circle as percentage of grid size
  const baseRadius = useMemo(() => {
    if (!mazeGrid.length) return 0;
    const size = Math.max(mazeGrid.length, mazeGrid[0].length);
    return ((VISION_RADIUS + 0.5) / size) * 100;
  }, [mazeGrid]);

  const [fogRadius, setFogRadius] = useState(baseRadius);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setFogRadius(baseRadius);
  }, [baseRadius]);

  // clean up hint timeout on unmount
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  const isVisible = (row, col) => {
    const [pr, pc] = playerPos;
    return (
      Math.abs(pr - row) <= VISION_RADIUS &&
      Math.abs(pc - col) <= VISION_RADIUS
    );
  };

  // Monotonic elapsed time starts only once the maze is ready, not at mount.
  const [startTime, setStartTime] = useState(null);
  const [displayTime, setDisplayTime] = useState('0:00.000');

  useEffect(() => {
    if (startTime === null || finished) return;
    let rafId;
    const update = () => {
      setDisplayTime(formatElapsed(performance.now() - startTime));
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [startTime, finished]);

  // --- fetch maze on mount ---
  useEffect(() => {
    if (!profile) {
      navigate('/profiles');
      return;
    }
    let active = true;
    const fetchMaze = async () => {
      try {
        // Reuse the request during StrictMode effect replay to avoid two attempts.
        if (!startRequestRef.current) {
          startRequestRef.current = API.post('/maze/start', {
            subProfileId: profile._id, date: selectedDate,
          });
        }
        const res = await startRequestRef.current;
        if (!active) return;
        const { maze, seed } = res.data;
        setMazeData({ seed });
        setMazeGrid(maze.grid);
        const position = findStart(maze.grid);
        gameRef.current = { grid: maze.grid, position, inventory: [], completed: false };
        setPlayerPos(position);
        setStartTime(performance.now());
        localStorage.setItem('mazeStartTime', Date.now().toString());
      } catch (err) {
        if (!active) return;
        console.error('Failed to start maze:', err);
        alert(err.response?.data?.error || 'Could not load maze.');
      }
    };
    fetchMaze();
    return () => { active = false; };
  }, [profile, selectedDate, navigate]);

  const handleFinish = useCallback(async () => {
    if (completionPendingRef.current) return;
    completionPendingRef.current = true;
    setCompletionError(null);
    setFinished(true);
    if (startTime !== null && !finished) {
      setDisplayTime(formatElapsed(performance.now() - startTime));
    }
    try {
      const res = await API.post('/maze/complete', {
        subProfileId: profile._id,
        date: selectedDate,
      });
      const { time, reward } = res.data;
      localStorage.setItem('lastMazeTime', time);
      if (reward) {
        localStorage.setItem('lastReward', JSON.stringify(reward));
      } else {
        localStorage.removeItem('lastReward');
      }

      const key = selectedDate;
      let bestTimes;
      try { bestTimes = JSON.parse(localStorage.getItem('bestTimes') || '{}'); }
      catch { bestTimes = {}; }
      if (!bestTimes || typeof bestTimes !== 'object' || Array.isArray(bestTimes)) bestTimes = {};
      const prevBest = bestTimes[key] === undefined ? undefined : Number(bestTimes[key]);
      let isNewRecord = false;

      if (prevBest === undefined || Number(time) < prevBest) {
        if (prevBest !== undefined && Number(time) < prevBest) {
          isNewRecord = true;
        }
        bestTimes[key] = time;
        localStorage.setItem('bestTimes', JSON.stringify(bestTimes));
      }

      if (isNewRecord) {
        localStorage.setItem('lastNewRecord', 'true');
      } else {
        localStorage.removeItem('lastNewRecord');
      }

      localStorage.removeItem('mazeStartTime');
      setClosing(true);
    } catch (err) {
      console.error('Maze completion failed:', err);
      setCompletionError(err.response?.data?.error || 'Could not save your result. Check your connection and retry.');
    } finally {
      completionPendingRef.current = false;
    }
  }, [profile?._id, selectedDate, startTime, finished]);

  // play fog closing animation then navigate to results
  useEffect(() => {
    if (!closing) return;
    const duration = 3000;
    const start = performance.now();
    const startRadius = baseRadius;
    let raf;
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setFogRadius(startRadius * (1 - progress));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        navigate('/results');
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [closing, baseRadius, navigate]);

  const movePlayer = useCallback((direction) => {
    if (showQuitModal || finished || !gameRef.current) return;
    const result = move(gameRef.current, direction);
    if (result.blockedByFire) {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      setShowFireHint(true);
      hintTimeoutRef.current = setTimeout(() => {
        setShowFireHint(false);
        hintTimeoutRef.current = null;
      }, 2000);
    }
    if (result.state === gameRef.current) return;
    // Update synchronously so multiple input events cannot reuse stale state.
    gameRef.current = result.state;
    setMazeGrid(result.state.grid);
    setInventory(result.state.inventory);
    setPlayerPos(result.state.position);
    if (result.state.completed) handleFinish();
  }, [showQuitModal, finished, handleFinish]);

  useEffect(() => {
    const directions = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const handleKey = (event) => {
      const direction = directions[event.key];
      if (!direction || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      movePlayer(direction);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer]);

  const renderCell = (cell, row, col) => {
    const isPlayer = playerPos[0] === row && playerPos[1] === col;
    const visible  = isVisible(row, col);
    const bg       = cell === '#' ? `url(textures/wall.png)` : `url(textures/floor.png)`;
    return (
      <div
        key={`${row}-${col}`}
        className="maze-cell"
        style={{
          backgroundImage: bg,
          backgroundSize: 'cover',
          backgroundRepeat: 'repeat',
          opacity: 1,
        }}
      >
        {visible && (
          isPlayer ? (
            <>
              🧍‍♂️
              {showFireHint && (
                <div className="thought-bubble">
                  <span className="bubble-icon">🧯</span>
                </div>
              )}
            </>
          ) :
          cell     === 'X' ? '🧯' :
          cell     === 'F' ? '🔥' :
          cell     === 'E' ? (
            <img
              src={goalImg}
              alt="Goal"
              style={{ width: '90%', height: '90%', objectFit: 'contain' }}
            />
          ) :
          null
        )}
      </div>
    );
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

  if (!mazeData) {
    return (
      <div
        style={{
          backgroundColor: '#542700',   // pick any solid color you like
          color: '#B97927',             // text color
          position: 'fixed',
          fontSize: '3rem',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: 0,
          padding: 0,
          zIndex: 9999,              // make sure it sits on top
        }}
      >
        <p style={{ margin: 0, fontSize: '1.5rem' }}>
          Loading maze…
        </p>
      </div>
    );
  }
  

  return (
    <div className="maze-page" style={{
      backgroundImage: "url('/assets/fortBG.png')"
    }}>
      {/* BACK / QUIT button */}
      <button
        className="back-btn"
        onClick={() => setShowQuitModal(true)}
      >
        <img src="/icons/arrowBack.png" alt="Back" />
      </button>
      <div className="maze-banner" style={{
        backgroundImage: "url('/assets/mazeBanner.png')"
      }}/>

      <div className="maze-hud">
        {/* ── Column 1: Date on top, Timer below ── */}

          <div className="maze-hud__item">
            <span className="maze-hud__icon">📅</span>
            <h2 className="maze-date">{formattedDate}</h2>
          </div>
          <div className="maze-hud__item">
            <span className="maze-hud__icon">⏱</span>
            <p className="maze-timer">{displayTime}</p>
          </div>


        {/* ── Column 2: Inventory slot ── */}

          <div className="maze-hud__item">
            <div className="maze-slot">
              {inventory.includes('extinguisher') && '🧯'}
            </div>
          </div>

      </div>

      <div className="maze-container">
        <div className="maze-grid" style={{ position: 'relative' }}>
          {mazeGrid.map((row, rowIndex) => (
            <div key={rowIndex} className="maze-row">
              {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
            </div>
          ))}
          <div className="maze-fog">
            <div
              className="maze-fog-main"
              style={{
                backgroundImage: `url(${PUBLIC}/textures/clouds.png)`,
                '--px': `${((playerPos[1] + 0.5) / mazeGrid[0].length) * 100}%`,
                '--py': `${((playerPos[0] + 0.5) / mazeGrid.length) * 100}%`,
                '--rad': `${fogRadius}%`
              }}
            />
          </div>
        </div>
      </div>
      <div className="dpad">
        <div className="dpad-row">
          <button className="dpad-btn" onClick={() => movePlayer('up')}>
          <img src="/icons/arrowUp.png" alt="Up" />
          </button>
        </div>
        <div className="dpad-row">
          <button className="dpad-btn" onClick={() => movePlayer('left')}>
            <img src="/icons/arrowLeft.png" alt="Left" />
          </button>
          <button className="dpad-btn" onClick={() => movePlayer('down')}>
            <img src="/icons/arrowDown.png" alt="Down" />
          </button>
          <button className="dpad-btn" onClick={() => movePlayer('right')}>
            <img src="/icons/arrowRight.png" alt="Right" />
          </button>
        </div>
      </div>     

      {completionError && (
        <div className="modal-overlay">
          <div className="modal-content" role="alert">
            <p>{completionError}</p>
            <div className="modal-buttons">
              <button onClick={handleFinish}>Retry saving</button>
              <button onClick={() => navigate('/mazes')}>Back to mazes</button>
            </div>
          </div>
        </div>
      )}

      {/* Quit Confirmation Modal */}
      {showQuitModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>Are you sure you want to quit?</p>
            <div className="modal-buttons">
              <button onClick={() => navigate('/mazes')}>Yes</button>
              <button onClick={() => setShowQuitModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MazePage;

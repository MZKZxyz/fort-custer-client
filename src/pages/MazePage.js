import { useRef, useMemo, useEffect, useState, useCallback  } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import '../css/MazePage.css'; // Add CSS below to this file
const PUBLIC = process.env.PUBLIC_URL;

const MazePage = () => {
  const navigate = useNavigate();
  const profile = useMemo(() => {
    return JSON.parse(localStorage.getItem('activeSubProfile'));
  }, []);
  const selectedDate = new Date(
    localStorage.getItem('selectedMazeDate') || new Date().toISOString()
  ).toISOString().slice(0, 10);

  const containerRef = useRef(null);
  const prevent = (e) => e.preventDefault();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const opts = { passive: false };
    const events = ['touchstart','touchmove','touchend','mousedown','contextmenu'];
    events.forEach((evt) => el.addEventListener(evt, prevent, opts));
    return () => {
      events.forEach((evt) => el.removeEventListener(evt, prevent, opts));
    };
  }, []);

  // --- your existing state ---
  const [mazeData, setMazeData]     = useState(null);
  const [mazeGrid, setMazeGrid]     = useState([]);
  const [playerPos, setPlayerPos]   = useState([0, 0]);
  const [inventory, setInventory]   = useState([]);

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

  const findStartPosition = (grid) => {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] === 'S') {
          return [r, c];
        }
      }
    }
    return [0, 0];
  };

  // --- timer state ---
  const [startTime]    = useState(performance.now());
  const [displayTime, setDisplayTime] = useState('0:00.000');

  useEffect(() => {
    let rafId;
    const update = () => {
      if (finished) return;           // ← stop updating once finished
      const now = performance.now();
      const elapsed = now - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const ms = Math.floor(elapsed % 1000);
      const formatted = `${minutes}:${seconds
        .toString()
        .padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
      setDisplayTime(formatted);
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
    const fetchMaze = async () => {
      try {
        const res = await API.post('/maze/start', {
          subProfileId: profile._id,
          date: selectedDate,
        });
        const { maze, seed } = res.data;
        setMazeData({ seed });
        setMazeGrid(maze.grid);
        setPlayerPos(findStartPosition(maze.grid));
        localStorage.setItem('mazeStartTime', Date.now().toString());
      } catch (err) {
        console.error('Failed to start maze:', err);
        alert(err.response?.data?.error || 'Could not load maze.');
      }
    };
    fetchMaze();
  }, [profile, selectedDate, navigate]);

  const handleFinish = useCallback(async () => {
    // freeze timer & input immediately
    setFinished(true);
    try {
      const res = await API.post('/maze/complete', {
        subProfileId: profile._id,
        date: selectedDate,
      });
      const { time, reward } = res.data;
      localStorage.setItem('lastMazeTime', time);
      if (reward) {
        localStorage.setItem('lastReward', JSON.stringify(reward));
      }
      localStorage.removeItem('mazeStartTime');
    } catch (err) {
      console.error('Maze completion failed:', err);
      alert(err.response?.data?.error || 'Something went wrong!');
    }
  }, [profile._id, selectedDate]);

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

  // --- keyboard handler (guarded by quit-modal & finished) ---
  useEffect(() => {
    const handleKey = (e) => {
      if (showQuitModal || finished || !mazeGrid.length) return;

      const [r, c] = playerPos;
      let next = [r, c];
      if (e.key === 'ArrowUp')    next = [r - 1, c];
      if (e.key === 'ArrowDown')  next = [r + 1, c];
      if (e.key === 'ArrowLeft')  next = [r, c - 1];
      if (e.key === 'ArrowRight') next = [r, c + 1];

      const [nr, nc] = next;
      const height = mazeGrid.length;
      const width  = mazeGrid[0].length;
      if (nr < 0 || nc < 0 || nr >= height || nc >= width) return;

      const nextTile = mazeGrid[nr][nc];
      if (nextTile === '#') return;
      if (nextTile === 'F') {
        if (!inventory.includes('extinguisher')) {
          if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
          setShowFireHint(true);
          hintTimeoutRef.current = setTimeout(() => {
            setShowFireHint(false);
            hintTimeoutRef.current = null;
          }, 2000);
          return;
        }
        const newGrid = mazeGrid.map(row => [...row]);
        newGrid[nr][nc] = ' ';
        setMazeGrid(newGrid);
        setInventory(prev => prev.filter(i => i !== 'extinguisher'));
        return;
      }
      if (nextTile === 'X') {
        setInventory(prev => [...prev, 'extinguisher']);
        const newGrid = mazeGrid.map(row => [...row]);
        newGrid[nr][nc] = ' ';
        setMazeGrid(newGrid);
        setPlayerPos(next);
        return;
      }
      if (nextTile === 'E') {
        setPlayerPos(next);
        handleFinish();
        setClosing(true);
        return;
      }
      setPlayerPos(next);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [playerPos, mazeGrid, inventory, showQuitModal, finished, handleFinish]);

  // --- D-pad movement (also guarded) ---
  const movePlayer = (direction) => {
    if (showQuitModal || finished || !mazeGrid.length) return;
    const [r, c] = playerPos;
    let next = [r, c];
    if (direction === 'up')    next = [r - 1, c];
    if (direction === 'down')  next = [r + 1, c];
    if (direction === 'left')  next = [r, c - 1];
    if (direction === 'right') next = [r, c + 1];

    const [nr, nc] = next;
    const height = mazeGrid.length;
    const width  = mazeGrid[0].length;
    if (nr < 0 || nc < 0 || nr >= height || nc >= width) return;

    const nextTile = mazeGrid[nr][nc];
    if (nextTile === '#') return;
    if (nextTile === 'F' && !inventory.includes('extinguisher')) {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      setShowFireHint(true);
      hintTimeoutRef.current = setTimeout(() => {
        setShowFireHint(false);
        hintTimeoutRef.current = null;
      }, 2000);
      return;
    }

    const newGrid = mazeGrid.map(row => [...row]);
    if (nextTile === 'X') {
      setInventory(prev => [...new Set([...prev, 'extinguisher'])]);
      newGrid[nr][nc] = ' ';
      setMazeGrid(newGrid);
    } else if (nextTile === 'F') {
      newGrid[nr][nc] = ' ';
      setMazeGrid(newGrid);
      setInventory(prev => prev.filter(i => i !== 'extinguisher'));
    } else if (nextTile === 'E') {
      setPlayerPos(next);
      handleFinish();
      setClosing(true);
      return;
    }
    setPlayerPos(next);
  };

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
    <div ref={containerRef} className="maze-page" style={{
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

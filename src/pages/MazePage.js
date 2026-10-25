import { lazy, Suspense, useRef, useMemo, useLayoutEffect, useEffect, useState, useCallback  } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { move, findStart, formatElapsed } from '../game/movement';
import { createMazeScene, createMazeViewModel } from '../game/scene';
import { createCamera } from '../game/camera';
import { commandOutcome } from '../game/commandOutcome';
import MazeDialog from '../components/MazeDialog';
import MazeRenderBoundary from '../components/MazeRenderBoundary';
import '../css/MazePage.css'; // Add CSS below to this file
const PUBLIC = process.env.PUBLIC_URL;
// Explicit preview/release opt-in; ordinary production builds stay on legacy.
const CAMERA_ENABLED = process.env.REACT_APP_MAZE_CAMERA === 'true';

const INTEGRATION_ENABLED = process.env.REACT_APP_MAZE_VISUALS === 'true';
const PalletMaze = INTEGRATION_ENABLED ? lazy(() => import('../components/PalletMaze')) : null;

const MazePage = () => {
  const [integrated, setIntegrated] = useState(INTEGRATION_ENABLED);
  const [facing, setFacing] = useState('down');
  const [movementStatus, setMovementStatus] = useState('Reach the tipi. Arrow keys or direction buttons move one cell.');
  const navigate = useNavigate();
  const profile = useMemo(() => {
    return JSON.parse(localStorage.getItem('activeSubProfile'));
  }, []);
  const selectedDate = useMemo(() => new Date(
    localStorage.getItem('selectedMazeDate') || new Date().toISOString()
  ).toISOString().slice(0, 10), []);

  const recoveryKey = `mazeCompletion:${profile?._id}:${selectedDate}`;
  const recovery = useMemo(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(recoveryKey));
      return typeof value?.attemptId === 'string' ? value : null;
    } catch { return null; }
  }, [recoveryKey]);
  const attemptIdRef = useRef(recovery?.attemptId);
  // --- your existing state ---
  const [mazeData, setMazeData]     = useState(null);
  const [mazeGrid, setMazeGrid]     = useState([]);
  const [playerPos, setPlayerPos]   = useState([0, 0]);
  const [inventory, setInventory]   = useState([]);
  const gameRef = useRef(null);
  const startRequestRef = useRef(null);
  const completionPendingRef = useRef(false);
  const [completionError, setCompletionError] = useState(recovery ? 'Your result may already be saved. Retry saving to recover the server result.' : null);

  // hint when bumping into fire without extinguisher
  const [showFireHint, setShowFireHint] = useState(false);
  const hintTimeoutRef = useRef(null);

  // --- quit modal & finished flag ---
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [finished, setFinished]           = useState(Boolean(recovery));

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

  // Memoize geometry independently of the timer; renderers only read this snapshot.
  const scene = useMemo(() => createMazeScene({
    grid: mazeGrid, position: playerPos, inventory, completed: finished,
  }, { visionRadius: VISION_RADIUS, revealAll: CAMERA_ENABLED || integrated }), [mazeGrid, playerPos, inventory, finished, integrated]);
  const viewportRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0, tileSize: 36 });
  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!CAMERA_ENABLED || integrated || !element) return;
    const measure = () => {
      const tileSize = element.querySelector('.maze-cell')?.getBoundingClientRect().width || 36;
      setViewportSize({ width: element.clientWidth, height: element.clientHeight, tileSize });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [mazeData, integrated]);
  const camera = useMemo(() => createCamera({
    ...viewportSize, rows: scene.camera.bounds.rows, columns: scene.camera.bounds.columns,
    row: scene.player.row, column: scene.player.column,
  }), [scene, viewportSize]);
  useLayoutEffect(() => {
    if (!CAMERA_ENABLED || integrated || !viewportRef.current) return;
    viewportRef.current.scrollLeft = camera.x;
    viewportRef.current.scrollTop = camera.y;
  }, [camera, integrated]);
  const baseRadius = CAMERA_ENABLED || integrated ? 0 : scene.camera.visibilityRadiusPercent;

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
    if (recovery) return; // Never create a new attempt while recovering an ambiguous save.
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
        attemptIdRef.current = res.data.attemptId;
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
  }, [profile, selectedDate, navigate, recovery]);

  const handleFinish = useCallback(async () => {
    if (completionPendingRef.current) return;
    completionPendingRef.current = true;
    setCompletionError(null);
    setFinished(true);
    if (startTime !== null && !finished) {
      setDisplayTime(formatElapsed(performance.now() - startTime));
    }
    try {
      // Persist intent before sending: a refresh or timeout must reuse this attempt.
      if (attemptIdRef.current) sessionStorage.setItem(recoveryKey, JSON.stringify({ attemptId: attemptIdRef.current }));
      const res = await API.post('/maze/complete', {
        subProfileId: profile._id,
        date: selectedDate,
        ...(attemptIdRef.current ? { attemptId: attemptIdRef.current } : {}),
      }, { timeout: 15000 });
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
  }, [profile?._id, selectedDate, startTime, finished, recoveryKey]);

  // Camera path opens results without fog; legacy fallback retains its closing effect.
  useEffect(() => {
    if (!closing) return;
    const duration = integrated || CAMERA_ENABLED || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 3000;
    const start = performance.now();
    const startRadius = baseRadius;
    let raf;
    const step = (now) => {
      const progress = duration ? Math.min((now - start) / duration, 1) : 1;
      setFogRadius(startRadius * (1 - progress));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        sessionStorage.removeItem(recoveryKey);
        navigate('/results');
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [closing, baseRadius, navigate, recoveryKey, integrated]);

  const movePlayer = useCallback((direction) => {
    if (showQuitModal || finished || !gameRef.current) return { reason: 'inactive', terminal: true };
    const before = gameRef.current;
    const result = move(before, direction);
    const outcome = commandOutcome(before, result);
    if (integrated) {
      setMovementStatus(outcome.message);
      if (outcome.reason === 'step' || outcome.reason === 'complete') setFacing(direction);
    }
    if (result.blockedByFire) {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      setShowFireHint(true);
      hintTimeoutRef.current = setTimeout(() => {
        setShowFireHint(false);
        hintTimeoutRef.current = null;
      }, 2000);
    }
    if (result.state === gameRef.current) return outcome;
    // Update synchronously so multiple input events cannot reuse stale state.
    gameRef.current = result.state;
    setMazeGrid(result.state.grid);
    setInventory(result.state.inventory);
    setPlayerPos(result.state.position);
    if (result.state.completed) handleFinish();
    return outcome;
  }, [showQuitModal, finished, handleFinish, integrated]);

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

  const renderCell = ({ id, row, column, terrain, object, isPlayer, visible }) => {
    const bg = terrain === 'wall' ? `url(textures/wall.png)` : `url(textures/floor.png)`;
    return (
      <div
        key={id}
        className="maze-cell"
        data-row={row} data-column={column} data-terrain={terrain}
        data-player={isPlayer || undefined}
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
              {view.ui.showFireHint && (
                <div className="thought-bubble" role="status" aria-label="Fire blocks the path. Find an extinguisher.">
                  <span className="bubble-icon">🧯</span>
                </div>
              )}
            </>
          ) :
          object   === 'extinguisher' ? '🧯' :
          object   === 'fire' ? '🔥' :
          object   === 'exit' ? (
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

  const view = createMazeViewModel(scene, {
    dateLabel: formattedDate, elapsedLabel: displayTime, showFireHint, showQuitModal,
    finished, closing, completionError, fogRadius,
  });

  if (!mazeData && recovery) {
    return <div className="maze-page">
      <div role="alert">
        <p>{completionError || (closing ? 'Result saved. Opening results…' : 'Saving your result…')}</p>
        {completionError && <button onClick={handleFinish}>Retry saving</button>}
        <button onClick={() => navigate('/mazes')}>Back to mazes</button>
        <button onClick={() => {
          sessionStorage.removeItem(recoveryKey);
          navigate('/mazes');
        }}>Dismiss recovery and return to mazes</button>
      </div>
    </div>;
  }

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
    <div className={`maze-page${integrated ? ' pallet-enabled' : ''}`} style={{
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
            <h2 className="maze-date">{view.hud.dateLabel}</h2>
          </div>
          <div className="maze-hud__item">
            <span className="maze-hud__icon">⏱</span>
            <p className="maze-timer">{view.hud.elapsedLabel}</p>
          </div>


        {/* ── Column 2: Inventory slot ── */}

          <div className="maze-hud__item">
            <div className="maze-slot" role="img" aria-label={view.hud.equipment ? 'Equipment: extinguisher' : 'Equipment: empty'}>
              {view.hud.equipment === 'extinguisher' && '🧯'}
            </div>
          </div>

      </div>

      {integrated ? <>
        <MazeRenderBoundary onFallback={() => setIntegrated(false)}>
        <Suspense fallback={<p role="status">Loading maze artwork…</p>}>
          <PalletMaze scene={view.scene} facing={facing} onFallback={() => setIntegrated(false)} />
        </Suspense>
        </MazeRenderBoundary>
        <p className="pallet-status" role="status">{movementStatus}</p>
      </> : <div className={`maze-container${CAMERA_ENABLED ? ' camera-enabled' : ''}`}>
        <div ref={viewportRef} className={CAMERA_ENABLED ? 'maze-viewport' : 'maze-legacy-host'}
          role={CAMERA_ENABLED ? 'region' : undefined} aria-label={CAMERA_ENABLED ? 'Maze viewport' : undefined}
          style={CAMERA_ENABLED ? { '--world-columns': scene.camera.bounds.columns, '--world-rows': scene.camera.bounds.rows } : undefined}>
        <div className="maze-grid" style={{ position: 'relative' }}>
          {view.scene.rows.map((row, rowIndex) => (
            <div key={rowIndex} className="maze-row">
              {row.map(renderCell)}
            </div>
          ))}
          {!CAMERA_ENABLED && <div className="maze-fog">
            <div
              className="maze-fog-main"
              style={{
                backgroundImage: `url(${PUBLIC}/textures/clouds.png)`,
                '--px': `${view.scene.camera.focusPercent.x}%`,
                '--py': `${view.scene.camera.focusPercent.y}%`,
                '--rad': `${view.effects.fogRadius}%`
              }}
            />
          </div>}
        </div>
        </div>
      </div>}
      <div className="dpad" role="group" aria-label="Movement controls">
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

      {view.ui.finished && !view.ui.closing && !view.ui.completionError && <p role="status">Saving your result…</p>}
      {view.ui.completionError && (
        <MazeDialog label="Save result" onCancel={() => {}}>
          <div role="alert">
            <p>{view.ui.completionError}</p>
            <div className="modal-buttons">
              <button onClick={handleFinish}>Retry saving</button>
              <button onClick={() => navigate('/mazes')}>Back to mazes</button>
            </div>
          </div>
        </MazeDialog>
      )}

      {/* Quit Confirmation Modal */}
      {view.ui.showQuitModal && (
        <MazeDialog label="Quit maze" onCancel={() => setShowQuitModal(false)}>
            <p>Are you sure you want to quit?</p>
            <div className="modal-buttons">
              <button onClick={() => navigate('/mazes')}>Yes</button>
              <button onClick={() => setShowQuitModal(false)}>Cancel</button>
            </div>
        </MazeDialog>
      )}
    </div>
  );
};

export default MazePage;

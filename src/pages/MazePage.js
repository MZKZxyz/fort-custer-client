import { lazy, Suspense, useRef, useMemo, useLayoutEffect, useEffect, useState, useCallback  } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import SessionGate, { pendingV2 } from '../session/SessionGate';
import { EXPERIMENTAL_V2 } from '../session/contract';
import { move, findStart, formatElapsed, inspectDirection } from '../game/movement';
import { createMazeScene, createMazeViewModel } from '../game/scene';
import { createCamera } from '../game/camera';
import { STEERING_MODES } from '../game/dragSteering';
import { bindMazeInput } from '../game/inputCoordinator';
import { commandOutcome } from '../game/commandOutcome';
import MazeDialog from '../components/MazeDialog';
import MazeRenderBoundary from '../components/MazeRenderBoundary';
import '../css/MazePage.css'; // Add CSS below to this file
import LegacyEntry from '../archive/LegacyEntry';
import { accountId, parsed, readIdentity, stored } from '../archive/identity';
import { isDate } from '../archive/dates';
import { createResultReceipt } from '../archive/resultReceipt';
const PUBLIC = process.env.PUBLIC_URL;
// Explicit preview/release opt-in; ordinary production builds stay on legacy.
const CAMERA_ENABLED = process.env.REACT_APP_MAZE_CAMERA === 'true';

const INTEGRATION_ENABLED = process.env.REACT_APP_MAZE_VISUAL_INTEGRATION === 'true';
const PalletMaze = INTEGRATION_ENABLED ? lazy(() => import('../components/PalletMaze')) : null;

export const MazePage = ({ v2 = null }) => {
  const [serverReady, setServerReady] = useState(!v2);
  const readyRequestRef = useRef(null);
  const inputRootRef = useRef(null);
  const inputRef = useRef(null);
  const commandRef = useRef(null);
  const [steeringMode, setSteeringMode] = useState('trailing');
  const [helpOpen, setHelpOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [showDirections, setShowDirections] = useState(() => {
    try { return localStorage.getItem('mazeDirectionButtons') === 'true'; } catch { return false; }
  });
  const toggleDirections = () => {
    inputRef.current?.cancel('controls changed');
    const next = !showDirections;
    setShowDirections(next);
    try { localStorage.setItem('mazeDirectionButtons', String(next)); } catch { /* preference is optional */ }
  };
  const [inputStatus, setInputStatus] = useState('idle');
  const [integrated, setIntegrated] = useState(INTEGRATION_ENABLED);
  const [facing, setFacing] = useState('down');
  const [movementStatus, setMovementStatus] = useState('');
  const dpadRef = useRef(null);
  const [noticeBottom, setNoticeBottom] = useState(8);
  useLayoutEffect(() => {
    const placeNotice = () => {
      const rect = showDirections && dpadRef.current?.getBoundingClientRect();
      setNoticeBottom(rect && rect.top >= 0 && rect.top < window.innerHeight
        ? window.innerHeight - rect.top + 8 : 8);
    };
    placeNotice();
    window.addEventListener('scroll', placeNotice, { passive: true });
    window.addEventListener('resize', placeNotice);
    return () => { window.removeEventListener('scroll', placeNotice); window.removeEventListener('resize', placeNotice); };
  }, [showDirections, movementStatus]);

  useEffect(() => {
    if (!movementStatus.startsWith('Extinguisher picked up')) return;
    const timer = setTimeout(() => setMovementStatus(''), 5000);
    return () => clearTimeout(timer);
  }, [movementStatus]);
  const navigate = useNavigate();
  const profile = useMemo(() => {
    return parsed('activeSubProfile');
  }, []);
  const [selectedDate] = useState(() => {
    const value = v2?.snapshot?.session?.date || stored('selectedMazeDate');
    return isDate(value) ? value : null;
  });
  const originalIdentity = useRef(readIdentity());

  const recoveryKey = `mazeCompletion:${profile?._id}:${selectedDate}`;
  const recovery = useMemo(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(recoveryKey));
      return typeof value?.attemptId === 'string' ? value : null;
    } catch { return null; }
  }, [recoveryKey]);
  const attemptIdRef = useRef(recovery?.attemptId);
  // --- your existing state ---
  const [loadError, setLoadError] = useState('');
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
    if (!isDate(selectedDate)) { navigate('/mazes'); return; }
    if (v2) {
      const { session, state } = v2.snapshot;
      gameRef.current = state;
      setMazeData({ seed: session.manifest.mazeVersion });
      setMazeGrid(state.grid); setPlayerPos(state.position); setInventory(state.inventory);
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
          }, { headers: { Authorization: originalIdentity.current.token ? `Bearer ${originalIdentity.current.token}` : null } });
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
        setLoadError(err.response?.data?.error || 'Could not load maze. Return to mazes and try again.');
      }
    };
    fetchMaze();
    return () => { active = false; };
  }, [profile, selectedDate, navigate, recovery, v2]);

  // Run only after the shell has rendered and its single coordinator is bound.
  useEffect(() => {
    if (!v2 || !mazeData) return;
    let active = true;
    if (!readyRequestRef.current) readyRequestRef.current = (async () => {
      const deadline = performance.now() + 15000;
      while (true) {
        if (performance.now() > deadline) throw new Error('RENDER_NOT_READY');
        const root = inputRootRef.current;
        if (root?.querySelector('[data-maze-surface]') && inputRef.current
          && Array.from(root.querySelectorAll('img')).every(img => img.complete)) break;
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      return v2.session.ready();
    })();
    readyRequestRef.current.then(elapsed => {
      if (!active) return;
      setStartTime(performance.now() - elapsed); setServerReady(true);
    }).catch(failure => { if (active) v2.fail(failure); });
    return () => { active = false; };
  }, [v2, mazeData]);

  const handleFinish = useCallback(async () => {
    if (completionPendingRef.current) return;
    completionPendingRef.current = true;
    setCompletionError(null);
    setFinished(true);
    setMovementStatus('Saving your result…');
    if (startTime !== null && !finished) {
      setDisplayTime(formatElapsed(performance.now() - startTime));
    }
    try {
      if (v2) {
        await v2.session.submit();
        navigate('/results?protocol=session-v2');
        return;
      }
      // Persist intent before sending: a refresh or timeout must reuse this attempt.
      if (readIdentity().key !== originalIdentity.current.key) {
        setCompletionError('Restore the original sign-in and profile before retrying this result.');
        return;
      }
      if (attemptIdRef.current) sessionStorage.setItem(recoveryKey, JSON.stringify({ attemptId: attemptIdRef.current,
        ...(accountId(originalIdentity.current.token) ? { accountId: accountId(originalIdentity.current.token) } : {}) }));
      const res = await API.post('/maze/complete', {
        subProfileId: profile._id,
        date: selectedDate,
        ...(attemptIdRef.current ? { attemptId: attemptIdRef.current } : {}),
      }, { timeout: 15000, headers: { Authorization: originalIdentity.current.token ? `Bearer ${originalIdentity.current.token}` : null } });
      const { time, reward } = res.data;
      // A late owned receipt stays recoverable; it must not replace another account's result UI.
      if (readIdentity().key !== originalIdentity.current.key) return;
      const resultContext = await createResultReceipt(originalIdentity.current, {
        date: selectedDate, time, reward, attemptId: attemptIdRef.current,
      });
      if (readIdentity().key !== originalIdentity.current.key) return;
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
      resultContext.receipt.newRecord = isNewRecord;
      sessionStorage.setItem('mazeResultContext', JSON.stringify(resultContext));
      window.dispatchEvent(new Event('mazeResultSaved'));

      localStorage.removeItem('mazeStartTime');
      setMovementStatus('Result saved. Opening results…');
      setClosing(true);
    } catch (err) {
      if (v2) { v2.fail(err); return; }
      console.error('Maze completion failed:', err);
      setMovementStatus('');
      setCompletionError(err.response?.data?.error || 'Could not save your result. Check your connection and retry.');
    } finally {
      completionPendingRef.current = false;
    }
  }, [profile?._id, selectedDate, startTime, finished, recoveryKey, v2, navigate]);

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
    if (!serverReady || showQuitModal || helpOpen || controlsOpen || finished || !gameRef.current || (v2 && gameRef.current.completed)) return { reason: 'inactive', terminal: true };
    const before = gameRef.current;
    const result = move(before, direction);
    if (v2) {
      try { v2.session.append(direction, before, result.state); }
      catch (failure) { v2.fail(failure); return { reason: 'inactive', terminal: true }; }
    }
    const outcome = commandOutcome(before, result);
    const meaningful = ['fire blocked', 'fire cleared', 'complete'].includes(outcome.reason)
      || result.state.inventory.length > before.inventory.length;
    if (meaningful) setMovementStatus(outcome.reason === 'fire cleared'
      ? 'Fire cleared. Extinguisher used. You stayed in place. Release, then use a fresh input to enter.' : outcome.message);
    else if (outcome.reason === 'step') setMovementStatus('');
    if (outcome.reason === 'step' || outcome.reason === 'complete') setFacing(direction);
    if (result.blockedByFire) {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      setShowFireHint(true);
      hintTimeoutRef.current = setTimeout(() => {
        setShowFireHint(false);
        hintTimeoutRef.current = null;
      }, 2000);
    }
    if (result.state === gameRef.current) return outcome;
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    setShowFireHint(false);
    // Update synchronously so multiple input events cannot reuse stale state.
    gameRef.current = result.state;
    setMazeGrid(result.state.grid);
    setInventory(result.state.inventory);
    setPlayerPos(result.state.position);
    if (result.state.completed) handleFinish();
    return outcome;
  }, [showQuitModal, helpOpen, controlsOpen, finished, handleFinish, serverReady, v2]);

  // The controller survives renders; commands always read the current shell.
  useLayoutEffect(() => { commandRef.current = movePlayer; }, [movePlayer]);
  useLayoutEffect(() => {
    if (!mazeData || !inputRootRef.current) return;
    const coordinator = bindMazeInput(inputRootRef.current, {
      command: direction => commandRef.current(direction),
      inspect: direction => inspectDirection(gameRef.current, direction),
      changed: input => {
        setInputStatus(input.phase);
        if (input.reason === 'turn hazard') setMovementStatus('Fire blocks queued travel. Steer again to interact.');
      },
    });
    inputRef.current = coordinator;
    return () => { coordinator.destroy(); inputRef.current = null; };
  }, [mazeData]);
  useLayoutEffect(() => {
    if (showQuitModal || helpOpen || controlsOpen || finished || completionError) inputRef.current?.cancel('shell interrupted');
  }, [showQuitModal, helpOpen, controlsOpen, finished, completionError]);
  const useClassic = useCallback(() => {
    inputRef.current?.cancel('renderer changed');
    (inputRootRef.current?.querySelector('[data-direction]') || inputRootRef.current?.querySelector('[data-hud-controls]'))?.focus({ preventScroll: true });
    setIntegrated(false);
  }, []);

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
                <div className="thought-bubble" aria-hidden="true">
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

  const formattedDate = isDate(selectedDate) ? new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }) : 'No date selected';

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

  if (loadError) return <div className="maze-page"><div role="alert"><p>{loadError}</p><button onClick={() => navigate('/mazes')}>Back to mazes</button></div></div>;

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
    <div ref={inputRootRef} className={`maze-page${integrated ? ' pallet-enabled' : ''}`} style={{
      backgroundImage: "url('/assets/fortBG.png')"
    }}>
      <header className="field-strip" aria-label="Maze field strip">
        <div className="field-meta"><span className="maze-date">{view.hud.dateLabel}</span>
          <span className="maze-timer" aria-label="Provisional elapsed time">{view.hud.elapsedLabel}</span></div>
        <span className="field-kit" role="img" aria-label={view.hud.equipment ? 'Equipment: extinguisher' : 'Equipment: empty'}>
          {view.hud.equipment ? '🧯 Kit: 1 charge' : 'Kit empty'}
        </span>
        <nav aria-label="Maze actions">
          <button onClick={() => { inputRef.current?.cancel('modal opened'); setShowQuitModal(true); }}>Back</button>
          <button onClick={() => { inputRef.current?.cancel('help opened'); setHelpOpen(true); }}>Help</button>
          <button data-hud-controls onClick={() => { inputRef.current?.cancel('controls opened'); setControlsOpen(true); }}>Controls</button>
        </nav>
      </header>
      {process.env.REACT_APP_MAZE_INPUT_PREVIEW === 'true' && <label className="maze-steering-choice">Drag steering <select aria-label="Drag steering" value={steeringMode} onChange={event => {
        inputRef.current?.configureSteering(event.target.value); setSteeringMode(event.target.value);
      }}>{Object.entries(STEERING_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <p id="maze-input-help" className="hud-sr-only">Drag anywhere on the maze to steer; release to stop. Arrow keys and direction buttons also work.</p>
      {integrated ? <>
        <MazeRenderBoundary onFallback={useClassic}>
        <Suspense fallback={<p role="status">Loading maze artwork…</p>}>
          <PalletMaze scene={view.scene} inputPhase={inputStatus} facing={facing} onFallback={useClassic} />
        </Suspense>
        </MazeRenderBoundary>
      </> : <div className={`maze-container${CAMERA_ENABLED ? ' camera-enabled' : ''}`}>
        <div ref={viewportRef} className={CAMERA_ENABLED ? 'maze-viewport' : 'maze-legacy-host'}
          data-maze-surface={CAMERA_ENABLED || undefined} data-input-phase={CAMERA_ENABLED ? inputStatus : undefined}
          tabIndex={CAMERA_ENABLED ? 0 : undefined} aria-describedby={CAMERA_ENABLED ? 'maze-input-help' : undefined}
          role={CAMERA_ENABLED ? 'region' : undefined} aria-label={CAMERA_ENABLED ? 'Maze viewport' : undefined}
          style={CAMERA_ENABLED ? { '--world-columns': scene.camera.bounds.columns, '--world-rows': scene.camera.bounds.rows } : undefined}>
        <div className="maze-grid" style={{ position: 'relative' }}
          data-maze-surface={!CAMERA_ENABLED || undefined} data-input-phase={!CAMERA_ENABLED ? inputStatus : undefined}
          tabIndex={!CAMERA_ENABLED ? 0 : undefined} role={!CAMERA_ENABLED ? 'region' : undefined}
          aria-label={!CAMERA_ENABLED ? 'Maze viewport' : undefined} aria-describedby={!CAMERA_ENABLED ? 'maze-input-help' : undefined}>
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
      {!serverReady && <p className="field-notice" aria-hidden="true">Waiting for server-ready acknowledgment…</p>}
      <div className="hud-sr-only" role="status" aria-live="polite" aria-atomic="true">{serverReady ? movementStatus : 'Waiting for server-ready acknowledgment…'}</div>
      {movementStatus && !finished && <p style={{'--notice-bottom': `${noticeBottom}px`}} className="field-notice" aria-hidden="true">{movementStatus}</p>}
      {showDirections && <div ref={dpadRef} id="maze-directions" className="dpad" role="group" aria-label="Movement controls">
        <div className="dpad-row">
          <button className="dpad-btn" data-direction="up">
          <img src="/icons/arrowUp.png" alt="Up" />
          </button>
        </div>
        <div className="dpad-row">
          <button className="dpad-btn" data-direction="left">
            <img src="/icons/arrowLeft.png" alt="Left" />
          </button>
          <button className="dpad-btn" data-direction="down">
            <img src="/icons/arrowDown.png" alt="Down" />
          </button>
          <button className="dpad-btn" data-direction="right">
            <img src="/icons/arrowRight.png" alt="Right" />
          </button>
        </div>
      </div>}

      {view.ui.finished && !view.ui.closing && !view.ui.completionError && <p className="field-notice" aria-hidden="true">Saving your result…</p>}
      {helpOpen && <MazeDialog label="Maze help" initialFocus="#maze-help-title" onCancel={() => setHelpOpen(false)}>
        <h2 id="maze-help-title" tabIndex={-1}>Maze help</h2><p>Reach the tipi. Drag anywhere on the maze to steer; release to stop. Arrow keys also move.</p>
        <p>Find an extinguisher to clear fire. Clearing consumes its charge without moving. Release and use a fresh input to enter the cleared tile.</p>
        <p>Use Controls to show or hide direction buttons. Your choice is remembered on this device when storage is available.</p>
        {v2 && <p>Play begins after the server acknowledges readiness. The timer is provisional; only a saved server receipt can supply an official time. Keep this tab open while saving, or recover the original attempt after interruption.</p>}
        <button onClick={() => setHelpOpen(false)}>Close Help</button>
      </MazeDialog>}
      {controlsOpen && <MazeDialog label="Maze controls" onCancel={() => setControlsOpen(false)}>
        <h2>Maze controls</h2><p>Drag or use arrow keys. Direction buttons offer another way to move.</p>
        <button aria-expanded={showDirections} aria-controls="maze-directions" onClick={toggleDirections}>{showDirections ? 'Hide direction buttons' : 'Show direction buttons'}</button>
        <button onClick={() => setControlsOpen(false)}>Close Controls</button>
      </MazeDialog>}
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

export default function GameplayPage() {
  // An unresolved durable v2 record also blocks legacy in a flag-OFF build.
  // Legacy completion recovery always precedes admission of a new v2 attempt.
  let legacyRecovery = false;
  try {
    const profile = JSON.parse(localStorage.getItem('activeSubProfile'));
    const date = localStorage.getItem('selectedMazeDate');
    legacyRecovery = Boolean(sessionStorage.getItem(`mazeCompletion:${profile?._id}:${date}`));
  } catch { /* the existing legacy shell handles its own state */ }
  if (pendingV2() || (EXPERIMENTAL_V2 && !legacyRecovery)) return <SessionGate>{v2 => <MazePage key={v2?.generation || 'legacy'} v2={v2} />}</SessionGate>;
  return <LegacyEntry><MazePage /></LegacyEntry>;
}

import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import NavBar from '../components/NavBar';
import '../css/MazePage.css'; // Add CSS below to this file
const PUBLIC = process.env.PUBLIC_URL;
 

export default function MazePage() {
  const navigate = useNavigate();
  const profile = useMemo(() => {
    return JSON.parse(localStorage.getItem('activeSubProfile'));
  }, []);
  const selectedDate = new Date(
    localStorage.getItem('selectedMazeDate') || new Date().toISOString()
  ).toISOString().slice(0, 10);  

  const [mazeData, setMazeData] = useState(null);
  const [mazeGrid, setMazeGrid] = useState([]);
  const [playerPos, setPlayerPos] = useState([0, 0]);
  const [inventory, setInventory] = useState([]);

  const VISION_RADIUS = 1; // can be 1 or 2

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
    return [0, 0]; // fallback just in case
  };
  
  const [startTime] = useState(performance.now());
  const [displayTime, setDisplayTime] = useState('0:00.000');
  
  useEffect(() => {
    const update = () => {
      const now = performance.now();
      const elapsed = now - startTime;
  
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const ms = Math.floor(elapsed % 1000);
  
      const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}.${ms
        .toString()
        .padStart(3, '0')}`;
  
      setDisplayTime(formatted);
      requestAnimationFrame(update);
    };
  
    const rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [startTime]);
  
  
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
    
        // Store local start time for session-based timer
        localStorage.setItem('mazeStartTime', Date.now().toString());
    
      } catch (err) {
        console.error('Failed to start maze:', err);
        alert(err.response?.data?.error || 'Could not load maze.');
      }
    };
    

    fetchMaze();
  }, [profile, selectedDate, navigate]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!mazeGrid.length) return;
  
      const [r, c] = playerPos;
      let next = [r, c];
  
      if (e.key === 'ArrowUp') next = [r - 1, c];
      if (e.key === 'ArrowDown') next = [r + 1, c];
      if (e.key === 'ArrowLeft') next = [r, c - 1];
      if (e.key === 'ArrowRight') next = [r, c + 1];
  
      const [nr, nc] = next;
      const height = mazeGrid.length;
      const width = mazeGrid[0].length;
  
      if (
        nr >= 0 &&
        nc >= 0 &&
        nr < height &&
        nc < width
      ) {
        const nextTile = mazeGrid[nr][nc];
  
        // Block if it's a wall
        if (nextTile === '#') return;
  
        // Fire: if extinguisher is in inventory, clear fire and use it
        if (nextTile === 'F') {
          if (inventory.includes('extinguisher')) {
            const newGrid = mazeGrid.map(row => [...row]);
            newGrid[nr][nc] = ' ';
            setMazeGrid(newGrid);
            setInventory(inventory.filter(item => item !== 'extinguisher'));
          } else {
            return;
          }
        }
        
        if (nextTile === 'X') {
          setInventory((prev) => [...prev, 'extinguisher']);
          const newGrid = mazeGrid.map(row => [...row]);
          newGrid[nr][nc] = ' ';
          setMazeGrid(newGrid);
          setPlayerPos(next);
          return;
        }                    
  
        // Finish — first step onto it, then trigger completion
        if (nextTile === 'E') {
          setPlayerPos(next);
            // give React one render pass to show the player on the goal
          setTimeout(() => handleFinish(), 150);
          return;
        }
  
        // normal move
        setPlayerPos(next);
      }
    };
  
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [playerPos, mazeGrid, inventory]);
  
  const movePlayer = (direction) => {
    if (!mazeGrid.length) return;
  
    const [r, c] = playerPos;
    let next = [r, c];
    if (direction === 'up') next = [r - 1, c];
    if (direction === 'down') next = [r + 1, c];
    if (direction === 'left') next = [r, c - 1];
    if (direction === 'right') next = [r, c + 1];
  
    const [nr, nc] = next;
    const height = mazeGrid.length;
    const width = mazeGrid[0].length;
  
    if (
      nr >= 0 &&
      nc >= 0 &&
      nr < height &&
      nc < width
    ) {
      const nextTile = mazeGrid[nr][nc];
  
      if (nextTile === '#') return;
  
      if (nextTile === 'F' && !inventory.includes('extinguisher')) {
        return;
      }
  
      const newGrid = mazeGrid.map(row => [...row]);
  
      if (nextTile === 'X') {
        setInventory(prev => [...new Set([...prev, 'extinguisher'])]);
        newGrid[nr][nc] = ' ';
        setMazeGrid(newGrid);
      }
  
      if (nextTile === 'F' && inventory.includes('extinguisher')) {
        newGrid[nr][nc] = ' ';
        setMazeGrid(newGrid);
        setInventory(prev => prev.filter(item => item !== 'extinguisher'));
      }
  
      if (nextTile === 'E') {
        setPlayerPos(next);
        setTimeout(() => handleFinish(), 150);
        return;
      }
  
      setPlayerPos(next);
    }
  };
  
  const handleFinish = async () => {
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
  
      // Optionally clear startTime from localStorage
      localStorage.removeItem('mazeStartTime');
  
      navigate('/results');
    } catch (err) {
      console.error('Maze completion failed:', err);
      alert(err.response?.data?.error || 'Something went wrong!');
    }
  };
  

// at top of file, if you like, import PUBLIC_URL:
// const PUBLIC = process.env.PUBLIC_URL;

const renderCell = (cell, row, col) => {
  const isPlayer = playerPos[0] === row && playerPos[1] === col;
  const visible  = isVisible(row, col);

  // pick the right texture for each state
  let bg;
  if (cell === '#') {
    bg = `url(textures/wall.png)`;
  } else {
    bg = `url(textures/floor.png)`;
  }
  
  return (
    <div
      key={`${row}-${col}`}
      className="maze-cell"
      style={{
        backgroundImage:  bg,
        backgroundSize:   'cover',
        backgroundRepeat: 'repeat',
        opacity:          1,
      }}
    >
      {/* only draw the glyph if visible */}
      {visible && (
        isPlayer ? '🧍‍♂️' :
        cell === 'X' ? '🧯' :
        cell === 'F' ? '🔥' :
        cell === 'E' ? '🏁' :
        null
      )}
    </div>
  );
};

  
  
  if (!mazeData) return <p>Loading maze...</p>;

  return (
    <div>
      <h2 style={{ textAlign: 'center', margin: '1rem 0' }}>
        {new Date(selectedDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })}
      </h2>
      <p style={{ textAlign: 'center', fontSize: '1.25rem', margin: '0 0 1rem' }}>
        ⏱ Time: {displayTime}
      </p>

      <div className="maze-container">
        <div className="maze-grid" style={{ position: 'relative' }}>
          {mazeGrid.map((row, rowIndex) => (
            <div key={rowIndex} className="maze-row">
              {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
            </div>
          ))}
          <div className="maze-fog">
            {/* main drifting fog */}
            <div
              className="maze-fog-main"
              style={{ backgroundImage: `url(${PUBLIC}/textures/fog2.png)`,
                '--px': `${((playerPos[1] + 0.5) / mazeGrid[0].length) * 100}%`,
                '--py': `${((playerPos[0] + 0.5) / mazeGrid.length) * 100}%`,
                '--rad':  `${((VISION_RADIUS + 0.5) / Math.max(mazeGrid.length, mazeGrid[0].length)) * 100}%`
              }}
            />
            {/* pulsing noise mask */}
            <div
              className="maze-fog-noise"
              style={{ 
                backgroundImage: `url(${PUBLIC}/textures/fog-noise.png)`,
                '--px': `${((playerPos[1] + 0.5) / mazeGrid[0].length) * 100}%`,
                '--py': `${((playerPos[0] + 0.5) / mazeGrid.length) * 100}%`,
                '--rad':  `${((VISION_RADIUS + 0.5) / Math.max(mazeGrid.length, mazeGrid[0].length)) * 100}%`
              }}
            />
          </div>
        </div>
        {/* <div className="maze-fog" style={{backgroundImage: `url(${PUBLIC}/textures/fog2.png)`}}/> */}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        margin: '0.5rem 0',
        fontSize: '1.25rem',
        padding: '0 8px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '2px solid #000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          fontSize: '1.25rem',
        }}>
          {inventory.includes('extinguisher') ? '🧯' : ''}
        </div>
      </div>
      <div className="dpad">
        <div className="dpad-row">
          <button className="dpad-btn" onClick={() => movePlayer('up')}>↑</button>
        </div>
        <div className="dpad-row">
          <button className="dpad-btn" onClick={() => movePlayer('left')}>←</button>
          <button className="dpad-btn" onClick={() => movePlayer('down')}>↓</button>
          <button className="dpad-btn" onClick={() => movePlayer('right')}>→</button>
        </div>
      </div>
      <NavBar />
    </div>
  );
}

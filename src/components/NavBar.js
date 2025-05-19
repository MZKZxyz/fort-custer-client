// src/components/NavBar.js
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Mazes',       icon: '🧩', path: '/mazes'      },
  { label: 'Collection',  icon: '🏆', path: '/collection' },
  { label: 'Leaderboard', icon: '📈', path: '/leaderboard'},
  { label: 'Profile',     icon: '👤', path: '/profiles'   },
];

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem('activeSubProfile');
      if (stored) setProfile(JSON.parse(stored));
    };
    sync();
    window.addEventListener('activeSubProfileChanged', sync);
    return () => window.removeEventListener('activeSubProfileChanged', sync);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: '#00aef0',      // theme blue
      borderTop: '3px solid #000',
      display: 'flex',
      zIndex: 1000,
    }}>
      {navItems.map((item, i) => {
        const isActive = location.pathname === item.path;
        const icon  = item.path === '/profiles' && profile?.avatar ? profile.avatar : item.icon;
        const label = item.path === '/profiles' && profile?.name   ? profile.name   : item.label;

        return (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: i > 0 ? '2px solid #007bbf' : 'none',
              background: isActive ? '#ffe066' : 'transparent',
              color:      isActive ? '#000'    : '#fff',
              fontWeight: isActive ? 'bold'    : 'normal',
              fontFamily: 'Arial Black, sans-serif',
              cursor:     'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{icon}</span>
            <span style={{
              fontSize: '0.65rem',
              marginTop: '2px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

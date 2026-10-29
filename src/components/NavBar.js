import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIdentity } from '../archive/identity';

const navItems = [
  { label: 'Mazes',       icon: 'fort.png',       path: '/mazes'      },
  { label: 'Collection',  icon: 'backpackMap.png',path: '/collection' },
  { label: 'Leaderboard', icon: 'metalStar.png',  path: '/leaderboard'},
  { label: '',     icon: '',             path: '/profiles'   },
];

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useIdentity();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
      background: '#00aef0',
      borderTop: '3px solid #000',
      display: 'flex',
      zIndex: 1000,
    }}>
      {navItems.map((item, i) => {
        const isActive = location.pathname === item.path;
        const isProfile = item.path === '/profiles';

        // Determine raw icon: profile avatar or default icon
        const rawIcon = isProfile && profile?.avatar
          ? profile.avatar
          : item.icon;
        const isImage = typeof rawIcon === 'string' && /\.(png|jpe?g|svg|gif)$/.test(rawIcon);
        const src = isImage
          ? (rawIcon.startsWith('http') ? rawIcon : `/icons/${rawIcon}`)
          : null;
        const iconContent = isImage
          ? <img
              src={src}
              alt={item.label}
              style={{
                width: '3rem',
                height: '3rem',
                maxWidth: '70%',
                maxHeight: '60px',
                objectFit: 'contain',
                borderRadius: isProfile ? '50%' : '0'
              }}
              onError={e => { e.currentTarget.onerror = null; }}
            />
          : <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{rawIcon}</span>;

        // Only profile shows text label
        const label = isProfile && (profile?.name || 'Profiles');

        return (
          <button type="button"
            key={item.path}
            aria-label={isProfile ? 'Profiles' : item.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              border: 0,
              borderRadius: 0,
              padding: 0,
              minHeight: 44,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: i > 0 ? '2px solid #007bbf' : 'none',
              background: isActive ? '#ffe066' : 'transparent',
              color: '#000',
              fontWeight: isActive ? 'bold'    : 'normal',
              fontFamily: 'Arial Black, sans-serif',
              cursor:     'pointer',
              userSelect: 'none',
            }}
          >
            {iconContent}
            {isProfile && (
              <span style={{
                maxWidth: '100%',
                fontSize: '0.8rem',
                marginTop: '2px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis'
              }}>
                {label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

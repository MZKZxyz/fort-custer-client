import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const navigate                = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/users/login', { email, password });

      // save auth info
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userEmail', res.data.user.email);

      // save subProfiles array
      const subs = res.data.user.subProfiles || [];
      localStorage.setItem('subProfiles', JSON.stringify(subs));

      if (subs.length === 0) {
        // no profiles yet: take them to the profile page to create one
        navigate('/profiles');
      } else if (subs.length === 1) {
        // exactly one: auto-select it and continue
        localStorage.setItem('activeSubProfile', JSON.stringify(subs[0]));
        // notify any listeners
        window.dispatchEvent(new Event('activeSubProfileChanged'));
        // go to your main app route (change “/app” to whatever is your post-login landing)
        navigate('/app');
      } else {
        // multiple: let them choose
        navigate('/profiles');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{
      background: '#ffe066',
      minHeight: '100vh',
      padding: '2rem 1rem',
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: '360px',
        margin: '0 auto',
        background: '#fff',
        border: '4px solid #000',
        borderRadius: '8px',
        boxShadow: '4px 4px 0 #000',
        padding: '1.5rem',
      }}>
        <h2 style={{
          textAlign: 'center',
          margin: '0 0 1rem',
          fontSize: '1.75rem',
          fontFamily: 'Arial Black, sans-serif',
        }}>
          🔒 Login
        </h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              margin: '0.5rem 0',
              fontSize: '1rem',
              border: '2px solid #000',
              borderRadius: '4px',
              boxShadow: '2px 2px 0 #000',
              boxSizing: 'border-box',
            }}
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              margin: '0.5rem 0 1rem',
              fontSize: '1rem',
              border: '2px solid #000',
              borderRadius: '4px',
              boxShadow: '2px 2px 0 #000',
              boxSizing: 'border-box',
            }}
          />

          <button type="submit" style={{
            width: '100%',
            padding: '0.75rem',
            background: 'red',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 'bold',
            border: '2px solid #000',
            borderRadius: '4px',
            boxShadow: '4px 4px 0 #000',
            cursor: 'pointer',
          }}>
            Login
          </button>

          {error && (
            <p style={{
              color: 'red',
              textAlign: 'center',
              marginTop: '0.75rem',
              fontWeight: 'bold',
            }}>
              {error}
            </p>
          )}
        </form>

        <p style={{
          textAlign: 'center',
          margin: '1rem 0 0',
          fontSize: '0.9rem',
        }}>
          Don’t have an account?{' '}
          <a
            href="/register"
            style={{ color: 'blue', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            Register
          </a>
        </p>
      </div>
    </div>
  );
}

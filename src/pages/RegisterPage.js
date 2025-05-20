// src/pages/RegisterPage.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

export default function RegisterPage() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]               = useState('');
  const navigate                        = useNavigate();

  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await API.post('/users/register', { email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div style={{
      display: 'flex',              // <–– add this
      justifyContent: 'center',     // <–– add this
      alignItems: 'center',         // <–– add this
      background: '#ffe066',
      minHeight: '100vh',
      // padding: '2rem 1rem',
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
          🆕 Register
        </h2>

        <form onSubmit={handleRegister}>
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
              margin: '0.5rem 0',
              fontSize: '1rem',
              border: `2px solid ${passwordsMatch || !confirmPassword ? '#000' : 'red'}`,
              borderRadius: '4px',
              boxShadow: '2px 2px 0 #000',
              boxSizing: 'border-box',
            }}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              margin: '0.5rem 0 1rem',
              fontSize: '1rem',
              border: `2px solid ${passwordsMatch ? '#000' : 'red'}`,
              borderRadius: '4px',
              boxShadow: '2px 2px 0 #000',
              boxSizing: 'border-box',
            }}
          />

          <button
            type="submit"
            disabled={!passwordsMatch}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: passwordsMatch ? '#007bff' : '#999',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 'bold',
              border: '2px solid #000',
              borderRadius: '4px',
              boxShadow: '4px 4px 0 #000',
              cursor: passwordsMatch ? 'pointer' : 'not-allowed',
            }}
          >
            Register
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
          Already have an account?{' '}
          <a
            href="/login"
            style={{ color: 'blue', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            Login
          </a>
        </p>
      </div>
    </div>
  );
}

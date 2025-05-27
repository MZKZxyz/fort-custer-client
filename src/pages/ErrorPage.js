import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ErrorPage() {
  const navigate = useNavigate();
  // Read token to conditionally show protected link
  const token = localStorage.getItem('token');

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#ffe066',
      minHeight: '100vh',
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
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: '1.75rem',
          fontFamily: 'Arial Black, sans-serif',
          margin: '0 0 1rem',
        }}>
          500 - Server Error
        </h2>
        <p style={{
          fontSize: '1rem',
          marginBottom: '1.5rem',
        }}>
          Oops! Something went wrong on our end.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.75rem',
              background: 'red',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 'bold',
              border: '2px solid #000',
              borderRadius: '4px',
              boxShadow: '4px 4px 0 #000',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
          <Link
            to="/"
            style={{
              display: 'block',
              padding: '0.75rem',
              background: '#007bff',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 'bold',
              textDecoration: 'none',
              border: '2px solid #000',
              borderRadius: '4px',
              boxShadow: '4px 4px 0 #000',
              cursor: 'pointer',
            }}
          >
            Home
          </Link>
          {token && (
            <Link
              to="/profiles"
              style={{
                display: 'block',
                padding: '0.75rem',
                background: '#28a745',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 'bold',
                textDecoration: 'none',
                border: '2px solid #000',
                borderRadius: '4px',
                boxShadow: '4px 4px 0 #000',
                cursor: 'pointer',
              }}
            >
              My Profiles
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

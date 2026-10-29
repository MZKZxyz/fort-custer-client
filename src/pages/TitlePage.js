import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/TitlePage.css';
import { parsed } from '../archive/identity';

export default function TitlePage() {
  const navigate = useNavigate();

  const handleStart = () => {
    // Check login state
    const token = localStorage.getItem('token');
    if (!token) {
      // Not logged in: go to login
      navigate('/login');
      return;
    }

    // Logged in: perform post-login logic
    const cached = parsed('subProfiles');
    const subs = Array.isArray(cached) ? cached.filter(profile => typeof profile?._id === 'string') : [];
    if (subs.length === 0) {
      // No sub-profiles: prompt to create one
      navigate('/profiles');
    } else if (subs.length === 1) {
      // Exactly one: select and go to maze collection
      localStorage.setItem('activeSubProfile', JSON.stringify(subs[0]));
      window.dispatchEvent(new Event('activeSubProfileChanged'));
      navigate('/mazes');
    } else {
      // Multiple: let user choose
      navigate('/profiles');
    }
  };

  return (
    <div className="title-page">
      <img
        src="/assets/titleScreen.png"
        alt="Fort Custer Maze"
        className="title-page__image"
      />
      <button
        className="title-page__start-button"
        onClick={handleStart}
      >
        Play
      </button>
    </div>
  );
}

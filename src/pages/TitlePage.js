import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/TitlePage.css';
// import titleImage from '../../public/assets/titleScreen.png';

export default function TitlePage() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/login');
  };

  return (
    <div className="title-page">
      <img
        src='/assets/titleScreen.png'
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

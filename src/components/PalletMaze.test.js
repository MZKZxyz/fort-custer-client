import { render, fireEvent, screen } from '@testing-library/react';

import { createMazeScene } from '../game/scene';
jest.mock('../game/characterArt', () => ({
  localCharacter: { character: 'boy', source: 'source-1' },
  characterAsset: (_mode, direction, layer) => direction ? `/__local-meshy/${direction}-${layer}.png` : null,
}));
test('missing local layer replaces the whole facing with pilot, without losing surface or attempt', () => {
  const prior = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  try {
    const PalletMaze = require('./PalletMaze').default;
    const scene = createMazeScene({ grid: [['S', ' ', 'E']], position: [0, 0], inventory: [], completed: false });
    const fallback = jest.fn();
    const { container, rerender } = render(<PalletMaze scene={scene} facing="down" onFallback={fallback} />);
    const surface = container.querySelector('[data-maze-surface]');
    const images = () => [...container.querySelectorAll('[data-role="explorer-down"]')];
    expect(images()).toHaveLength(2);
    fireEvent.error(images()[0]);
    expect(images().every(i => !i.src.includes('__local-meshy'))).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('using pilot');
    rerender(<PalletMaze scene={scene} facing="right" onFallback={fallback} />);
    expect(container.querySelector('[data-maze-surface]')).toBe(surface);
    expect(container.querySelector('[data-role="explorer-right"]')).toHaveAttribute('data-character-art', 'boy');
    rerender(<PalletMaze scene={scene} facing="down" onFallback={fallback} />);
    expect(images().every(i => !i.src.includes('__local-meshy'))).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Use classic view' }));
    expect(fallback).toHaveBeenCalledTimes(1);
  } finally { process.env.NODE_ENV = prior; }
});

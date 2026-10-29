// These values are replaced at compile time. Production cannot select local art.
export function characterArtMode(env) {
  if (env.NODE_ENV !== 'development' || env.REACT_APP_MAZE_VISUAL_INTEGRATION !== 'true' ||
      env.REACT_APP_MAZE_CHARACTER_ART !== 'meshy-local') return null;
  const character = env.REACT_APP_MAZE_CHARACTER_SOURCE || 'boy';
  if (!['boy', 'girl'].includes(character)) return null;
  return { source: character === 'boy' ? 'source-1' : 'source-2', character };
}
export const localCharacter = characterArtMode({
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_MAZE_VISUAL_INTEGRATION: process.env.REACT_APP_MAZE_VISUAL_INTEGRATION,
  REACT_APP_MAZE_CHARACTER_ART: process.env.REACT_APP_MAZE_CHARACTER_ART,
  REACT_APP_MAZE_CHARACTER_SOURCE: process.env.REACT_APP_MAZE_CHARACTER_SOURCE,
});
const facings = { up: 'north', right: 'east', down: 'south', left: 'west' };
export function characterAsset(mode, direction, layer) {
  if (!mode || !facings[direction] || !['body', 'shadow'].includes(layer)) return null;
  return `/__local-meshy/${mode.source}-1.15-${facings[direction]}-daylight-${layer}.png`;
}

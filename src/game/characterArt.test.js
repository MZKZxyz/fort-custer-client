import { characterArtMode, characterAsset } from './characterArt';
const enabled = { NODE_ENV: 'development', REACT_APP_MAZE_VISUAL_INTEGRATION: 'true', REACT_APP_MAZE_CHARACTER_ART: 'meshy-local' };
test('requires both gates and development regardless of preferences', () => {
  expect(characterArtMode(enabled).character).toBe('boy');
  for (const changes of [{ NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { REACT_APP_MAZE_VISUAL_INTEGRATION: 'false' }, { REACT_APP_MAZE_CHARACTER_ART: undefined }, { REACT_APP_MAZE_CHARACTER_SOURCE: 'unknown' }]) {
    expect(characterArtMode({ ...enabled, ...changes })).toBeNull();
  }
});
for (const [character, source] of [['boy', 'source-1'], ['girl', 'source-2']]) {
  test(`${character}: all four approved 1.15 daylight frames`, () => {
    const mode = characterArtMode({ ...enabled, REACT_APP_MAZE_CHARACTER_SOURCE: character });
    for (const [game, art] of Object.entries({ up: 'north', right: 'east', down: 'south', left: 'west' })) {
      for (const layer of ['body', 'shadow']) expect(characterAsset(mode, game, layer)).toBe(`/__local-meshy/${source}-1.15-${art}-daylight-${layer}.png`);
    }
    expect(characterAsset(null, 'down', 'body')).toBeNull();
    expect(characterAsset(mode, 'unknown', 'body')).toBeNull();
    expect(characterAsset(mode, 'down', 'unknown')).toBeNull();
  });
}

import { commandOutcome } from './commandOutcome';
import { move } from './movement';

test('controller outcomes distinguish obstruction, stationary clear, step and completion', () => {
  let state = { grid: [['S', 'X', 'F', 'E']], position: [0, 0], inventory: [], completed: false };
  expect(commandOutcome(state, move(state, 'up'))).toMatchObject({ reason: 'obstruction', terminal: true });
  for (const [reason, terminal, position] of [['step', false, [0, 1]], ['fire cleared', true, [0, 1]], ['step', false, [0, 2]], ['complete', true, [0, 3]]]) {
    const result = move(state, 'right');
    expect(commandOutcome(state, result)).toMatchObject({ reason, terminal });
    expect(result.state.position).toEqual(position);
    state = result.state;
  }
});
test('unequipped fire is a distinct blocked outcome', () => {
  const state = { grid: [['S', 'F']], position: [0, 0], inventory: [], completed: false };
  expect(commandOutcome(state, move(state, 'right'))).toMatchObject({ reason: 'fire blocked', terminal: true });
});

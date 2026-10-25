// Describes a committed canonical move for input adapters. No timers, repeat,
// pointer ownership, state mutation or controller policy lives at this boundary.
export function commandOutcome(before, result) {
  const after = result.state;
  const stationary = after.position.every((value, index) => value === before.position[index]);
  const reason = after === before ? (result.blockedByFire ? 'fire blocked' : 'obstruction')
    : after.completed ? 'complete' : stationary ? 'fire cleared' : 'step';
  const messages = {
    obstruction: 'A wall or maze edge blocks this direction.',
    'fire blocked': 'Fire blocks the path. Find an extinguisher.',
    'fire cleared': 'Fire cleared. Extinguisher used. You stayed in place; press again to advance.',
    complete: 'Tipi reached. Saving your result…',
    step: after.inventory.length > before.inventory.length ? 'Extinguisher picked up. One charge equipped.' : 'Moved one cell.',
  };
  return Object.freeze({ reason, terminal: reason !== 'step', message: messages[reason] });
}

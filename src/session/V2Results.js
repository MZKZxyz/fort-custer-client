import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ATTEMPT_KEY, RECEIPT_KEY, identityDigest, receiptView } from './contract';
import { formatElapsed } from '../game/movement';
import NavBar from '../components/NavBar';

export default function V2Results() {
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = JSON.parse(localStorage.getItem(RECEIPT_KEY));
        const profile = JSON.parse(localStorage.getItem('activeSubProfile'));
        if (stored?.version !== 1 || stored.identityHash !== await identityDigest(localStorage.getItem('token'))
          || stored.profileId !== profile?._id || stored.date !== localStorage.getItem('selectedMazeDate')
          || !['official', 'untimed'].includes(stored.receipt?.timing.status)) throw new Error('RECEIPT_SCOPE');
        const pending = JSON.parse(localStorage.getItem(ATTEMPT_KEY));
        if (pending && (pending.attemptId !== stored.attemptId || pending.phase !== 'accepted')) throw new Error('RESULT_UNRESOLVED');
        if (active) {
          setReceipt(receiptView({ ...stored.receipt, attemptId: stored.attemptId,
            status: 'accepted', routeValidated: true, progress: { completed: true } }, stored));
          // Receipt is durable and owned; displaying it releases local recovery.
          if (pending) localStorage.removeItem(ATTEMPT_KEY);
        }
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; };
  }, []);
  if (error) return <main className="page-with-nav"><div role="alert"><h1>Result needs recovery</h1>
    <p>Restore the original sign-in, profile and maze date, then recover the original attempt.</p>
    <button onClick={() => navigate('/maze')}>Recover original attempt</button></div></main>;
  if (!receipt) return <p role="status">Loading saved receipt…</p>;
  const status = receipt.collectible.status;
  const nextDate = new Date(`${receipt.date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const next = nextDate.toISOString().slice(0, 10);
  return <main className="page-with-nav" style={{ padding: '1rem', overflowWrap: 'anywhere' }}>
    <h1>Maze complete</h1><p>{receipt.date}</p>
    <p>{receipt.timing.status === 'untimed' ? 'Accepted untimed completion. Your maze date is saved.'
      : `Official server time: ${formatElapsed(receipt.timing.elapsedMs)}`}</p>
    <p>The gameplay timer was provisional. Network and acknowledgment delays are not compensated.</p>
    {status === 'awarded' && <section aria-label="Saved collectible"><h2>Collectible saved</h2>
      <p>{receipt.collectible.reward?.emoji} {receipt.collectible.reward?.name}</p>
      <p>{receipt.collectible.reward?.description}</p></section>}
    {status === 'exhausted' && <p>This date’s collectible opportunity is complete. No unowned item remained.</p>}
    {status === 'already-used' && <p>This date’s collectible opportunity was already used. No additional item was awarded.</p>}
    {status === 'review-required' && <p>Your completion is saved. This date’s collectible history needs review.</p>}
    {status === 'pending' && <p>Your completion is saved. Its collectible opportunity is recorded and pending.</p>}
    <button onClick={() => navigate('/maze')}>Replay Maze</button>
    <button disabled={next > new Date().toISOString().slice(0, 10)} onClick={() => {
      localStorage.setItem('selectedMazeDate', next); navigate('/maze');
    }}>Next Maze</button><NavBar />
  </main>;
}

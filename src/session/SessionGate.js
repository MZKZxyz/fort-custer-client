import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ATTEMPT_KEY, EXPERIMENTAL_V2, createContract } from './contract';
import { PlayableSession } from './playableSession';

export function pendingV2() {
  try { return Boolean(localStorage.getItem(ATTEMPT_KEY)); } catch { return EXPERIMENTAL_V2; }
}
export function recoveryMessage(error) {
  const code = error?.response?.data?.error || error?.code;
  const messages = {
    STORAGE_UNAVAILABLE: 'Durable storage is unavailable. Gameplay is stopped to protect your original attempt. Restore storage, then recover.',
    ATTEMPT_SCOPE: 'An original v2 attempt belongs to a different sign-in, profile or maze date. Restore that selection to recover it.',
    CONTEXT_CHANGED: 'Your sign-in, profile or maze date changed. Restore the original selection to recover this attempt.',
    TAB_BUSY: 'This v2 attempt is open in another tab. Close that game tab, then recover here.',
    LOCKS_UNAVAILABLE: 'This browser cannot safely coordinate v2 tabs. Use a secure browser with Web Locks support.',
    PREFIX_INVALID: 'The saved command history is inconsistent. Review or explicitly abandon this attempt; no progress was invented.',
    PREFIX_MISSING: 'The saved command history is missing. Review or explicitly abandon this attempt.',
    CHECKPOINT_INVALID: 'The saved scene does not match its command history. Review or explicitly abandon this attempt.',
    TRANSCRIPT_LIMIT: 'This run reached the recording limit. Movement stopped before an unrecorded command. Abandon explicitly to start a new run.',
    SESSION_EXPIRED: 'The server reports that this attempt expired. You can explicitly release it and start again.',
    SESSION_ABANDONED: 'The server reports that this attempt was abandoned. You can explicitly release it and start again.',
    CHECK_DEADLINE: 'This attempt may have reached its deadline. Recover the owned server status before continuing.',
    INPUT_LOCKED: 'Movement is stopped. Recover the original attempt and its deadline before continuing.',
    OFFLINE: 'The connection was interrupted. Your recorded commands are retained. Recover the original attempt when connected.',
    AUTH_REQUIRED: 'Sign in to the original account, then recover this attempt.',
    RESOLVE_SAVE_FIRST: 'A completion may already be saved. Recover its original result before starting another run.',
  };
  return messages[code] || 'The v2 operation could not be confirmed. Movement is stopped. Recover the original attempt; your keys and commands are retained.';
}

export default function SessionGate({ children }) {
  const navigate = useNavigate();
  const sessionRef = useRef(null);
  const operationRef = useRef(false);
  const titleRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [legacy, setLegacy] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(true);
  const [generation, setGeneration] = useState(0);
  const mounted = useRef(false);
  const display = result => {
    if (!mounted.current) return;
    if (result.receipt) navigate('/results?protocol=session-v2');
    else if (result.legacy) setLegacy(true);
    else { setSnapshot(result); setGeneration(value => value + 1); }
  };
  useEffect(() => {
    mounted.current = true;
    let active = true, release;
    const held = new Promise(resolve => { release = resolve; });
    async function run(lock) {
      if (!active) return;
      if (!lock) { setError({ code: 'TAB_BUSY' }); setBusy(false); return; }
      try {
        const profileId = JSON.parse(localStorage.getItem('activeSubProfile'))?._id;
        const date = localStorage.getItem('selectedMazeDate') || new Date().toISOString().slice(0, 10);
        const token = localStorage.getItem('token');
        if (!profileId || !token) throw new Error('AUTH_REQUIRED');
        const session = new PlayableSession({ api: createContract(token), profileId, date, token });
        sessionRef.current = session;
        const result = await session.initialize();
        if (active) display(result);
        if (result.legacy) return;
      } catch (failure) { if (active) setError(failure); }
      finally { if (active) setBusy(false); }
      // Keep the lock through the last outstanding operation and tab lifetime.
      await held;
    }
    if (!EXPERIMENTAL_V2) { setError({ code: 'FLAG_OFF' }); setBusy(false); }
    else if (!navigator.locks) { setError({ code: 'LOCKS_UNAVAILABLE' }); setBusy(false); }
    else Promise.resolve().then(() => {
      // StrictMode's discarded effect must not compete with its replacement.
      if (active) return navigator.locks.request('fc.session-v2.gameplay', { ifAvailable: true }, run);
    }).catch(failure => { if (active) { setError(failure); setBusy(false); } });
    return () => { active = false; mounted.current = false; sessionRef.current?.interrupt(); release(); };
    // The lock owns the mounted attempt; context checks guard every command/request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fail = useCallback(failure => { sessionRef.current?.interrupt(); setError(failure); }, []);
  const attached = useMemo(() => ({ session: sessionRef.current, snapshot, fail, generation }), [snapshot, fail, generation]);
  useEffect(() => { if (error) titleRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (legacy) return;
    const offline = () => fail({ code: 'OFFLINE' });
    window.addEventListener('offline', offline);
    return () => window.removeEventListener('offline', offline);
  }, [fail, legacy]);
  const retry = async () => {
    if (busy || operationRef.current) return;
    operationRef.current = true;
    setBusy(true);
    try {
      if (!sessionRef.current?.record) { window.location.reload(); return; }
      const result = await sessionRef.current.resolve();
      setError(null); display(result);
    } catch (failure) { fail(failure); }
    finally { operationRef.current = false; setBusy(false); }
  };
  const abandon = async () => {
    if (busy || operationRef.current || !window.confirm('Abandon this original v2 attempt? Recorded progress will be lost only after the server confirms it is terminal.')) return;
    operationRef.current = true;
    setBusy(true);
    try { await sessionRef.current.abandon(); window.location.reload(); }
    catch (failure) { fail(failure); }
    finally { operationRef.current = false; setBusy(false); }
  };
  if (legacy) return children(null);
  if (error) return <div className="maze-page"><div role="alert">
    <h1 ref={titleRef} tabIndex={-1}>Recover v2 gameplay</h1><p>{error.code === 'FLAG_OFF'
      ? 'An unresolved v2 attempt is stored here. Reopen the experimental build with the original sign-in, profile and maze date to recover it. Legacy gameplay will not replace it.'
      : recoveryMessage(error)}</p>
    {EXPERIMENTAL_V2 && <button disabled={busy} onClick={retry}>Recover original attempt</button>}
    {sessionRef.current?.record?.attemptId && !sessionRef.current.record.completion
      && sessionRef.current.session?.saveStatus !== 'resolving' && sessionRef.current.session?.state !== 'COMPLETED'
      && <button disabled={busy} onClick={abandon}>Abandon attempt and restart</button>}
    <button onClick={() => navigate('/mazes')}>Back to mazes</button>
  </div></div>;
  if (!snapshot) return <div className="maze-page"><p role="status">Preparing gameplay…</p></div>;
  return children(attached);
}

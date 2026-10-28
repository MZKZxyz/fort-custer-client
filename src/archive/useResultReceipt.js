import { useEffect, useLayoutEffect, useMemo, useReducer, useState } from 'react';
import { flushSync } from 'react-dom';
import { accountId, readIdentity, stored } from './identity';
import { resultIdentityHash, validResultReceipt } from './resultReceipt';

export default function useResultReceipt() {
  const [, refresh] = useReducer(value => value + 1, 0);
  const identity = readIdentity();
  const raw = stored('mazeResultContext', sessionStorage);
  const context = useMemo(() => { try { return JSON.parse(raw); } catch { return null; } }, [raw]);
  const [proof, setProof] = useState(null);
  const candidate = validResultReceipt(context) && identity.token
    && context.profileId === identity.profile?._id
    && context.accountId === accountId(identity.token);
  useLayoutEffect(() => {
    // Hide before an identity-change event returns, not after catalog effects or timers.
    const sync = () => flushSync(refresh);
    const events = ['storage', 'activeSubProfileChanged', 'authChanged', 'focus', 'pageshow', 'mazeResultSaved'];
    events.forEach(name => window.addEventListener(name, sync));
    document.addEventListener('visibilitychange', sync);
    return () => {
      events.forEach(name => window.removeEventListener(name, sync));
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (candidate) resultIdentityHash(identity.token).then(hash => {
      if (active && readIdentity().key === identity.key && stored('mazeResultContext', sessionStorage) === raw) {
        setProof({ identityKey: identity.key, raw, hash });
      }
    }).catch(() => { if (active) setProof(null); });
    return () => { active = false; };
  }, [candidate, identity.key, identity.token, raw]);
  // These live checks also reject stale proof during unrelated/delayed React updates.
  const authorized = candidate && proof?.identityKey === identity.key && proof.raw === raw
    && proof.hash === context.identityHash;
  return { identity, raw: authorized ? raw : null, context: authorized ? context : null };
}

import { useEffect, useState } from 'react';
import { isDate } from './dates';

export function stored(key, storage = localStorage) {
  try { return storage.getItem(key); } catch { return null; }
}
export function parsed(key, storage = localStorage) {
  try { return JSON.parse(stored(key, storage)); } catch { return null; }
}
export function readIdentity() {
  const profile = parsed('activeSubProfile');
  const token = stored('token');
  return { token, profile: typeof profile?._id === 'string' ? profile : null,
    key: JSON.stringify([token, profile?._id || null]) };
}
export function useIdentity() {
  const [identity, setIdentity] = useState(readIdentity);
  useEffect(() => {
    const sync = () => setIdentity(previous => {
      const next = readIdentity();
      return next.key === previous.key && next.profile?.name === previous.profile?.name ? previous : next;
    });
    const events = ['storage', 'activeSubProfileChanged', 'focus', 'pageshow', 'authChanged'];
    events.forEach(name => window.addEventListener(name, sync));
    return () => events.forEach(name => window.removeEventListener(name, sync));
  }, []);
  return identity;
}
// This is a local scope hint only; the API always verifies profile ownership.
export function accountId(token) {
  try {
    const id = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id;
    return /^[a-f0-9]{24}$/.test(id) ? id : null;
  } catch { return null; }
}
export function pendingCompletion(profileId, date) {
  const value = parsed(`mazeCompletion:${profileId}:${date}`, sessionStorage);
  return typeof value?.attemptId === 'string' ? value : null;
}
export function pendingCompletions(identity) {
  const dates = [];
  if (!identity.profile || !identity.token) return dates;
  try {
    const prefix = `mazeCompletion:${identity.profile._id}:`;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key.startsWith(prefix)) continue;
      const date = key.slice(prefix.length), record = pendingCompletion(identity.profile._id, date);
      if (isDate(date) && record && (!record.accountId || record.accountId === accountId(identity.token))) dates.push(date);
    }
  } catch { /* storage unavailable; the date selection/start path also fails closed */ }
  return dates.sort();
}

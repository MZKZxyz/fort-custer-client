import { useCallback, useEffect, useState } from 'react';
import API from '../utils/api';
import { catalogFresh, catalogProblem, validateCatalog } from './catalog';
import { useIdentity } from './identity';

export default function useCatalog(month = null) {
  const identity = useIdentity();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: 'loading' });
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const scope = JSON.stringify([identity.key, month]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const startedAt = performance.now();
    setState(previous => ({ ...(previous.identityKey === identity.key ? previous : {}),
      scope, identityKey: identity.key, status: 'loading', problem: null }));
    const request = async privateRead => {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (privateRead) params.set('subProfileId', identity.profile._id);
      const query = params.toString();
      const response = await API.get(`/maze/archive${query ? `?${query}` : ''}`, {
        signal: controller.signal, timeout: 10000,
        headers: { Authorization: identity.token ? `Bearer ${identity.token}` : null },
      });
      const data = validateCatalog(response.data, month);
      return privateRead ? data : { ...data,
        items: data.items.map(item => ({ ...item, progress: undefined })),
        todayMaze: { ...data.todayMaze, progress: undefined } };
    };
    async function load() {
      let data, progressProblem = null;
      const privateRead = Boolean(identity.token && identity.profile);
      try {
        try { data = await request(privateRead); }
        catch (error) {
          const problem = catalogProblem(error);
          if (!privateRead || problem.kind !== 'unavailable' || controller.signal.aborted) throw error;
          progressProblem = 'Completion status unavailable. Retry to refresh it.';
          data = await request(false);
        }
        if (active) setState({ data, scope, identityKey: identity.key, startedAt, status: 'ready', progressProblem });
      } catch (error) {
        if (active) setState(previous => ({ ...previous, scope, status: 'error', problem: catalogProblem(error) }));
      }
    }
    load();
    return () => { active = false; controller.abort(); };
  }, [scope, identity, month, revision]);
  useEffect(() => {
    const visible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('mazeResultSaved', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('mazeResultSaved', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  useEffect(() => {
    if (state.scope !== scope || state.status !== 'ready') return;
    const remaining = Date.parse(state.data.nextDayAt) - Date.parse(state.data.serverNow)
      - (performance.now() - state.startedAt);
    const timer = setTimeout(refresh, Math.max(1000, Math.min(60000, remaining)));
    return () => clearTimeout(timer);
  }, [state, scope, refresh]);
  // A render with a new identity must never expose the previous private projection.
  const current = state.scope === scope ? state : { status: 'loading',
    ...(state.identityKey === identity.key ? { data: state.data } : {}) };
  return { ...current, identity, refresh, usable: catalogFresh(current) };
}

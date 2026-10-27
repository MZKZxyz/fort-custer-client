import axios from 'axios';
import API from '../utils/api';

export const PROTOCOL = 'session-v2';
export const CAPABILITY = 'route-transcript-v1';
export const MAX_COMMANDS = 65536;
export const MAX_BYTES = 2097152;
export const ATTEMPT_KEY = 'fc.session-v2.attempt.v1';
export const RECEIPT_KEY = 'fc.session-v2.receipt.v1';
export const EXPERIMENTAL_V2 = process.env.REACT_APP_EXPERIMENTAL_SESSION_V2 === 'true';
export const directions = ['up', 'down', 'left', 'right'];
export const problem = code => Object.assign(new Error(code), { code });
export const transcript = commands => ({ version: CAPABILITY, commands });
export async function digest(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const result = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function identityDigest(token) {
  // JWT payload is only a local scope hint. The server must authenticate EVERY
  // request. Same-account token renewal can recover; a token change mid-input
  // still cancels and requires a new owned status/ACK cycle.
  try {
    const parts = token.split('.');
    const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (parts.length === 3 && /^[a-f0-9]{24}$/.test(payload.id)) return digest({ accountId: payload.id });
  } catch { /* opaque tokens remain exact-bound; the server rejects invalid auth */ }
  return digest(token);
}
export function randomKey() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Separate transport prevents the legacy interceptor from rebinding an in-flight
// attempt to a newly selected token. Callers check the original context each time.
export function createContract(token) {
  const transport = axios.create({ baseURL: API.defaults?.baseURL, timeout: 15000,
    headers: { Authorization: `Bearer ${token}`, 'X-Fort-Custer-Protocol': PROTOCOL,
      'X-Fort-Custer-Capabilities': CAPABILITY } });
  const get = async (path, profile) => (await transport.get(`/v2/${path}`, {
    ...(profile ? { params: { subProfileId: profile } } : {}),
  })).data;
  const post = async (path, body, revision) => (await transport.post(`/v2/${path}`, body,
    { headers: revision ? { 'If-Match': String(revision) } : {} })).data;
  return {
    capabilities: () => get('capabilities'),
    create: body => post('sessions', body),
    status: (id, profile) => get(`sessions/${id}/status`, profile),
    result: (id, profile) => get(`sessions/${id}/result`, profile),
    ready: (id, body, revision) => post(`sessions/${id}/ready`, body, revision),
    complete: (id, body, revision) => post(`sessions/${id}/complete`, body, revision),
    recover: (id, profile) => post(`sessions/${id}/recover`, { subProfileId: profile }),
    abandon: (id, body, revision) => post(`sessions/${id}/abandon`, body, revision),
  };
}

export function allowed(capabilities) {
  return capabilities?.protocol === PROTOCOL && capabilities.admission === true
    && Array.isArray(capabilities.capabilities) && capabilities.capabilities.includes(CAPABILITY);
}

// Render a small explicit allowlist, never server messages, IDs or arbitrary URLs.
export function receiptView(value, attempt) {
  if (value?.protocol !== PROTOCOL || value.attemptId !== attempt.attemptId
    || value.date !== attempt.date || value.status !== 'accepted' || value.routeValidated !== true
    || value.progress?.completed !== true || !['official', 'untimed'].includes(value.timing?.status)
    || (value.timing.status === 'untimed' ? value.timing.elapsedMs !== null
      : !Number.isSafeInteger(value.timing.elapsedMs) || value.timing.elapsedMs < 0)) throw problem('RECEIPT_INVALID');
  const statuses = ['awarded', 'exhausted', 'review-required', 'already-used', 'pending'];
  if (!statuses.includes(value.collectible?.status)) throw problem('RECEIPT_INVALID');
  const reward = value.collectible.reward;
  return { protocol: PROTOCOL, date: value.date, timing: {
    status: value.timing.status, elapsedMs: value.timing.elapsedMs,
  }, collectible: { status: value.collectible.status,
    ...(reward && value.collectible.status === 'awarded' ? { reward: Object.fromEntries(
      ['name', 'description', 'emoji', 'category', 'rarity'].filter(key => typeof reward[key] === 'string')
        .map(key => [key, reward[key].slice(0, key === 'description' ? 2000 : 200)])) } : {}),
  } };
}

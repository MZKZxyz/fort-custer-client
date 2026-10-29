import { accountId } from './identity';
import { isDate } from './dates';

// Local UI scope only. Authentication and result persistence remain server-owned.
export async function resultIdentityHash(token) {
  if (typeof token !== 'string' || !token) throw new Error('RESULT_OWNER_REQUIRED');
  const id = accountId(token);
  const bytes = new TextEncoder().encode(JSON.stringify(id ? { accountId: id } : { token }));
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

export function validResultReceipt(context) {
  const receipt = context?.receipt;
  const reward = receipt?.reward;
  return context?.version === 2 && isDate(context.date)
    && typeof context.profileId === 'string' && context.profileId.length > 0 && context.profileId.length <= 128
    && (context.accountId === null || /^[a-f0-9]{24}$/.test(context.accountId))
    && typeof context.identityHash === 'string' && /^[a-f0-9]{64}$/.test(context.identityHash)
    && receipt && typeof receipt === 'object' && !Array.isArray(receipt)
    && typeof receipt.time === 'string' && /^\d+(?:\.\d+)?$/.test(receipt.time)
    && Number.isFinite(Number(receipt.time)) && Number(receipt.time) < 8640000000000
    && typeof receipt.newRecord === 'boolean'
    && (receipt.attemptId === undefined || (typeof receipt.attemptId === 'string' && receipt.attemptId.length > 0))
    && (reward === null || (typeof reward === 'object' && !Array.isArray(reward)
      && ['name', 'image', 'description', 'emoji', 'category', 'rarity']
        .every(key => reward[key] === undefined || typeof reward[key] === 'string')));
}

export async function createResultReceipt(identity, { date, time, reward, attemptId }) {
  const result = { version: 2, date, profileId: identity.profile?._id,
    accountId: accountId(identity.token), identityHash: await resultIdentityHash(identity.token),
    receipt: { time: String(time), reward: reward ?? null, newRecord: false,
      ...(attemptId ? { attemptId } : {}) } };
  if (!validResultReceipt(result)) throw new Error('INVALID_RESULT_RECEIPT');
  return result;
}

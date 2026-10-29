import { createResultReceipt, resultIdentityHash, validResultReceipt } from './resultReceipt';
const profile={_id:'00000000000000000000000a'};
const jwt=(id,nonce)=>`header.${btoa(JSON.stringify({id,nonce}))}.signature`;
test('same account token renewal preserves ownership, while accounts and opaque sign-ins differ',async()=>{
  const a='000000000000000000000001',b='000000000000000000000002';
  expect(await resultIdentityHash(jwt(a,1))).toBe(await resultIdentityHash(jwt(a,2)));
  expect(await resultIdentityHash(jwt(a,1))).not.toBe(await resultIdentityHash(jwt(b,1)));
  expect(await resultIdentityHash('opaque-a')).not.toBe(await resultIdentityHash('opaque-b'));
});
test('new context binds exact result fields and original UUID without persisting bearer credentials',async()=>{
  const token='opaque-sensitive-fixture';
  const receipt=await createResultReceipt({token,profile},{date:'2028-02-29',time:'8.123',reward:null,attemptId:'original-attempt'});
  expect(validResultReceipt(receipt)).toBe(true);
  expect(receipt.receipt).toEqual({time:'8.123',reward:null,newRecord:false,attemptId:'original-attempt'});
  expect(JSON.stringify(receipt)).not.toContain(token);
});
test.each([
  {version:1}, {date:'2028-02-30'}, {identityHash:null}, {accountId:undefined}, {profileId:''},
  {receipt:{time:'garbage',reward:null,newRecord:false}}, {receipt:{time:'8.123',reward:{name:{}},newRecord:false}},
])('malformed owner/receipt metadata is refused: %j',async invalid=>{
  const receipt=await createResultReceipt({token:'opaque',profile},{date:'2028-02-29',time:'8.123',reward:null});
  expect(validResultReceipt({...receipt,...invalid})).toBeFalsy();
});

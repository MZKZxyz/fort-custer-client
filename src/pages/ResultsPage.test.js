import { act, fireEvent, render, screen } from '@testing-library/react';
import ResultsPage from './ResultsPage';
import { createResultReceipt } from '../archive/resultReceipt';
import * as receipts from '../archive/resultReceipt';
import { readIdentity } from '../archive/identity';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../archive/useCatalog', () => () => ({ status: 'error', usable: false, identity: {}, problem: {kind: 'unavailable', message: 'Archive temporarily unavailable'}, refresh: jest.fn() }));
jest.mock('../components/NavBar', () => () => null);
const profileA = '00000000000000000000000a', profileB = '00000000000000000000000b';
const accountA = '000000000000000000000001', accountB = '000000000000000000000002';
const token = id => `header.${btoa(JSON.stringify({id}))}.signature`;
const reward = { id: 'synthetic', name: 'Original keepsake', image: 'crate.png', description: 'Original private description', category: 'Original category', rarity: 'Original rarity' };
let context, raw;
const noPrivateDetails = () => {
  expect(screen.queryByText('Maze Complete!')).not.toBeInTheDocument();
  expect(screen.queryByText(/February 29, 2028/)).not.toBeInTheDocument();
  expect(screen.queryByText(/You finished in/)).not.toBeInTheDocument();
  expect(screen.queryByText(/personal best/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Original (keepsake|private description|category|rarity)/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {name:'Open reward crate'})).not.toBeInTheDocument();
  expect(screen.queryByRole('img', {name:'Original keepsake'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {name:'Replay Maze'})).not.toBeInTheDocument();
};
const ownerVisible = async () => expect(await screen.findByText(/You finished in/)).toHaveTextContent('02:03.456');
const switchProfile = id => {
  localStorage.setItem('activeSubProfile', JSON.stringify({_id:id,name:id===profileA?'Player A':'Player B'}));
  window.dispatchEvent(new Event('activeSubProfileChanged'));
};
beforeEach(async () => {
  localStorage.clear();sessionStorage.clear();mockNavigate.mockReset();
  localStorage.setItem('token',token(accountA));
  localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileA,name:'Player A'}));
  localStorage.setItem('lastMazeTime','123.456');localStorage.setItem('lastReward',JSON.stringify(reward));localStorage.setItem('lastNewRecord','true');
  localStorage.setItem('selectedMazeDate','2028-02-29');
  context=await createResultReceipt(readIdentity(),{date:'2028-02-29',time:'123.456',reward,attemptId:'01234567-89ab-4cde-8fab-0123456789ab'});
  context.receipt.newRecord=true;raw=JSON.stringify(context);sessionStorage.setItem('mazeResultContext',raw);
});
afterEach(()=>{jest.useRealTimers();jest.restoreAllMocks();});

test('valid owner sees the exact saved millisecond and best status without consuming global state',async()=>{
  render(<ResultsPage/>);await ownerVisible();
  expect(screen.getByText(/personal best/)).toBeInTheDocument();
  expect(localStorage.getItem('lastNewRecord')).toBe('true');
  expect(sessionStorage.getItem('mazeResultContext')).toBe(raw);
});
test('QA reproduction: another player sees no private details on initial render or after effects',async()=>{
  switchProfile(profileB);render(<ResultsPage/>);noPrivateDetails();
  await act(async()=>{});noPrivateDetails();
  expect(localStorage.getItem('lastMazeTime')).toBe('123.456');expect(localStorage.getItem('lastNewRecord')).toBe('true');
  expect(sessionStorage.getItem('mazeResultContext')).toBe(raw);
});
test('mounted A → B → A conceals synchronously and restores the immutable receipt while catalog is offline',async()=>{
  render(<ResultsPage/>);await ownerVisible();
  act(()=>{switchProfile(profileB);noPrivateDetails();});
  expect(sessionStorage.getItem('mazeResultContext')).toBe(raw);
  // Other cached values cannot be rebound to the preserved original receipt.
  localStorage.setItem('lastMazeTime','999.999');localStorage.setItem('lastReward','{"name":"Other reward"}');
  act(()=>switchProfile(profileA));await ownerVisible();
  expect(screen.getByText(/personal best/)).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Open reward crate'})).toBeInTheDocument();
  expect(sessionStorage.getItem('mazeResultContext')).toBe(raw);
});
test.each(['logout','account','missing-profile'])('%s hides before the change event returns; restoring A retains its receipt',async mode=>{
  render(<ResultsPage/>);await ownerVisible();
  act(()=>{
    if(mode==='logout')localStorage.removeItem('token');
    if(mode==='account')localStorage.setItem('token',token(accountB));
    if(mode==='missing-profile')localStorage.removeItem('activeSubProfile');
    window.dispatchEvent(new Event('authChanged'));noPrivateDetails();
  });
  expect(localStorage.getItem('lastNewRecord')).toBe('true');expect(sessionStorage.getItem('mazeResultContext')).toBe(raw);
  act(()=>{localStorage.setItem('token',token(accountA));switchProfile(profileA);});await ownerVisible();
});
test.each([null,'{broken', '{}', '[]', 'null', '{"date":"2028-02-29","profileId":"00000000000000000000000a","accountId":null}'])('unbound or malformed context %s fails closed without mutating cached evidence',async value=>{
  if(value===null)sessionStorage.removeItem('mazeResultContext');else sessionStorage.setItem('mazeResultContext',value);
  render(<ResultsPage/>);noPrivateDetails();await act(async()=>{});noPrivateDetails();
  expect(sessionStorage.getItem('mazeResultContext')).toBe(value);
  expect(localStorage.getItem('lastNewRecord')).toBe('true');
});
test('invalid bound payload or a forged hash cannot render cached fields',async()=>{
  context.identityHash='0'.repeat(64);sessionStorage.setItem('mazeResultContext',JSON.stringify(context));
  render(<ResultsPage/>);await act(async()=>{});noPrivateDetails();
});
test('late identity-proof resolution cannot disclose A under B',async()=>{
  let resolve;const pending=new Promise(yes=>{resolve=yes;});
  jest.spyOn(receipts,'resultIdentityHash').mockReturnValueOnce(pending).mockResolvedValue(context.identityHash);
  render(<ResultsPage/>);act(()=>switchProfile(profileB));
  await act(async()=>resolve(context.identityHash));noPrivateDetails();
  act(()=>switchProfile(profileA));await ownerVisible();
});
test.each([0,600])('reveal callbacks are cancelled after %sms and restored owner still has its reward',async delay=>{
  render(<ResultsPage/>);await ownerVisible();jest.useFakeTimers();
  fireEvent.click(screen.getByRole('button',{name:'Open reward crate'}));
  act(()=>{jest.advanceTimersByTime(delay);switchProfile(profileB);noPrivateDetails();jest.advanceTimersByTime(2000);});noPrivateDetails();
  jest.useRealTimers();act(()=>switchProfile(profileA));await ownerVisible();
  fireEvent.click(screen.getByRole('button',{name:'Open reward crate'}));
  expect(await screen.findByText('Original private description', {}, { timeout: 2500 })).toBeInTheDocument();
  expect(screen.getByRole('img',{name:'Original keepsake'})).toHaveAttribute('src','/images/crate.png');
  expect(sessionStorage.getItem('mazeResultContext')).toBe(raw);
});
test('removing owner context while mounted hides immediately and restoring it is non-destructive',async()=>{
  render(<ResultsPage/>);await ownerVisible();
  act(()=>{sessionStorage.removeItem('mazeResultContext');window.dispatchEvent(new Event('storage'));noPrivateDetails();});
  act(()=>{sessionStorage.setItem('mazeResultContext',raw);window.dispatchEvent(new Event('storage'));});await ownerVisible();
});
test('opaque sign-ins are exact-token bound, including after reload without a catalog',async()=>{
  localStorage.setItem('token','opaque-original');
  context=await createResultReceipt(readIdentity(),{date:'2028-02-29',time:'123.456',reward:null});raw=JSON.stringify(context);
  sessionStorage.setItem('mazeResultContext',raw);const page=render(<ResultsPage/>);await ownerVisible();page.unmount();
  localStorage.setItem('token','opaque-other');const other=render(<ResultsPage/>);await act(async()=>{});noPrivateDetails();other.unmount();
  localStorage.setItem('token','opaque-original');render(<ResultsPage/>);await ownerVisible();
});

test('a valid owned receipt ignores a corrupt selected-date cache',async()=>{
  localStorage.setItem('selectedMazeDate','garbage');render(<ResultsPage/>);await ownerVisible();
  expect(screen.getByText('February 29, 2028 (UTC)')).toBeInTheDocument();
});
test.each([0,600])('child-only delayed reveal after %sms checks live identity without a notification',async delay=>{
  render(<ResultsPage/>);await ownerVisible();jest.useFakeTimers();
  fireEvent.click(screen.getByRole('button',{name:'Open reward crate'}));
  act(()=>jest.advanceTimersByTime(delay));
  localStorage.setItem('activeSubProfile',JSON.stringify({_id:profileB}));
  act(()=>jest.advanceTimersByTime(601));noPrivateDetails();
  expect(sessionStorage.getItem('mazeResultContext')).toBe(raw);
});

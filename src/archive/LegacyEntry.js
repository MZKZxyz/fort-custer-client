import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCatalog from './useCatalog';
import ArchiveNotice from './ArchiveNotice';
import { accountId, pendingCompletion, pendingCompletions, stored, useIdentity } from './identity';
import { isDate } from './dates';

function PublishedAdmission({ date, children }) {
  const catalog = useCatalog(date.slice(0, 7));
  const [admitted, setAdmitted] = useState(false);
  useEffect(() => {
    if (catalog.usable && catalog.identity.token && catalog.identity.profile
        && catalog.data.items.some(item => item.date === date)) setAdmitted(true);
  }, [catalog, date]);
  // Admission belongs to this mounted attempt. Rollover/revalidation cannot restart it.
  if (admitted) return children;
  return <div className="maze-page"><ArchiveNotice catalog={catalog} />
    {catalog.status === 'ready' && <p role="alert">No published maze is available for this selection. Choose a published date from the archive.</p>}
    <ArchiveBack /></div>;
}
function ArchiveBack() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/mazes')}>Back to mazes</button>;
}
export default function LegacyEntry({ children }) {
  const identity = useIdentity();
  const [date] = useState(() => stored('selectedMazeDate'));
  const original = useRef(identity.key);
  const recovery = pendingCompletion(identity.profile?._id, date);
  const owner = accountId(identity.token);
  if (identity.key !== original.current || (recovery?.accountId && recovery.accountId !== owner)) {
    return <div className="maze-page"><p role="alert">Your sign-in or profile changed. Restore the original selection to recover your result.</p><ArchiveBack /></div>;
  }
  if (!identity.profile || !identity.token || !isDate(date)) return <div className="maze-page">
    <p role="alert">Choose a profile and a published date from the archive.</p><ArchiveBack /></div>;
  // Saved result reads must work even with an absent/unavailable publication catalog.
  if (recovery) return children;
  if (pendingCompletions(identity).length) return <div className="maze-page">
    <p role="alert">An original result is not confirmed. Return to the archive to recover it before starting another maze.</p><ArchiveBack /></div>;
  return <PublishedAdmission date={date}>{children}</PublishedAdmission>;
}

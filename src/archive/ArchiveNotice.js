import { useNavigate } from 'react-router-dom';

export default function ArchiveNotice({ catalog }) {
  const navigate = useNavigate();
  if (catalog.status === 'loading') return <p role="status">Loading published dates…</p>;
  if (catalog.status === 'error') return <div role="alert" className="archive-notice">
    <p>{catalog.problem.message}</p>
    <button onClick={catalog.refresh}>Retry</button>
    {catalog.problem.kind === 'auth' && <button onClick={() => navigate('/login')}>Sign in</button>}
    {catalog.problem.kind === 'profile' && <button onClick={() => navigate('/profiles')}>Choose profile</button>}
  </div>;
  if (catalog.progressProblem) return <div role="status"><p>{catalog.progressProblem}</p>
    <button onClick={catalog.refresh}>Retry completion status</button></div>;
  return null;
}

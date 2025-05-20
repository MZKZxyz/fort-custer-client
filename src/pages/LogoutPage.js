import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

export default function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function doLogout() {
      try {
        // optional: tell server to clear session/token
        await API.post('/users/logout');
      } catch (err) {
        // ignore errors
      } finally {
        // clear client‐side auth
        localStorage.clear();
        // fire any global listeners
        window.dispatchEvent(new Event('activeSubProfileChanged'));
        // send them home
        navigate('/', { replace: true });
      }
    }
    doLogout();
  }, [navigate]);

  // you can return a spinner or null
  return null;
}

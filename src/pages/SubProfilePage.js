import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import NavBar from '../components/NavBar';

const AVATAR_CHOICES = ['🐶', '🐱', '🐵', '🐸', '🦊', '🐯', '🐼', '🐧', '🐨'];

export default function SubProfilePage() {
  const navigate = useNavigate();
  const [subProfiles, setSubProfiles] = useState([]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalProfile, setModalProfile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  


  useEffect(() => {
    const stored = localStorage.getItem('subProfiles');
    if (stored) setSubProfiles(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  

  const refreshProfiles = (profiles) => {
    setSubProfiles(profiles);
    localStorage.setItem('subProfiles', JSON.stringify(profiles));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/users/subprofile', { name, avatar });
      refreshProfiles(res.data);
      setName('');
      setAvatar('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sub-profile');
    }
  };

  const handleSelect = (profile) => {
    localStorage.setItem('activeSubProfile', JSON.stringify(profile));
    setModalProfile(profile);
    setShowModal(true);
    window.dispatchEvent(new Event('activeSubProfileChanged'));
    setTimeout(() => setShowModal(false), 2500);
  };
  
  

  const handleEdit = (profile) => {
    setEditingId(profile._id);
    setEditName(profile.name);
    setEditAvatar(profile.avatar || '');
    setOpenMenu(null);
  };

  const handleSaveEdit = async (id) => {
    try {
      const res = await API.put(`/users/subprofile/${id}`, {
        name: editName,
        avatar: editAvatar,
      });
      refreshProfiles(res.data);       // update list + localStorage
  
      // if we were editing the active profile, overwrite it
      const current = JSON.parse(localStorage.getItem('activeSubProfile'));
      const updated = res.data.find(p => p._id === id);
      if (current && updated && current._id === updated._id) {
        localStorage.setItem('activeSubProfile', JSON.stringify(updated));
        // tell NavBar (and anyone listening) about the change
        window.dispatchEvent(new Event('activeSubProfileChanged'));
      }
  
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  };
  
  const handleDelete = async (id) => {
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  };
  
  const confirmDelete = async () => {
    try {
      const res = await API.delete(`/users/subprofile/${pendingDeleteId}`);
      refreshProfiles(res.data);    // update list + localStorage
  
      // if we just deleted the active profile, pick a new one (or clear)
      const current = JSON.parse(localStorage.getItem('activeSubProfile'));
      if (current?._id === pendingDeleteId) {
        if (res.data.length > 0) {
          const newActive = res.data[0];
          localStorage.setItem('activeSubProfile', JSON.stringify(newActive));
        } else {
          localStorage.removeItem('activeSubProfile');
        }
        window.dispatchEvent(new Event('activeSubProfileChanged'));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    } finally {
      setShowDeleteModal(false);
      setPendingDeleteId(null);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPendingDeleteId(null);
  };
  

  return (
    <div style={{ padding: '1rem' }}>
      {openMenuId && (
        <div
          onClick={() => setOpenMenuId(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'transparent',
            zIndex: 10, // lower than dropdown but higher than other content
          }}
        />
      )}

      <h2 style={{ marginTop: 0 }}>Select a Player</h2>

      {subProfiles.map((profile) => (
        <div
          key={profile._id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '2px solid black',
            background: '#fff',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '0.5rem',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          {editingId === profile._id ? (
            <div style={{ flexGrow: 1 }}>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
                style={{
                  fontSize: '1.25rem',
                  padding: '0.75rem',
                  width: '80%',
                  border: '2px solid #000',
                  borderRadius: '6px',
                  marginBottom: '0.75rem',
                  fontFamily: '"Arial Black", sans-serif',
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {AVATAR_CHOICES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setEditAvatar(a)}
                    style={{
                      fontSize: '1.5rem',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: a === editAvatar ? '#ffe135' : '#fff',
                      border: '2px solid #000',
                      boxShadow: a === editAvatar ? '2px 2px 0 #000' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleSaveEdit(profile._id)}
                  style={{
                    flex: 1,
                    background: 'blue',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    padding: '0.75rem',
                    border: '2px solid #000',
                    boxShadow: '3px 3px 0 #000',
                    fontFamily: '"Arial Black", sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{
                    flex: 1,
                    background: '#fff',
                    color: '#000',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    padding: '0.75rem',
                    border: '2px solid #000',
                    boxShadow: '3px 3px 0 #000',
                    fontFamily: '"Arial Black", sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>

          ) : (
            <>
              <div
                onClick={() => handleSelect(profile)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1 }}
              >
                <span style={{ fontSize: '1.5rem' }}>{profile.avatar}</span>
                <span style={{ fontWeight: 'bold' }}>{profile.name}</span>
              </div>
              <div style={{ position: 'relative' }}>
              <div className="profile-menu" style={{ position: 'relative' }}>
                <button onClick={() => setOpenMenuId(profile._id)} style={{ 
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  }}>
                  ⋮
                </button>

                {openMenuId === profile._id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '2.5rem',
                      right: '0',
                      backgroundColor: '#fff',
                      border: '2px solid #000',
                      borderRadius: '4px',
                      boxShadow: '4px 4px 0 #000',
                      padding: '0.25rem 0',
                      zIndex: 100,
                      minWidth: '100px',
                    }}
                  >
                    <button
                      onClick={() => {
                        handleEdit(profile);
                        setOpenMenuId(null);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.5rem 1rem',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(profile._id);
                        setOpenMenuId(null);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.5rem 1rem',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        fontWeight: 'bold',
                        color: 'red',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              </div>
            </>
          )}
        </div>
      ))}

      <h3 style={{ marginTop: '2rem' }}>Create New Player</h3>
        <form onSubmit={handleCreate}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="username"
            required
            style={{
              fontSize: '1.25rem',
              padding: '0.75rem',
              width: '80%',
              border: '2px solid #000',
              borderRadius: '6px',
              marginBottom: '0.75rem',
              fontFamily: '"Arial Black", sans-serif',
            }}
          />

          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexWrap: 'wrap', 
            marginBottom: '1rem' 
          }}>
            {AVATAR_CHOICES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                style={{
                  fontSize: '1.5rem',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: a === avatar ? '#ffe135' : '#fff',
                  border: '2px solid #000',
                  boxShadow: a === avatar ? '2px 2px 0 #000' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {a}
              </button>
            ))}
          </div>

          <button
            type="submit"
            style={{
              marginTop: '1rem',
              background: 'blue',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 'bold',
              width: '100%',
              padding: '1rem',
              border: '2px solid #000',
              boxShadow: '4px 4px 0 #000',
              fontFamily: '"Arial Black", sans-serif',
              cursor: 'pointer'
            }}
          >
            Add Player
          </button>
        </form>


      {error && <p style={{ color: 'red' }}>{error}</p>}
      {showModal && modalProfile && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            border: '4px solid black',
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1.25rem',
            boxShadow: '4px 4px 0 black'
          }}>
            <div style={{ fontSize: '2rem' }}>{modalProfile.avatar || '👤'}</div>
            <div>{modalProfile.name} is now playing</div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            border: '4px solid black',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '1rem',
            boxShadow: '4px 4px 0 black',
            maxWidth: '320px',
            fontFamily: '"Arial Black", sans-serif'
          }}>
            <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              Are you sure you want to delete <span >{subProfiles.find(p => p._id === pendingDeleteId)?.name}</span>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button onClick={confirmDelete} style={{
                background: 'red',
                color: '#000',
                border: '3px solid black',
                borderRadius: '6px',
                boxShadow: '3px 3px 0 black',
                padding: '0.5rem 1.25rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                Yes
              </button>
              <button onClick={cancelDelete} style={{
                background: '#eee',
                color: '#000',
                border: '3px solid black',
                borderRadius: '6px',
                boxShadow: '3px 3px 0 black',
                padding: '0.5rem 1.25rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      <NavBar />
    </div>
  );
}

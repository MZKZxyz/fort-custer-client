import React, { useEffect, useState  } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import NavBar from '../components/NavBar';

const AVATAR_CHOICES = ['🐶','🐱','🐵','🐸','🦊','🐯','🐼','🐧','🐨'];

export default function SubProfilePage() {
  const navigate = useNavigate();
  const [subProfiles, setSubProfiles]   = useState([]);
  const [name, setName]                 = useState('');
  const [avatar, setAvatar]             = useState('');
  const [error, setError]               = useState('');
  const [openMenuId, setOpenMenuId]     = useState(null);
  const [editingId, setEditingId]       = useState(null);
  const [editName, setEditName]         = useState('');
  const [editAvatar, setEditAvatar]     = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [modalProfile, setModalProfile] = useState(null);
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [pendingDeleteId, setPendingDeleteId]   = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // NEW: show/hide create panel
  const [showCreate, setShowCreate]     = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('subProfiles');
    if (stored) setSubProfiles(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const onClickOutside = e => {
      if (!e.target.closest('.profile-menu')) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const refreshProfiles = profiles => {
    setSubProfiles(profiles);
    localStorage.setItem('subProfiles', JSON.stringify(profiles));
  };

  const handleCreate = async e => {
    e.preventDefault();
    try {
      const res = await API.post('/users/subprofile', { name, avatar });
      refreshProfiles(res.data);
      setName(''); setAvatar(''); setShowCreate(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create');
    }
  };

  const handleSelect = profile => {
    localStorage.setItem('activeSubProfile', JSON.stringify(profile));
    window.dispatchEvent(new Event('activeSubProfileChanged'));
    setModalProfile(profile); setShowModal(true);
    setTimeout(() => setShowModal(false), 2500);
  };

  const handleEdit = profile => {
    setEditingId(profile._id);
    setEditName(profile.name);
    setEditAvatar(profile.avatar||'');
  };

  const handleSaveEdit = async id => {
    try {
      const res = await API.put(`/users/subprofile/${id}`, {
        name: editName, avatar: editAvatar
      });
      refreshProfiles(res.data);
      const cur = JSON.parse(localStorage.getItem('activeSubProfile'));
      const upd = res.data.find(p=>p._id===id);
      if(cur?._id===id && upd){
        localStorage.setItem('activeSubProfile', JSON.stringify(upd));
        window.dispatchEvent(new Event('activeSubProfileChanged'));
      }
      setEditingId(null);
    } catch {
      setError('Update failed');
    }
  };

  const handleDelete = id => {
    setPendingDeleteId(id); setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const res = await API.delete(`/users/subprofile/${pendingDeleteId}`);
      refreshProfiles(res.data);
      const cur = JSON.parse(localStorage.getItem('activeSubProfile'));
      if(cur?._id===pendingDeleteId){
        if(res.data.length) {
          localStorage.setItem('activeSubProfile', JSON.stringify(res.data[0]));
        } else {
          localStorage.removeItem('activeSubProfile');
        }
        window.dispatchEvent(new Event('activeSubProfileChanged'));
      }
    } catch {
      setError('Delete failed');
    } finally {
      setShowDeleteModal(false); setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false); setPendingDeleteId(null);
  };

  const handleLogoutClick = () => {
      setShowLogoutConfirm(true);
    };
    const confirmLogout = () => {
      setShowLogoutConfirm(false);
      localStorage.clear();
      navigate('/login');
    };
    const cancelLogout = () => {
      setShowLogoutConfirm(false);
    };

  // shared card style
  const cardStyle = {
    display: 'flex',
    alignItems: 'center',
    border: '2px solid black',
    background: '#fff',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '0.5rem',
  };

  return (
    <div style={{ 
      padding:'1rem', 
      position:'relative' ,
      background: '#479743',
      height:'100vh'
      }}>
      {/* Logout */}
      <button
        onClick={handleLogoutClick}
        style={{
          position:'absolute', top:'1rem', right:'1rem',
          background:'red', color:'white', border:'none',
          padding:'0.5rem 1rem', borderRadius:'4px',
          cursor:'pointer', boxShadow:'2px 2px 0 #000'
        }}
      >Logout</button>

    {/* Logout confirmation modal */}
     {showLogoutConfirm && (
       <div style={{
         position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
         background: 'rgba(0,0,0,0.5)',
         display: 'flex', alignItems: 'center', justifyContent: 'center',
         zIndex: 2000
       }}>
         <div style={{
           background: 'white',
           padding: '1.5rem',
           border: '4px solid black',
           borderRadius: '8px',
           textAlign: 'center',
           boxShadow: '4px 4px 0 black',
           maxWidth: '320px'
         }}>
           <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
             Are you sure you want to log out?
           </p>
           <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
             <button
               onClick={confirmLogout}
               style={{
                 background: 'red',
                 color: 'white',
                 border: '3px solid black',
                 borderRadius: '6px',
                 boxShadow: '3px 3px 0 black',
                 padding: '0.5rem 1.25rem',
                 fontWeight: 'bold',
                 cursor: 'pointer'
               }}
             >
               Yes
             </button>
             <button
               onClick={cancelLogout}
               style={{
                 background: '#eee',
                 color: 'black',
                 border: '3px solid black',
                 borderRadius: '6px',
                 boxShadow: '3px 3px 0 black',
                 padding: '0.5rem 1.25rem',
                 fontWeight: 'bold',
                 cursor: 'pointer'
               }}
             >
               Cancel
             </button>
           </div>
         </div>
       </div>
     )}

      <h2 style={{ marginTop:0 }}>Select a Player</h2>

      {/* Profile buttons */}
      {subProfiles.map(profile => (
      <React.Fragment key={profile._id}>
        <div
          style={{
            ...cardStyle,
            cursor: editingId === profile._id ? 'default' : 'pointer'
          }}
          onClick={() => editingId !== profile._id && handleSelect(profile)}
        >
          {/* Avatar + name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexGrow: 1
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{profile.avatar}</span>
            <span style={{ fontWeight: 'bold' }}>{profile.name}</span>
          </div>

          {/* Edit/Delete menu */}
          <div style={{ position: 'relative' }}>
            <div className="profile-menu" style={{ position: 'relative' }}>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setOpenMenuId(profile._id);
                }}
                style={{
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1.25rem'
                }}
              >⋮</button>

              {openMenuId === profile._id && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2.5rem',
                    right: 0,
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
                     onClick={e => {
                       e.stopPropagation();
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
                  >Edit</button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
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
                  >Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inline Edit Panel */}
        {editingId === profile._id && (
          <div style={{
            ...cardStyle,
            flexDirection: 'column',
            alignItems: 'stretch',
            marginBottom: '1rem'
          }}>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Name"
              style={{
                fontSize: '1.25rem',
                padding: '0.75rem',
                border: '2px solid #000',
                borderRadius: '6px',
                marginBottom: '0.75rem',
                fontFamily: '"Arial Black", sans-serif',
                boxSizing: 'border-box'
              }}
            />

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '1rem'
            }}>
              {AVATAR_CHOICES.map(a => (
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
                    cursor: 'pointer'
                  }}
                >{a}</button>
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
                  cursor: 'pointer'
                }}
              >Save</button>
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
                  cursor: 'pointer'
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </React.Fragment>
    ))}

      {/* Add Player button (left-aligned) */}
      <div
        style={{
          ...cardStyle,
          justifyContent:'flex-start',
          cursor:'pointer'
        }}
        onClick={()=>setShowCreate(c=>!c)}
      >
        <span style={{ fontSize:'1.5rem', marginRight:'0.75rem' }}>＋</span>
        <span style={{ fontWeight:'bold' }}>Add Player</span>
      </div>

      {/* Creation panel (no global card styling) */}
      {showCreate && (
        <div style={{ marginBottom:'1rem' }}>
          <form onSubmit={handleCreate}>
            <input
              value={name}
              onChange={e=>setName(e.target.value)}
              placeholder="Username"
              required
              style={{
                fontSize:'1.25rem', padding:'0.75rem', width:'100%',
                border:'2px solid #000', borderRadius:'6px',
                marginBottom:'0.75rem', fontFamily:'"Arial Black",sans-serif',
                boxSizing:'border-box'
              }}
            />

            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
              {AVATAR_CHOICES.map(a=>(
                <button
                  key={a}
                  type="button"
                  onClick={()=>setAvatar(a)}
                  style={{
                    fontSize:'1.5rem', width:'48px', height:'48px',
                    borderRadius:'50%', backgroundColor:a===avatar?'#ffe135':'#fff',
                    border:'2px solid #000', boxShadow:a===avatar?'2px 2px 0 #000':'none',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer'
                  }}
                >{a}</button>
              ))}
            </div>

            <button
              type="submit"
              style={{
                background:'blue', color:'white', fontSize:'1rem',
                fontWeight:'bold', width:'100%', padding:'1rem',
                border:'2px solid #000', boxShadow:'4px 4px 0 #000',
                fontFamily:'"Arial Black",sans-serif', cursor:'pointer'
              }}
            >Create</button>
          </form>
        </div>
      )}

      {error && <p style={{ color:'red' }}>{error}</p>}

      {/* Select confirmation modal */}
      {showModal && modalProfile && (
        <div style={{
          position:'fixed', top:0,left:0,right:0,bottom:0,
          background:'rgba(0,0,0,0.5)',
          display:'flex', justifyContent:'center', alignItems:'center',
          zIndex:2000
        }}>
          <div style={{
            background:'white', padding:'1.5rem',
            border:'4px solid black', borderRadius:'8px',
            textAlign:'center', fontWeight:'bold', fontSize:'1.25rem',
            boxShadow:'4px 4px 0 black'
          }}>
            <div style={{ fontSize:'2rem' }}>{modalProfile.avatar||'👤'}</div>
            <div>{modalProfile.name} is now playing</div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{
          position:'fixed', top:0,left:0,right:0,bottom:0,
          background:'rgba(0,0,0,0.5)',
          display:'flex', justifyContent:'center', alignItems:'center',
          zIndex:2000
        }}>
          <div style={{
            background:'white', padding:'1.5rem',
            border:'4px solid black', borderRadius:'8px',
            textAlign:'center', fontSize:'1rem',
            boxShadow:'4px 4px 0 black', maxWidth:'320px',
            fontFamily:'"Arial Black",sans-serif'
          }}>
            <p style={{ marginBottom:'1rem', fontWeight:'bold' }}>
              Are you sure you want to delete{' '}
              <span>{subProfiles.find(p=>p._id===pendingDeleteId)?.name}</span>?
            </p>
            <div style={{ display:'flex', justifyContent:'center', gap:'1rem' }}>
              <button onClick={confirmDelete} style={{
                background:'red', color:'#000',
                border:'3px solid black', borderRadius:'6px',
                boxShadow:'3px 3px 0 black', padding:'0.5rem 1.25rem',
                fontWeight:'bold', cursor:'pointer'
              }}>Yes</button>
              <button onClick={cancelDelete} style={{
                background:'#eee', color:'#000',
                border:'3px solid black', borderRadius:'6px',
                boxShadow:'3px 3px 0 black', padding:'0.5rem 1.25rem',
                fontWeight:'bold', cursor:'pointer'
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
}

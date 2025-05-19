// src/pages/FieldKitPage.js
import { useEffect, useState } from 'react';
import API from '../utils/api';
import NavBar from '../components/NavBar';

export default function FieldKitPage() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const profile = JSON.parse(localStorage.getItem('activeSubProfile'));
    if (!profile) return;

    const load = async () => {
      try {
        const res = await API.get(`/maze/rewards?subProfileId=${profile._id}`);
        setItems(res.data);
      } catch (err) {
        console.error('Failed to load field kit:', err);
      }
    };

    load();
  }, []);

  return (
    <div style={{ padding: '1rem', paddingBottom: '80px', backgroundColor: '#ffe066', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>
        <img
          src="/images/backpackClosed.png"
          alt="Field Kit"
          style={{
            width: '32px',
            height: '32px',
            verticalAlign: 'middle',
            marginRight: '0.5rem',
          }}
        />
        Field Kit
      </h2>

      {items.length === 0 ? (
        <p style={{ textAlign: 'center', fontStyle: 'italic', marginTop: '2rem' }}>
          You haven't collected any items yet.
        </p>
      ) : (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'center',
          marginTop: '1rem',
        }}>
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              style={{
                width: '100px',
                height: '100px',
                border: '2px solid black',
                borderRadius: '10px',
                background: 'white',
                fontSize: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                cursor: 'pointer',
                boxShadow: '4px 4px 0 #000',
                position: 'relative'
              }}
            >
            <img
              src={`/images/${item.image}`}
              alt={item.name}
              style={{
                width: '90%',
                height: '90%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
              {item.quantity > 1 && (
                <span style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 6,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}>
                  x{item.quantity}
                </span>
              )}
            </div>
          ))}
        </div>
      )}


      {selectedItem && (
        <div style={{
          marginTop: '2rem',
          border: '2px solid black',
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          maxWidth: '400px',
          marginLeft: 'auto',
          marginRight: 'auto',
          boxShadow: '4px 4px 0 #000'
        }}>
          <div style={{ fontSize: '2rem' }}>{selectedItem.emoji}</div>
          <h3 style={{ margin: '0.5rem 0' }}>{selectedItem.name}</h3>
          <p style={{ margin: 0 }}>{selectedItem.description}</p>
          <p style={{ fontSize: '0.9rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
            Category: {selectedItem.category}, Rarity: {selectedItem.rarity}
          </p>
        </div>
      )}

      <NavBar />
    </div>
  );
}

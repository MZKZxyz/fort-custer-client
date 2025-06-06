import React, { useEffect, useState, useMemo } from 'react';
import API from '../utils/api';
import NavBar from '../components/NavBar';

export default function FieldKitPage() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const itemsPerPage = 12;

  const categories = useMemo(() => {
    const set = new Set(items.map((it) => it.category));
    return ['all', ...Array.from(set)];
  }, [items]);

  const filteredItems =
    selectedCategory === 'all'
      ? items
      : items.filter((it) => it.category === selectedCategory);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

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

  // Adjust currentPage if out of bounds when items change
useEffect(() => {
  if (currentPage >= totalPages) {
    setCurrentPage(totalPages > 0 ? totalPages - 1 : 0);
    setSelectedItem(null);
  }
}, [filteredItems.length, totalPages, currentPage]);

// Slice items for current page
const pagedItems = filteredItems.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  );

  // Build fixed-size slots array (fill with nulls for empty slots)
  const slots = [
    ...pagedItems,
    ...Array(itemsPerPage - pagedItems.length).fill(null),
  ];

  return (
    <div style={{ padding: '1rem', paddingBottom: '80px', backgroundColor: '#ffe066', minHeight: '100vh' }}>
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>
        <img
          src="/images/backpackMap.png"
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

      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '0.5rem',
          padding: '0.5rem 0',
          justifyContent: 'center',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setCurrentPage(0);
              setSelectedItem(null);
            }}
            style={{
              flex: '0 0 auto',
              padding: '0.25rem 0.75rem',
              border: '2px solid black',
              borderRadius: '8px',
              background: selectedCategory === cat ? '#fff9c4' : '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '2px 2px 0 #000',
              whiteSpace: 'nowrap',
            }}
          >
            {cat === 'all'
              ? 'All'
              : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p style={{ textAlign: 'center', fontStyle: 'italic', marginTop: '2rem' }}>
          You haven't collected any items yet.
        </p>
      ) : filteredItems.length === 0 ? (
        <p style={{ textAlign: 'center', fontStyle: 'italic', marginTop: '2rem' }}>
          No items in this category.
        </p>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'center',
              marginTop: '1rem',
            }}
          >
            {slots.map((item, idx) => {
              const isSelected =
                item && selectedItem &&
                ((selectedItem._id && item._id && selectedItem._id === item._id) ||
                  selectedItem === item);
              return (
                <div
                  key={idx}
                  onClick={() => item && setSelectedItem(item)}
                  style={{
                    width: '100px',
                    height: '100px',
                    border: isSelected ? '2px solid #ff0' : '2px solid black',
                    borderRadius: '10px',
                    background: isSelected ? '#fff9c4' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    cursor: item ? 'pointer' : 'default',
                    boxShadow: isSelected
                      ? '0 0 0 2px #ff0, 4px 4px 0 #000'
                      : '4px 4px 0 #000',
                    position: 'relative',
                  }}
                >
                  {item ? (
                    <>
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
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 6,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}
                      >
                        x{item.quantity}
                      </span>
                    )}
                  </>
                ) : null}
              </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <button
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 0));
                setSelectedItem(null);
              }}
              disabled={currentPage === 0}
              style={{
                width: '40px',
                height: '40px',
                fontSize: '1rem',
                fontWeight: 'bold',
                border: '2px solid black',
                borderRadius: '8px',
                background: currentPage === 0 ? '#ccc' : '#fff',
                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              ←
            </button>
            <span>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => {
                setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
                setSelectedItem(null);
              }}
              disabled={currentPage >= totalPages - 1}
              style={{
                width: '40px',
                height: '40px',
                fontSize: '1rem',
                fontWeight: 'bold',
                border: '2px solid black',
                borderRadius: '8px',
                background: currentPage >= totalPages - 1 ? '#ccc' : '#fff',
                cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              →
            </button>
          </div>
        </>
      )}

      {/* Info Panel */}
      {selectedItem && (
        <div
          style={{
            marginTop: '2rem',
            border: '2px solid black',
            background: '#fff',
            padding: '1rem',
            borderRadius: '8px',
            maxWidth: '400px',
            margin: '2rem auto 0',
            boxShadow: '4px 4px 0 #000',
          }}
        >
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

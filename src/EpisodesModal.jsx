import React, { useEffect, useState, useRef } from 'react';

const EpisodesModal = () => {
  const [episodes, setEpisodes] = useState([]);
  const [visible, setVisible] = useState(false);
  const modalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Leer datos desde el DOM
  useEffect(() => {
    const dataEl = document.getElementById('episodes-data');
    if (dataEl) {
      try {
        const data = JSON.parse(dataEl.textContent || '[]');
        setEpisodes(data);
      } catch (e) {
        console.error('Error parsing episodes data:', e);
      }
    }
  }, []);

  // Conectarse al botón que ya existe en SATVPlayer.jsx
  useEffect(() => {
    const btn = document.getElementById('episodesButtonReact');
    if (!btn) return;

    const handleEnter = () => {
      clearTimeout(timeoutRef.current);
      setVisible(true);
    };

    const handleLeave = () => {
      timeoutRef.current = setTimeout(() => setVisible(false), 200);
    };

    btn.addEventListener('mouseenter', handleEnter);
    btn.addEventListener('mouseleave', handleLeave);

    return () => {
      btn.removeEventListener('mouseenter', handleEnter);
      btn.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  const handlePlay = (ep) => {
    if (typeof SATVPlayerEmbed === 'function') {
      SATVPlayerEmbed({
        elementId: 'player',
        videoUrl: ep.videoPath,
      });
    }
    setVisible(false);
  };

  // Ocultar modal al salir
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleLeave = () => setVisible(false);
    modal.addEventListener('mouseleave', handleLeave);

    return () => {
      modal.removeEventListener('mouseleave', handleLeave);
    };
  }, [modalRef]);

  if (!visible) return null;

  return (
    <div
      ref={modalRef}
      style={{
        position: 'absolute',
        top: '70px',
        left: '10px',
        zIndex: 9999,
        width: '360px',
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        padding: '1em',
      }}
    >
      {episodes.map((ep, index) => (
        <div
          key={index}
          onClick={() => handlePlay(ep)}
          style={{
            display: 'flex',
            marginBottom: '1em',
            cursor: 'pointer',
            borderRadius: '6px',
            padding: '0.5em',
          }}
        >
          <img
            src={ep.image}
            alt={ep.title}
            style={{
              width: '80px',
              height: '45px',
              objectFit: 'cover',
              borderRadius: '4px',
              marginRight: '0.5em',
            }}
          />
          <div>
            <strong style={{ fontSize: '0.95em' }}>{ep.title}</strong>
            <p style={{ fontSize: '0.75em', margin: '0.3em 0', color: '#444' }}>
              {ep.description.slice(0, 60)}...
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EpisodesModal;
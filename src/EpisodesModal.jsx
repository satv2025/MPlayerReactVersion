import React, { useEffect, useState, useRef } from 'react';

const EpisodesModal = ({ volumeSliderVisible, showSpeedModal }) => {
  const [episodes, setEpisodes] = useState([]);
  const [visible, setVisible] = useState(false);
  const modalRef = useRef(null);
  const timeoutRef = useRef(null);

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

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleEnter = () => {
      clearTimeout(timeoutRef.current);
    };

    const handleLeave = () => {
      timeoutRef.current = setTimeout(() => setVisible(false), 200);
    };

    modal.addEventListener('mouseenter', handleEnter);
    modal.addEventListener('mouseleave', handleLeave);

    return () => {
      modal.removeEventListener('mouseenter', handleEnter);
      modal.removeEventListener('mouseleave', handleLeave);
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

  return (
    <div
      ref={modalRef}
      className={`modal ${visible ? 'visible' : 'hidden'}`}
      style={{
        display: volumeSliderVisible || showSpeedModal ? 'none' : 'block',
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>Episodios</h2>
          <span className="close-btn" onClick={() => setVisible(false)}>×</span>
        </div>

        <div className="selector-container">
          {episodes.map((ep, index) => (
            <div
              key={index}
              className={`episode ${index === 0 ? 'e1item' : ''}`}
              onClick={() => handlePlay(ep)}
            >
              <img src={ep.image} alt={ep.title} />
              <div className="episode-info">
                <h4>{ep.title}</h4>
                <p>{ep.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EpisodesModal;
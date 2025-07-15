import React, { useState } from "react";

export default function EpisodesButton({
  onClick,
  seasons = [],
  volumeSliderVisible = false,
  showSpeedModal = false,
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);

  const toggleModal = (value) => () => setShowModal(value);

  const selectedSeason = seasons[selectedSeasonIndex] || { episodes: [] };

  // Oculta todo si hay slider de volumen o modal de velocidad
  const hidden = volumeSliderVisible || showSpeedModal;

  return (
    <div
      style={{
        position: "relative",
        display: hidden ? "none" : "inline-block",
        visibility: hidden ? "hidden" : "visible",
      }}
      onMouseEnter={toggleModal(true)}
      onMouseLeave={toggleModal(false)}
    >
      <button
        onClick={onClick}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginLeft: 10,
        }}
        aria-label="Episodes"
        type="button"
      >
        <img
          src="https://static.solargentinotv.com.ar/controls/icons/png/episodes.png"
          alt="Episodes"
          style={{ width: 40, height: 40 }}
        />
      </button>

      {showModal && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            color: "white",
            padding: "10px",
            borderRadius: "6px",
            width: "250px",
            zIndex: 1000,
          }}
        >
          {seasons.length > 1 && (
            <div style={{ marginBottom: "10px" }}>
              {seasons.map((season, i) => (
                <div
                  key={season.id || i}
                  onClick={() => setSelectedSeasonIndex(i)}
                  style={{
                    padding: "5px 10px",
                    backgroundColor:
                      selectedSeasonIndex === i ? "#e50914" : "transparent",
                    cursor: "pointer",
                    borderRadius: "4px",
                    fontWeight: selectedSeasonIndex === i ? "bold" : "normal",
                    marginBottom: "5px",
                  }}
                >
                  Temporada {i + 1} ({season.episodes.length} episodios)
                </div>
              ))}
            </div>
          )}

          <div>
            {selectedSeason.episodes.map((ep, idx) => (
              <div
                key={ep.id || idx}
                style={{
                  padding: "6px 10px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (ep.onClick) ep.onClick();
                  setShowModal(false); // Cerramos modal al clickear episodio
                }}
              >
                {ep.title || `Episodio ${idx + 1}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
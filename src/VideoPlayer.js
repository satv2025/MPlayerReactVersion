import React, { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css';
import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  @import url('https://fuentes.solargentinotv.com.ar/netflixsans.css');

  * {
    font-family: 'Netflix Sans';
  }
`;

const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // NUEVO: referencia para el timeout que controla el cierre con delay del modal
  const hideSpeedTimeout = useRef(null);

  // NUEVAS funciones para controlar el hover con delay
  const handleMouseEnterSpeed = () => {
    if (hideSpeedTimeout.current) {
      clearTimeout(hideSpeedTimeout.current);
      hideSpeedTimeout.current = null;
    }
    setShowSpeedModal(true);
  };

  const handleMouseLeaveSpeed = () => {
    hideSpeedTimeout.current = setTimeout(() => {
      setShowSpeedModal(false);
    }, 300); // 300ms de delay antes de cerrar el modal
  };

  useEffect(() => {
    const video = videoRef.current;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onDurationChange);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onDurationChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const changeVolume = (val) => {
    const video = videoRef.current;
    video.volume = val;
    setVolume(val);
  };

  const rewind = () => {
    const video = videoRef.current;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const forward = () => {
    const video = videoRef.current;
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return (
      (h > 0 ? h + ':' : '') +
      (m < 10 && h > 0 ? '0' : '') +
      m +
      ':' +
      (s < 10 ? '0' : '') +
      s
    );
  };

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    videoRef.current.currentTime = newTime;
  };

  const toggleFullscreen = () => {
    const elem = videoRef.current.parentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setFullscreen(false));
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 900,
        margin: 'auto',
        backgroundColor: 'black',
      }}
    >
      <video
        ref={videoRef}
        src="https://cdn.jsdelivr.net/gh/satv2025/media@main/videos/app/e5/Asesinato-Para-Principiantes-T1-E5.m3u8"
        style={{ width: '100%', display: 'block' }}
        onClick={togglePlay}
      />
      {/* Controles Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          padding: '10px 15px',
          fontFamily: 'Arial, sans-serif',
          fontSize: 14,
        }}
      >
        {/* Barra progreso */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          style={{
            height: 4,
            backgroundColor: '#555',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: 0,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: (currentTime / duration) * 100 + '%',
              backgroundColor: '#e50914',
              height: '100%',
              borderRadius: 0,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translate(50%, -50%)',
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#e50914',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
        {/* Controles abajo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img
              src={
                playing
                  ? 'https://static.solargentinotv.com.ar/controls/icons/png/pause.png'
                  : 'https://static.solargentinotv.com.ar/controls/icons/png/play.png'
              }
              alt={playing ? 'Pause' : 'Play'}
              style={{ width: 20, height: 20 }}
            />
          </button>
          {/* Rewind */}
          <button
            onClick={rewind}
            aria-label="Rewind 10 seconds"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginTop: '0.4em',
            }}
          >
            <img
              src="https://static.solargentinotv.com.ar/controls/icons/png/backward10.png"
              alt="Backward 10 seconds"
              style={{ width: 24, height: 24 }}
            />
          </button>
          {/* Forward */}
          <button
            onClick={forward}
            aria-label="Forward 10 seconds"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginTop: '0.4em',
              marginLeft: '-0.5em',
            }}
          >
            <img
              src="https://static.solargentinotv.com.ar/controls/icons/png/forward10.png"
              alt="Forward 10 seconds"
              style={{ width: 24, height: 24 }}
            />
          </button>
          {/* Volumen */}
          <VolumeControl volume={volume} onVolumeChange={changeVolume} />
          {/* Tiempo */}
          <div
            style={{
              flexGrow: 1,
              textAlign: 'center',
              userSelect: 'text',
              marginLeft: '-7.2em',
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          {/* Velocidad */}
          <div
            style={{ position: 'relative', cursor: 'pointer', width: 24 }}
            onMouseEnter={handleMouseEnterSpeed}
            onMouseLeave={handleMouseLeaveSpeed}
          >
            <button
              aria-label="Change playback speed"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
            >
              <img
                src="https://static.solargentinotv.com.ar/controls/icons/png/velocidad.png"
                alt="Speed"
                style={{ width: 20, height: 20 }}
              />
            </button>
            {showSpeedModal && (
              <div
                className="speed-modal"
                onMouseEnter={handleMouseEnterSpeed}
                onMouseLeave={handleMouseLeaveSpeed}
              >
                <div className="speed-modal-header">
                  <div className="speed-modal-title">Velocidad</div>
                  <div className="speed-modal-description">
                    En este menú podrás elegir distintas velocidades de
                    reproducción para tu video.
                  </div>
                </div>
                <div className="speed-options-container">
                  {speeds.map((sp) => (
                    <button
                      key={sp}
                      className={`speed-option ${sp === speed ? 'active' : ''}`}
                      onClick={() => {
                        setSpeed(sp);
                        videoRef.current.playbackRate = sp;
                        setShowSpeedModal(false);
                      }}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img
              src={
                fullscreen
                  ? 'https://static.solargentinotv.com.ar/controls/icons/png/windowed.png'
                  : 'https://static.solargentinotv.com.ar/controls/icons/png/fullscreen.png'
              }
              alt={fullscreen ? 'Windowed' : 'Fullscreen'}
              style={{ width: 20, height: 20 }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// Volumen Custom Component
function VolumeControl({ volume, onVolumeChange }) {
  const [dragging, setDragging] = useState(false);
  const sliderRef = useRef(null);

  const handlePointerDown = (e) => {
    setDragging(true);
    updateVolume(e);
  };
  const handlePointerMove = (e) => {
    if (!dragging) return;
    updateVolume(e);
  };
  const handlePointerUp = () => {
    setDragging(false);
  };

  const updateVolume = (e) => {
    const rect = sliderRef.current.getBoundingClientRect();
    let newVolume = (e.clientX - rect.left) / rect.width;
    newVolume = Math.min(1, Math.max(0, newVolume));
    onVolumeChange(newVolume);
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
    >
      <img
        src={
          volume === 0
            ? 'https://static.solargentinotv.com.ar/controls/icons/png/volumemute.png'
            : volume > 0.66
            ? 'https://static.solargentinotv.com.ar/controls/icons/png/volume2.png'
            : volume > 0.33
            ? 'https://static.solargentinotv.com.ar/controls/icons/png/volume1.png'
            : 'https://static.solargentinotv.com.ar/controls/icons/png/volumemute.png'
        }
        alt="Volume"
        style={{ marginRight: 6, userSelect: 'none', width: 20, height: 20 }}
        onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
      />
      <div
        ref={sliderRef}
        style={{
          width: 80,
          height: 6,
          backgroundColor: '#555',
          borderRadius: 0,
          position: 'relative',
        }}
        onPointerDown={handlePointerDown}
      >
        <div
          style={{
            width: `${volume * 100}%`,
            height: '100%',
            backgroundColor: '#e50914',
            borderRadius: 0,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translate(50%, -50%)',
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#e50914',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
}

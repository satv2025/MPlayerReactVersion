import React, { useState, useRef, useEffect } from 'react';
import './css/SATVPlayer.css';
import Hls from 'hls.js';
import { createGlobalStyle } from 'styled-components';

const iconButtonStyle = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
};

export const GlobalStyle = createGlobalStyle`
  @import url('https://fuentes.solargentinotv.com.ar/netflixsans.css');
  * {
    font-family: 'Netflix Sans';
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
    background-color: black;
  }
`;

const speeds = [0.5, 0.75, 1, 1.25, 1.5];


function VolumeControl({ volume, onVolumeChange, onSliderVisibilityChange }) {
  const [dragging, setDragging] = React.useState(false);
  const [showSlider, setShowSlider] = React.useState(false);
  const sliderRef = React.useRef(null);

  // Para guardar volumen temporal mientras se arrastra sin forzar render
  const tempVolumeRef = React.useRef(volume);

  const roundedVolume = Math.round(volume * 100) / 100;
  const isMute = roundedVolume === 0;
  const isLow = roundedVolume > 0 && roundedVolume <= 0.33;
  const isMedium = roundedVolume > 0.33 && roundedVolume <= 0.66;

  let volumeIcon = 'https://static.solargentinotv.com.ar/controls/icons/png/volume2.png';
  if (isMute) {
    volumeIcon = 'https://static.solargentinotv.com.ar/controls/icons/png/volumemute.png';
  } else if (isLow) {
    volumeIcon = 'https://static.solargentinotv.com.ar/controls/icons/png/volume0.png';
  } else if (isMedium) {
    volumeIcon = 'https://static.solargentinotv.com.ar/controls/icons/png/volume1.png';
  }

  // Raf para limitar updates
  const rafId = React.useRef(null);

  const updateVolumeInternal = (clientY) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    let newVolume = 1 - (clientY - rect.top) / rect.height;
    newVolume = Math.min(1, Math.max(0, newVolume));
    tempVolumeRef.current = newVolume;
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    sliderRef.current.setPointerCapture(e.pointerId);
    updateVolumeInternal(e.clientY);
    // Actualizar inmediatamente para respuesta instantánea
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      onVolumeChange(tempVolumeRef.current);
    });
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    updateVolumeInternal(e.clientY);

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      onVolumeChange(tempVolumeRef.current);
    });
  };

  const handlePointerUp = (e) => {
    setDragging(false);
    sliderRef.current.releasePointerCapture(e.pointerId);

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    // Al soltar confirmamos el volumen final
    onVolumeChange(tempVolumeRef.current);
  };

  const handleMouseEnter = () => {
    setShowSlider(true);
    if (onSliderVisibilityChange) onSliderVisibilityChange(true);
  };

  const handleMouseLeave = () => {
    if (!dragging) {
      setShowSlider(false);
      if (onSliderVisibilityChange) onSliderVisibilityChange(false);
    }
  };

  return (
    <div
      className="nfp volume-controller popup-content"
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative' }}
    >
<img
  src={volumeIcon}
  alt="Volume"
  className={`volume-icon ${showSlider ? 'active' : ''}`}
  onClick={() => onVolumeChange(isMute ? 1 : 0)}
  onMouseEnter={handleMouseEnter}
  style={{ width: 40, height: 40 }} // mantener tamaño
/>

      <div
        ref={sliderRef}
        className={`ltr-121xt6i watch-video--scrubber-volume-container slider-container ${showSlider ? 'visible' : ''}`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="slider-bar-container">
          <div
            className="slider-bar-percentage"
            style={{ height: `${volume * 100}%` }}
          >
            <div className="scrubber-target">
              <div className="scrubber-head ltr93p1v1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ propVideoUrl, onEpisodeChange = () => {} }) {
  // 🎨✨ ICON BUTTON STYLE
  const iconButtonStyle = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  };

  // 🛠️🔧 REFS
  const episodesTimeout = useRef(null);
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState("");
  // TÍTULO DINÁMICO
  const [videoType, setVideoType] = useState('Movie'); // 'Movie' o 'Series'
  const [videoTitle, setVideoTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [seriesName, setSeriesName] = useState('');
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const sliderRef = useRef(null);
  const hideSpeedTimeout = useRef(null);
  const inactivityTimer = useRef(null);
  const hideControlsTimeout = useRef(null);

  // 📊📈 STATES
  const [volumeSliderVisible, setVolumeSliderVisible] = useState(false);
  const [nextOverlayVisible, setNextOverlayVisible] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [progressHover, setProgressHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [shouldHideTimeAndBar, setShouldHideTimeAndBar] = useState(false);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [episodes, setEpisodes] = useState([]); // 🎯 IMPORTANTE
  const [selectedSeries, setSelectedSeries] = useState("episodiosApp"); // ⚡ variable que puede cambiar según el JSON
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false); // ⚡ solo mostrar si hay >1 temporada
  

  // 🚪➡️ HANDLE MOUSE ENTER EPISODES
  const handleMouseEnterEpisodes = () => {
    clearTimeout(episodesTimeout.current);
    setShowEpisodesModal(true);
  };

  // 🚪⬅️ HANDLE MOUSE LEAVE EPISODES
  const handleMouseLeaveEpisodes = () => {
    episodesTimeout.current = setTimeout(() => {
      setShowEpisodesModal(false);
    }, 200);
  };

  // ⏳🕒 RESET HIDE TIMEOUT
  const resetHideTimeout = () => {
    // Mostrar controles inmediatamente cuando hay movimiento
    setShouldHideTimeAndBar(false);

    // Limpiar timeout anterior
    clearTimeout(hideControlsTimeout.current);

    // Programar ocultar controles después de 3 segundos sin movimiento
    hideControlsTimeout.current = setTimeout(() => {
      setShouldHideTimeAndBar(true);
    }, 3000);
  };

  useEffect(() => {
    const episodesDataScript = document.getElementById("episodes-data");
    if (!episodesDataScript) {
      if (propVideoUrl) {
        setVideoUrl(propVideoUrl);
        setVideoType("Movie");
        setVideoTitle("");
      }
      return;
    }
  
    try {
      const parsed = JSON.parse(episodesDataScript.textContent);
  
      // 🔹 Inicializamos la serie dinámica
      const firstSeries = Object.keys(parsed)[0]; // "episodiosApp", "episodiosReite666", etc.
      setSelectedSeries(firstSeries);
  
      const seasons = parsed[firstSeries]; // temporadas
      setEpisodesBySeason(seasons);
  
      const firstSeason = Object.keys(seasons)[0];
      setCurrentSeason(firstSeason);
  
      // Mostrar dropdown solo si hay más de 1 temporada
      setShowSeasonDropdown(Object.keys(seasons).length > 1);
  
      // Inicializamos los episodios de la primera temporada
      setEpisodes(seasons[firstSeason] || []);
  
      // Reproducir el primer episodio si existe
      if ((seasons[firstSeason] || []).length > 0) {
        playEpisode(0, seasons[firstSeason]);
      }
  
    } catch (e) {
      console.error("Error parsing episodes JSON", e);
    }
  }, [propVideoUrl]);  

// Función para reproducir video (HLS / nativo)
useEffect(() => {
  const video = videoRef.current;
  if (!video || !videoUrl) return;

  let hls;

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(videoUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch((err) => console.warn("Error al reproducir (HLS):", err));
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = videoUrl;

    const onLoadedMetadata = () => {
      video.play().catch((err) => console.warn("Error al reproducir (nativo HLS):", err));
    };
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      if (hls) hls.destroy();
    };
  } else {
    video.src = videoUrl;
    video.load();
    video.play().catch((err) => console.warn("Error al reproducir (formato básico):", err));
  }

  return () => {
    if (hls) hls.destroy();
  };
}, [videoUrl]);

// ✅ Función para cambiar de episodio
const playEpisode = (index, list = episodes) => {
  if (!list[index]) return;

  const ep = list[index];

  setVideoUrl(ep.videoPath);
  setVideoType(ep.titleType);          // "Movie" o "Series"
  setVideoTitle(ep.title);
  setEpisodeNumber(ep.episodeNumber);  // usar el número real del JSON
  setSeriesName(ep.seriesName || '');
  setShowEpisodesModal(false);

  // Mostrar título y controles inmediatamente
  setShouldHideTimeAndBar(false);
  resetHideTimeout();
};
  
  // ✅ Setear volumen inicial
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = 0.5;
      setVolume(0.5);
    }
  }, []);  

  const episodesRef = useRef(episodes);
  const videoUrlRef = useRef(videoUrl);
  
  // Mantener referencias actualizadas
  useEffect(() => { episodesRef.current = episodes; }, [episodes]);
  useEffect(() => { videoUrlRef.current = videoUrl; }, [videoUrl]);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
  
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    const onEnded = () => {
      setBuffering(false);
  
      // Playlist automático
      const eps = episodesRef.current;
      const current = videoUrlRef.current;
      if (eps.length > 0) {
        const currentIndex = eps.findIndex(ep => ep.videoPath === current);
        const nextIndex = currentIndex + 1;
        if (nextIndex < eps.length) {
          playEpisode(nextIndex, eps);
        }
      }
    };
  
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onDurationChange);
  
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
  
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onDurationChange);
  
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
    };
  }, []);  

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar que actúe cuando el foco está en un input
      const tag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
  
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.code === 'Space') {
        e.preventDefault(); // para que no haga scroll
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        rewind(); // retrocede 10s
      } else if (e.key === 'ArrowRight') {
        forward(); // avanza 10s
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // 👈 ya no necesita dependencias  

  // Detectar cambios de fullscreen para actualizar estado
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setFullscreen(!!fsElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
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
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const mm = m < 10 ? '0' + m : m;
    const ss = s < 10 ? '0' + s : s;

    if (h > 0) {
      const hh = h < 10 ? '0' + h : h;
      return `${hh}:${mm}:${ss}`;
    } else {
      return `${mm}:${ss}`;
    }
  };

  const [progressDragging, setProgressDragging] = useState(false);

  const handleProgressPointerDown = (e) => {
    e.preventDefault();
    setProgressDragging(true);
    updateProgress(e.clientX);
    progressRef.current.setPointerCapture(e.pointerId);
  };

  const handleProgressPointerMove = (e) => {
    if (!progressDragging) return;
    updateProgress(e.clientX);
  };

  const handleProgressPointerUp = (e) => {
    setProgressDragging(false);
    progressRef.current.releasePointerCapture(e.pointerId);
  };

  const updateProgress = (clientX) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    let newTime = ((clientX - rect.left) / rect.width) * duration;
    newTime = Math.min(Math.max(newTime, 0), duration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    const elem = containerRef.current;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
      // setFullscreen(true);  // Lo controla el event listener ahora
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      // setFullscreen(false);
    }
  };

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
    }, 300);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseMove={resetHideTimeout}
      onMouseEnter={resetHideTimeout}
    >
      <GlobalStyle />
      
      <div
  ref={containerRef}
  style={{ position: 'relative', width: '100%', height: '100%' }}
>
  <div
    className={`title-styles ${fullscreen ? 'fullscreen' : 'windowed'}`}
    style={{
      position: 'absolute',
      top: '85%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      display: shouldHideTimeAndBar ? 'none' : 'block', // ⬅ ocultar junto a los controles
    }}
  >
{videoType === 'Movie' ? (
  <div
    className="MovieTitleType"
    id="MovieTitleType"
    style={{
      fontWeight: 400,
      fontSize: '22px',
      color: 'white',
      display: shouldHideTimeAndBar ? 'none' : 'block', // 🔹 aquí
    }}
  >
    {videoTitle}
  </div>
    ) : (
      <div
        className="SeriesTitleType"
        id="SeriesTitleType"
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: '22px',
          color: 'white',
          display: shouldHideTimeAndBar ? 'none' : 'inline', // ⬅ ocultar junto a los controles
        }}
      >
        <strong style={{ fontWeight: 500 }}>{seriesName}</strong>{' '}
        <span style={{ fontWeight: 400 }}>
          E{episodeNumber} {videoTitle}
        </span>
      </div>
    )}
  </div>
</div>

<video
        ref={videoRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: 'black',
          display: 'block',
        }}
        onClick={togglePlay}
      />
      {/* Controles */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          color: 'white',
          display: shouldHideTimeAndBar ? 'none' : 'flex',
          flexDirection: 'column',
          fontFamily: 'Arial, sans-serif',
          fontSize: 14,
          userSelect: 'none',
        }}
        onMouseMove={resetHideTimeout}
        onMouseEnter={resetHideTimeout}
      >
        {/* Barra de progreso */}
        <div
          ref={progressRef}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          onPointerCancel={handleProgressPointerUp}
          onMouseEnter={() => setProgressHover(true)}
          onMouseLeave={() => setProgressHover(false)}
          style={{
            height: progressHover ? 6 : 4,
            width: '95%',
            backgroundColor: 'rgb(139 139 139 / 72%)',
            cursor: 'pointer',
            position: 'relative',
            borderRadius: 0,
            marginBottom: 10,
            marginLeft: '0.7em',
            transition: 'height 0.2s ease',
            display: (volumeSliderVisible || showSpeedModal || showEpisodesModal || nextOverlayVisible) ? 'none' : 'block',
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
                width: '1rem',
                height: '1rem',
                borderRadius: '50%',
                backgroundColor: '#e50914',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
  
        {/* Controles inferiores (botones y demás) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 27,
            marginBottom: '1em',
            marginTop: '1.7em',
          }}
        >
          <button onClick={togglePlay} style={iconButtonStyle}>
            <img
              src={
                playing
                  ? 'https://static.solargentinotv.com.ar/controls/icons/png/pause.png'
                  : 'https://static.solargentinotv.com.ar/controls/icons/png/play.png'
              }
              alt={playing ? 'Pause' : 'Play'}
              style={{ width: 40, height: 40 }}
            />
          </button>
          <button onClick={rewind} style={iconButtonStyle}>
            <img
              src="https://static.solargentinotv.com.ar/controls/icons/png/backward10.png"
              alt="Rewind 10 seconds"
              style={{ width: 40, height: 40 }}
            />
          </button>
          <button onClick={forward} style={iconButtonStyle}>
            <img
              src="https://static.solargentinotv.com.ar/controls/icons/png/forward10.png"
              alt="Forward 10 seconds"
              style={{ width: 40, height: 40 }}
            />
          </button>
  
          <VolumeControl
            volume={volume}
            onVolumeChange={changeVolume}
            onSliderVisibilityChange={setVolumeSliderVisible}
          />
  
  <div
            className="countdown-current-time"
            style={{
              flexGrow: 1,
              textAlign: 'center',
              userSelect: 'text',
              fontSize: '15px',
              marginTop: '-8.14em',
              position: 'relative',
              left: '54.8em',
              pointerEvents: 'none',
              visibility: (volumeSliderVisible || showSpeedModal || showEpisodesModal || nextOverlayVisible) ? 'hidden' : 'visible',
            }}
          >
            {formatTime(duration - currentTime)}
          </div>
  
          {/* Control de velocidad */}
          <div
            style={{ position: 'relative', cursor: 'pointer', width: 24 }}
            onMouseEnter={handleMouseEnterSpeed}
            onMouseLeave={handleMouseLeaveSpeed}
          >
            <button
              style={iconButtonStyle}
              onMouseEnter={() => setShowSpeedModal(true)}
              onMouseLeave={() => {
                /* No cerramos inmediatamente para evitar parpadeo */
              }}
            >
<img
  className={`speed-icon ${showSpeedModal ? 'active' : ''}`}
  src="https://static.solargentinotv.com.ar/controls/icons/png/velocidad.png"
  alt="Speed"
  style={{ width: 40, height: 40, marginLeft: '-1.6em' }}
/>
            </button>
  
            {showSpeedModal && (
              <div
                className="speed-modal"
                onMouseEnter={() => setShowSpeedModal(true)}
                onMouseLeave={() => setShowSpeedModal(false)}
                style={{
                  position: 'absolute',
                  bottom: '50px',
                  right: 0,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: '10px',
                  borderRadius: '5px',
                  zIndex: 100,
                  userSelect: 'none',
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '30px',
                      marginLeft: '0.8em',
                      marginTop: '0.4em',
                      color: 'white',
                    }}
                  >
                    Velocidad de reproducción
                  </div>
                </div>
  
                <div className="speed-options-container" style={{ display: 'flex', gap: '10px' }}>
                  {speeds.map((sp) => (
                    <button
                      key={sp}
                      className={`speed-option ${sp === speed ? 'active' : ''}`}
                      onClick={() => {
                        setSpeed(sp);
                        videoRef.current.playbackRate = sp;
                        setShowSpeedModal(false);
                      }}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: sp === speed ? 'transparent' : 'transparent',
                        border: 'none',
                        color: sp === speed ? 'white' : 'gray',
                        cursor: 'pointer',
                        borderRadius: '3px',
                        fontWeight: sp === speed ? 'bold' : 'normal',
                      }}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
  
{/* Contenedor relativo para fullscreen y captions */}
<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
  <button onClick={toggleFullscreen} style={iconButtonStyle}>
    <img
      src={
        fullscreen
          ? 'https://static.solargentinotv.com.ar/controls/icons/png/windowed.png'
          : 'https://static.solargentinotv.com.ar/controls/icons/png/fullscreen.png'
      }
      alt="Fullscreen toggle"
      style={{ width: 40, height: 40, marginRight: '-6.3em' }}
    />
  </button>

  <button
    style={{
      ...iconButtonStyle,
      position: 'absolute',
      left: '-50px',
      top: '50%',
      transform: 'translateY(-50%)',
    }}
  >
    <img
      src="https://static.solargentinotv.com.ar/controls/icons/png/captions.png"
      alt="Captions"
      style={{ width: 40, height: 40, marginLeft: '-7em', marginTop: '0.16em' }}
    />
  </button>
</div>

{/* Control de episodios */}
<div style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <button
    className="episodesReactButton"
    id="episodesReactButton"
    style={{
      ...iconButtonStyle,
      width: '40px',
      height: '40px',
      padding: 0,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    onMouseEnter={handleMouseEnterEpisodes} // SOLO este botón abre
    onMouseLeave={handleMouseLeaveEpisodes} // cierra si salís del botón y modal
  >
<img
  src="https://static.solargentinotv.com.ar/controls/icons/png/episodes.png"
  alt="Episodios"
  className={`episodes-icon ${showEpisodesModal ? 'active' : ''}`}
  style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block', position: 'relative', left: '-18em' }}
/>
  </button>
{/* NUEVO BOTÓN NextEpisode */}
<div
  className="div-position-next"
  style={{ position: 'relative', width: '40px', height: '40px', marginLeft: '8px' }}
  onMouseEnter={() => setNextOverlayVisible(true)}
  onMouseLeave={() => setNextOverlayVisible(false)}
>
  {/* Botón Next Episode */}
  <button
    className="nextEpisodeButton"
    style={{ ...iconButtonStyle, width: '40px', height: '40px', padding: 0 }}
    onClick={() => {
      const currentIndex = episodes.findIndex(ep => ep.videoPath === videoUrl);
      const nextIndex = currentIndex + 1;
      if (nextIndex < episodes.length) playEpisode(nextIndex);
    }}
  >
    <img
      src="https://static.solargentinotv.com.ar/controls/icons/png/next.png"
      alt="Next Episode"
      className={`next-episode-icon ${nextOverlayVisible ? 'active' : ''}`}
      style={{
        width: '32px',
        height: '32px',
        objectFit: 'contain',
        display: 'block',
        transform: nextOverlayVisible ? 'scale(1.2)' : 'scale(1)',
        transition: 'transform 0.2s ease',
      }}
    />
  </button>

  {/* Overlay Next Episode */}
  {episodes.length > 0 && (() => {
    const currentIndex = episodes.findIndex(ep => ep.videoPath === videoUrl);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= episodes.length) return null;
    const nextEp = episodes[nextIndex];

    return (
      <div
        className="next-episode-overlay"
        style={{
          display: nextOverlayVisible ? 'block' : 'none',
          cursor: 'pointer',
        }}
        onClick={() => playEpisode(nextIndex)} // reproduce el episodio al clickear overlay
      >
        {/* Encabezado */}
        <div className="next-episode-header">
          Siguiente episodio
        </div>

        {/* Imagen */}
        <img 
          src={nextEp.image} 
          alt={nextEp.title} 
          className="next-episode-image" 
        />

        {/* Título */}
        <div 
          className="next-episode-title" 
          style={{
            fontWeight: '500',
            fontSize: '26px',
            marginBottom: '3px',
            paddingLeft: '9em',
            marginTop: '-5em',
          }}  
        >
          {nextEp.title}
        </div>

        {/* Descripción */}
        <div 
          className="next-episode-description" 
          style={{
            fontSize: '19px',
            color: 'rgb(204, 204, 204)',
            fontWeight: '300',
            paddingLeft: '12.4em',
          }}
        >
          {nextEp.description}
        </div>
      </div>
    );
  })()}
</div>
{showEpisodesModal && (
  <div
    className="episodes-modal"
    onMouseEnter={handleMouseEnterEpisodes}  // mantiene abierto si estás en el modal
    onMouseLeave={handleMouseLeaveEpisodes}  // cierra si salís del modal
    style={{
      position: 'absolute',
      bottom: '50px',
      right: 0,
      backgroundColor: '#181818',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 100,
      userSelect: 'none',
      width: '300px',
      maxHeight: '400px',
      overflowY: 'auto',
    }}
  >
    {/* Título */}
    <div style={{ marginBottom: 10 }}>
      <div
        className="episodelist-title"
        style={{
          fontWeight: 'bold',
          fontSize: '24px',
          marginLeft: '0.8em',
          marginTop: '0.14em',
          color: 'white',
        }}
      >
        Episodios
      </div>
    </div>

    {/* Dropdown de temporadas */}
    {Object.keys(episodesBySeason).length > 1 && (
      <div
        className={`season-dropdown ${seasonDropdownOpen ? 'show' : ''}`}
        onMouseLeave={() => setSeasonDropdownOpen(false)}
      >
        <div
          className="dropdown-button"
          onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
        >
          Temporada {currentSeason}
        </div>

        <ul id="seasonMenu" className={seasonDropdownOpen ? 'show' : ''}>
          {Object.keys(episodesBySeason).map((season) => (
            <li key={season} className="season-option">
              <button
                className="texto"
                onClick={() => {
                  setCurrentSeason(season);
                  setEpisodes(episodesBySeason[season] || []);
                  setSeasonDropdownOpen(false);
                }}
              >
                Temporada {season} 
                <span className="episodios-count">
                  ({(episodesBySeason[season] || []).length})
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Lista de episodios */}
    {episodes.map((ep, index) => (
      <div
        key={index}
        className="episode-item"
        onClick={() => {
          playEpisode(index);
          const epnameEl = document.getElementById('epname');
          if (epnameEl) {
            epnameEl.textContent = `E${index + 1} ${ep.title}`;
          }
          setShowEpisodesModal(false);
        }}
        style={{
          display: 'flex',
          marginBottom: '10px',
          cursor: 'pointer',
          alignItems: 'center',
          gap: '10px',
          padding: '5px',
          borderRadius: '3px',
        }}
      >
        <img
          src={ep.image}
          alt={ep.title}
          id="epImage"
          className="epImage"
          style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '3px' }}
        />
        <div style={{ color: 'white' }}>
          <h4 style={{ margin: 0, fontSize: '16px' }}>{ep.title}</h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>{ep.description}</p>
        </div>
      </div>
    ))}
  </div>
)}
</div>
</div>
</div>
</div>
  );
}

export default VideoPlayer;
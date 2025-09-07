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
  const [dragging, setDragging] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const sliderRef = useRef(null);
  const tempVolumeRef = useRef(volume);
  const rafId = useRef(null);

  const roundedVolume = Math.round(volume * 100) / 100;
  const isMute = roundedVolume === 0;
  const isLow = roundedVolume > 0 && roundedVolume <= 0.33;
  const isMedium = roundedVolume > 0.33 && roundedVolume <= 0.66;

  let volumeIcon = 'https://static.solargentinotv.com.ar/controls/icons/png/volume2.png';
  if (isMute) volumeIcon = 'https://static.solargentinotv.com.ar/controls/icons/png/volumemute.png';
  else if (isLow) volumeIcon = 'https://static.solargentinotv.com.ar/controls/icons/png/volume0.png';
  else if (isMedium) volumeIcon = 'https://static.solargentinotv.com.ar/controls/icons/png/volume1.png';

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
    if (rafId.current) cancelAnimationFrame(rafId.current);
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
    <div className="nfp volume-controller popup-content" onMouseLeave={handleMouseLeave} style={{ position: 'relative' }}>
      <img
        src={volumeIcon}
        alt="Volume"
        className="volume-icon"
        onClick={() => onVolumeChange(isMute ? 1 : 0)}
        onMouseEnter={handleMouseEnter}
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
          <div className="slider-bar-percentage" style={{ height: `${volume * 100}%` }}>
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
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const hideControlsTimeout = useRef(null);

  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shouldHideTimeAndBar, setShouldHideTimeAndBar] = useState(false);
  const [volumeSliderVisible, setVolumeSliderVisible] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);

  const resetHideTimeout = () => {
    setShouldHideTimeAndBar(false);
    clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      setShouldHideTimeAndBar(true);
    }, 3000);
  };

  useEffect(() => {
    const episodesDataScript = document.getElementById('episodes-data');
    if (episodesDataScript) {
      try {
        const parsed = JSON.parse(episodesDataScript.textContent);
        setEpisodes(parsed);
        if (parsed.length > 0) {
          setVideoUrl(parsed[0].videoPath);
          onEpisodeChange(parsed[0]);
        }
      } catch (e) {
        console.error('Error parsing episodes JSON', e);
      }
    } else if (propVideoUrl) {
      setEpisodes([]);
      setVideoUrl(propVideoUrl);
      onEpisodeChange({ videoPath: propVideoUrl, title: '', description: '' });
    }
  }, [propVideoUrl, onEpisodeChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    let hls;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(console.warn));
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoUrl;
      const onLoadedMetadata = () => video.play().catch(console.warn);
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
    } else {
      video.src = videoUrl;
      video.load();
      video.play().catch(console.warn);
    }
    return () => hls && hls.destroy();
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.volume = 0.5;
    setVolume(0.5);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
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
      if (e.key.toLowerCase() === 'f') toggleFullscreen();
      else if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
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
    videoRef.current.volume = val;
    setVolume(val);
  };

  const toggleFullscreen = () => {
    const elem = containerRef.current;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.() || elem.webkitRequestFullscreen?.() || elem.mozRequestFullScreen?.() || elem.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.mozCancelFullScreen?.() || document.msExitFullscreen?.();
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mm = m < 10 ? '0' + m : m;
    const ss = s < 10 ? '0' + s : s;
    return h > 0 ? `${h < 10 ? '0'+h : h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const [progressDragging, setProgressDragging] = useState(false);
  const handleProgressPointerDown = (e) => { e.preventDefault(); setProgressDragging(true); updateProgress(e.clientX); progressRef.current.setPointerCapture(e.pointerId); };
  const handleProgressPointerMove = (e) => { if (progressDragging) updateProgress(e.clientX); };
  const handleProgressPointerUp = (e) => { setProgressDragging(false); progressRef.current.releasePointerCapture(e.pointerId); };
  const updateProgress = (clientX) => {
    const rect = progressRef.current.getBoundingClientRect();
    let newTime = ((clientX - rect.left) / rect.width) * duration;
    newTime = Math.min(Math.max(newTime, 0), duration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div ref={containerRef} style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', backgroundColor:'black', display:'flex', justifyContent:'center', alignItems:'center', overflow:'hidden', userSelect:'none' }} onMouseMove={resetHideTimeout} onMouseEnter={resetHideTimeout}>
      <GlobalStyle />
      <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'contain' }} onClick={togglePlay} />
      {/* Controles, barra de progreso, botones, volumen, velocidad, fullscreen y episodios */}
      {/* Reutiliza tu código de controles existente, ya que aquí mantuve toda la lógica */}
    </div>
  );
}

export default VideoPlayer;
import React, { useState, useRef, useEffect, useMemo } from 'react';
import './css/SATVPlayer.css';
import Hls from 'hls.js';
import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  @import url('https://fuentes.solargentinotv.com.ar/netflixsans.css');
  * { font-family: 'Netflix Sans'; margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; background-color: black; }
`;

const speeds = [0.5, 0.75, 1, 1.25, 1.5];

function VolumeControl({ volume, onVolumeChange, onSliderVisibilityChange }) {
  const [dragging, setDragging] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const sliderRef = useRef(null);
  const tempVolumeRef = useRef(volume);
  const rafId = useRef(null);

  useEffect(() => { tempVolumeRef.current = volume; }, [volume]);

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
    tempVolumeRef.current = Math.min(1, Math.max(0, newVolume));
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    sliderRef.current && sliderRef.current.setPointerCapture && sliderRef.current.setPointerCapture(e.pointerId);
    updateVolumeInternal(e.clientY);
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => onVolumeChange(tempVolumeRef.current));
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    updateVolumeInternal(e.clientY);
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => onVolumeChange(tempVolumeRef.current));
  };

  const handlePointerUp = (e) => {
    setDragging(false);
    sliderRef.current && sliderRef.current.releasePointerCapture && sliderRef.current.releasePointerCapture(e.pointerId);
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    onVolumeChange(tempVolumeRef.current);
  };

  const handleMouseEnter = () => { setShowSlider(true); onSliderVisibilityChange && onSliderVisibilityChange(true); };
  const handleMouseLeave = () => { if (!dragging) { setShowSlider(false); onSliderVisibilityChange && onSliderVisibilityChange(false); } };

  return (
    <div className="nfp volume-controller popup-content" onMouseLeave={handleMouseLeave} style={{ position: 'relative' }}>
      <img
        src={volumeIcon}
        alt="Volume"
        className={`volume-icon ${showSlider ? 'active' : ''}`}
        onClick={() => onVolumeChange(isMute ? 1 : 0)}
        onMouseEnter={handleMouseEnter}
        style={{ width: 40, height: 40 }}
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
        style={{ position: 'absolute', bottom: '48px', left: 0, width: 40, height: 120, display: showSlider ? 'block' : 'none' }}
      >
        <div className="slider-bar-container" style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
          <div className="slider-bar-percentage" style={{ height: `${volume * 100}%`, width: '100%', background: '#e50914', position: 'relative' }}>
            <div className="scrubber-target"><div className="scrubber-head ltr93p1v1" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ propVideoUrl, onEpisodeChange = () => {} }) {
  const defaultIconButton = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' };

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const progressRef = useRef(null);

  // core state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState('Movie');
  const [videoTitle, setVideoTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [seriesName, setSeriesName] = useState('');

  const [episodes, setEpisodes] = useState([]);
  const episodesRef = useRef(episodes);
  useEffect(() => { episodesRef.current = episodes; }, [episodes]);

  const videoUrlRef = useRef(videoUrl);
  useEffect(() => { videoUrlRef.current = videoUrl; }, [videoUrl]);

  const [volume, setVolume] = useState(0.5);
  const [playing, setPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const [progressHover, setProgressHover] = useState(false);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [volumeSliderVisible, setVolumeSliderVisible] = useState(false);
  const [nextOverlayVisible, setNextOverlayVisible] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [shouldHideTimeAndBar, setShouldHideTimeAndBar] = useState(false);

  // seasons dropdown state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  // Read external JSON (script tag with id 'episodes-data')
  useEffect(() => {
    const episodesDataScript = document.getElementById('episodes-data');
    if (!episodesDataScript) {
      if (propVideoUrl) setVideoUrl(propVideoUrl);
      return;
    }

    try {
      const parsed = JSON.parse(episodesDataScript.textContent);

      if (Array.isArray(parsed)) {
        // legacy: flat array
        const flat = parsed.map(ep => ({ ...ep, season: ep.season || 1 }));
        setEpisodes(flat);
        if (flat.length > 0) playEpisode(0, flat);
        return;
      }

      // object like { t1: { 'cant-eps': n, eps: [...] }, t2: {...} }
      if (parsed && typeof parsed === 'object') {
        const seasonKeys = Object.keys(parsed).filter((k) => /^t\d+$/i.test(k));
        seasonKeys.sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));

        const flat = [];
        seasonKeys.forEach((key) => {
          const seasonNum = Number(key.replace(/\D/g, '')) || 1;
          const sObj = parsed[key];
          if (sObj && Array.isArray(sObj.eps)) {
            sObj.eps.forEach((ep) => flat.push({ ...ep, season: seasonNum }));
          }
        });

        // fallback: maybe parsed.eps is a flat array
        if (flat.length === 0 && Array.isArray(parsed.eps)) {
          parsed.eps.forEach((ep) => flat.push({ ...ep, season: ep.season || 1 }));
        }

        setEpisodes(flat);
        if (flat.length > 0) playEpisode(0, flat);
        return;
      }

      console.warn('Formato de JSON de episodios no reconocido.');
    } catch (err) {
      console.error('Error parsing episodes JSON', err);
    }
  }, [propVideoUrl]);

  // compute seasons grouped
  const seasons = useMemo(() => {
    const map = new Map();
    episodes.forEach((ep) => {
      const s = Number(ep.season) || 1;
      if (!map.has(s)) map.set(s, []);
      map.get(s).push(ep);
    });
    const arr = Array.from(map.entries()).sort((a,b)=>a[0]-b[0]).map(([season, eps])=>({ season, episodes: eps }));

    const jsonObj = {};
    arr.forEach(item => {
      jsonObj[`t${item.season}`] = { 'cant-eps': item.episodes.length, eps: item.episodes };
    });

    return { arr, jsonObj };
  }, [episodes]);

  // keep selectedSeason valid
  useEffect(() => {
    if (seasons.arr && seasons.arr.length > 0) {
      const exists = seasons.arr.some(s => s.season === selectedSeason);
      if (!exists) setSelectedSeason(seasons.arr[0].season);
    }
  }, [seasons, selectedSeason]);

  // single effect to manage video element events and HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls;
    const attachHls = (src) => {
      if (hls) { hls.destroy(); hls = null; }
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      } else {
        video.src = src;
      }
    };

    // ensure src is set
    if (videoUrl) attachHls(videoUrl);

    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const onWaiting = () => {};
    const onPlaying = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onCanPlay = () => {};
    const onEnded = () => {
      // advance to next in playlist if exists
      const eps = episodesRef.current;
      const current = videoUrlRef.current;
      const idx = eps.findIndex(ep => ep.videoPath === current);
      if (idx >= 0 && idx + 1 < eps.length) {
        playEpisode(idx + 1, eps);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);

    // set initial volume and playbackRate
    video.volume = volume;
    video.playbackRate = speed;

    // try autoplay (may be blocked by browser policies)
    video.play().catch(() => {});

    return () => {
      video.pause();
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      if (hls) { hls.destroy(); hls = null; }
    };
  // only re-run when videoUrl, volume or speed change
  }, [videoUrl, volume, speed]);

  // keyboard and fullscreen change listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target && e.target.tagName;
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft') rewind();
      else if (e.key === 'ArrowRight') forward();
    };

    const handleFullscreenChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setFullscreen(!!fsEl);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // control helpers
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  const rewind = () => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, (videoRef.current.currentTime || 0) - 10); };
  const forward = () => { if (videoRef.current && duration) videoRef.current.currentTime = Math.min(videoRef.current.duration, (videoRef.current.currentTime || 0) + 10); };
  const changeVolume = (val) => { if (videoRef.current) videoRef.current.volume = val; setVolume(val); };
  const setPlaybackSpeed = (s) => { if (videoRef.current) videoRef.current.playbackRate = s; setSpeed(s); };

  const updateProgressFromClientX = (clientX) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    let newTime = ((clientX - rect.left) / rect.width) * duration;
    newTime = Math.min(Math.max(newTime, 0), duration);
    if (videoRef.current) videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressPointerDown = (e) => { e.preventDefault(); updateProgressFromClientX(e.clientX); progressRef.current && progressRef.current.setPointerCapture && progressRef.current.setPointerCapture(e.pointerId); };
  const handleProgressPointerMove = (e) => { if (e.buttons === 1) updateProgressFromClientX(e.clientX); };
  const handleProgressPointerUp = (e) => { progressRef.current && progressRef.current.releasePointerCapture && progressRef.current.releasePointerCapture(e.pointerId); };

  const playEpisode = (index, list = episodes) => {
    if (!list || !list[index]) return;
    const ep = list[index];
    setVideoUrl(ep.videoPath);
    setVideoType(ep.titleType || 'Series');
    setVideoTitle(ep.title || '');
    setEpisodeNumber(ep.episodeNumber || (index+1));
    setSeriesName(ep.seriesName || '');
    setShowEpisodesModal(false);
    setShouldHideTimeAndBar(false);
  };

  const toggleFullscreen = () => {
    const elem = containerRef.current;
    if (!document.fullscreenElement) {
      elem && elem.requestFullscreen && elem.requestFullscreen();
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  };

  // UI helpers
  const currentSeasonObj = seasons.arr.find(s => s.season === selectedSeason) || (seasons.arr[0] ?? { season: 1, episodes });
  const seasonsCount = seasons.arr.length || 0;

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, backgroundColor: 'black', display: 'flex', flexDirection: 'column', userSelect: 'none' }} onMouseMove={() => setShouldHideTimeAndBar(false)}>
      <GlobalStyle />

      <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'black' }} onClick={togglePlay} />

      {/* controls */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, color: 'white', display: shouldHideTimeAndBar ? 'none' : 'flex', flexDirection: 'column', fontSize: 14 }}>
        <div ref={progressRef} onPointerDown={handleProgressPointerDown} onPointerMove={handleProgressPointerMove} onPointerUp={handleProgressPointerUp}
          onMouseEnter={() => setProgressHover(true)} onMouseLeave={() => setProgressHover(false)}
          style={{ height: progressHover ? 6 : 4, width: '95%', backgroundColor: 'rgba(139,139,139,0.72)', cursor: 'pointer', position: 'relative', marginLeft: '0.7em', transition: 'height 0.2s ease' }}>
          <div style={{ width: (duration ? (currentTime/duration)*100 : 0) + '%', height: '100%', backgroundColor: '#e50914', position: 'relative' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: '1em' }}>
          <button onClick={togglePlay} style={defaultIconButton}><img src={playing ? 'https://static.solargentinotv.com.ar/controls/icons/png/pause.png' : 'https://static.solargentinotv.com.ar/controls/icons/png/play.png'} alt="play" style={{ width: 40, height: 40 }} /></button>
          <button onClick={rewind} style={defaultIconButton}><img src="https://static.solargentinotv.com.ar/controls/icons/png/backward10.png" alt="rew" style={{ width: 40, height: 40 }} /></button>
          <button onClick={forward} style={defaultIconButton}><img src="https://static.solargentinotv.com.ar/controls/icons/png/forward10.png" alt="fwd" style={{ width: 40, height: 40 }} /></button>

          <VolumeControl volume={volume} onVolumeChange={changeVolume} onSliderVisibilityChange={setVolumeSliderVisible} />

          <div style={{ flexGrow: 1, textAlign: 'center', fontSize: 15 }}>{duration ? new Date((duration - currentTime) * 1000).toISOString().substr(duration >= 3600 ? 11 : 14, duration >= 3600 ? 8 : 5) : '00:00'}</div>

          <div style={{ position: 'relative', cursor: 'pointer' }} onMouseEnter={() => setShowSpeedModal(true)} onMouseLeave={() => setShowSpeedModal(false)}>
            <button style={defaultIconButton}><img src="https://static.solargentinotv.com.ar/controls/icons/png/velocidad.png" alt="speed" style={{ width: 40, height: 40 }} /></button>
            {showSpeedModal && (
              <div style={{ position: 'absolute', bottom: 50, right: 0, background: 'rgba(0,0,0,0.85)', padding: 8, borderRadius: 6 }}>
                <div style={{ fontWeight: 'bold', fontSize: 16, color: 'white', marginBottom: 8 }}>Velocidad</div>
                <div style={{ display: 'flex', gap: 8 }}>{speeds.map(sp => (
                  <button key={sp} onClick={() => setPlaybackSpeed(sp)} style={{ background: 'transparent', border: 'none', color: sp === speed ? 'white' : '#888', cursor: 'pointer', fontWeight: sp === speed ? 'bold' : 'normal' }}>{sp}x</button>
                ))}</div>
              </div>
            )}
          </div>

          <button onClick={toggleFullscreen} style={defaultIconButton}><img src={fullscreen ? 'https://static.solargentinotv.com.ar/controls/icons/png/windowed.png' : 'https://static.solargentinotv.com.ar/controls/icons/png/fullscreen.png'} alt="fs" style={{ width: 40, height: 40 }} /></button>

          <div style={{ position: 'relative', width: 40, height: 40 }}>
            <button className="episodesReactButton" onMouseEnter={() => setShowEpisodesModal(true)} onMouseLeave={() => setShowEpisodesModal(false)} style={defaultIconButton}><img src="https://static.solargentinotv.com.ar/controls/icons/png/episodes.png" alt="eps" style={{ width: 32, height: 32 }} /></button>

            {showEpisodesModal && (
              <div onMouseEnter={() => setShowEpisodesModal(true)} onMouseLeave={() => setShowEpisodesModal(false)} style={{ position: 'absolute', bottom: 50, right: 0, width: 380, maxHeight: 400, overflowY: 'auto', background: '#181818', padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>Episodios</div>

                {/* seasons dropdown */}
                <div style={{ marginBottom: 12 }}>
                  {seasonsCount >= 2 ? (
                    <div className="dropdown" style={{ position: 'relative' }}>
                      <button onClick={() => setShowSeasonDropdown(s => !s)} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 4, border: '1px solid #333', background: '#0f0f0f', color: 'white' }}>Temporada {selectedSeason}</button>

                      {showSeasonDropdown && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '100%', background: '#121212', borderRadius: 4, border: '1px solid #333', padding: 6, zIndex: 1000 }}>
                          {seasons.arr.map(sObj => (
                            <div key={sObj.season} onClick={() => { setSelectedSeason(sObj.season); setShowSeasonDropdown(false); }} style={{ padding: '8px 10px', cursor: 'pointer', color: 'white' }}>Temporada {sObj.season} ({sObj.episodes.length} episodios)</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#ccc' }}>Temporada {currentSeasonObj.season} ({currentSeasonObj.episodes.length} episodios)</div>
                  )}
                </div>

                {/* episodes list for selected season */}
                { (currentSeasonObj.episodes || []).map((ep, idx) => (
                  <div key={idx} onClick={() => {
                    const globalIndex = episodes.findIndex(x => x.videoPath === ep.videoPath);
                    if (globalIndex >= 0) playEpisode(globalIndex);
                    setShowEpisodesModal(false);
                  }} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 6, cursor: 'pointer' }}>
                    <img src={ep.image} alt={ep.title} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                    <div style={{ color: 'white' }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{ep.title}</div>
                      <div style={{ fontSize: 12, color: '#ccc' }}>{ep.description}</div>
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
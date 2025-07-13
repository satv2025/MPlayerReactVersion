import React from 'react';
import VideoPlayer from './VideoPlayer';
import './netflix.css'; // este archivo lo vamos a crear para importar la fuente

function App() {
  return (
    <div className="app">
      <h1>Mi Reproductor HLS con React</h1>
      <VideoPlayer url="https://cdn.jsdelivr.net/gh/satv2025/media@main/videos/app/e5/Asesinato-Para-Principiantes-T1-E5.m3u8" />
    </div>
  );
}

export default App;

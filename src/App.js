import React from 'react';
import ReactDOM from 'react-dom';
import reactToWebComponent from 'react-to-webcomponent';

import SATVPlayer_wrapper from './SATVPlayer.jsx'; // importás el componente React
import './css/SATVPlayer.css'; // estilos

// Convertís el componente React a Web Component (solo una vez)
const SATVPlayerElement = reactToWebComponent(SATVPlayer_wrapper, React, ReactDOM);
if (!customElements.get('satv-player')) {
  customElements.define('satv-player', SATVPlayerElement);
}

function App() {
  return (
    <div>
      <satv-player></satv-player> {/* Usás el web component */}
    </div>
  );
}

export default App;
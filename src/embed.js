import React from "react";
import ReactDOM from "react-dom";
import SATVPlayer from "./SATVPlayer.jsx";

window.SATVPlayerEmbed = function ({ elementId, videoUrl }) {
  const el = document.getElementById(elementId);
  if (el) {
    ReactDOM.render(<SATVPlayer videoUrl={videoUrl} />, el);
  } else {
    console.error("Elemento no encontrado:", elementId);
  }
};
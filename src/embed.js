// src/embed.js
import React from "react";
import { createRoot } from "react-dom/client";
import SATVPlayer from "./SATVPlayer.jsx";

// Exportar como función global
window.SATVPlayerEmbed = function ({ elementId, videoUrl }) {
  const root = createRoot(document.getElementById(elementId));
  root.render(<SATVPlayer src={videoUrl} />);
};
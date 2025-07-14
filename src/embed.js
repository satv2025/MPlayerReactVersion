import React from "react";
import { createRoot } from "react-dom/client";
import SATVPlayer from "./SATVPlayer.jsx";

window.SATVPlayerEmbed = function ({ elementId, videoUrl }) {
  const root = createRoot(document.getElementById(elementId));
  root.render(<SATVPlayer src={videoUrl} />);
};
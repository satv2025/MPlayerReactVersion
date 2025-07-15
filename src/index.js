import React from "react";
import ReactDOM from "react-dom";
import EpisodesButton from "./EpisodesModal";

function mountEpisodesButton() {
  // Seleccioná el contenedor exacto de controles donde quieras insertar el botón
  const controlsContainer = document.querySelector(
    'div[style*="position: absolute"][style*="bottom: 20px"]'
  );

  if (!controlsContainer) {
    console.warn("No se encontró el contenedor de controles para insertar EpisodesButton");
    return;
  }

  // Crear un nodo donde React monte el botón
  const mountPoint = document.createElement("div");
  mountPoint.id = "episodes-button-mount";
  controlsContainer.appendChild(mountPoint);

  ReactDOM.render(
    <EpisodesButton onClick={() => alert("Episodes clicked")} />,
    mountPoint
  );
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  mountEpisodesButton();
} else {
  window.addEventListener("DOMContentLoaded", mountEpisodesButton);
}
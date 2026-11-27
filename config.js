// config.js — ajustes de detección y campos de información de cada foto.
const CFG = {
  anchoAnalisis: 480,   // ancho (px) al que se analiza cada cuadro
  intervaloMs: 50,      // cada cuántos ms se analiza un cuadro
  mantenerMs: 300,      // tiempo que el punto debe quedarse quieto para capturar
  huecoMs: 200,         // pérdida de señal tolerada sin reiniciar el conteo
  pausaMs: 2500,        // descanso después de cada captura
  rojoMinBase: 250, rojoMinPaso: 6,  // canal rojo mínimo = base - sensibilidad*paso
  difBase: 90, difPaso: 6,           // rojo menos verde/azul mínimo
  pxMin: 2, pxMaxFrac: 0.004,        // tamaño mínimo y máximo (fracción de la imagen)
  bboxMaxFrac: 0.12,                 // el punto no puede ser más ancho que este % de la imagen
  sensDef: 5
};
// Información que se puede adjuntar y editar en cada foto.
// Agregar un campo = agregar una línea (area:true = cuadro de texto grande).
const CAMPOS = [
  { k: "titulo", l: "Título" },
  { k: "desc", l: "Descripción", area: true },
  { k: "lugar", l: "Lugar / objeto señalado" },
  { k: "etiquetas", l: "Etiquetas (separadas por coma)" }
];

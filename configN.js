// config.js — ajustes de detección y datos que se anotan en cada foto.
const CFG = {
  anchoAnalisis: 480,  // ancho (px) al que se analiza cada cuadro
  intervaloMs: 50,     // cada cuántos ms se analiza un cuadro
  mantenerMs: 300,     // tiempo que el punto debe quedarse quieto para capturar
  huecoMs: 200,        // pérdida de señal tolerada sin reiniciar el conteo
  pausaMs: 2500,       // descanso después de cada captura
  estaticoMs: 1500,    // una mancha roja quieta más de este tiempo se ignora (objeto fijo)
  rojoMin: 220,        // canal rojo mínimo (0-255). OJO: la Sensibilidad de Ajustes pisa rojoMin, difMin, mantenerMs, pausaMs y estaticoMs
  difMin: 60,          // cuánto más rojo que verde y azul
  pxMin: 2, pxMaxFrac: 0.002,  // tamaño mínimo y máximo de la mancha (fracción de la imagen)
  elongMax: 1.8        // 1 = redondo; más alargado que esto se descarta
};
// Información de cada foto. Agregar un campo = agregar una línea.
const CAMPOS = [
  { k: "titulo", l: "Título" },
  { k: "desc", l: "Descripción", area: true },
  { k: "lugar", l: "Lugar / objeto señalado" },
  { k: "etiquetas", l: "Etiquetas (separadas por coma)" }
];

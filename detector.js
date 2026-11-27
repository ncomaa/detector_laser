// detector.js — detección del punto rojo (función pura, sin DOM).
// data = píxeles RGBA de un cuadro. Devuelve {x,y,n} o null.
function detectarPunto(data, w, h, sens) {
  const rMin = CFG.rojoMinBase - sens * CFG.rojoMinPaso, dMin = CFG.difBase - sens * CFG.difPaso;
  let n = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r >= rMin && r - g >= dMin && r - b >= dMin) {
      n++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (n < CFG.pxMin || n > w * h * CFG.pxMaxFrac) return null;        // muy chico o demasiado grande (objeto rojo)
  if (x1 - x0 > w * CFG.bboxMaxFrac || y1 - y0 > w * CFG.bboxMaxFrac) return null; // manchas separadas
  return { x: sx / n, y: sy / n, n };
}
if (typeof module !== "undefined") module.exports = { detectarPunto };

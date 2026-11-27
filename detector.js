// Detección de manchas rojas y, opcionalmente, verdes.
// Devuelve candidatos [{x,y,n,el,color}] ordenados del más redondo al más alargado.
function detectarPuntos(data, w, h, sens, incluirVerde = false) {
  const rMin = CFG.rojoMinBase - sens * CFG.rojoMinPaso;
  const dMin = CFG.difBase - sens * CFG.difPaso;
  const gMin = 220 - sens * 6;
  const gdMin = 60 - sens * 6;
  const m = new Uint8Array(w * h), colors = new Uint8Array(w * h), out = [], st = [];
  const maxN = w * h * CFG.pxMaxFrac;

  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const red = r >= rMin && r - g >= dMin && r - b >= dMin;
    const green = incluirVerde && g >= gMin && g - r >= gdMin && g - b >= gdMin;
    if (red || green) { m[p] = 1; colors[p] = green && !red ? 2 : 1; }
  }

  for (let s = 0; s < w * h; s++) {
    if (m[s] !== 1) continue;
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, redN = 0, greenN = 0;
    st.length = 0; st.push(s); m[s] = 2;
    while (st.length) {
      const p = st.pop(), x = p % w, y = (p - x) / w;
      n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
      if (colors[p] === 2) greenN++; else redN++;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (m[q] === 1) { m[q] = 2; st.push(q); }
        }
      }
    }
    if (n < CFG.pxMin || n > maxN) continue;
    const mx = sx / n, my = sy / n;
    const vx = sxx / n - mx * mx + 1 / 12, vy = syy / n - my * my + 1 / 12, cv = sxy / n - mx * my;
    const t = (vx + vy) / 2, d = Math.sqrt(((vx - vy) / 2) ** 2 + cv * cv), l2 = Math.max(t - d, 1e-6);
    const el = Math.sqrt((t + d) / l2);
    if (el > CFG.elongMax) continue;
    out.push({ x: mx, y: my, n, el, color: greenN > redN ? "green" : "red" });
  }
  return out.sort((a, b) => a.el - b.el);
}
if (typeof module !== "undefined") module.exports = { detectarPuntos };

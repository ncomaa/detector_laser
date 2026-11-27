// detector.js — busca puntos rojos redondos en un cuadro (función pura, sin DOM).
// Devuelve [{x,y,n,el}] ordenado del más redondo al más alargado.
function detectarPuntos(data, w, h) {
  const m = new Uint8Array(w * h), out = [], st = [], maxN = w * h * CFG.pxMaxFrac;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) { const r = data[i]; if (r >= CFG.rojoMin && r - data[i + 1] >= CFG.difMin && r - data[i + 2] >= CFG.difMin) m[p] = 1; }
  for (let s = 0; s < w * h; s++) {
    if (m[s] !== 1) continue;
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0; st.length = 0; st.push(s); m[s] = 2;   // se agrupan píxeles vecinos en una mancha
    while (st.length) {
      const p = st.pop(), x = p % w, y = (p - x) / w; n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; const q = yy * w + xx; if (m[q] === 1) { m[q] = 2; st.push(q); } } }
    }
    if (n < CFG.pxMin || n > maxN) continue;
    const mx = sx / n, my = sy / n, vx = sxx / n - mx * mx + 1 / 12, vy = syy / n - my * my + 1 / 12, cv = sxy / n - mx * my;
    const t = (vx + vy) / 2, d = Math.sqrt(((vx - vy) / 2) ** 2 + cv * cv);
    const el = Math.sqrt((t + d) / Math.max(t - d, 1e-6));   // elongación: 1 = círculo, alto = línea
    if (el <= CFG.elongMax) out.push({ x: mx, y: my, n, el });
  }
  return out.sort((a, b) => a.el - b.el);
}

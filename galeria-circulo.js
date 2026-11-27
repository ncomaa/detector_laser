// Ajuste visual del círculo en la vista de detalle de la galería.
(() => {
  const abrirFotoOriginal = window.abrirFoto;
  if (typeof abrirFotoOriginal !== "function") return;

  window.abrirFoto = async id => {
    await abrirFotoOriginal(id);
    const detalle = document.getElementById("det");
    const img = detalle && detalle.querySelector("img");
    if (!img) return;

    const registro = await new Promise(resolve => {
      const request = indexedDB.open("laser", 1);
      request.onsuccess = () => {
        const db = request.result;
        const get = db.transaction("fotos", "readonly").objectStore("fotos").get(id);
        get.onsuccess = () => { resolve(get.result); db.close(); };
        get.onerror = () => { resolve(null); db.close(); };
      };
      request.onerror = () => resolve(null);
    });
    if (!registro) return;

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return;

    const xs = Array.isArray(registro.xpList) ? registro.xpList : [registro.xp];
    const ys = Array.isArray(registro.ypList) ? registro.ypList : [registro.yp];
    const points = xs.map((x, i) => ({ x: Number(x), y: Number(ys[i]) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!points.length) return;

    const baseRadius = Math.max(28, width * 0.045);
    const key = `laser-circle-scale-${id}`;
    const savedScale = Number(localStorage.getItem(key)) || 1;
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:relative;width:100%;";
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    const circles = points.map(point => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(width * point.x / 100));
      circle.setAttribute("cy", String(height * point.y / 100));
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", "#00ff6a");
      circle.setAttribute("stroke-width", String(Math.max(4, width / 250)));
      svg.appendChild(circle);
      return circle;
    });
    wrapper.appendChild(svg);

    const controls = document.createElement("div");
    controls.className = "card";
    controls.innerHTML = '<label for="circleScale">Tamaño del círculo: <b id="circleScaleValue"></b></label><input id="circleScale" type="range" min="0.5" max="2.5" step="0.05" aria-label="Agrandar o achicar los círculos que rodean los láseres"><span class="lb">Ajuste visual de esta foto en la galería.</span>';
    wrapper.insertAdjacentElement("afterend", controls);
    const range = controls.querySelector("input");
    const value = controls.querySelector("b");
    range.value = String(Math.min(2.5, Math.max(0.5, savedScale)));
    const update = () => {
      const scale = Number(range.value);
      circles.forEach(circle => circle.setAttribute("r", String(baseRadius * scale)));
      value.textContent = `${scale.toFixed(2)}×`;
      localStorage.setItem(key, String(scale));
    };
    range.addEventListener("input", update);
    update();
  };
})();

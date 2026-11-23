// app.js — cámara, captura, galería y edición de información.
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const v = $("v"), ov = $("ov"), gO = ov.getContext("2d");
const cA = document.createElement("canvas"), gA = cA.getContext("2d", { willReadFrequently: true });
let stream = null, run = false, hold = null, cool = 0, last = 0, AW = 480, AH = 360, urls = [];
const cfg = { sens: +(localStorage.getItem("sens") || CFG.sensDef), test: localStorage.getItem("test") === "1", expo: localStorage.getItem("expo") !== "0" };

// ---------- almacenamiento (IndexedDB: fotos + información) ----------
const DB = new Promise((ok, er) => { const r = indexedDB.open("laser", 1); r.onupgradeneeded = () => r.result.createObjectStore("fotos", { keyPath: "id" }); r.onsuccess = () => ok(r.result); r.onerror = () => er(r.error); });
const tx = async (m, f) => { const db = await DB; return new Promise((ok, er) => { const t = db.transaction("fotos", m), q = f(t.objectStore("fotos")); t.oncomplete = () => ok(q && q.result); t.onerror = () => er(t.error); }); };
const put = r => tx("readwrite", s => s.put(r)), all = () => tx("readonly", s => s.getAll()), get = id => tx("readonly", s => s.get(id)), del = id => tx("readwrite", s => s.delete(id));

// ---------- navegación y ajustes ----------
document.querySelectorAll("#nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("#nav button").forEach(x => x.classList.toggle("on", x === b));
  $("cam").classList.toggle("hide", b.dataset.v !== "cam"); $("gal").classList.toggle("hide", b.dataset.v !== "gal");
  if (b.dataset.v === "gal") galeria();
});
$("sens").value = cfg.sens; $("sv").textContent = cfg.sens; $("test").checked = cfg.test; $("expo").checked = cfg.expo;
$("sens").oninput = e => { cfg.sens = +e.target.value; $("sv").textContent = cfg.sens; localStorage.setItem("sens", cfg.sens); };
$("test").onchange = e => { cfg.test = e.target.checked; localStorage.setItem("test", cfg.test ? 1 : 0); if (!cfg.test) gO.clearRect(0, 0, ov.width, ov.height); };
$("expo").onchange = e => { cfg.expo = e.target.checked; localStorage.setItem("expo", cfg.expo ? 1 : 0); aplicarExpo(); };
const est = (t, c) => { const e = $("est"); e.textContent = t; e.className = "est " + (c || ""); };

// ---------- cámara ----------
function aplicarExpo() {
  try { const tr = stream.getVideoTracks()[0], cap = tr.getCapabilities();
    if (cap.exposureCompensation) tr.applyConstraints({ advanced: [{ exposureCompensation: cfg.expo ? cap.exposureCompensation.min * 0.6 : 0 }] }); } catch (e) { }
}
function parar() { run = false; if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; v.srcObject = null; gO.clearRect(0, 0, ov.width, ov.height); $("btnCam").textContent = "Iniciar cámara"; est("Cámara apagada"); }
const camSel = $("camSel");
const abrirCam = id => navigator.mediaDevices.getUserMedia({ video: { ...(id ? { deviceId: { exact: id } } : { facingMode: { ideal: "environment" } }), width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
const esAncha = l => /ultra|wide|0\.5|macro|depth|tele|angular/i.test(l);   // se evitan las lentes que no son la principal
const aplicarZoom = z => { try { stream.getVideoTracks()[0].applyConstraints({ advanced: [{ zoom: +z }] }); } catch (e) { } };
async function iniciar() {
  try {
    const saved = localStorage.getItem("cam");
    try { stream = await abrirCam(saved); } catch (e) { stream = await abrirCam(null); }
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
    let cur = stream.getVideoTracks()[0].getSettings().deviceId;
    if (!saved) { const c = devs.find(d => /back|rear|trasera|environment/i.test(d.label) && !esAncha(d.label));
      if (c && c.deviceId !== cur) { stream.getTracks().forEach(t => t.stop()); stream = await abrirCam(c.deviceId); cur = c.deviceId; } }
    camSel.innerHTML = devs.map((d, i) => `<option value="${d.deviceId}">${esc(d.label || "Cámara " + (i + 1))}</option>`).join(""); camSel.value = cur;
    $("camBox").classList.remove("hide");
    v.srcObject = stream; await v.play();
    const cap = stream.getVideoTracks()[0].getCapabilities ? stream.getVideoTracks()[0].getCapabilities() : {};
    if (cap.zoom) { const z = $("zoom"); z.min = cap.zoom.min; z.max = cap.zoom.max; z.step = cap.zoom.step || 0.1;
      const val = Math.min(Math.max(+localStorage.getItem("zoom") || 1, cap.zoom.min), cap.zoom.max); z.value = val; $("zv").textContent = val.toFixed(1) + "x"; aplicarZoom(val); $("zoomBox").classList.remove("hide"); }
    else $("zoomBox").classList.add("hide");
    AW = CFG.anchoAnalisis; AH = Math.round(AW * v.videoHeight / v.videoWidth);
    cA.width = ov.width = AW; cA.height = ov.height = AH;
    $("stage").style.aspectRatio = v.videoWidth + "/" + v.videoHeight;
    aplicarExpo(); run = true; tracks = []; $("btnCam").textContent = "Detener cámara"; requestAnimationFrame(loop);
  } catch (e) { est("No se pudo abrir la cámara. Revisá el permiso en los ajustes del celular.", "er"); }
}
$("btnCam").onclick = () => run ? parar() : iniciar();
camSel.onchange = e => { localStorage.setItem("cam", e.target.value); if (run) { parar(); iniciar(); } };
$("zoom").oninput = e => { $("zv").textContent = (+e.target.value).toFixed(1) + "x"; localStorage.setItem("zoom", e.target.value); aplicarZoom(e.target.value); };

// ---------- detección ----------
let tracks = [];   // manchas rojas seguidas en el tiempo: {x,y,t0,seen,hecho}
function pintar(cs) {
  gO.clearRect(0, 0, AW, AH); if (!cfg.test) return;
  cs.forEach(c => { gO.strokeStyle = c.estatico ? "#f59e0b" : "#22c55e"; gO.lineWidth = 3; gO.beginPath(); gO.arc(c.x, c.y, 14, 0, 7); gO.stroke(); });  // verde = candidato, naranja = objeto fijo ignorado
}
function loop(t) {
  if (!run) return; requestAnimationFrame(loop);
  if (t - last < CFG.intervaloMs) return; last = t;
  gA.drawImage(v, 0, 0, AW, AH);
  const cs = detectarPuntos(gA.getImageData(0, 0, AW, AH).data, AW, AH, cfg.sens), R = AW * 0.05;
  tracks = tracks.filter(k => t - k.seen < CFG.huecoMs);
  let mejor = null;
  cs.forEach(c => {
    let k = tracks.find(k => Math.hypot(c.x - k.x, c.y - k.y) < R);
    if (!k) { k = { x: c.x, y: c.y, t0: t, seen: t, hecho: false }; tracks.push(k); }
    k.seen = t; c.k = k; c.estatico = t - k.t0 > CFG.estaticoMs;
    if (!c.estatico && !mejor) mejor = c;
  });
  pintar(cs);
  if (t < cool) return est("📸 Capturada · pausa breve", "ok");
  if (mejor && !mejor.k.hecho) {
    est("Punto detectado, manteniendo...", "ok");
    if (t - mejor.k.t0 >= CFG.mantenerMs) { mejor.k.hecho = true; capturar(mejor); cool = t + CFG.pausaMs; }
  } else est(cs.length ? "Objetos rojos fijos ignorados" : "Buscando punto láser...", "");
}
async function capturar(d) {
  const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
  const g = c.getContext("2d"); g.drawImage(v, 0, 0);
  const x = d.x / AW * c.width, y = d.y / AH * c.height, r = Math.max(28, c.width * 0.045), lw = Math.max(4, c.width / 250);
  g.lineWidth = lw + 4; g.strokeStyle = "#000"; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();   // borde negro para que se vea sobre cualquier fondo
  g.lineWidth = lw; g.strokeStyle = "#00ff6a"; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  const blob = await new Promise(o => c.toBlob(o, "image/jpeg", 0.9));
  const rec = { id: Date.now(), blob, xp: +(x / c.width * 100).toFixed(1), yp: +(y / c.height * 100).toFixed(1), editado: null };
  CAMPOS.forEach(f => rec[f.k] = ""); await put(rec);
  if (navigator.vibrate) navigator.vibrate(120);
  toast("📸 Foto guardada · tocá para agregar información", rec.id); cuenta();
}
function toast(t, id) { const e = $("toast"); e.textContent = t; e.classList.remove("hide"); e.onclick = () => { e.classList.add("hide"); abrirFoto(id); }; clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.add("hide"), 4000); }

// ---------- galería y edición ----------
async function cuenta() { const n = (await all()).length; $("cnt").textContent = n ? "(" + n + ")" : ""; }
const fechaDe = id => new Date(id).toLocaleString("es-AR");
$("q").oninput = galeria;
async function galeria() {
  urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
  const f = $("q").value.trim().toLowerCase();
  const l = (await all()).sort((a, b) => b.id - a.id).filter(r => !f || CAMPOS.some(c => String(r[c.k] || "").toLowerCase().includes(f)));
  $("grid").innerHTML = l.length ? l.map(r => { const u = URL.createObjectURL(r.blob); urls.push(u);
    return `<div class="th" onclick="abrirFoto(${r.id})"><img src="${u}"><div><b>${esc(r.titulo) || "Sin título"}</b><br><span class="lb">${fechaDe(r.id)}</span></div></div>`; }).join("") : '<div class="card" style="grid-column:1/3">Sin fotos todavía.</div>';
  cuenta();
}
window.abrirFoto = async id => {
  const r = await get(id); if (!r) return; const u = URL.createObjectURL(r.blob);
  const campos = CAMPOS.map(c => `<label class="lb">${esc(c.l)}</label>` + (c.area ? `<textarea id="f_${c.k}" rows="3">${esc(r[c.k])}</textarea>` : `<input id="f_${c.k}" value="${esc(r[c.k])}">`)).join("");
  $("det").innerHTML = `<img src="${u}"><p class="lb">${fechaDe(r.id)} · punto en ${r.xp}% x, ${r.yp}% y${r.editado ? " · editado " + new Date(r.editado).toLocaleString("es-AR") : ""}</p>${campos}
  <button class="b g" id="d_save">Guardar información</button><button class="b s" id="d_dl">Descargar imagen</button>
  <button class="b s" id="d_sh">Compartir</button><button class="b" id="d_del">Eliminar foto</button><button class="b s" id="d_x">Cerrar</button>`;
  $("det").classList.remove("hide");
  const cerrar = () => { URL.revokeObjectURL(u); $("det").classList.add("hide"); galeria(); };
  const vals = () => { const o = {}; CAMPOS.forEach(c => o[c.k] = $("f_" + c.k).value.trim()); return o; };
  $("d_save").onclick = async () => { await put({ ...r, ...vals(), editado: new Date().toISOString() }); cerrar(); };
  $("d_dl").onclick = () => { const a = document.createElement("a"); a.href = u; a.download = "laser_" + r.id + ".jpg"; a.click(); };
  $("d_sh").onclick = async () => { const file = new File([r.blob], "laser_" + r.id + ".jpg", { type: "image/jpeg" }), v2 = vals();
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: v2.titulo || "Foto láser", text: Object.values(v2).filter(Boolean).join(" · ") }); else alert("Este dispositivo no permite compartir; usá Descargar imagen."); } catch (e) { } };
  $("d_del").onclick = async () => { if (confirm("¿Eliminar esta foto y su información?")) { await del(r.id); cerrar(); } };
  $("d_x").onclick = cerrar;
};
$("btnExp").onclick = async () => {
  const l = (await all()).sort((a, b) => a.id - b.id).map(({ blob, ...r }) => ({ ...r, fecha: new Date(r.id).toISOString() }));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(l, null, 2)], { type: "application/json" })); a.download = "datos_laser.json"; a.click();
};
cuenta();

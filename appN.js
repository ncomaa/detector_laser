// app.js — cámara, detección, captura, archivo, ajustes y fichas.
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const v = $("v"), ov = $("ov"), gO = ov.getContext("2d");
const cA = document.createElement("canvas"), gA = cA.getContext("2d", { willReadFrequently: true });
let stream = null, run = false, ses = 0, tracks = [], ultimos = [], cool = 0, last = 0, AW = CFG.anchoAnalisis, AH = 360;
let devs = [], curId = null, probe = false, intentos = 0, negros = 0, buenos = 0, sinImagen = false, avisoNegro = false, urls = [];
const vista = { q: "", fav: false, asc: false };
const hud = (t, c) => { const e = $("hud"); e.textContent = t; e.className = "hud " + (c || ""); };
const fechaDe = id => new Date(id).toLocaleString("es-AR");
const abierto = () => ["gal", "aj", "det"].some(i => !$(i).classList.contains("hide"));

// ---------- ajustes (se guardan en el celular) ----------
const DEF = { sens: 5, mant: 0.3, pausa: 2.5, fijos: true, test: false, expo: false, zoom: 0, color: "#ff5b14", radio: 4.5, sello: false, vibra: true, sonido: false };
const S = (() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem("lm_aj")) }; } catch (e) { return { ...DEF }; } })();
const COLORES = [["#ff5b14", "Naranja"], ["#00ff6a", "Verde"], ["#ffe600", "Amarillo"], ["#00e5ff", "Cian"], ["#ff2bd6", "Magenta"], ["#ffffff", "Blanco"]];
// [tipo, clave, etiqueta, min, max, paso, formato]   tipos: h=título, r=deslizador, c=casilla, o=color, s=cámara, z=zoom
const ROWS = [
  ["h", "Detección"],
  ["r", "sens", "Sensibilidad", 1, 10, 1, x => String(x)],
  ["r", "mant", "Tiempo quieto para capturar", 0.1, 1.5, 0.1, x => x.toFixed(1) + " s"],
  ["r", "pausa", "Pausa entre capturas", 1, 10, 0.5, x => x.toFixed(1) + " s"],
  ["c", "fijos", "Ignorar objetos rojos fijos"],
  ["c", "test", "Modo prueba (marca lo que detecta)"],
  ["h", "Cámara"], ["s"], ["z"],
  ["c", "expo", "Reducir exposición (resalta el láser)"],
  ["h", "Marca en la foto"], ["o"],
  ["r", "radio", "Tamaño del círculo", 2, 10, 0.5, x => x.toFixed(1) + " %"],
  ["c", "sello", "Sellar fecha y hora en la imagen"],
  ["h", "Avisos"], ["c", "vibra", "Vibrar al capturar"], ["c", "sonido", "Sonido al capturar"]
];
function aplicar() {
  CFG.rojoMin = 250 - 6 * S.sens; CFG.difMin = 90 - 6 * S.sens;   // más sensibilidad = acepta rojos más tenues
  CFG.mantenerMs = S.mant * 1000; CFG.pausaMs = S.pausa * 1000; CFG.estaticoMs = S.fijos ? 1500 : 1e12;
  aplicarExpo();
}
const guardarAj = () => { localStorage.setItem("lm_aj", JSON.stringify(S)); aplicar(); };
function renderAj() {
  $("ajc").innerHTML = ROWS.map(r => {
    if (r[0] === "h") return `<h4>${r[1]}</h4>`;
    if (r[0] === "r") return `<label class="row">${r[2]} <b id="l_${r[1]}"></b><input type="range" data-k="${r[1]}" min="${r[3]}" max="${r[4]}" step="${r[5]}"></label>`;
    if (r[0] === "c") return `<label class="row ck"><input type="checkbox" data-k="${r[1]}"> ${r[2]}</label>`;
    if (r[0] === "o") return `<label class="row">Color del círculo<select data-k="color">${COLORES.map(c => `<option value="${c[0]}">${c[1]}</option>`).join("")}</select></label>`;
    if (r[0] === "s") return `<label class="row">Cámara<select id="camSel" data-k="cam"></select></label>`;
    if (r[0] === "z") return `<label class="row hide" id="zRow">Zoom <b id="l_zoom"></b><input type="range" id="zoom" data-k="zoom"></label>`;
  }).join("") + `<h4>Datos</h4><button class="o" id="bExp">Exportar datos (JSON)</button><button class="o" id="bBorrar">Borrar todas las fotos</button><button class="o" id="bReset">Restablecer ajustes</button>`;
  sincronizar();
}
function sincronizar() {
  document.querySelectorAll("#ajc [data-k]").forEach(el => { const k = el.dataset.k; if (k === "cam" || k === "zoom") return; if (el.type === "checkbox") el.checked = !!S[k]; else el.value = S[k]; });
  ROWS.forEach(r => { if (r[0] === "r") $("l_" + r[1]).textContent = r[6](S[r[1]]); });
}
function cambioAj(e) {
  const el = e.target, k = el.dataset.k; if (!k) return;
  if (k === "cam") { if (e.type !== "change") return; localStorage.setItem("lm_cam", el.value); probe = false; return iniciar(el.value); }
  const val = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
  S[k] = val;
  if (k === "zoom") { $("l_zoom").textContent = val.toFixed(1) + "x"; aplicarZoom(val); }
  else { const r = ROWS.find(x => x[0] === "r" && x[1] === k); if (r) $("l_" + k).textContent = r[6](val); }
  guardarAj();
}
$("ajc").addEventListener("input", cambioAj); $("ajc").addEventListener("change", cambioAj);
$("ajc").addEventListener("click", async e => {
  if (e.target.id === "bExp") exportar();
  if (e.target.id === "bBorrar") { const l = await all(); if (l.length && confirm("¿Borrar las " + l.length + " fotos y su información? No se puede deshacer.")) { for (const r of l) await del(r.id); cuenta(); } }
  if (e.target.id === "bReset") { Object.assign(S, DEF); localStorage.removeItem("lm_aj"); sincronizar(); aplicar(); }
});

// ---------- almacenamiento (IndexedDB) ----------
const DB = new Promise((ok, er) => { const r = indexedDB.open("lasermark", 1); r.onupgradeneeded = () => r.result.createObjectStore("fotos", { keyPath: "id" }); r.onsuccess = () => ok(r.result); r.onerror = () => er(r.error); });
const tx = async (m, f) => { const db = await DB; return new Promise((ok, er) => { const t = db.transaction("fotos", m), q = f(t.objectStore("fotos")); t.oncomplete = () => ok(q && q.result); t.onerror = () => er(t.error); }); };
const put = r => tx("readwrite", s => s.put(r)), all = () => tx("readonly", s => s.getAll()), get = id => tx("readonly", s => s.get(id)), del = id => tx("readwrite", s => s.delete(id));

// ---------- cámara ----------
const abrirCam = id => navigator.mediaDevices.getUserMedia({ video: { ...(id ? { deviceId: { exact: id } } : { facingMode: { ideal: "environment" } }), width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
const MSG = { NotAllowedError: "Permiso de cámara denegado. Habilitalo en Ajustes del celular > Apps > esta app > Permisos.", NotFoundError: "No se encontró ninguna cámara.", NotReadableError: "Otra app está usando la cámara. Cerrala e intentá de nuevo.", OverconstrainedError: "La cámara elegida no está disponible.", SecurityError: "El navegador bloqueó la cámara." };
function fallo(e) { hud("SIN CÁMARA", "er"); $("avTxt").textContent = (MSG[e && e.name] || "No se pudo abrir la cámara.") + " [" + ((e && e.name) || "error") + "]"; $("aviso").classList.remove("hide"); }
function parar() { run = false; ses++; if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; v.srcObject = null; }
const pista = () => stream && stream.getVideoTracks()[0];
function aplicarZoom(z) { try { const p = pista().applyConstraints({ advanced: [{ zoom: +z }] }); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function aplicarExpo() { try { const t = pista(), c = t.getCapabilities().exposureCompensation; if (c) { const p = t.applyConstraints({ advanced: [{ exposureCompensation: S.expo ? c.min * 0.6 : 0 }] }); if (p && p.catch) p.catch(() => { }); } } catch (e) { } }
function capacidades() {
  let cap = {}; try { cap = pista().getCapabilities() || {}; } catch (e) { }
  const z = cap.zoom; $("zRow").classList.toggle("hide", !z);
  if (z) { const r = $("zoom"); r.min = z.min; r.max = z.max; r.step = z.step || 0.1; const val = Math.min(Math.max(S.zoom || 1, z.min), z.max); r.value = val; $("l_zoom").textContent = val.toFixed(1) + "x"; aplicarZoom(val); }
  aplicarExpo();
}
async function iniciar(id) {
  const tenia = !!stream; parar(); const mi = ses; $("aviso").classList.add("hide"); hud("INICIANDO");
  if (tenia) await new Promise(r => setTimeout(r, 300));   // el celular necesita un instante para liberar la cámara
  try {
    const pedida = id || localStorage.getItem("lm_cam") || null;
    try { stream = await abrirCam(pedida); } catch (e) { if (!pedida) throw e; localStorage.removeItem("lm_cam"); stream = await abrirCam(null); }
    if (mi !== ses) { stream.getTracks().forEach(t => t.stop()); return; }
    curId = (pista().getSettings() || {}).deviceId || null;
    v.srcObject = stream; await v.play(); if (mi !== ses) return;
    try { devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput"); } catch (e) { devs = []; }
    $("camSel").innerHTML = devs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || "Cámara " + (i + 1))}</option>`).join(""); if (curId) $("camSel").value = curId;
    $("btnCamSig").classList.toggle("hide", devs.length < 2);
    capacidades();
    AH = Math.round(AW * (v.videoHeight || 3) / (v.videoWidth || 4)); cA.width = AW; cA.height = AH;
    negros = buenos = 0; sinImagen = false; run = true; requestAnimationFrame(t => loop(t, mi));
  } catch (e) { if (mi === ses) fallo(e); }
}
function arranque() { probe = !localStorage.getItem("lm_cam"); intentos = 0; iniciar(); }
async function siguiente(manual) {
  if (devs.length < 2) return;
  const i = devs.findIndex(d => d.deviceId === curId), nx = devs[(i + 1) % devs.length];
  if (manual) { probe = false; localStorage.setItem("lm_cam", nx.deviceId); }
  hud("CAMBIANDO CÁMARA"); await iniciar(nx.deviceId);
}
// Si la cámara queda en negro (algunas lentes auxiliares no dan imagen), se prueba la siguiente sola.
function sinSenal() {
  if (probe && devs.length > 1 && intentos < devs.length - 1) { intentos++; siguiente(false); return; }
  avisoNegro = true; $("avTxt").textContent = "La cámara no entrega imagen (queda en negro). Probá otra con el botón ⟲ o en Ajustes > Cámara."; $("aviso").classList.remove("hide");
}
$("btnAct").onclick = arranque; $("btnCamSig").onclick = () => siguiente(true);

// ---------- detección ----------
function dibujar(cs) {
  const w = ov.clientWidth, h = ov.clientHeight; if (ov.width !== w) ov.width = w; if (ov.height !== h) ov.height = h;
  gO.clearRect(0, 0, w, h); if (!S.test) return;
  const vw = v.videoWidth || 1, vh = v.videoHeight || 1, k = Math.max(w / vw, h / vh), ox = (w - vw * k) / 2, oy = (h - vh * k) / 2;   // el video se muestra recortado ("cover")
  cs.forEach(c => { gO.strokeStyle = c.estatico ? "#f59e0b" : "#22ff88"; gO.lineWidth = 3; gO.beginPath(); gO.arc(c.x / AW * vw * k + ox, c.y / AH * vh * k + oy, 16, 0, 7); gO.stroke(); });
}
function loop(t, mi) {
  if (!run || mi !== ses) return; requestAnimationFrame(t2 => loop(t2, mi));
  if (abierto() || t - last < CFG.intervaloMs) return; last = t;
  gA.drawImage(v, 0, 0, AW, AH);
  const data = gA.getImageData(0, 0, AW, AH).data;
  let s = 0, n = 0; for (let i = 0; i < data.length; i += 64) { s += data[i] + data[i + 1] + data[i + 2]; n += 3; }
  if (n && s / n < 1.5) { buenos = 0; if (++negros >= 40) { negros = 0; sinImagen = true; sinSenal(); } }
  else { negros = 0; if (sinImagen) { sinImagen = false; if (avisoNegro) { avisoNegro = false; $("aviso").classList.add("hide"); } }
    if (++buenos === 20 && probe) { probe = false; if (intentos > 0 && curId) localStorage.setItem("lm_cam", curId); } }
  const cs = detectarPuntos(data, AW, AH), R = AW * 0.05;
  tracks = tracks.filter(k => t - k.seen < CFG.huecoMs);
  let mejor = null;
  cs.forEach(c => {   // cada mancha se sigue en el tiempo; si lleva mucho quieta es un objeto fijo
    let k = tracks.find(k => Math.hypot(c.x - k.x, c.y - k.y) < R);
    if (!k) { k = { x: c.x, y: c.y, t0: t, seen: t, hecho: false }; tracks.push(k); }
    k.seen = t; c.k = k; c.estatico = t - k.t0 > CFG.estaticoMs;
    if (!c.estatico && !mejor) mejor = c;
  });
  ultimos = cs; dibujar(cs);
  if (sinImagen) return hud("SIN IMAGEN", "er");
  if (t < cool) return hud("CAPTURADA", "ok");
  if (mejor && !mejor.k.hecho) {
    hud("PUNTO DETECTADO", "ok");
    if (t - mejor.k.t0 >= CFG.mantenerMs) { mejor.k.hecho = true; capturar(mejor, false); cool = t + CFG.pausaMs; }
  } else hud(cs.length && !mejor ? "OBJETO FIJO IGNORADO" : "BUSCANDO LÁSER");
}

// ---------- captura ----------
function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = 0.15; o.start(); o.stop(a.currentTime + 0.12); } catch (e) { } }
async function capturar(d, manual) {
  if (!v.videoWidth) return;
  const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
  const g = c.getContext("2d"); g.drawImage(v, 0, 0);
  let xp = null, yp = null;
  if (d) {   // círculo alrededor del punto (con borde para que se vea sobre cualquier fondo)
    const x = d.x / AW * c.width, y = d.y / AH * c.height, r = Math.max(24, c.width * S.radio / 100), lw = Math.max(4, c.width / 250);
    g.lineWidth = lw + 6; g.strokeStyle = ["#ff5b14", "#ff2bd6"].includes(S.color) ? "#fff" : "#000"; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    g.lineWidth = lw; g.strokeStyle = S.color; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
    xp = +(x / c.width * 100).toFixed(1); yp = +(y / c.height * 100).toFixed(1);
  }
  if (S.sello) { const tx = new Date().toLocaleString("es-AR"), fs = Math.round(c.width / 42); g.font = fs + "px monospace"; const tw = g.measureText(tx).width;
    g.fillStyle = "rgba(0,0,0,.65)"; g.fillRect(8, c.height - fs * 1.8 - 8, tw + 16, fs * 1.8); g.fillStyle = "#fff"; g.fillText(tx, 16, c.height - fs * 0.55 - 8); }
  const blob = await new Promise(o => c.toBlob(o, "image/jpeg", 0.9));
  const rec = { id: Date.now(), blob, xp, yp, editado: null, fav: false, manual: !!manual };
  CAMPOS.forEach(f => rec[f.k] = ""); await put(rec);
  if (S.vibra && navigator.vibrate) navigator.vibrate(120); if (S.sonido) beep();
  const e = $("toast"); e.textContent = "FOTO GUARDADA · TOCÁ PARA ANOTAR"; e.classList.remove("hide");
  e.onclick = () => { e.classList.add("hide"); abrirFoto(rec.id); };
  clearTimeout(capturar.h); capturar.h = setTimeout(() => e.classList.add("hide"), 4000); cuenta();
}
// Obturador manual: usa el punto detectado en este momento; si no hay ninguno, guarda la foto sin círculo.
$("btnObt").onclick = () => { if (!run) return; hud("FOTO MANUAL", "ok"); capturar(ultimos.find(c => !c.estatico) || ultimos[0] || null, true); };

// ---------- archivo ----------
async function cuenta() { $("cnt").textContent = String((await all()).length).padStart(2, "0"); }
async function galeria() {
  urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
  const q = vista.q.toLowerCase();
  const l = (await all()).filter(r => (!vista.fav || r.fav) && (!q || CAMPOS.some(c => String(r[c.k] || "").toLowerCase().includes(q)))).sort((a, b) => vista.asc ? a.id - b.id : b.id - a.id);
  $("grid").innerHTML = l.length ? l.map(r => { const u = URL.createObjectURL(r.blob); urls.push(u);
    return `<div class="th" onclick="abrirFoto(${r.id})"><img src="${u}"><b>${r.fav ? "★ " : ""}${esc(r.titulo) || "Sin título"}</b><small>${fechaDe(r.id)}</small></div>`; }).join("")
    : '<div class="vacio">' + (vista.q || vista.fav ? "Ninguna foto coincide." : "Todavía no hay fotos.<br>Apuntá el láser y mantenelo quieto.") + "</div>";
  cuenta();
}
$("q").oninput = e => { vista.q = e.target.value.trim(); galeria(); };
$("bFav").onclick = e => { vista.fav = !vista.fav; e.target.textContent = vista.fav ? "★ Solo favoritas" : "★ Todas"; galeria(); };
$("bOrd").onclick = e => { vista.asc = !vista.asc; e.target.textContent = vista.asc ? "Más antiguas" : "Más nuevas"; galeria(); };
$("btnGal").onclick = () => { $("gal").classList.remove("hide"); galeria(); };
$("btnAj").onclick = () => $("aj").classList.remove("hide");
document.querySelectorAll("[data-back]").forEach(b => b.onclick = () => b.closest("section").classList.add("hide"));
async function exportar() {
  const l = (await all()).sort((a, b) => a.id - b.id).map(({ blob, ...r }) => ({ ...r, fecha: new Date(r.id).toISOString() }));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(l, null, 2)], { type: "application/json" })); a.download = "datos_laser.json"; a.click();
}

// ---------- ficha de una foto ----------
window.abrirFoto = async id => {
  const r = await get(id); if (!r) return; const u = URL.createObjectURL(r.blob);
  const campos = CAMPOS.map(c => `<label>${esc(c.l)}</label>` + (c.area ? `<textarea id="f_${c.k}" rows="3">${esc(r[c.k])}</textarea>` : `<input id="f_${c.k}" value="${esc(r[c.k])}">`)).join("");
  const punto = r.xp == null ? "sin punto marcado" : "punto en " + r.xp + "% / " + r.yp + "%";
  $("det").innerHTML = `<h3>Ficha</h3><img src="${u}"><div class="meta">${fechaDe(r.id)} · ${punto}${r.manual ? " · manual" : ""}${r.editado ? " · editada " + fechaDe(new Date(r.editado).getTime()) : ""}</div>${campos}
  <div class="fila"><button class="a" id="d_save">Guardar</button><button class="o" id="d_fav">${r.fav ? "★ Quitar de favoritas" : "☆ Marcar favorita"}</button><button class="o" id="d_dl">Descargar imagen</button><button class="o" id="d_sh">Compartir</button><button class="o" id="d_del">Eliminar</button><button id="d_x">Cerrar</button></div>`;
  $("det").classList.remove("hide"); $("toast").classList.add("hide");
  const cerrar = () => { URL.revokeObjectURL(u); $("det").classList.add("hide"); if (!$("gal").classList.contains("hide")) galeria(); else cuenta(); };
  const vals = () => { const o = {}; CAMPOS.forEach(c => o[c.k] = $("f_" + c.k).value.trim()); return o; };
  $("d_save").onclick = async () => { const cur = await get(id); await put({ ...cur, ...vals(), editado: new Date().toISOString() }); cerrar(); };
  $("d_fav").onclick = async e => { const cur = await get(id); cur.fav = !cur.fav; await put(cur); e.target.textContent = cur.fav ? "★ Quitar de favoritas" : "☆ Marcar favorita"; };
  $("d_dl").onclick = () => { const a = document.createElement("a"); a.href = u; a.download = "laser_" + r.id + ".jpg"; a.click(); };
  $("d_sh").onclick = async () => { const f = new File([r.blob], "laser_" + r.id + ".jpg", { type: "image/jpeg" }), x = vals();
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: x.titulo || "Foto láser", text: Object.values(x).filter(Boolean).join(" · ") }); else alert("Este dispositivo no permite compartir; usá Descargar imagen."); } catch (e) { } };
  $("d_del").onclick = async () => { if (confirm("¿Eliminar esta foto y su información?")) { await del(id); cerrar(); } };
  $("d_x").onclick = cerrar;
};

renderAj(); aplicar(); cuenta(); arranque();

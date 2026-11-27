// Captura secuencial de varios puntos en una sola foto.
(() => {
  const video = document.getElementById("v");
  const status = document.getElementById("multiStatus");
  const startButton = document.getElementById("multiStart");
  const originalCapture = window.capturar;
  if (!video || !status || !startButton || typeof originalCapture !== "function") return;

  let session = null;
  const setStatus = text => { status.textContent = text; };
  const finish = async reason => {
    if (!session) return;
    const current = session;
    session = null;
    clearInterval(current.timer);
    CFG.mantenerMs = current.settings.mantenerMs;
    CFG.pausaMs = current.settings.pausaMs;
    CFG.estaticoMs = current.settings.estaticoMs;
    startButton.textContent = "Iniciar captura múltiple";
    startButton.disabled = false;

    try {
      if (!current.points.length) {
        setStatus("No se detectaron puntos; no se guardó ninguna foto.");
        return;
      }
      if (!video.videoWidth || !video.videoHeight) throw new Error("La cámara no está disponible.");
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("No se pudo generar la imagen.");
      const xpList = current.points.map(p => +(p.x / canvas.width * 100).toFixed(1));
      const ypList = current.points.map(p => +(p.y / canvas.height * 100).toFixed(1));
      const rec = {
        id: Date.now(), blob, xp: xpList[0], yp: ypList[0], xpList, ypList,
        editado: null, cantidadPuntos: xpList.length
      };
      CAMPOS.forEach(field => rec[field.k] = "");
      const request = indexedDB.open("laser", 1);
      await new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("fotos", "readwrite");
          tx.objectStore("fotos").put(rec);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
      if (navigator.vibrate) navigator.vibrate(120);
      if (typeof window.toast === "function") window.toast(`📸 Foto guardada con ${xpList.length} punto(s)`, rec.id);
      if (typeof window.cuenta === "function") window.cuenta();
      setStatus(`Foto guardada con ${xpList.length} punto(s) (${reason}).`);
    } catch (error) {
      setStatus(`No se pudo guardar la foto: ${error.message}`);
    }
  };

  const captureWrapped = async candidate => {
    if (!session) return originalCapture(candidate);
    const s = session;
    if (Date.now() >= s.endsAt) {
      await finish("tiempo cumplido");
      return;
    }
    if (s.points.length >= s.limit) return;
    const overlay = document.getElementById("ov");
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height || !overlay.width || !overlay.height) return;
    const x = candidate.x / overlay.width * width;
    const y = candidate.y / overlay.height * height;
    s.points.push({ x, y });
    setStatus(`Puntos detectados: ${s.points.length} / ${s.limit}`);
    if (s.points.length >= s.limit) await finish("límite de puntos alcanzado");
  };
  window.capturar = captureWrapped;

  startButton.addEventListener("click", () => {
    if (session) {
      finish("captura detenida");
      return;
    }
    if (!video.videoWidth || !video.videoHeight || video.paused) {
      setStatus("Primero iniciá la cámara y esperá a que aparezca la imagen.");
      return;
    }
    const secondsInput = document.getElementById("multiSeconds");
    const limitInput = document.getElementById("multiLimit");
    const seconds = Math.min(120, Math.max(1, Math.round(Number(secondsInput.value) || 10)));
    const limit = Math.min(50, Math.max(1, Math.round(Number(limitInput.value) || 5)));
    secondsInput.value = seconds;
    limitInput.value = limit;
    session = {
      points: [], limit, endsAt: Date.now() + seconds * 1000,
      settings: { mantenerMs: CFG.mantenerMs, pausaMs: CFG.pausaMs, estaticoMs: CFG.estaticoMs },
      timer: null
    };
    // La aparición dura ~0,5 s: registrar el primer cuadro válido sin espera ni pausa entre puntos.
    CFG.mantenerMs = 0;
    CFG.pausaMs = 0;
    CFG.estaticoMs = seconds * 1000 + 1000;
    startButton.textContent = "Detener y guardar";
    setStatus(`Capturando por ${seconds} s · 0 / ${limit} puntos`);
    session.timer = setInterval(() => {
      if (session && Date.now() >= session.endsAt) finish("tiempo cumplido");
    }, 100);
  });
})();

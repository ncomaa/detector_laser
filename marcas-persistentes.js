// Mantiene las detecciones visibles y permite guardar la foto con sus marcas en la galería.
(() => {
  const video = document.getElementById("v");
  const stage = document.getElementById("stage");
  const marksCanvas = document.getElementById("marks");
  const status = document.getElementById("marksStatus");
  const saveButton = document.getElementById("saveMarked");
  const clearButton = document.getElementById("clearMarks");
  const captureBeforeMarks = window.capturar;
  if (!video || !stage || !marksCanvas || !status || !saveButton || typeof captureBeforeMarks !== "function") return;

  const marksContext = marksCanvas.getContext("2d");
  const points = [];
  const setStatus = message => { status.textContent = message; };

  function resizeMarks() {
    const overlay = document.getElementById("ov");
    if (!overlay || !overlay.width || !overlay.height) return;
    if (marksCanvas.width !== overlay.width || marksCanvas.height !== overlay.height) {
      marksCanvas.width = overlay.width;
      marksCanvas.height = overlay.height;
      redraw();
    }
  }

  function redraw() {
    resizeMarks();
    marksContext.clearRect(0, 0, marksCanvas.width, marksCanvas.height);
    const radius = Math.max(10, marksCanvas.width * 0.03);
    points.forEach(point => {
      marksContext.beginPath();
      marksContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
      marksContext.lineWidth = Math.max(2, marksCanvas.width / 180);
      marksContext.strokeStyle = point.color === "green" ? "#22c55e" : "#ff3b30";
      marksContext.stroke();
      marksContext.beginPath();
      marksContext.arc(point.x, point.y, Math.max(2, radius * 0.18), 0, Math.PI * 2);
      marksContext.fillStyle = point.color === "green" ? "#22c55e" : "#ff3b30";
      marksContext.fill();
    });
    setStatus(points.length ? `${points.length} punto(s) marcado(s).` : "Todavía no hay puntos marcados.");
  }

  window.capturar = async candidate => {
    resizeMarks();
    if (Number.isFinite(candidate.x) && Number.isFinite(candidate.y)) {
      points.push({ x: candidate.x, y: candidate.y, color: candidate.color === "green" ? "green" : "red" });
      redraw();
    }
    return captureBeforeMarks(candidate);
  };

  clearButton.addEventListener("click", () => {
    points.length = 0;
    redraw();
  });

  saveButton.addEventListener("click", async () => {
    if (!video.videoWidth || !video.videoHeight || video.paused) {
      setStatus("Iniciá la cámara antes de guardar la imagen.");
      return;
    }
    if (!points.length) {
      setStatus("No hay puntos marcados para guardar.");
      return;
    }
    saveButton.disabled = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const sx = canvas.width / marksCanvas.width;
      const sy = canvas.height / marksCanvas.height;
      const radius = Math.max(28, canvas.width * 0.045);
      const lineWidth = Math.max(4, canvas.width / 250);
      const xpList = points.map(point => +(point.x / marksCanvas.width * 100).toFixed(1));
      const ypList = points.map(point => +(point.y / marksCanvas.height * 100).toFixed(1));
      // Incrustamos los marcadores en esta copia guardada; la captura automática original sigue limpia.
      points.forEach(point => {
        const x = point.x * sx;
        const y = point.y * sy;
        const color = point.color === "green" ? "#22c55e" : "#ff3b30";
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.lineWidth = lineWidth + 4;
        context.strokeStyle = "#000";
        context.stroke();
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.lineWidth = lineWidth;
        context.strokeStyle = color;
        context.stroke();
      });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("No se pudo crear la imagen.");
      const record = {
        id: Date.now(), blob, xp: xpList[0], yp: ypList[0], xpList, ypList,
        cantidadPuntos: points.length, editado: null
      };
      CAMPOS.forEach(field => record[field.k] = "");
      await put(record);
      if (typeof cuenta === "function") await cuenta();
      setStatus(`Imagen guardada con ${points.length} punto(s).`);
      if (navigator.vibrate) navigator.vibrate(120);
      if (typeof toast === "function") toast(`📸 Imagen guardada con ${points.length} punto(s)`, record.id);
    } catch (error) {
      setStatus(`No se pudo guardar la imagen: ${error.message}`);
    } finally {
      saveButton.disabled = false;
    }
  });

  window.addEventListener("resize", resizeMarks);
  setStatus("Todavía no hay puntos marcados.");
})();

// Opciones adicionales del detector y captura limpia sin círculos dibujados en el archivo.
(() => {
  const greenToggle = document.getElementById("greenLaser");
  cfg.green = localStorage.getItem("greenLaser") === "1";
  if (greenToggle) {
    greenToggle.checked = cfg.green;
    greenToggle.addEventListener("change", () => {
      cfg.green = greenToggle.checked;
      localStorage.setItem("greenLaser", cfg.green ? "1" : "0");
    });
  }

  // app.js llama a detectarPuntos en cada cuadro; el ajuste agrega el detector verde.
  const detectorOriginal = window.detectarPuntos;
  if (typeof detectorOriginal === "function") {
    window.detectarPuntos = (data, width, height, sensitivity) =>
      detectorOriginal(data, width, height, sensitivity, cfg.green);
  }

  // Guardar únicamente la imagen de cámara y las coordenadas. El círculo se dibuja
  // como superposición ajustable en la galería, nunca se incorpora al JPEG.
  window.capturar = async candidate => {
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    if (!canvas.width || !canvas.height) return;
    canvas.getContext("2d").drawImage(v, 0, 0);
    const x = candidate.x / AW * canvas.width;
    const y = candidate.y / AH * canvas.height;
    const xp = +(x / canvas.width * 100).toFixed(1);
    const yp = +(y / canvas.height * 100).toFixed(1);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    const rec = { id: Date.now(), blob, xp, yp, xpList: [xp], ypList: [yp], editado: null };
    CAMPOS.forEach(field => rec[field.k] = "");
    await put(rec);
    if (navigator.vibrate) navigator.vibrate(120);
    toast("📸 Foto guardada · tocá para agregar información", rec.id);
    cuenta();
  };
})();

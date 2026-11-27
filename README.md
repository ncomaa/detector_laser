# Detector de puntero láser

Aplicación móvil (PWA que se empaqueta como **APK de Android**) que usa la cámara del celular para detectar un **puntero láser rojo**. Cuando el punto se mantiene un instante en el mismo lugar, guarda esa imagen con un **círculo dibujado alrededor del punto**. A cada foto se le puede adjuntar información (título, descripción, lugar, etiquetas) y editarla cuando se quiera.

> Pensada para uso en **interiores**, con luz moderada y superficies mates.

## Funciones

- Detección en vivo del punto láser rojo con la cámara trasera.
- Captura automática cuando el punto se mantiene ~0,3 s en el mismo lugar, con una pausa de 2,5 s entre capturas.
- Círculo verde con borde negro alrededor del punto, visible sobre cualquier fondo.
- Galería con buscador, edición de la información de cada foto, descarga, opción de compartir y eliminación.
- Exportación de todos los datos a un archivo JSON.
- Filtros para evitar falsos positivos: descarta manchas rojas grandes, alargadas y objetos rojos que están fijos.
- Selector de cámara y control de zoom (para no usar la lente gran angular 0.5).
- Modo prueba que marca en pantalla lo que se detecta, para calibrar.
- Funciona sin conexión una vez cargada. Todo se guarda en el propio celular.

## Cómo funciona

1. Cada 50 ms se toma un cuadro del video reducido a 480 px de ancho.
2. Se marcan los píxeles muy rojos (canal rojo alto y mucho mayor que verde y azul). El umbral depende de la sensibilidad (1 a 10).
3. Los píxeles vecinos se agrupan en manchas. Se descartan las demasiado chicas, las demasiado grandes y las alargadas (elongación > 1,8).
4. Cada mancha se sigue en el tiempo: si se queda en el mismo lugar ≥ 0,3 s se captura la foto; si lleva más de 1,5 s quieta se considera un objeto fijo y se ignora.
5. Se guarda el cuadro completo en resolución de cámara, con el círculo dibujado, en IndexedDB.

## Estructura del proyecto

```
index.html            pantallas
estilos.css           apariencia
config.js             ajustes de detección y campos de información de cada foto
detector.js           detección de puntos rojos (función pura, sin DOM)
app.js                cámara, captura, galería y edición
sw.js                 modo sin conexión (busca primero la versión nueva en la red)
manifest.webmanifest  datos de la app instalable
icon-192.png, icon-512.png
```

## Publicar la app (GitHub Pages)

1. Creá un repositorio **público** y subí todos los archivos **sueltos en la raíz** (sin carpeta).
2. Entrá a **Settings > Pages**, elegí la rama `main` y la carpeta `/ (root)`, y guardá.
3. Esperá uno o dos minutos. La app queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
4. Abrila en Chrome del celular y probá la cámara antes de empaquetarla.

## Generar el APK (sin instalar nada en la PC)

1. Entrá a [pwabuilder.com](https://www.pwabuilder.com) y pegá la dirección de tu app.
2. Tocá **Package for stores > Android**.
3. Completá el *Package ID* (por ejemplo `com.tuescuela.detectorlaser`) y el nombre de la app. Dejá que genere la firma automáticamente.
4. Descargá el zip y usá el archivo `.apk` firmado (los `.aab` no se instalan directo).
5. Guardá la carpeta completa, en especial el archivo de clave (`signing.keystore`) y su contraseña: se necesitan para publicar actualizaciones.
6. Instalá el APK en el celular (habilitando "instalar apps de fuentes desconocidas" si lo pide).

Como el APK abre la página publicada, los cambios que subas al repositorio se reflejan sin volver a generarlo.

## Uso

1. Tocá **Iniciar cámara** y aceptá el permiso.
2. Apuntá el láser rojo a la escena y mantenelo quieto un instante. La app vibra y muestra el aviso "Foto guardada".
3. Tocá el aviso (o entrá a **Galería**) para agregar o editar la información de la foto.
4. Desde la ficha de la foto podés descargarla, compartirla o eliminarla.

## Calibración

| Ajuste | Dónde | Qué hace |
|---|---|---|
| Sensibilidad (1 a 10) | Pantalla Cámara | Más alta detecta puntos más tenues, con más riesgo de falsos positivos |
| Modo prueba | Pantalla Cámara | Círculo **verde** = candidato, **naranja** = objeto fijo ignorado |
| Reducir exposición | Pantalla Cámara | Oscurece la imagen para que el láser resalte (si el celular lo permite) |
| Cámara y zoom | Pantalla Cámara | Elegir la lente principal en lugar de la gran angular |
| `elongMax` | `config.js` | Qué tan alargada puede ser una mancha (1 = círculo; menor = más estricto) |
| `mantenerMs`, `pausaMs`, `estaticoMs` | `config.js` | Tiempo de mantenimiento, pausa entre capturas y tiempo para considerar fijo un objeto |

Agregar un campo de información a las fotos es agregar una línea en `CAMPOS` de `config.js`.

## Limitaciones

- La detección se probó con imágenes generadas por computadora; la calibración con un láser real depende de cada cámara.
- Con mucha luz, sol directo o superficies brillantes o claras, la detección es poco fiable.
- Un objeto rojo quieto más de 1,5 s se ignora, por lo que no se detecta el láser apuntando justo sobre él.
- Las fotos quedan dentro de la app (no en la galería del celular) hasta que se descargan.
- Los datos viven en el celular: se pierden si se borran los datos de la app o del navegador.

## Problemas frecuentes

- **No abre la cámara:** revisá el permiso en Ajustes > Apps > (la app) > Permisos.
- **Usa la cámara 0.5:** elegí otra en el selector de cámara; la app lo recuerda.
- **No cambia después de actualizar:** el título muestra la versión (por ejemplo `v4`). Cerrá la app por completo y abrila de nuevo. Evitá borrar los datos del sitio: se perderían las fotos.
- **Detecta objetos que no son el láser:** bajá la sensibilidad y revisá el modo prueba.

## Autores

Proyecto educativo. Autores: _(completar)_.

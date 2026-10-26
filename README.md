# Karaoke FX Gallery

En la rama `test-de-video`, la galería obtiene los videos públicos de
[AnimeDarkAmv en Rumble](https://rumble.com/user/AnimeDarkAmv/videos).

Ejecuta `npm install` y `npm run dev` para abrir la web en el puerto 3000.
Vite y Vercel sirven `/api/rumble-videos` desde el servidor para evitar CORS.
El endpoint recorre las páginas del canal (hasta 200 videos), incluye visitas
y mantiene los resultados durante cinco minutos. La reproducción usa el iframe
de Rumble. Si la carga falla, la galería muestra un botón para reintentar.

Validación: `npx tsc --noEmit`, `npm run build` y
`node --test tests/rumble-videos.test.js`.

El listado se extrae del JSON público incluido en la página del canal; si Rumble
cambia ese formato, habrá que adaptar `api/rumble-videos.js`.
La web necesita un servidor con el endpoint; publicar solo `dist/` en GitHub
Pages no ejecuta esta API.

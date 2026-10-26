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
Si Rumble rechaza las consultas desde Vercel (HTTP 403), el endpoint sirve el
último catálogo guardado en `data/rumble-catalog.json`. Los iframes siguen
reproduciendo directamente desde Rumble; el respaldo contiene solo metadatos.
La respuesta de la API incluye `source` (`live` o `snapshot`) y `updated_at`.
Las visitas del respaldo corresponden a la fecha de esa captura.

Para incorporar videos nuevos al respaldo, ejecuta `npm run rumble:update`
en local, guarda el JSON actualizado en un commit, súbelo y vuelve a desplegar.
La actualización falla sin sobrescribir el catálogo si Rumble no responde.
El build de Vercel usa el catálogo incluido y no necesita descargarlo de Rumble.

La web necesita un servidor con el endpoint; publicar solo `dist/` en GitHub
Pages no ejecuta esta API.

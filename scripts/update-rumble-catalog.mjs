import { writeFile, rename } from 'node:fs/promises';
import { loadChannel } from '../api/rumble-videos.js';

// Run locally where Rumble permits access. A failed refresh must preserve the
// last working catalog; do not turn a 403 into an empty published gallery.
const videos = await loadChannel();
if (!videos.length) throw new Error('El canal devolvió cero videos; se conserva el catálogo anterior.');
const catalog = { channel: 'AnimeDarkAmv', updated_at: new Date().toISOString(), videos };
const target = new URL('../data/rumble-catalog.json', import.meta.url);
const temporary = new URL('../data/rumble-catalog.json.tmp', import.meta.url);
await writeFile(temporary, `${JSON.stringify(catalog, null, 2)}\n`);
await rename(temporary, target);
console.log(`Catálogo actualizado: ${videos.length} videos. Guarda y sube los cambios para publicarlos.`);

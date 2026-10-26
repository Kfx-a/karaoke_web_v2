export interface RumbleVideo {
  id: string;
  name: string;
  title: string;
  thumbnail: string;
  duration: string;
  view_count: number | null;
  release_time: string;
  canonical_url: string;
  embed_url: string;
  description: string;
}

const CACHE_KEY = 'rumble_AnimeDarkAmv_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

function getPriority(description: string): number {
  const lower = description.trimStart().toLowerCase();
  if (lower.startsWith('[s]')) return 0;
  if (lower.startsWith('[a]')) return 1;
  return 2;
}

export function sortByPriority(videos: RumbleVideo[]): RumbleVideo[] {
  return [...videos].sort((a, b) => getPriority(a.description) - getPriority(b.description));
}

export async function fetchRumbleVideos(): Promise<RumbleVideo[]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const entry = raw ? JSON.parse(raw) : null;
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS && Array.isArray(entry.data) && entry.data.length) {
      return entry.data;
    }
  } catch { /* Storage can be unavailable. */ }

  const response = await fetch('/api/rumble-videos', { signal: AbortSignal.timeout(35000) });
  if (!response.ok) throw new Error('No se pudieron cargar los videos de Rumble. Intenta nuevamente.');
  const data = await response.json() as { videos?: RumbleVideo[] };
  if (!Array.isArray(data.videos)) throw new Error('Rumble devolvió una respuesta inválida.');
  if (data.videos.length) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: data.videos, timestamp: Date.now() }));
    } catch { /* Storage can be unavailable. */ }
  }
  return data.videos;
}

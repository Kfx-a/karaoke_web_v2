import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface OdyseeVideo {
  id: string;
  name: string;
  title: string;
  thumbnail: string;
  duration: string;
  release_time: string;
  canonical_url: string;
  embed_url: string;
  description: string;
}

/**
 * Returns a numeric priority for a video based on its description tag:
 *   0 = [S] (alta prioridad)
 *   1 = [A] (normal)
 *   2 = sin tag (última)
 */
function getPriority(description: string): number {
  const lower = description.trimStart().toLowerCase();
  if (lower.startsWith('[s]')) return 0;
  if (lower.startsWith('[a]')) return 1;
  return 2;
}

/** Sort an array of OdyseeVideo by description-based priority (stable sort). */
export function sortByPriority(videos: OdyseeVideo[]): OdyseeVideo[] {
  return [...videos].sort((a, b) => getPriority(a.description) - getPriority(b.description));
}

const CACHE_KEY = 'odysee_videos_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: OdyseeVideo[];
  timestamp: number;
}

function getCached(channel: string): OdyseeVideo[] | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${channel}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function setCache(channel: string, data: OdyseeVideo[]) {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    sessionStorage.setItem(`${CACHE_KEY}_${channel}`, JSON.stringify(entry));
  } catch {
    // sessionStorage may be unavailable (private mode, quota exceeded)
  }
}

export async function fetchOdyseeVideos(channelName: string): Promise<OdyseeVideo[]> {
  // Return cached data if fresh
  const cached = getCached(channelName);
  if (cached) return cached;

  const PROXY_URL = 'https://api.na-backend.odysee.com/api/v1/proxy';

  try {
    // 1. Resolve the channel to get its claim_id
    const resolveResponse = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'resolve',
        params: { urls: [`lbry://${channelName}`] },
        id: Date.now(),
      }),
    });

    const resolveData = await resolveResponse.json();
    const channelId = resolveData.result?.[`lbry://${channelName}`]?.claim_id;

    if (!channelId) {
      console.error('Could not resolve channel ID');
      return [];
    }

    // 2. Search for claims (videos) from this channel
    const searchResponse = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'claim_search',
        params: {
          channel_ids: [channelId],
          order_by: ['release_time'],
          page_size: 200,
          no_totals: true,
          claim_type: ['stream'],
          has_source: true,
        },
        id: Date.now(),
      }),
    });

    const searchData = await searchResponse.json();
    const claims = searchData.result?.items || [];

    const videos: OdyseeVideo[] = claims.map((claim: any) => {
      const metadata = claim.value || {};
      const durationSeconds = metadata.video?.duration || metadata.audio?.duration || 0;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = Math.floor(durationSeconds % 60);

      const canonicalPath = claim.canonical_url.replace('lbry://', '').replace(/#/g, ':');
      const rawThumbnail = metadata.thumbnail?.url || `https://picsum.photos/seed/${claim.claim_id}/800/1000`;

      return {
        id: claim.claim_id,
        name: claim.name,
        title: metadata.title || 'Untitled',
        thumbnail: `https://wsrv.nl/?url=${encodeURIComponent(rawThumbnail)}&w=640&output=webp&q=80&we`,
        duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        release_time: claim.meta?.release_time || claim.timestamp,
        canonical_url: `https://odysee.com/${canonicalPath}`,
        embed_url: `https://odysee.com/$/embed/${canonicalPath}?autoplay=true`,
        description: metadata.description || '',
      };
    });

    setCache(channelName, videos);
    return videos;
  } catch (error) {
    console.error('Error fetching Odysee videos:', error);
    return [];
  }
}

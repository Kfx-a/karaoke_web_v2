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
}

export async function fetchOdyseeVideos(channelName: string): Promise<OdyseeVideo[]> {
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
          page_size: 20,
          no_totals: true,
          claim_type: ['stream'],
          has_source: true,
        },
        id: Date.now(),
      }),
    });

    const searchData = await searchResponse.json();
    const claims = searchData.result?.items || [];

    return claims.map((claim: any) => {
      const metadata = claim.value || {};
      const durationSeconds = metadata.video?.duration || metadata.audio?.duration || 0;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = Math.floor(durationSeconds % 60);
      
      const canonicalPath = claim.canonical_url.replace('lbry://', '').replace(/#/g, ':');
      
      return {
        id: claim.claim_id,
        name: claim.name,
        title: metadata.title || 'Untitled',
        thumbnail: metadata.thumbnail?.url || `https://picsum.photos/seed/${claim.claim_id}/800/1000`,
        duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        release_time: claim.meta?.release_time || claim.timestamp,
        canonical_url: `https://odysee.com/${canonicalPath}`,
        embed_url: `https://odysee.com/$/embed/${canonicalPath}?autoplay=true`,
      };
    });
  } catch (error) {
    console.error('Error fetching Odysee videos:', error);
    return [];
  }
}

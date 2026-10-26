const CHANNEL = 'AnimeDarkAmv';
const CHANNEL_URL = `https://rumble.com/user/${CHANNEL}/videos`;
const MAX_RESULTS = 200;
const CACHE_TTL_MS = 5 * 60 * 1000;
let cached = null;
let pending = null;

// Rumble publishes the listing as JSON inside its channel page. Parse data only;
// never execute scripts from the upstream page.
export function parseChannelPage(html) {
  let items;
  for (const match of html.matchAll(/<script\b[^>]*\btype=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const data = JSON.parse(match[1]);
    if (Array.isArray(data.items)) {
      items = data.items;
      break;
    }
  }
  if (!items) throw new Error('Rumble did not return a readable video listing');

  const videos = items.filter(item => item.object_type === 'video' && item.by?.name === CHANNEL).map(item => {
    if (!Number.isSafeInteger(item.id) || item.id <= 0) throw new Error('Invalid Rumble video ID');
    const url = new URL(item.url);
    const thumbnail = new URL(item.thumb);
    if (url.origin !== 'https://rumble.com' || thumbnail.protocol !== 'https:') {
      throw new Error('Invalid Rumble video URL');
    }
    const seconds = Math.max(0, Math.floor(Number(item.duration) || 0));
    return {
      id: String(item.id),
      name: item.permalink_id || String(item.id),
      title: item.title || 'Untitled',
      thumbnail: thumbnail.href,
      duration: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
      view_count: typeof item.views === 'number' ? item.views : null,
      release_time: item.upload_date || '',
      canonical_url: url.href,
      // Numeric video ID in base 36; verified against Rumble's oEmbed response.
      embed_url: `https://rumble.com/embed/v${item.id.toString(36)}/`,
      description: item.description || '',
    };
  });
  const nextLink = [...html.matchAll(/<link\b[^>]*>/gi)].find(match => /\brel=["']?next\b/i.test(match[0]));
  const nextHref = nextLink?.[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
  let nextPage = null;
  if (nextHref) {
    const url = new URL(nextHref.replace(/&amp;/g, '&'), CHANNEL_URL);
    if (url.origin !== 'https://rumble.com' || url.pathname !== new URL(CHANNEL_URL).pathname) {
      throw new Error('Invalid Rumble pagination URL');
    }
    nextPage = url.href;
  }
  return { videos, nextPage };
}

async function loadChannel() {
  const videos = new Map();
  const visited = new Set();
  const signal = AbortSignal.timeout(25000);
  let url = CHANNEL_URL;
  while (url && videos.size < MAX_RESULTS) {
    if (visited.has(url) || visited.size >= 8) throw new Error('Invalid Rumble pagination');
    visited.add(url);
    const response = await fetch(url, { signal, headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error(`Rumble channel failed with HTTP ${response.status}`);
    const page = parseChannelPage(await response.text());
    for (const video of page.videos) videos.set(video.id, video);
    url = page.nextPage;
  }
  const result = [...videos.values()].slice(0, MAX_RESULTS);
  if (result.length > 0) cached = { videos: result, timestamp: Date.now() };
  return result;
}

export default async function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    let videos;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      videos = cached.videos;
    } else {
      pending ??= loadChannel().finally(() => { pending = null; });
      videos = await pending;
    }
    response.setHeader('Cache-Control', videos.length ? 's-maxage=300, stale-while-revalidate=600' : 'no-store');
    response.status(200).json({ videos });
  } catch (error) {
    console.error('Could not fetch Rumble videos:', error);
    response.setHeader('Cache-Control', 'no-store');
    response.status(502).json({ error: 'No se pudieron cargar los videos de Rumble. Intenta nuevamente.' });
  }
}

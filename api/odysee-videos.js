const ODYSEE_PROXY_URL = 'https://api.na-backend.odysee.com/api/v1/proxy';
const DEFAULT_CHANNEL = '@Alis_FX:f';
const MAX_RESULTS = 200;
const REQUEST_TIMEOUT_MS = 15000;

function formatDuration(durationSeconds = 0) {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getCanonicalPath(claim) {
  const source = claim.canonical_url || claim.permanent_url || claim.short_url || `lbry://${claim.name || 'video'}#${claim.claim_id || ''}`;
  return source.replace('lbry://', '').replace(/#/g, ':');
}

function getThumbnailUrl(rawThumbnail, claimId) {
  if (!rawThumbnail) return `https://picsum.photos/seed/${claimId}/800/450`;
  if (rawThumbnail.startsWith('https://thumbnails.odycdn.com/')) return rawThumbnail;
  if (/^https?:\/\//i.test(rawThumbnail)) {
    return `https://thumbnails.odycdn.com/optimize/s:640:360/quality:80/plain/${rawThumbnail}`;
  }
  return `https://picsum.photos/seed/${claimId}/800/450`;
}

function mapClaimToVideo(claim, index) {
  const metadata = claim.value || {};
  const durationSeconds = metadata.video?.duration || metadata.audio?.duration || 0;
  const claimId = claim.claim_id || claim.name || `unknown-video-${index}`;
  const canonicalPath = getCanonicalPath(claim);

  return {
    id: claimId,
    name: claim.name || claimId,
    title: metadata.title || 'Untitled',
    thumbnail: getThumbnailUrl(metadata.thumbnail?.url || '', claimId),
    duration: formatDuration(durationSeconds),
    view_count: null,
    release_time: String(claim.meta?.release_time || claim.timestamp || ''),
    canonical_url: `https://odysee.com/${canonicalPath}`,
    embed_url: `https://odysee.com/$/embed/${canonicalPath}`,
    description: metadata.description || '',
  };
}

async function postOdysee(method, params) {
  const url = new URL(ODYSEE_PROXY_URL);
  url.searchParams.set('m', method);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Odysee ${method} failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data?.error) {
      throw new Error(`Odysee ${method} returned an RPC error`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function getChannel(request) {
  const channel = typeof request.query?.channel === 'string' ? request.query.channel : DEFAULT_CHANNEL;
  if (!/^@[A-Za-z0-9._-]+:[a-f0-9]+$/i.test(channel)) {
    throw new Error('Invalid Odysee channel');
  }
  return channel;
}

export default async function handler(request, response) {
  if (request.method && request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const channel = getChannel(request);
    const channelUrl = `lbry://${channel}`;
    const resolveData = await postOdysee('resolve', { urls: [channelUrl] });
    const channelId = resolveData?.result?.[channelUrl]?.claim_id;

    if (!channelId) {
      response.status(502).json({ error: 'Could not resolve Odysee channel' });
      return;
    }

    const searchData = await postOdysee('claim_search', {
      channel_ids: [channelId],
      order_by: ['release_time'],
      page_size: MAX_RESULTS,
      no_totals: true,
      claim_type: ['stream'],
      stream_types: ['video'],
      has_source: true,
    });
    const items = Array.isArray(searchData?.result?.items) ? searchData.result.items : [];
    const videos = items.map(mapClaimToVideo);

    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    response.status(200).json({ videos });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : 'Could not fetch Odysee videos',
    });
  }
}

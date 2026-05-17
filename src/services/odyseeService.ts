export interface OdyseeVideo {
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

interface CacheEntry {
  data: OdyseeVideo[];
  timestamp: number;
}

interface OdyseeResolveValue {
  claim_id?: string;
}

interface OdyseeClaim {
  claim_id?: string;
  name?: string;
  canonical_url?: string;
  permanent_url?: string;
  short_url?: string;
  timestamp?: number | string;
  meta?: {
    release_time?: number | string;
  };
  value?: {
    title?: string;
    description?: string;
    thumbnail?: {
      url?: string;
    };
    video?: {
      duration?: number;
    };
    audio?: {
      duration?: number;
    };
  };
}

interface OdyseeRpcResponse<T> {
  result?: T;
  error?: unknown;
}

interface OdyseeApiResponse<T> {
  success: boolean;
  error: string | null;
  data: T;
}

const CACHE_KEY = 'odysee_videos_cache_v3';
const AUTH_TOKEN_KEY = 'odysee_anonymous_auth_token';
const CACHE_TTL_MS = 5 * 60 * 1000;
const PROXY_URL = 'https://api.na-backend.odysee.com/api/v1/proxy';
const ODYSEE_API_URL = 'https://api.odysee.com';
const ODYSEE_APP_ID = 'odyseecom692EAWhtoqDuAfQ6KHMXxFxt8tkhmt7sfprEMHWKjy5hf6PwZcHDV542V';

let authTokenPromise: Promise<string> | null = null;

function getPriority(description: string): number {
  const lower = description.trimStart().toLowerCase();
  if (lower.startsWith('[s]')) return 0;
  if (lower.startsWith('[a]')) return 1;
  return 2;
}

export function sortByPriority(videos: OdyseeVideo[]): OdyseeVideo[] {
  return [...videos].sort((a, b) => getPriority(a.description) - getPriority(b.description));
}

function getCached(channel: string): OdyseeVideo[] | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${channel}`);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry;
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
    // sessionStorage can be unavailable in private mode or restricted embeds.
  }
}

async function postOdysee<T>(method: string, params: unknown): Promise<OdyseeRpcResponse<T>> {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Odysee ${method} failed with HTTP ${response.status}`);
  }

  const data = await response.json() as OdyseeRpcResponse<T>;
  if (data.error) {
    throw new Error(`Odysee ${method} returned an RPC error`);
  }

  return data;
}

function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredAuthToken(token: string) {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // localStorage can be unavailable in private mode or restricted embeds.
  }
}

async function createAnonymousAuthToken(): Promise<string> {
  const body = new URLSearchParams({
    auth_token: '',
    language: 'en',
    app_id: ODYSEE_APP_ID,
  });

  const response = await fetch(`${ODYSEE_API_URL}/user/new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Odysee user/new failed with HTTP ${response.status}`);
  }

  const data = await response.json() as OdyseeApiResponse<{ auth_token?: string }>;
  const token = data.data?.auth_token;
  if (!data.success || !token) {
    throw new Error(data.error || 'Odysee user/new did not return an auth token');
  }

  setStoredAuthToken(token);
  return token;
}

async function getOdyseeAuthToken(): Promise<string> {
  const storedToken = getStoredAuthToken();
  if (storedToken) return storedToken;

  authTokenPromise ??= createAnonymousAuthToken().finally(() => {
    authTokenPromise = null;
  });

  return authTokenPromise;
}

async function fetchViewCount(claimId: string, authToken: string): Promise<number | null> {
  try {
    const url = new URL(`${ODYSEE_API_URL}/file/view_count`);
    url.searchParams.set('auth_token', authToken);
    url.searchParams.set('claim_id', claimId);

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as OdyseeApiResponse<number[]>;
    if (!data.success) return null;

    return typeof data.data?.[0] === 'number' ? data.data[0] : null;
  } catch {
    return null;
  }
}

function formatDuration(durationSeconds = 0): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getCanonicalPath(claim: OdyseeClaim): string {
  const source = claim.canonical_url || claim.permanent_url || claim.short_url || `lbry://${claim.name || 'video'}#${claim.claim_id || ''}`;
  return source.replace('lbry://', '').replace(/#/g, ':');
}

function mapClaimToVideo(claim: OdyseeClaim, index: number): OdyseeVideo {
  const metadata = claim.value || {};
  const durationSeconds = metadata.video?.duration || metadata.audio?.duration || 0;
  const claimId = claim.claim_id || claim.name || `unknown-video-${index}`;
  const rawThumbnail = metadata.thumbnail?.url || `https://picsum.photos/seed/${claimId}/800/1000`;
  const canonicalPath = getCanonicalPath(claim);

  return {
    id: claimId,
    name: claim.name || claimId,
    title: metadata.title || 'Untitled',
    thumbnail: `https://wsrv.nl/?url=${encodeURIComponent(rawThumbnail)}&w=640&output=webp&q=80&we`,
    duration: formatDuration(durationSeconds),
    view_count: null,
    release_time: String(claim.meta?.release_time || claim.timestamp || ''),
    canonical_url: `https://odysee.com/${canonicalPath}`,
    embed_url: `https://odysee.com/$/embed/${canonicalPath}`,
    description: metadata.description || '',
  };
}

async function attachViewCounts(videos: OdyseeVideo[]): Promise<OdyseeVideo[]> {
  try {
    const authToken = await getOdyseeAuthToken();
    return Promise.all(
      videos.map(async (video) => ({
        ...video,
        view_count: await fetchViewCount(video.id, authToken),
      }))
    );
  } catch {
    return videos;
  }
}

export async function fetchOdyseeVideos(channelName: string): Promise<OdyseeVideo[]> {
  const cached = getCached(channelName);
  if (cached) return cached;

  try {
    const resolveData = await postOdysee<Record<string, OdyseeResolveValue>>('resolve', {
      urls: [`lbry://${channelName}`],
    });
    const channelId = resolveData.result?.[`lbry://${channelName}`]?.claim_id;

    if (!channelId) {
      console.error('Could not resolve Odysee channel ID');
      return [];
    }

    const searchData = await postOdysee<{ items?: OdyseeClaim[] }>('claim_search', {
      channel_ids: [channelId],
      order_by: ['release_time'],
      page_size: 200,
      no_totals: true,
      claim_type: ['stream'],
      has_source: true,
    });

    const videos = (searchData.result?.items || []).map(mapClaimToVideo);
    const videosWithViews = await attachViewCounts(videos);

    setCache(channelName, videosWithViews);
    return videosWithViews;
  } catch (error) {
    console.error('Error fetching Odysee videos:', error);
    return [];
  }
}

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

interface ViewCountsResponse {
  counts?: Record<string, number | null>;
}

const CACHE_KEY = 'odysee_videos_cache_v4';
const AUTH_TOKEN_KEY = 'odysee_anonymous_auth_token';
const CACHE_TTL_MS = 5 * 60 * 1000;
const API_TIMEOUT_MS = 15000;
const VIEW_COUNT_CONCURRENCY = 6;
const MAX_VIEW_COUNT_IDS = 50;
const PROXY_URL = 'https://api.na-backend.odysee.com/api/v1/proxy';
const ODYSEE_API_URL = 'https://api.odysee.com';
const ODYSEE_APP_ID = 'odyseecom692EAWhtoqDuAfQ6KHMXxFxt8tkhmt7sfprEMHWKjy5hf6PwZcHDV542V';
const ODYSEE_THUMBNAIL_CDN = 'https://thumbnails.odycdn.com/optimize/s:640:360/quality:80/plain/';

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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function postOdysee<T>(method: string, params: unknown): Promise<OdyseeRpcResponse<T>> {
  const url = new URL(PROXY_URL);
  url.searchParams.set('m', method);

  const response = await fetchWithTimeout(url, {
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

  const response = await fetchWithTimeout(`${ODYSEE_API_URL}/user/new`, {
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

    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;

    const data = await response.json() as OdyseeApiResponse<number[]>;
    if (!data.success) return null;

    return typeof data.data?.[0] === 'number' ? data.data[0] : null;
  } catch {
    return null;
  }
}

async function fetchViewCountsFromServer(claimIds: string[]): Promise<Record<string, number | null> | null> {
  try {
    const url = new URL('/api/odysee-view-counts', window.location.origin);
    url.searchParams.set('claim_ids', claimIds.join(','));

    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;

    const data = await response.json() as ViewCountsResponse;
    return data.counts || null;
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

function getThumbnailUrl(rawThumbnail: string, claimId: string): string {
  if (!rawThumbnail) return `https://picsum.photos/seed/${claimId}/800/450`;
  if (rawThumbnail.startsWith('https://thumbnails.odycdn.com/')) return rawThumbnail;
  if (/^https?:\/\//i.test(rawThumbnail)) return `${ODYSEE_THUMBNAIL_CDN}${rawThumbnail}`;
  return `https://picsum.photos/seed/${claimId}/800/450`;
}

function mapClaimToVideo(claim: OdyseeClaim, index: number): OdyseeVideo {
  const metadata = claim.value || {};
  const durationSeconds = metadata.video?.duration || metadata.audio?.duration || 0;
  const claimId = claim.claim_id || claim.name || `unknown-video-${index}`;
  const rawThumbnail = metadata.thumbnail?.url || '';
  const canonicalPath = getCanonicalPath(claim);

  return {
    id: claimId,
    name: claim.name || claimId,
    title: metadata.title || 'Untitled',
    thumbnail: getThumbnailUrl(rawThumbnail, claimId),
    duration: formatDuration(durationSeconds),
    view_count: null,
    release_time: String(claim.meta?.release_time || claim.timestamp || ''),
    canonical_url: `https://odysee.com/${canonicalPath}`,
    embed_url: `https://odysee.com/$/embed/${canonicalPath}`,
    description: metadata.description || '',
  };
}

function isClaimId(value: string): boolean {
  return /^[a-f0-9]{40}$/i.test(value);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function fetchOdyseeViewCounts(videos: OdyseeVideo[]): Promise<Record<string, number | null>> {
  const claimIds = [...new Set(videos.map(video => video.id).filter(isClaimId))].slice(0, MAX_VIEW_COUNT_IDS);
  if (claimIds.length === 0) return {};

  try {
    const serverCounts = await fetchViewCountsFromServer(claimIds);
    if (serverCounts) return serverCounts;

    const authToken = await getOdyseeAuthToken();
    const counts = await mapWithConcurrency(claimIds, VIEW_COUNT_CONCURRENCY, async claimId => [
      claimId,
      await fetchViewCount(claimId, authToken),
    ] as const);
    return Object.fromEntries(counts);
  } catch {
    return {};
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
      stream_types: ['video'],
      has_source: true,
    });

    const videos = (searchData.result?.items || []).map(mapClaimToVideo);

    setCache(channelName, videos);
    return videos;
  } catch (error) {
    console.error('Error fetching Odysee videos:', error);
    return [];
  }
}

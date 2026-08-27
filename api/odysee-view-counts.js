const ODYSEE_API_URL = 'https://api.odysee.com';
const ODYSEE_APP_ID = 'odyseecom692EAWhtoqDuAfQ6KHMXxFxt8tkhmt7sfprEMHWKjy5hf6PwZcHDV542V';
const MAX_CLAIM_IDS = 50;
const REQUEST_CONCURRENCY = 6;

let authTokenPromise = null;

async function createAnonymousAuthToken() {
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

  const data = await response.json();
  const token = data?.data?.auth_token;
  if (!data?.success || !token) {
    throw new Error(data?.error || 'Odysee user/new did not return an auth token');
  }

  return token;
}

async function getOdyseeAuthToken() {
  if (authTokenPromise) return authTokenPromise;

  authTokenPromise = createAnonymousAuthToken();
  try {
    return await authTokenPromise;
  } catch (error) {
    authTokenPromise = null;
    throw error;
  }
}

async function fetchViewCount(claimId, authToken) {
  try {
    const url = new URL(`${ODYSEE_API_URL}/file/view_count`);
    url.searchParams.set('auth_token', authToken);
    url.searchParams.set('claim_id', claimId);

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return data?.success && typeof data?.data?.[0] === 'number' ? data.data[0] : null;
  } catch {
    return null;
  }
}

function isClaimId(value) {
  return /^[a-f0-9]{40}$/i.test(value);
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
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

export default async function handler(request, response) {
  const rawClaimIds = typeof request.query.claim_ids === 'string' ? request.query.claim_ids : '';
  const claimIds = rawClaimIds
    .split(',')
    .map(claimId => claimId.trim())
    .filter(isClaimId)
    .filter((claimId, index, ids) => ids.indexOf(claimId) === index)
    .slice(0, MAX_CLAIM_IDS);

  if (claimIds.length === 0) {
    response.status(400).json({ error: 'claim_ids is required' });
    return;
  }

  try {
    const authToken = await getOdyseeAuthToken();
    const entries = await mapWithConcurrency(
      claimIds,
      REQUEST_CONCURRENCY,
      async claimId => [claimId, await fetchViewCount(claimId, authToken)]
    );

    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    response.status(200).json({ counts: Object.fromEntries(entries) });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : 'Could not fetch Odysee view counts',
    });
  }
}

const ODYSEE_API_URL = 'https://api.odysee.com';
const ODYSEE_APP_ID = 'odyseecom692EAWhtoqDuAfQ6KHMXxFxt8tkhmt7sfprEMHWKjy5hf6PwZcHDV542V';

let authTokenPromise;

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
  authTokenPromise ??= createAnonymousAuthToken();
  return authTokenPromise;
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

export default async function handler(request, response) {
  const rawClaimIds = typeof request.query.claim_ids === 'string' ? request.query.claim_ids : '';
  const claimIds = rawClaimIds
    .split(',')
    .map(claimId => claimId.trim())
    .filter(Boolean)
    .slice(0, 250);

  if (claimIds.length === 0) {
    response.status(400).json({ error: 'claim_ids is required' });
    return;
  }

  try {
    const authToken = await getOdyseeAuthToken();
    const entries = await Promise.all(
      claimIds.map(async claimId => [claimId, await fetchViewCount(claimId, authToken)])
    );

    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    response.status(200).json({ counts: Object.fromEntries(entries) });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : 'Could not fetch Odysee view counts',
    });
  }
}

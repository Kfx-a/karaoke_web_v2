import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { parseChannelPage } from '../api/rumble-videos.js';
import catalog from '../data/rumble-catalog.json' with { type: 'json' };

const item = {
  object_type: 'video', by: { name: 'AnimeDarkAmv' }, id: 444614778,
  permalink_id: 'v7evzw0', title: 'New Anime - 「AMV」Home To Me',
  duration: 191, views: 28, upload_date: '2026-08-31T11:53:14+00:00',
  url: 'https://rumble.com/v7evzw0-new-anime-amvhome-to-me.html',
  thumb: 'https://hugh.cdn.rumble.cloud/video/thumbnail.jpg',
};
const page = items => `<script type="application/json">${JSON.stringify({ items })}</script>`;

test('maps channel metadata and the embed ID confirmed by Rumble oEmbed', () => {
  const { videos, nextPage } = parseChannelPage(page([item]));
  assert.equal(videos[0].title, item.title);
  assert.equal(videos[0].duration, '3:11');
  assert.equal(videos[0].view_count, 28);
  assert.equal(videos[0].embed_url, 'https://rumble.com/embed/v7cpmyi/');
  assert.equal(nextPage, null);
});

test('follows channel pagination and excludes recommendations from other users', () => {
  const html = '<link rel=next href="/user/AnimeDarkAmv/videos?page=2">' +
    page([item, { ...item, by: { name: 'AnotherUser' } }]);
  const result = parseChannelPage(html);
  assert.equal(result.videos.length, 1);
  assert.equal(result.nextPage, 'https://rumble.com/user/AnimeDarkAmv/videos?page=2');
});

test('distinguishes an empty channel from an upstream challenge or changed format', () => {
  assert.deepEqual(parseChannelPage(page([])).videos, []);
  assert.throws(() => parseChannelPage('<html>Access denied</html>'), /readable/);
});

test('rejects invalid IDs and pagination outside the selected channel', () => {
  assert.throws(() => parseChannelPage(page([{ ...item, id: 'not-an-id' }])), /ID/);
  assert.throws(() => parseChannelPage('<link rel="next" href="https://example.com/">' + page([item])), /pagination/);
});

test('returns 405 for unsupported methods without requesting Rumble', async () => {
  const response = {
    headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; }, json(data) { this.data = data; },
  };
  await handler({ method: 'POST' }, response);
  assert.equal(response.code, 405);
  assert.equal(response.headers.Allow, 'GET');
});

function captureResponse() {
  return {
    headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; }, json(data) { this.data = data; },
  };
}

test('serves the saved real catalog on HTTP 403 and caches it to avoid repeated blocked requests', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response('Forbidden', { status: 403 }));
  t.mock.method(console, 'warn', () => {});
  const { default: isolatedHandler } = await import('../api/rumble-videos.js?test=blocked');
  const response = captureResponse();
  await isolatedHandler({ method: 'GET' }, response);
  assert.equal(response.code, 200);
  assert.equal(response.data.source, 'snapshot');
  assert.equal(response.data.updated_at, catalog.updated_at);
  assert.deepEqual(response.data.videos, catalog.videos);
  assert.ok(response.data.videos.length > 0);
  await isolatedHandler({ method: 'GET' }, captureResponse());
  assert.equal(upstream.mock.callCount(), 1);
});

test('preserves live channel loading when Rumble is available', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(page([item])));
  const { default: isolatedHandler } = await import('../api/rumble-videos.js?test=live');
  const response = captureResponse();
  await isolatedHandler({ method: 'GET' }, response);
  assert.equal(response.code, 200);
  assert.equal(response.data.source, 'live');
  assert.equal(response.data.videos.length, 1);
  assert.equal(response.data.videos[0].id, String(item.id));
});

test('uses the complete catalog if a later channel page is blocked', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => ++calls === 1
    ? new Response('<link rel=next href="/user/AnimeDarkAmv/videos?page=2">' + page([item]))
    : new Response('Forbidden', { status: 403 }));
  t.mock.method(console, 'warn', () => {});
  const { default: isolatedHandler } = await import('../api/rumble-videos.js?test=partial');
  const response = captureResponse();
  await isolatedHandler({ method: 'GET' }, response);
  assert.equal(calls, 2);
  assert.equal(response.code, 200);
  assert.equal(response.data.source, 'snapshot');
  assert.deepEqual(response.data.videos, catalog.videos);
});

test('also serves the saved catalog on a request timeout', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  t.mock.method(console, 'warn', () => {});
  const { default: isolatedHandler } = await import('../api/rumble-videos.js?test=timeout');
  const response = captureResponse();
  await isolatedHandler({ method: 'GET' }, response);
  assert.equal(response.code, 200);
  assert.equal(response.data.source, 'snapshot');
  assert.deepEqual(response.data.videos, catalog.videos);
});

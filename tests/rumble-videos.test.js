import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { parseChannelPage } from '../api/rumble-videos.js';

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

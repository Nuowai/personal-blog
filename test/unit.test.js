const test = require('node:test');
const assert = require('node:assert/strict');
const { makeSlug, normalizeTags } = require('../src/format');
const { validateAuth, validatePost } = require('../src/validation');

test('slug generation creates a stable non-empty slug', () => {
  assert.equal(makeSlug('Hello World'), 'hello-world');
  assert.match(makeSlug('🌸'), /^post-/);
});

test('tags are normalized and deduplicated', () => {
  assert.equal(normalizeTags('生活, 日常,生活'), '生活,日常');
});

test('auth validation normalizes email and enforces password length', () => {
  assert.equal(validateAuth({ email: ' USER@Example.COM ', password: '12345678' }).email, 'user@example.com');
  assert.throws(() => validateAuth({ email: 'bad', password: '123' }), { code: 'INVALID_EMAIL' });
});

test('post validation trims and bounds content', () => {
  const post = validatePost({ title: ' 标题 ', content: ' 正文 ' });
  assert.equal(post.title, '标题');
  assert.equal(post.content, '正文');
  assert.equal(post.published, true);
});


test('rejects non-string and non-boolean input', () => {
  assert.throws(() => validatePost({ title: 1, content: '正文' }), { code: 'INVALID_TYPE' });
  assert.throws(() => validatePost({ title: '标题', content: '正文', published: 'true' }), { code: 'INVALID_TYPE' });
});
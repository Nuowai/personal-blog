const crypto = require('node:crypto');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const publicPostFields = 'id, title, slug, excerpt, category, tags, cover_emoji, cover_image, published, created_at, updated_at';
const allowedHtml = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'video', 'audio', 'source'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height'],
    video: ['src', 'controls', 'poster', 'width', 'height', 'loop', 'muted'],
    audio: ['src', 'controls'],
    source: ['src', 'type']
  },
  allowedSchemes: ['http', 'https', 'mailto']
};

function splitTags(value) {
  return [...new Set(String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
}

function normalizeTags(value) {
  return splitTags(Array.isArray(value) ? value.join(',') : value).join(',');
}

function formatPost(row, { includeContent = false } = {}) {
  if (!row) return null;
  const post = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    category: row.category,
    tags: splitTags(row.tags),
    cover_emoji: row.cover_emoji,
    cover_image: row.cover_image,
    published: Boolean(row.published),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
  if (includeContent) {
    post.content = row.content || '';
    post.content_html = sanitizeHtml(marked.parse(post.content, { breaks: true, gfm: true }), allowedHtml);
  }
  return post;
}

function makeSlug(title) {
  const slug = String(title || '').normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  return slug || `post-${crypto.randomUUID().slice(0, 8)}`;
}

function escapeXml(value) {
  return String(value || '').replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char]));
}

module.exports = { publicPostFields, splitTags, normalizeTags, formatPost, makeSlug, escapeXml };

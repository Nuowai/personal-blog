const express = require('express');
const { AppError, asyncHandler } = require('../http');
const { publicPostFields, normalizeTags, formatPost, makeSlug } = require('../format');
const { validatePost } = require('../validation');
const { safeEqual } = require('../security');

function createPostsRouter({ db, config }) {
  const router = express.Router();

  const requireAdmin = (req, res, next) => {
    if (!config.adminToken) return next(new AppError(503, 'ADMIN_NOT_CONFIGURED', '站点尚未配置管理员密钥'));
    if (!safeEqual(req.headers['x-admin-token'], config.adminToken)) return next(new AppError(401, 'ADMIN_UNAUTHORIZED', '需要管理员密钥'));
    next();
  };

  function uniqueSlug(title, exceptId = null) {
    const base = makeSlug(title);
    const rows = db.prepare('SELECT slug FROM posts WHERE (slug = ? OR slug LIKE ?) AND (? IS NULL OR id != ?)').all(base, `${base}-%`, exceptId, exceptId);
    const used = new Set(rows.map((row) => row.slug));
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) slug = `${base}-${suffix++}`;
    return slug;
  }
  function getPostBySlug(slug, { includeDraft = false } = {}) {
    const where = includeDraft ? 'slug = ?' : 'slug = ? AND published = 1';
    return db.prepare(`SELECT ${publicPostFields}${includeDraft ? ', content' : ''} FROM posts WHERE ${where}`).get(slug);
  }

  router.get('/posts', asyncHandler(async (req, res) => {
    let query = `SELECT ${publicPostFields} FROM posts WHERE published = 1`;
    const params = [];
    const keyword = String(req.query.q || '').trim().slice(0, 100);
    const tag = String(req.query.tag || '').trim().slice(0, 40);
    if (keyword) {
      query += ' AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (tag) {
      query += ` AND (',' || tags || ',') LIKE ?`;
      params.push(`%,${tag},%`);
    }
    query += ' ORDER BY datetime(created_at) DESC';
    const posts = db.prepare(query).all(...params).map((row) => formatPost(row));
    res.json({ posts });
  }));

  router.get('/posts/:slug', asyncHandler(async (req, res) => {
    const post = getPostBySlug(req.params.slug);
    if (!post) throw new AppError(404, 'POST_NOT_FOUND', '文章没有找到');
    res.json({ post: formatPost(post, { includeContent: true }) });
  }));

  router.get('/admin/posts', requireAdmin, asyncHandler(async (req, res) => {
    const posts = db.prepare(`SELECT ${publicPostFields} FROM posts ORDER BY datetime(created_at) DESC`).all()
      .map((row) => formatPost(row));
    res.json({ posts });
  }));

  router.get('/admin/posts/:id', requireAdmin, asyncHandler(async (req, res) => {
    const post = db.prepare(`SELECT ${publicPostFields}, content FROM posts WHERE id = ?`).get(req.params.id);
    if (!post) throw new AppError(404, 'POST_NOT_FOUND', '文章没有找到');
    res.json({ post: formatPost(post, { includeContent: true }) });
  }));

  router.post('/posts', requireAdmin, asyncHandler(async (req, res) => {
    const payload = validatePost(req.body);
    const result = db.prepare(`INSERT INTO posts (title, slug, excerpt, content, category, tags, cover_emoji, cover_image, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(payload.title, uniqueSlug(payload.title), payload.excerpt, payload.content, payload.category, normalizeTags(payload.tags), payload.cover_emoji, payload.cover_image, payload.published ? 1 : 0);
    const post = db.prepare(`SELECT ${publicPostFields}, content FROM posts WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ post: formatPost(post, { includeContent: true }) });
  }));

  router.put('/posts/:id', requireAdmin, asyncHandler(async (req, res) => {
    const payload = validatePost(req.body);
    const existing = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
    if (!existing) throw new AppError(404, 'POST_NOT_FOUND', '文章没有找到');
    const result = db.prepare(`UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, category = ?, tags = ?, cover_emoji = ?, cover_image = ?, published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(payload.title, uniqueSlug(payload.title, req.params.id), payload.excerpt, payload.content, payload.category, normalizeTags(payload.tags), payload.cover_emoji, payload.cover_image, payload.published ? 1 : 0, req.params.id);
    if (!result.changes) throw new AppError(404, 'POST_NOT_FOUND', '文章没有找到');
    const post = db.prepare(`SELECT ${publicPostFields}, content FROM posts WHERE id = ?`).get(req.params.id);
    res.json({ post: formatPost(post, { includeContent: true }) });
  }));

  router.delete('/posts/:id', requireAdmin, asyncHandler(async (req, res) => {
    const result = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    if (!result.changes) throw new AppError(404, 'POST_NOT_FOUND', '文章没有找到');
    res.status(204).end();
  }));

  return router;
}

module.exports = { createPostsRouter };

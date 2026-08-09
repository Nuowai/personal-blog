const express = require('express');
const { AppError, asyncHandler, rateLimit } = require('../http');
const { validateMessage } = require('../validation');

function createCommunityRouter({ db }) {
  const router = express.Router();
  const writeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });

  router.get('/posts/:slug/comments', asyncHandler(async (req, res) => {
    const post = db.prepare('SELECT id FROM posts WHERE slug = ? AND published = 1').get(req.params.slug);
    if (!post) throw new AppError(404, 'POST_NOT_FOUND', '文章没有找到');
    const comments = db.prepare('SELECT id, nickname, message, created_at FROM comments WHERE post_id = ? AND approved = 1 ORDER BY datetime(created_at) DESC').all(post.id);
    res.json({ comments });
  }));

  router.post('/posts/:slug/comments', writeLimiter, asyncHandler(async (req, res) => {
    const post = db.prepare('SELECT id FROM posts WHERE slug = ? AND published = 1').get(req.params.slug);
    if (!post) throw new AppError(404, 'POST_NOT_FOUND', '文章没有找到');
    const { nickname, message } = validateMessage(req.body, '评论', 500);
    const result = db.prepare('INSERT INTO comments (post_id, nickname, message) VALUES (?, ?, ?)').run(post.id, nickname, message);
    const comment = db.prepare('SELECT id, nickname, message, created_at FROM comments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ comment });
  }));

  router.get('/guestbook', asyncHandler(async (req, res) => {
    const messages = db.prepare('SELECT id, nickname, message, created_at FROM guestbook ORDER BY datetime(created_at) DESC LIMIT 20').all();
    res.json({ messages });
  }));

  router.post('/guestbook', writeLimiter, asyncHandler(async (req, res) => {
    const { nickname, message } = validateMessage(req.body, '留言', 240);
    const result = db.prepare('INSERT INTO guestbook (nickname, message) VALUES (?, ?)').run(nickname, message);
    const created = db.prepare('SELECT id, nickname, message, created_at FROM guestbook WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: created });
  }));

  return router;
}

module.exports = { createCommunityRouter };

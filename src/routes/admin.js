const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { AppError, asyncHandler } = require('../http');
const { safeEqual } = require('../security');

function createAdminRouter({ db, config }) {
  const router = express.Router();
  const requireAdmin = (req, res, next) => {
    if (!config.adminToken) return next(new AppError(503, 'ADMIN_NOT_CONFIGURED', '站点尚未配置管理员密钥'));
    if (!safeEqual(req.headers['x-admin-token'], config.adminToken)) return next(new AppError(401, 'ADMIN_UNAUTHORIZED', '需要管理员密钥'));
    next();
  };
  const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav']);
  const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mp3', '.ogg', '.wav']);
  const storage = multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
  });
  const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, allowedMimes.has(file.mimetype) && allowedExtensions.has(path.extname(file.originalname).toLowerCase()))
  });

  router.post('/media', requireAdmin, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, 'MEDIA_REQUIRED', '请选择支持的图片、视频或音频文件');
    const url = `/uploads/${req.file.filename}`;
    const result = db.prepare('INSERT INTO media (filename, original_name, mime_type, size, url) VALUES (?, ?, ?, ?, ?)').run(req.file.filename, String(req.file.originalname).slice(0, 240), req.file.mimetype, req.file.size, url);
    const media = db.prepare('SELECT id, filename AS name, mime_type, size, url, original_name, created_at FROM media WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ media });
  }));

  router.get('/media', requireAdmin, asyncHandler(async (req, res) => {
    const media = db.prepare('SELECT id, filename AS name, mime_type, size, url, original_name, created_at FROM media ORDER BY datetime(created_at) DESC').all();
    res.json({ media });
  }));

  router.delete('/media/:id', requireAdmin, asyncHandler(async (req, res) => {
    const media = db.prepare('SELECT filename FROM media WHERE id = ?').get(req.params.id);
    if (!media) throw new AppError(404, 'MEDIA_NOT_FOUND', '媒体文件没有找到');
    const filePath = path.join(config.uploadDir, media.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
    res.status(204).end();
  }));

  function readSettings() {
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      theme: values.theme || 'sakura',
      faviconUrl: values.favicon_url || '',
      wallpaperUrl: values.wallpaper_url || '',
      siteTitle: values.site_title || 'Sakura Note · 樱花汽水日记',
      siteDescription: values.site_description || '一个软萌的个人博客。',
      admin: { name: config.adminName, email: config.adminEmail }
    };
  }

  function assetUrl(value, field) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (raw.startsWith('/') && !raw.startsWith('//') && !/[<>"'\\s]/.test(raw)) return raw;
    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
      return parsed.href;
    } catch {
      throw new AppError(400, 'INVALID_SETTING', `${field}必须是 http(s) 或站内路径`);
    }
  }

  router.get('/settings', asyncHandler(async (req, res) => {
    res.json(readSettings());
  }));

  router.put('/settings', requireAdmin, asyncHandler(async (req, res) => {
    const body = req.body || {};
    const updates = [];
    if (Object.prototype.hasOwnProperty.call(body, 'theme')) {
      const theme = String(body.theme || '');
      if (!['sakura', 'night', 'mint', 'lavender'].includes(theme)) throw new AppError(400, 'INVALID_THEME', '主题无效');
      updates.push(['theme', theme]);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'faviconUrl')) updates.push(['favicon_url', assetUrl(body.faviconUrl, '网站图标地址')]);
    if (Object.prototype.hasOwnProperty.call(body, 'wallpaperUrl')) updates.push(['wallpaper_url', assetUrl(body.wallpaperUrl, '壁纸地址')]);
    if (Object.prototype.hasOwnProperty.call(body, 'siteTitle')) updates.push(['site_title', String(body.siteTitle || '').trim().slice(0, 80)]);
    if (Object.prototype.hasOwnProperty.call(body, 'siteDescription')) updates.push(['site_description', String(body.siteDescription || '').trim().slice(0, 200)]);
    const save = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
    db.exec('BEGIN');
    try {
      for (const [key, value] of updates) save.run(key, value);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.json({ ok: true, settings: readSettings() });
  }));

  return router;
}

module.exports = { createAdminRouter };

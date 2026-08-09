const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { AppError, asyncHandler } = require('../http');
const { text } = require('../validation');
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
    fileFilter: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (!allowedMimes.has(file.mimetype) || !allowedExtensions.has(extension)) {
        return cb(new AppError(415, 'MEDIA_TYPE_NOT_ALLOWED', '媒体类型或扩展名不受支持'));
      }
      cb(null, true);
    }
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
    const uploadRoot = path.resolve(config.uploadDir);
    const filePath = path.resolve(uploadRoot, media.filename);
    if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) throw new AppError(400, 'INVALID_MEDIA_PATH', '媒体路径无效');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
    res.status(204).end();
  }));

  function readSettings({ includeAdmin = false } = {}) {
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const settings = {
      theme: values.theme || 'sakura',
      faviconUrl: values.favicon_url || '',
      wallpaperUrl: values.wallpaper_url || '',
      siteTitle: values.site_title || 'Sakura Note · 樱花汽水日记',
      siteDescription: values.site_description || '一个软萌的个人博客。'
    };
    if (includeAdmin) settings.admin = { name: config.adminName, email: config.adminEmail };
    return settings;
  }

  function assetUrl(value, field) {
    if (value !== undefined && value !== null && typeof value !== 'string') throw new AppError(400, 'INVALID_SETTING', `${field}必须是字符串`);
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (raw.startsWith('/') && !raw.startsWith('//') && !/[<>"'\s]/.test(raw)) return raw;
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
    const allowedKeys = new Set(['theme', 'faviconUrl', 'wallpaperUrl', 'siteTitle', 'siteDescription']);
    const unknownKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));
    if (unknownKeys.length) throw new AppError(400, 'INVALID_SETTING', `不支持的网站设置：${unknownKeys.join(', ')}`);
    const updates = [];
    if (Object.prototype.hasOwnProperty.call(body, 'theme')) {
      const theme = body.theme;
      if (typeof theme !== 'string') throw new AppError(400, 'INVALID_SETTING', '主题必须是字符串');
      if (!['sakura', 'night', 'mint', 'lavender'].includes(theme)) throw new AppError(400, 'INVALID_THEME', '主题无效');
      updates.push(['theme', theme]);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'faviconUrl')) updates.push(['favicon_url', assetUrl(body.faviconUrl, '网站图标地址')]);
    if (Object.prototype.hasOwnProperty.call(body, 'wallpaperUrl')) updates.push(['wallpaper_url', assetUrl(body.wallpaperUrl, '壁纸地址')]);
    if (Object.prototype.hasOwnProperty.call(body, 'siteTitle')) updates.push(['site_title', text(body.siteTitle, '网站标题', { max: 80 })]);
    if (Object.prototype.hasOwnProperty.call(body, 'siteDescription')) updates.push(['site_description', text(body.siteDescription, '网站简介', { max: 200 })]);
    const save = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
    db.exec('BEGIN');
    try {
      for (const [key, value] of updates) save.run(key, value);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.json({ ok: true, settings: readSettings({ includeAdmin: true }) });
  }));

  return router;
}

module.exports = { createAdminRouter };

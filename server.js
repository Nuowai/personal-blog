const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const { marked } = require('marked');
const multer = require('multer');
const sanitizeHtml = require('sanitize-html');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'sakura-change-me';
const AMAP_JS_KEY = process.env.AMAP_JS_KEY || '';
const AMAP_SECURITY_CODE = process.env.AMAP_SECURITY_CODE || '';
const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY || '';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(password, stored) {
  const parts = stored.split(':');
  const salt = parts[0];
  const h = parts.slice(1).join(':');
  const v = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(v, 'hex'));
}

function requireAdmin(req, res, next) {
  const provided = req.headers['x-admin-token'] || '';
  if (provided && provided === ADMIN_TOKEN) return next();
  res.status(401).json({ error: '需要管理员密钥' });
}

const db = new DatabaseSync(path.join(DATA_DIR, 'sakura-note.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '日常',
    tags TEXT NOT NULL DEFAULT '',
    cover_emoji TEXT NOT NULL DEFAULT '🌸',
    cover_image TEXT NOT NULL DEFAULT '',
    published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS guestbook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    nickname TEXT NOT NULL,
    message TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'email',
    google_sub TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

for (const statement of [
  "ALTER TABLE posts ADD COLUMN tags TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE posts ADD COLUMN cover_image TEXT NOT NULL DEFAULT ''"
]) {
  try { db.exec(statement); } catch {}
}

if (db.prepare('SELECT COUNT(*) AS count FROM posts').get().count === 0) {
  const seed = db.prepare(`INSERT INTO posts (title, slug, excerpt, content, category, tags, cover_emoji, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
  db.exec('BEGIN');
  seed.run('把平凡日子收集成一小罐星光', 'tiny-jar-of-starlight', '一些关于慢下来、做喜欢的小事，以及给未来自己的温柔留言。', '# 把平凡日子收集成一小罐星光\n\n今天的风很轻，刚好把窗边的风铃吹出一点亮晶晶的声音。\n\n> 不必每天都闪闪发光，能好好生活就已经很厉害啦。', '生活碎片', '日常,治愈', '✨');
  seed.run('我的迷你服务器折腾手记', 'tiny-server-notes', '从一个空目录开始，把个人站点稳稳地放进一台小小的服务器。', '# 我的迷你服务器折腾手记\n\n个人站不需要很复杂的架构。Node.js、SQLite 和一台低功耗小主机就足够装下博客与实验。\n\n- **简单**：一个进程就能跑起来。\n- **轻量**：数据落在本地 SQLite。\n- **可爱**：工具也可以有自己的颜色和心情。', '技术手记', '服务器,Node.js', '🛜');
  db.exec('COMMIT');
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

const publicPostFields = 'id, title, slug, excerpt, category, tags, cover_emoji, cover_image, published, created_at, updated_at';
const allowedHtml = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'video', 'audio', 'source'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height'],
    video: ['src', 'controls', 'poster', 'width', 'height', 'loop', 'muted', 'autoplay'],
    audio: ['src', 'controls'],
    source: ['src', 'type']
  }
};

function formatPost(row) {
  if (!row) return null;
  return { ...row, published: Boolean(row.published), tags: String(row.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean), content_html: sanitizeHtml(marked.parse(row.content || '', { breaks: true, gfm: true }), allowedHtml) };
}
function makeSlug(title) { return title.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80); }

const storage = multer.diskStorage({ destination: UPLOAD_DIR, filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname)}`) });
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

app.get('/api/posts', (req, res) => {
  let query = `SELECT ${publicPostFields} FROM posts WHERE published = 1`;
  const params = [];
  if (req.query.q) { query += ` AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ?)`; params.push(`%${req.query.q}%`, `%${req.query.q}%`, `%${req.query.q}%`); }
  if (req.query.tag) { query += ` AND tags LIKE ?`; params.push(`%${req.query.tag}%`); }
  query += ` ORDER BY datetime(created_at) DESC`;
  res.json({ posts: db.prepare(query).all(...params).map(formatPost) });
});

app.get('/api/posts/:slug', (req, res) => {
  const isSlug = /^[a-z0-9-]+$/i.test(req.params.slug);
  const post = isSlug ? db.prepare(`SELECT ${publicPostFields}, content FROM posts WHERE slug = ? AND published = 1`).get(req.params.slug) : db.prepare(`SELECT ${publicPostFields}, content FROM posts WHERE id = ? AND published = 1`).get(req.params.slug);
  if (!post) return res.status(404).json({ error: '文章没有找到' });
  res.json({ post: formatPost(post) });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '邮箱和密码不能为空' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: '该邮箱已注册' });
  const passwordHash = hashPassword(password);
  const result = db.prepare('INSERT INTO users (email, password_hash, name, provider) VALUES (?, ?, ?, \'email\')').run(email, passwordHash, name || email.split('@')[0]);
  setSessionCookie(res, result.lastInsertRowid);
  res.status(201).json({ user: { id: result.lastInsertRowid, email, name: name || email.split('@')[0], provider: 'email' } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT id, email, name, password_hash, provider FROM users WHERE email = ? AND provider = \'email\'').get(email);
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: '邮箱或密码不正确' });
  setSessionCookie(res, user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name, provider: user.provider } });
});

app.post('/api/auth/google', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: '站点还没有配置 Google Client ID' });
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(req.body?.credential || '')));
    if (!tokenRes.ok) throw new Error('token verification failed');
    const payload = await tokenRes.json();
    if (!payload?.sub || !payload.email) return res.status(400).json({ error: 'Google 登录信息不完整' });
    let user = db.prepare('SELECT id, email, name, provider FROM users WHERE email = ?').get(payload.email);
    if (!user) {
      const result = db.prepare('INSERT INTO users (email, name, provider, google_sub) VALUES (?, ?, \'google\', ?)').run(payload.email, payload.name || payload.email.split('@')[0], payload.sub);
      user = { id: result.lastInsertRowid, email: payload.email, name: payload.name || payload.email.split('@')[0], provider: 'google' };
    }
    setSessionCookie(res, user.id);
    res.json({ user });
  } catch (error) { res.status(401).json({ error: 'Google 登录验证失败' }); }
});

function setSessionCookie(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  db.prepare('INSERT OR REPLACE INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt);
  res.cookie('sakura_session', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
}

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies?.sakura_session;
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(crypto.createHash('sha256').update(token).digest('hex'));
  res.clearCookie('sakura_session');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies?.sakura_session;
  if (!token) return res.json({ user: null });
  const session = db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > datetime(\'now\')').get(crypto.createHash('sha256').update(token).digest('hex'));
  if (!session) return res.json({ user: null });
  const user = db.prepare('SELECT id, email, name, avatar, provider FROM users WHERE id = ?').get(session.user_id);
  res.json({ user: user || null });
});

app.get('/api/auth/config', (req, res) => res.json({ googleClientId: GOOGLE_CLIENT_ID }));

app.get('/api/deepseek/models', (req, res) => res.json({ models: ['deepseek-chat', 'deepseek-reasoner'] }));

app.post('/api/deepseek', async (req, res) => {
  const apiKey = req.headers['x-deepseek-key'] || '';
  if (!apiKey) return res.status(400).json({ error: { message: '请在聊天窗口输入 DeepSeek API Key' } });
  try {
    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: req.body.model || 'deepseek-chat', messages: req.body.messages || [], max_tokens: req.body.max_tokens || 1024, temperature: req.body.temperature ?? 0.8 })
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (error) { res.status(502).json({ error: { message: '无法访问 DeepSeek API，请检查网络' } }); }
});

app.post('/api/posts', requireAdmin, (req, res) => {
  const { title, excerpt = '', content, category = '日常', tags = '', cover_emoji = '🌸', cover_image = '', published = true } = req.body || {};
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: '标题和正文不能为空' });
  const slug = makeSlug(title);
  const result = db.prepare(`INSERT INTO posts (title, slug, excerpt, content, category, tags, cover_emoji, cover_image, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title.trim(), slug, excerpt.trim(), content.trim(), category.trim(), Array.isArray(tags) ? tags.join(',') : String(tags).trim(), cover_emoji.trim() || '🌸', cover_image.trim(), published ? 1 : 0);
  res.status(201).json({ post: formatPost(db.prepare(`SELECT ${publicPostFields}, content FROM posts WHERE id = ?`).get(result.lastInsertRowid)) });
});

app.put('/api/posts/:id', requireAdmin, (req, res) => {
  const { title, excerpt = '', content, category = '日常', tags = '', cover_emoji = '🌸', cover_image = '', published = true } = req.body || {};
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: '标题和正文不能为空' });
  const result = db.prepare('UPDATE posts SET title = ?, excerpt = ?, content = ?, category = ?, tags = ?, cover_emoji = ?, cover_image = ?, published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title.trim(), excerpt.trim(), content.trim(), category.trim(), Array.isArray(tags) ? tags.join(',') : String(tags).trim(), cover_emoji.trim() || '🌸', cover_image.trim(), published ? 1 : 0, req.params.id);
  if (!result.changes) return res.status(404).json({ error: '文章没有找到' });
  res.json({ post: formatPost(db.prepare(`SELECT ${publicPostFields}, content FROM posts WHERE id = ?`).get(req.params.id)) });
});

app.delete('/api/posts/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: '文章没有找到' });
  res.status(204).end();
});

app.get('/api/posts/:slug/comments', (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!post) return res.status(404).json({ error: '文章没有找到' });
  res.json({ comments: db.prepare('SELECT id, nickname, message, created_at FROM comments WHERE post_id = ? AND approved = 1 ORDER BY datetime(created_at) DESC').all(post.id) });
});

app.post('/api/posts/:slug/comments', (req, res) => {
  const nickname = String(req.body?.nickname || '').trim().slice(0, 30);
  const message = String(req.body?.message || '').trim().slice(0, 500);
  const post = db.prepare('SELECT id FROM posts WHERE slug = ? AND published = 1').get(req.params.slug);
  if (!post) return res.status(404).json({ error: '文章没有找到' });
  if (!nickname || !message) return res.status(400).json({ error: '昵称和评论不能为空' });
  const result = db.prepare('INSERT INTO comments (post_id, nickname, message) VALUES (?, ?, ?)').run(post.id, nickname, message);
  res.status(201).json({ comment: db.prepare('SELECT id, nickname, message, created_at FROM comments WHERE id = ?').get(result.lastInsertRowid) });
});

app.get('/api/guestbook', (req, res) => res.json({ messages: db.prepare('SELECT id, nickname, message, created_at FROM guestbook ORDER BY datetime(created_at) DESC LIMIT 20').all() }));
app.post('/api/guestbook', (req, res) => {
  const nickname = String(req.body?.nickname || '').trim().slice(0, 30);
  const message = String(req.body?.message || '').trim().slice(0, 240);
  if (!nickname || !message) return res.status(400).json({ error: '昵称和留言都要写一点哦' });
  const result = db.prepare('INSERT INTO guestbook (nickname, message) VALUES (?, ?)').run(nickname, message);
  res.status(201).json({ message: db.prepare('SELECT id, nickname, message, created_at FROM guestbook WHERE id = ?').get(result.lastInsertRowid) });
});

app.post('/api/media', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择一个文件' });
  const url = `/uploads/${req.file.filename}`;
  const result = db.prepare('INSERT INTO media (filename, original_name, mime_type, size, url) VALUES (?, ?, ?, ?, ?)').run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, url);
  res.status(201).json({ media: db.prepare('SELECT id, filename AS name, mime_type, size, url, original_name, created_at FROM media WHERE id = ?').get(result.lastInsertRowid) });
});

app.get('/api/media', requireAdmin, (req, res) => res.json({ media: db.prepare('SELECT id, filename AS name, mime_type, size, url, original_name, created_at FROM media ORDER BY datetime(created_at) DESC').all() }));

app.delete('/api/media/:id', requireAdmin, (req, res) => {
  const media = db.prepare('SELECT filename FROM media WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: '媒体文件没有找到' });
  const filePath = path.join(UPLOAD_DIR, media.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  res.json({ theme: settings.theme || 'sakura' });
});

app.put('/api/settings', requireAdmin, (req, res) => {
  if (req.body.theme) db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (\'theme\', ?)').run(req.body.theme);
  res.json({ ok: true });
});

app.get('/api/location-config', (req, res) => res.json({ amapJsKey: AMAP_JS_KEY, securityJsCode: AMAP_SECURITY_CODE }));

app.get('/api/weather', async (req, res) => {
  if (!AMAP_WEB_KEY) return res.json({ error: '站点未配置高德天气 Key' });
  const adcode = req.query.city || '110000';
  try {
    const upstream = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?key=${encodeURIComponent(AMAP_WEB_KEY)}&city=${encodeURIComponent(adcode)}&extensions=base`);
    const data = await upstream.json();
    res.json(data);
  } catch (error) { res.status(502).json({ error: '天气查询失败' }); }
});

app.get('/feed.xml', (req, res) => {
  const posts = db.prepare(`SELECT ${publicPostFields} FROM posts WHERE published = 1 ORDER BY datetime(created_at) DESC LIMIT 20`).all();
  const items = posts.map((post) => `<item><title><![CDATA[${post.title}]]></title><link>${req.protocol}://${req.get('host')}/post.html?slug=${encodeURIComponent(post.slug)}</link><description><![CDATA[${post.excerpt}]]></description><pubDate>${new Date(`${post.created_at.replace(' ', 'T')}Z`).toUTCString()}</pubDate></item>`).join('');
  res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Sakura Note</title><link>${req.protocol}://${req.get('host')}</link><description>樱花汽水日记</description>${items}</channel></rss>`);
});

app.get('/sitemap.xml', (req, res) => {
  const posts = db.prepare('SELECT slug, updated_at FROM posts WHERE published = 1').all();
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = [`<url><loc>${base}/</loc></url>`, ...posts.map((post) => `<url><loc>${base}/post.html?slug=${encodeURIComponent(post.slug)}</loc><lastmod>${post.updated_at.slice(0, 10)}</lastmod></url>`)].join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'sakura-note' }));
app.use((error, req, res, next) => { if (error instanceof multer.MulterError || error) return res.status(400).json({ error: '文件上传失败，请确认格式和大小（最大 200MB）' }); next(); });
app.get('*', (req, res) => { if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API not found' }); res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const server = app.listen(PORT, '0.0.0.0', () => console.log(`Sakura Note is blooming at http://localhost:${PORT}`));
module.exports = { app, server };

const express = require('express');
const { AppError, asyncHandler, rateLimit } = require('../http');
const { hashPassword, verifyPassword, getSessionToken, hashToken, setSessionCookie, clearSessionCookie, normalizeEmail, safeEqual } = require('../security');
const { validateAuth } = require('../validation');

function createAuthRouter({ db, config }) {
  const router = express.Router();
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

  router.post('/auth/register', authLimiter, asyncHandler(async (req, res) => {
    const { email, password, name } = validateAuth(req.body, { register: true });
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      throw new AppError(409, 'EMAIL_EXISTS', '该邮箱已注册');
    }
    const result = db.prepare('INSERT INTO users (email, password_hash, name, provider) VALUES (?, ?, ?, \'email\')')
      .run(email, hashPassword(password), name);
    setSessionCookie(res, db, result.lastInsertRowid, config);
    res.status(201).json({ user: { id: result.lastInsertRowid, email, name, provider: 'email' } });
  }));

  router.post('/auth/login', authLimiter, asyncHandler(async (req, res) => {
    const { email, password } = validateAuth(req.body);
    const user = db.prepare('SELECT id, email, name, password_hash, provider FROM users WHERE email = ? AND provider = \'email\'').get(email);
    if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
      throw new AppError(401, 'INVALID_CREDENTIALS', '邮箱或密码不正确');
    }
    setSessionCookie(res, db, user.id, config);
    res.json({ user: { id: user.id, email: user.email, name: user.name, provider: user.provider } });
  }));

  router.post('/auth/google', authLimiter, asyncHandler(async (req, res) => {
    if (!config.googleClientId) throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', '站点尚未配置 Google 登录');
    const credential = String(req.body?.credential || '');
    if (!credential) throw new AppError(400, 'INVALID_GOOGLE_CREDENTIAL', 'Google 登录凭证不能为空');
    const tokenRes = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { signal: AbortSignal.timeout(10000) });
    if (!tokenRes.ok) throw new AppError(401, 'INVALID_GOOGLE_CREDENTIAL', 'Google 登录验证失败');
    const payload = await tokenRes.json();
    if (!payload?.sub || !payload.email || payload.aud !== config.googleClientId || payload.email_verified !== 'true') {
      throw new AppError(401, 'INVALID_GOOGLE_CREDENTIAL', 'Google 登录凭证无效');
    }
    const email = normalizeEmail(payload.email);
    let user = db.prepare('SELECT id, email, name, avatar, provider FROM users WHERE email = ?').get(email);
    if (!user) {
      const result = db.prepare('INSERT INTO users (email, name, provider, google_sub) VALUES (?, ?, \'google\', ?)')
        .run(email, String(payload.name || email.split('@')[0]).slice(0, 40), payload.sub);
      user = { id: result.lastInsertRowid, email, name: String(payload.name || email.split('@')[0]).slice(0, 40), provider: 'google', avatar: payload.picture || '' };
    } else {
      db.prepare('UPDATE users SET google_sub = COALESCE(google_sub, ?), avatar = COALESCE(NULLIF(?, \'\'), avatar) WHERE id = ?')
        .run(payload.sub, payload.picture || '', user.id);
    }
    setSessionCookie(res, db, user.id, config);
    res.json({ user });
  }));

  router.post('/auth/logout', asyncHandler(async (req, res) => {
    const token = getSessionToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    clearSessionCookie(res, config);
    res.json({ ok: true });
  }));

  router.get('/auth/me', asyncHandler(async (req, res) => {
    const token = getSessionToken(req);
    if (!token) return res.json({ user: null });
    const session = db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > datetime(\'now\')').get(hashToken(token));
    if (!session) return res.json({ user: null });
    const user = db.prepare('SELECT id, email, name, avatar, provider FROM users WHERE id = ?').get(session.user_id);
    res.json({ user: user || null });
  }));

  router.get('/auth/config', (req, res) => res.json({ googleClientId: config.googleClientId }));

  router.get('/auth/admin-check', (req, res) => {
    const provided = String(req.headers['x-admin-token'] || '');
    if (!config.adminToken) throw new AppError(503, 'ADMIN_NOT_CONFIGURED', '站点尚未配置管理员密钥');
    if (!safeEqual(provided, config.adminToken)) throw new AppError(401, 'ADMIN_UNAUTHORIZED', '管理员密钥不正确');
    res.json({ ok: true });
  });

  return router;
}

module.exports = { createAuthRouter };

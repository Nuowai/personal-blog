const express = require('express');
const { AppError, asyncHandler, rateLimit } = require('../http');
const { escapeXml, publicPostFields } = require('../format');

function createIntegrationsRouter({ db, config }) {
  const apiRouter = express.Router();
  const publicRouter = express.Router();
  const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

  apiRouter.get('/deepseek/models', (req, res) => res.json({ models: ['deepseek-chat', 'deepseek-reasoner'] }));

  apiRouter.post('/deepseek', aiLimiter, asyncHandler(async (req, res) => {
    const apiKey = String(req.headers['x-deepseek-key'] || '').trim();
    if (!apiKey) throw new AppError(400, 'DEEPSEEK_KEY_REQUIRED', '请在聊天窗口输入 DeepSeek API Key');
    const model = ['deepseek-chat', 'deepseek-reasoner'].includes(req.body?.model) ? req.body.model : 'deepseek-chat';
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = rawMessages.slice(-12).map((message) => ({
      role: ['system', 'user', 'assistant'].includes(message?.role) ? message.role : 'user',
      content: String(message?.content || '').slice(0, 8000)
    }));
    if (!messages.length) throw new AppError(400, 'DEEPSEEK_MESSAGES_REQUIRED', '消息不能为空');
    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: Math.min(Math.max(Number(req.body?.max_tokens) || 1024, 1), 4096), temperature: Math.min(Math.max(Number(req.body?.temperature ?? 0.8), 0), 2) })
    });
    const data = await upstream.json();
    if (!upstream.ok) throw new AppError(upstream.status === 429 ? 429 : 502, 'DEEPSEEK_UPSTREAM_ERROR', data?.error?.message || 'DeepSeek 请求失败');
    res.json(data);
  }));

  apiRouter.get('/location-config', (req, res) => res.json({ amapJsKey: config.amapJsKey, securityJsCode: config.amapSecurityCode }));

  apiRouter.get('/weather', asyncHandler(async (req, res) => {
    if (!config.amapWebKey) return res.json({ error: '站点未配置高德天气 Key', code: 'WEATHER_NOT_CONFIGURED' });
    const city = String(req.query.city || '110000').replace(/[^0-9]/g, '').slice(0, 12);
    const upstream = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?key=${encodeURIComponent(config.amapWebKey)}&city=${encodeURIComponent(city)}&extensions=base`, { signal: AbortSignal.timeout(10000) });
    const data = await upstream.json();
    if (!upstream.ok) throw new AppError(502, 'WEATHER_UPSTREAM_ERROR', '天气查询失败');
    res.json(data);
  }));

  publicRouter.get('/feed.xml', (req, res) => {
    const posts = db.prepare(`SELECT ${publicPostFields} FROM posts WHERE published = 1 ORDER BY datetime(created_at) DESC LIMIT 20`).all();
    const base = `${req.protocol}://${req.get('host')}`;
    const items = posts.map((post) => `<item><title><![CDATA[${String(post.title).replace(/]]>/g, '')}]]></title><link>${escapeXml(base)}/post.html?slug=${encodeURIComponent(post.slug)}</link><description><![CDATA[${String(post.excerpt).replace(/]]>/g, '')}]]></description><pubDate>${new Date(`${post.created_at.replace(' ', 'T')}Z`).toUTCString()}</pubDate></item>`).join('');
    res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Sakura Note</title><link>${escapeXml(base)}</link><description>樱花汽水日记</description>${items}</channel></rss>`);
  });

  publicRouter.get('/sitemap.xml', (req, res) => {
    const posts = db.prepare('SELECT slug, updated_at FROM posts WHERE published = 1').all();
    const base = `${req.protocol}://${req.get('host')}`;
    const urls = [`<url><loc>${escapeXml(base)}/</loc></url>`, ...posts.map((post) => `<url><loc>${escapeXml(base)}/post.html?slug=${encodeURIComponent(post.slug)}</loc><lastmod>${escapeXml(post.updated_at.slice(0, 10))}</lastmod></url>`)].join('');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });

  return { apiRouter, publicRouter };
}

module.exports = { createIntegrationsRouter };

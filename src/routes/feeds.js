const express = require('express');
const { escapeXml, publicPostFields } = require('../format');

function createFeedRouter({ db }) {
  const router = express.Router();

  router.get('/feed.xml', (req, res) => {
    const posts = db.prepare(`SELECT ${publicPostFields} FROM posts WHERE published = 1 ORDER BY datetime(created_at) DESC LIMIT 20`).all();
    const base = `${req.protocol}://${req.get('host')}`;
    const items = posts.map((post) => `<item><title><![CDATA[${String(post.title).replace(/]]>/g, '')}]]></title><link>${escapeXml(base)}/post.html?slug=${encodeURIComponent(post.slug)}</link><description><![CDATA[${String(post.excerpt).replace(/]]>/g, '')}]]></description><pubDate>${new Date(`${post.created_at.replace(' ', 'T')}Z`).toUTCString()}</pubDate></item>`).join('');
    res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Sakura Note</title><link>${escapeXml(base)}</link><description>樱花汽水日记</description>${items}</channel></rss>`);
  });

  router.get('/sitemap.xml', (req, res) => {
    const posts = db.prepare('SELECT slug, updated_at FROM posts WHERE published = 1').all();
    const base = `${req.protocol}://${req.get('host')}`;
    const urls = [`<url><loc>${escapeXml(base)}/</loc></url>`, ...posts.map((post) => `<url><loc>${escapeXml(base)}/post.html?slug=${encodeURIComponent(post.slug)}</loc><lastmod>${escapeXml(post.updated_at.slice(0, 10))}</lastmod></url>`)].join('');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });

  return router;
}

module.exports = { createFeedRouter };

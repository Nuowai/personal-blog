const express = require('express');
const path = require('node:path');
const { notFound, errorHandler } = require('./http');
const { createAuthRouter } = require('./routes/auth');
const { createPostsRouter } = require('./routes/posts');
const { createCommunityRouter } = require('./routes/community');
const { createAdminRouter } = require('./routes/admin');
const { createIntegrationsRouter } = require('./routes/integrations');

function createApp({ db, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use(express.static(config.publicDir));
  app.use('/uploads', express.static(config.uploadDir));

  app.use('/api', createAuthRouter({ db, config }));
  app.use('/api', createPostsRouter({ db, config }));
  app.use('/api', createCommunityRouter({ db }));
  app.use('/api', createAdminRouter({ db, config }));
  const integrations = createIntegrationsRouter({ db, config });
  app.use('/api', integrations.apiRouter);
  app.use('/', integrations.publicRouter);

  app.get('/health', (req, res) => res.json({ ok: true, service: 'sakura-note' }));
  app.use(notFound);
  app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在', code: 'NOT_FOUND' }));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: '接口不存在', code: 'NOT_FOUND' });
    res.sendFile(path.join(config.publicDir, 'index.html'));
  });
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

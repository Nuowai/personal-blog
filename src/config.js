const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

module.exports = Object.freeze({
  rootDir,
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  adminToken: process.env.ADMIN_TOKEN || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  amapJsKey: process.env.AMAP_JS_KEY || '',
  amapSecurityCode: process.env.AMAP_SECURITY_CODE || '',
  amapWebKey: process.env.AMAP_WEB_KEY || '',
  dataDir: path.join(rootDir, 'data'),
  uploadDir: path.join(rootDir, 'uploads'),
  publicDir: path.join(rootDir, 'public'),
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000
});

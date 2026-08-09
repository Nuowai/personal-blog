const config = require('./src/config');
const { createDatabase } = require('./src/db');
const { createApp } = require('./src/app');

const db = createDatabase(config);
const app = createApp({ db, config });
const server = require.main === module
  ? app.listen(config.port, '0.0.0.0', () => console.log(`Sakura Note is blooming at http://localhost:${config.port}`))
  : null;

module.exports = { app, server, db };

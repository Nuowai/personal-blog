const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function createDatabase(config) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const db = new DatabaseSync(path.join(config.dataDir, 'sakura-note.db'));
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

  const columns = new Set(db.prepare('PRAGMA table_info(posts)').all().map((column) => column.name));
  if (!columns.has('tags')) db.exec("ALTER TABLE posts ADD COLUMN tags TEXT NOT NULL DEFAULT ''");
  if (!columns.has('cover_image')) db.exec("ALTER TABLE posts ADD COLUMN cover_image TEXT NOT NULL DEFAULT ''");

  if (db.prepare('SELECT COUNT(*) AS count FROM posts').get().count === 0) {
    const seed = db.prepare(`INSERT INTO posts (title, slug, excerpt, content, category, tags, cover_emoji, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
    db.exec('BEGIN');
    try {
      seed.run('把平凡日子收集成一小罐星光', 'tiny-jar-of-starlight', '一些关于慢下来、做喜欢的小事，以及给未来自己的温柔留言。', '# 把平凡日子收集成一小罐星光\\n\\n今天的风很轻，刚好把窗边的风铃吹出一点亮晶晶的声音。\\n\\n> 不必每天都闪闪发光，能好好生活就已经很厉害啦。', '生活碎片', '日常,治愈', '✨');
      seed.run('我的迷你服务器折腾手记', 'tiny-server-notes', '从一个空目录开始，把个人站点稳稳地放进一台小小的服务器。', '# 我的迷你服务器折腾手记\\n\\n个人站不需要很复杂的架构。Node.js、SQLite 和一台低功耗小主机就足够装下博客与实验。\\n\\n- **简单**：一个进程就能跑起来。\\n- **轻量**：数据落在本地 SQLite。\\n- **可爱**：工具也可以有自己的颜色和心情。', '技术手记', '服务器,Node.js', '🛜');
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  return db;
}

module.exports = { createDatabase };

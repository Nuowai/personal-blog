const { AppError } = require('./http');
const { normalizeEmail } = require('./security');

function assertObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError(400, 'INVALID_TYPE', '请求体必须是对象');
  return value;
}

function text(value, field, { min = 0, max = 5000, required = false } = {}) {
  if (value !== undefined && value !== null && typeof value !== 'string') throw new AppError(400, 'INVALID_TYPE', `${field}必须是字符串`);
  const normalized = String(value ?? '').trim();
  if (required && !normalized) throw new AppError(400, 'VALIDATION_ERROR', `${field}不能为空`);
  if (normalized.length < min) throw new AppError(400, 'VALIDATION_ERROR', `${field}长度不能少于${min}个字符`);
  if (normalized.length > max) throw new AppError(400, 'VALIDATION_ERROR', `${field}长度不能超过${max}个字符`);
  return normalized;
}

function validateAuth(body, { register = false } = {}) {
  body = assertObject(body);
  const email = text(body.email, '邮箱', { min: 1, max: 200, required: true }).toLowerCase();
  const password = text(body.password, '密码', { min: 8, max: 200, required: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'INVALID_EMAIL', '邮箱格式不正确');
  return { email, password, name: register ? text(body.name || email.split('@')[0], '昵称', { min: 1, max: 40, required: true }) : undefined };
}

function validatePost(body) {
  body = assertObject(body);
  if (body.published !== undefined && typeof body.published !== 'boolean') throw new AppError(400, 'INVALID_TYPE', 'published 必须是布尔值');
  const tags = Array.isArray(body.tags) ? body.tags.map((tag) => text(tag, '标签', { max: 40 })).join(',') : body.tags;
  return {
    title: text(body.title, '标题', { min: 1, max: 100, required: true }),
    excerpt: text(body.excerpt, '摘要', { max: 180 }),
    content: text(body.content, '正文', { min: 1, max: 200000, required: true }),
    category: text(body.category || '日常', '分类', { max: 30 }) || '日常',
    tags: text(tags, '标签', { max: 160 }),
    cover_emoji: text(body.cover_emoji || '🌸', '封面表情', { max: 8 }) || '🌸',
    cover_image: text(body.cover_image, '封面地址', { max: 1000 }),
    published: body.published !== false
  };
}

function validateMessage(body, field, max) {
  body = assertObject(body);
  return {
    nickname: text(body.nickname, '昵称', { min: 1, max: 30, required: true }),
    message: text(body.message, field, { min: 1, max, required: true })
  };
}
module.exports = { assertObject, text, validateAuth, validatePost, validateMessage };

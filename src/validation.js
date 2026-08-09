const { AppError } = require('./http');
const { normalizeEmail } = require('./security');

function text(value, field, { min = 0, max = 5000, required = false } = {}) {
  const normalized = String(value ?? '').trim();
  if (required && !normalized) throw new AppError(400, 'VALIDATION_ERROR', `${field}不能为空`);
  if (normalized.length < min) throw new AppError(400, 'VALIDATION_ERROR', `${field}长度不能少于${min}个字符`);
  if (normalized.length > max) throw new AppError(400, 'VALIDATION_ERROR', `${field}长度不能超过${max}个字符`);
  return normalized;
}

function validateAuth(body, { register = false } = {}) {
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'INVALID_EMAIL', '邮箱格式不正确');
  if (password.length < 8 || password.length > 200) throw new AppError(400, 'INVALID_PASSWORD', '密码长度需要在8到200个字符之间');
  return { email, password, name: register ? text(body?.name || email.split('@')[0], '昵称', { min: 1, max: 40, required: true }) : undefined };
}

function validatePost(body) {
  return {
    title: text(body?.title, '标题', { min: 1, max: 100, required: true }),
    excerpt: text(body?.excerpt, '摘要', { max: 180 }),
    content: text(body?.content, '正文', { min: 1, max: 200000, required: true }),
    category: text(body?.category || '日常', '分类', { max: 30 }) || '日常',
    tags: text(Array.isArray(body?.tags) ? body.tags.join(',') : body?.tags, '标签', { max: 160 }),
    cover_emoji: text(body?.cover_emoji || '🌸', '封面表情', { max: 8 }) || '🌸',
    cover_image: text(body?.cover_image, '封面地址', { max: 1000 }),
    published: body?.published !== false
  };
}

function validateMessage(body, field, max) {
  return {
    nickname: text(body?.nickname, '昵称', { min: 1, max: 30, required: true }),
    message: text(body?.message, field, { min: 1, max, required: true })
  };
}

module.exports = { text, validateAuth, validatePost, validateMessage };

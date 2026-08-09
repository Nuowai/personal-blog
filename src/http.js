class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function rateLimit({ windowMs, max, key = (req) => req.ip || 'unknown' }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = key(req);
    const bucket = buckets.get(bucketKey) || { start: now, count: 0 };
    if (now - bucket.start >= windowMs) {
      bucket.start = now;
      bucket.count = 0;
    }
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    if (bucket.count > max) return next(new AppError(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试'));
    next();
  };
}

function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) return next(new AppError(404, 'NOT_FOUND', '接口不存在'));
  next();
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const known = error instanceof AppError;
  const status = known ? error.status : error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
  const code = known ? error.code : 'INTERNAL_ERROR';
  if (!known) console.error(error);
  res.status(status).json({ error: known ? error.message : '服务器内部错误', code, details: known ? error.details : undefined });
}

module.exports = { AppError, asyncHandler, rateLimit, notFound, errorHandler };

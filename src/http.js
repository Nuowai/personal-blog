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
  let lastCleanup = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup >= windowMs) {
      for (const [bucketKey, bucket] of buckets) {
        if (now - bucket.start >= windowMs) buckets.delete(bucketKey);
      }
      lastCleanup = now;
    }
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
  const isUploadTooLarge = error?.code === 'LIMIT_FILE_SIZE';
  const status = known ? error.status : isUploadTooLarge ? 413 : error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
  const code = known ? error.code : isUploadTooLarge ? 'MEDIA_TOO_LARGE' : 'INTERNAL_ERROR';
  if (!known) console.error({ requestId: req.requestId, method: req.method, path: req.path, error });
  const message = known ? error.message : isUploadTooLarge ? '媒体文件超过大小限制' : '服务器内部错误';
  res.status(status).json({ error: message, code, details: known ? error.details : undefined });
}

module.exports = { AppError, asyncHandler, rateLimit, notFound, errorHandler };

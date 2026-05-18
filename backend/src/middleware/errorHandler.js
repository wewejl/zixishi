import { normalizeError, notFound } from '../utils/errors.js';

export function notFoundHandler(req, res, next) {
  next(notFound('资源不存在', { method: req.method, path: req.originalUrl }));
}

export function errorHandler(err, req, res, next) {
  const appError = normalizeError(err);
  const status = appError.status || 500;
  const message = appError.expose ? appError.message : '服务端错误';

  if (status === 500) {
    console.error({
      requestId: req.requestId,
      code: appError.code,
      message: err?.message,
      stack: err?.stack
    });
  }

  res.status(status).json({
    error: {
      code: appError.code,
      message,
      requestId: req.requestId,
      details: appError.details
    }
  });
}

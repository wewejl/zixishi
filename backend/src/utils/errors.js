export class AppError extends Error {
  constructor({ code, message, status = 500, details = null, expose = true }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.expose = expose;
  }
}

export function unauthorized(message = '未登录或 token 无效', details = null) {
  return new AppError({
    code: 'UNAUTHORIZED',
    message,
    status: 401,
    details
  });
}

export function notFound(message = '资源不存在', details = null) {
  return new AppError({
    code: 'NOT_FOUND',
    message,
    status: 404,
    details
  });
}

export function notImplemented(resource) {
  return new AppError({
    code: 'NOT_IMPLEMENTED',
    message: `${resource} 暂未实现`,
    status: 501,
    details: { resource }
  });
}

export function normalizeError(err) {
  if (err instanceof AppError) {
    return err;
  }

  if (err?.type === 'entity.parse.failed') {
    return new AppError({
      code: 'INVALID_ARGUMENT',
      message: '请求体 JSON 格式错误',
      status: 400,
      details: null
    });
  }

  return new AppError({
    code: 'INTERNAL_SERVER_ERROR',
    message: '服务端错误',
    status: 500,
    details: null,
    expose: false
  });
}

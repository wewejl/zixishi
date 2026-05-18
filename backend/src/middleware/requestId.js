import { createRequestId } from '../utils/requestId.js';

export function requestId(req, res, next) {
  const incomingRequestId = req.get('X-Request-Id');
  req.requestId = incomingRequestId || createRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

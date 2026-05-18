import express from 'express';
import { cors } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(requestId);
  app.use(cors);
  app.use(express.json());

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

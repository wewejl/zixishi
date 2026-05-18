import { Router } from 'express';
import { accessRouter } from './access.js';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';
import { meRouter } from './me.js';
import { merchantRouter } from './merchant.js';
import { ordersRouter } from './orders.js';
import { packagesRouter } from './packages.js';
import { protectedPlaceholderRouter } from './protectedPlaceholders.js';
import { publicPlaceholderRouter } from './publicPlaceholders.js';
import { reservationRouter } from './reservations.js';
import { storesRouter } from './stores.js';
import { studySessionRouter } from './studySession.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(meRouter);
apiRouter.use(merchantRouter);
apiRouter.use(storesRouter);
apiRouter.use(reservationRouter);
apiRouter.use(studySessionRouter);
apiRouter.use(packagesRouter);
apiRouter.use(ordersRouter);
apiRouter.use(accessRouter);
apiRouter.use(publicPlaceholderRouter);
apiRouter.use(protectedPlaceholderRouter);

import express from 'express';
import cors from 'cors';
import { env } from './Config/env.js';
import { apiRouter } from './Route/index.js';
import { errorHandler, notFound } from './Middleware/errorHandler.js';

export const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

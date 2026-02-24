import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import assetsRouter from './routes/assets.js';
import appsRouter from './routes/apps.js';
import peopleRouter from './routes/people.js';
import integrationsRouter from './routes/integrations.js';
import activityRouter from './routes/activity.js';
import agentRouter from './routes/agent.js';

/**
 * Factory that creates and configures the Express app without starting
 * the HTTP listener — importable by both the production entry-point and
 * the test suite without triggering a network bind.
 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/auth', authRouter);
  app.use('/assets', assetsRouter);
  app.use('/apps', appsRouter);
  app.use('/people', peopleRouter);
  app.use('/integrations', integrationsRouter);
  app.use('/activity', activityRouter);
  app.use('/agent', agentRouter);

  app.use(errorHandler);

  return app;
}

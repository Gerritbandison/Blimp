import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import assetsRouter from './routes/assets.js';
import appsRouter from './routes/apps.js';
import peopleRouter from './routes/people.js';
import integrationsRouter from './routes/integrations.js';
import activityRouter from './routes/activity.js';
import agentRouter from './routes/agent.js';
import documentsRouter from './routes/documents.js';
import { prisma } from './lib/prisma.js';
import { spec } from './openapi.js';

/**
 * Factory that creates and configures the Express app without starting
 * the HTTP listener — importable by both the production entry-point and
 * the test suite without triggering a network bind.
 */
export function createApp() {
  const app = express();

  // Security headers — relaxed CSP for /api-docs (Swagger UI uses inline scripts)
  const helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
  app.use((req, res, next) => {
    // Skip strict CSP for Swagger UI paths
    if (req.path.startsWith('/api-docs')) return next();
    helmetMiddleware(req, res, next);
  });

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  // OpenAPI / Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'Blimp API Docs' }));
  app.get('/api-docs.json', (_req, res) => res.json(spec));

  // Liveness probe — checks DB connectivity
  app.get('/health', async (_req, res) => {
    let dbStatus: 'ok' | 'error' = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }
    const status = dbStatus === 'ok' ? 'ok' : 'degraded';
    const code = status === 'ok' ? 200 : 503;
    res.status(code).json({
      status,
      timestamp: new Date().toISOString(),
      checks: { database: dbStatus },
    });
  });

  // Readiness probe — separate endpoint for orchestrators
  app.get('/ready', (_req, res) => {
    res.json({ ready: true, timestamp: new Date().toISOString() });
  });

  app.use('/auth', authRouter);
  app.use('/assets', assetsRouter);
  app.use('/apps', appsRouter);
  app.use('/people', peopleRouter);
  app.use('/integrations', integrationsRouter);
  app.use('/activity', activityRouter);
  app.use('/agent', agentRouter);
  app.use('/documents', documentsRouter);

  app.use(errorHandler);

  return app;
}

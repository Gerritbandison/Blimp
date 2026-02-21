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

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/assets', assetsRouter);
app.use('/apps', appsRouter);
app.use('/people', peopleRouter);
app.use('/integrations', integrationsRouter);
app.use('/activity', activityRouter);

// ─── Error handler (must be last) ───────────────────────────────────────────

app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`[blimp-server] Listening on http://localhost:${config.port}`);
  console.log(`[blimp-server] CORS origin: ${config.corsOrigin}`);
});

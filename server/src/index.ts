import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[blimp-server] Listening on http://localhost:${config.port}`);
  console.log(`[blimp-server] CORS origin: ${config.corsOrigin}`);
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────
// On SIGTERM/SIGINT: stop accepting connections, drain existing requests,
// disconnect the database pool, then exit cleanly.

function shutdown(signal: string) {
  console.log(`[blimp-server] ${signal} received — shutting down gracefully...`);

  // Force exit after 30s if graceful shutdown stalls
  const forceTimer = setTimeout(() => {
    console.error('[blimp-server] Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 30_000);
  forceTimer.unref();

  server.close(async () => {
    console.log('[blimp-server] HTTP server closed');
    try {
      await prisma.$disconnect();
      console.log('[blimp-server] Database disconnected');
    } catch (err) {
      console.error('[blimp-server] Error disconnecting database:', err);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[blimp-server] Listening on http://localhost:${config.port}`);
  console.log(`[blimp-server] CORS origin: ${config.corsOrigin}`);
});

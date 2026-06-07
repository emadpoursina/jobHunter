import 'dotenv/config';
import express from 'express';
import { close as closeDb } from './db.js';
import settingsRouter from './routes/settings.js';
import ollamaRouter from './routes/ollama.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/settings', settingsRouter);
app.use('/api/ollama', ollamaRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

app.use((err, _req, res, _next) => {
  const status = err.status ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  console.error(`[ERROR] ${err.message}`, err.stack);
  res.status(status).json({ error: err.message, code });
});

function shutdown() {
  closeDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(PORT, () => {
  console.log(`[INFO] [server] Listening on http://localhost:${PORT}`);
});

import 'dotenv/config';
import express from 'express';
import { closeBrowser } from '../collectors/linkedin.js';
import { close as closeDb } from './db.js';
import { statusForError } from './errors.js';
import settingsRouter from './routes/settings.js';
import ollamaRouter from './routes/ollama.js';
import pipelineRouter from './routes/pipeline.js';
import collectRouter from './routes/collect.js';
import jobsRouter from './routes/jobs.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/settings', settingsRouter);
app.use('/api/ollama', ollamaRouter);
app.use('/api', pipelineRouter);
app.use('/api', collectRouter);
app.use('/api/jobs', jobsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

// Global error handler — all routes return { error, code }
app.use((err, _req, res, _next) => {
  const status = statusForError(err);
  const code = err.code ?? 'INTERNAL_ERROR';
  console.error(`[ERROR] [server] ${err.message}`, err.stack);
  res.status(status).json({ error: err.message, code });
});

async function shutdown() {
  try {
    await closeBrowser();
  } catch (err) {
    console.warn(`[WARN] [server] Failed to close browser: ${err.message}`);
  }
  closeDb();
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown();
});
process.on('SIGTERM', () => {
  shutdown();
});

app.listen(PORT, () => {
  console.log(`[INFO] [server] Listening on http://localhost:${PORT}`);
});

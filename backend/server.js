import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { env } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import apiV1 from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/error.js';
import { initSocketIO } from './utils/socketio.js';


const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit for large image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Handle URL-encoded data
app.use(morgan("dev"));

// test endpoint
app.get("/health", (_req, res) => res.json({ ok: true }));

// api
// app.use("/api/v1/listings", listingsRoutes);

// app.use("/api/v1", apiRoutes);

const limiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use(limiter);


app.use('/api/v1', apiV1);


app.use(notFound);
app.use((err, _req, res, next) => {
if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
return res.status(400).json({ error: 'Invalid JSON' });
}
next(err);
});
app.use(errorHandler);

// Create HTTP server for Socket.IO
const server = createServer(app);

// Initialize Socket.IO
initSocketIO(server);

connectMongo()
.then(() => {
  server.listen(env.PORT, () => console.log(`[api] listening on :${env.PORT}`));
})
.catch((e) => { console.error('[mongo] failed:', e.message); process.exit(1); });


process.on('unhandledRejection', (r) => console.error('unhandledRejection:', r));
process.on('uncaughtException', (e) => { console.error('uncaughtException:', e); process.exit(1); });

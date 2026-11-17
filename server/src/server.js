import 'dotenv/config'; // must load before app.js reads process.env
import mongoose from 'mongoose';
import { validateEnv } from './config/envCheck.js';
import connectDB from './config/db.js';
import app from './app.js';

validateEnv();

const PORT = process.env.PORT || 5000;

await connectDB();

const server = app.listen(PORT, () => {
  console.log(`[Doctor Tracker Server] running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown: stop accepting requests, let in-flight ones finish, then close the DB pool
const shutdown = (signal) => {
  console.log(`[Doctor Tracker Server] ${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // hard stop if something hangs
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A bug that escapes every try/catch should be visible in logs, and the process restarted cleanly
process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] Unhandled promise rejection:', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught exception:', err);
  shutdown('uncaughtException');
});

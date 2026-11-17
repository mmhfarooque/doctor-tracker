// Vercel serverless entry: every request is rewritten here (see vercel.json) and handled by the Express app.
// The MongoDB connection is created once per warm instance and reused across invocations.
import mongoose from 'mongoose';
import app from '../src/app.js';

let connecting = null;

const connect = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  connecting ??= mongoose
    .connect(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
    .catch((err) => {
      connecting = null; // allow the next request to retry
      throw err;
    });
  return connecting;
};

export default async function handler(req, res) {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Server is not configured (MONGODB_URI / JWT_SECRET missing).' }));
    return;
  }
  try {
    await connect();
  } catch (err) {
    console.error('[MongoDB] connection failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Database temporarily unavailable. Please try again.' }));
    return;
  }
  return app(req, res);
}

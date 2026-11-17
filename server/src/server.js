import 'dotenv/config'; // must load before app.js reads process.env
import { validateEnv } from './config/envCheck.js';
import connectDB from './config/db.js';
import app from './app.js';

validateEnv();

const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, () => {
  console.log(`[Doctor Tracker Server] running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

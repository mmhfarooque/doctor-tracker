import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);

    mongoose.connection.on('error', () => {
      console.error('[Error] Operation failed');
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from database cluster.');
    });

  } catch {
    console.error('[Error] Operation failed');
    process.exit(1);
  }
};

export default connectDB;

const mongoose = require('mongoose');

/**
 * Establishes a connection to MongoDB using the URI provided in the
 * environment. Fails fast with a clear error message if the connection
 * cannot be established, since nothing in this app works without it.
 */
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in the environment');
    }

    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
    });

    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[db] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[db] MongoDB disconnected - will attempt to reconnect automatically');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[db] MongoDB reconnected');
    });

    return conn;
  } catch (err) {
    console.error(`[db] Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
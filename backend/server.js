require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { initSocket } = require('./socket/socketHandler');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const documentRoutes = require('./routes/documentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ---- Security & parsing middleware ----
app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . from user input to prevent NoSQL injection

// General API rate limiter (auth routes have their own stricter one)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'CollabSpace API is running', timestamp: new Date().toISOString() });
});

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

// ---- Socket.IO ----
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});
initSocket(io);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[server] CollabSpace API + Socket.IO listening on port ${PORT}`);
    console.log(`[server] Accepting requests from ${CLIENT_URL}`);
  });
}

start();

process.on('unhandledRejection', (err) => {
  console.error('[server] Unhandled rejection:', err.message);
});

module.exports = { app, server, io };
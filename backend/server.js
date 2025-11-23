import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import workflowRoutes from './routes/workflows.js';
import jiraRoutes from './routes/jira.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://localhost:5175",
      "http://localhost:5174",
      "http://localhost:5176"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store io instance in app for use in routes
app.set('io', io);

// Middleware - CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:5175",
    "http://localhost:5174",
    "http://localhost:5176"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/testflow';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/jira', jiraRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Join workflow room
  socket.on('join-workflow', (workflowId) => {
    socket.join(`workflow:${workflowId}`);
    console.log(`👤 Client ${socket.id} joined workflow: ${workflowId}`);
  });

  // Leave workflow room
  socket.on('leave-workflow', (workflowId) => {
    socket.leave(`workflow:${workflowId}`);
    console.log(`👋 Client ${socket.id} left workflow: ${workflowId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = process.env.API_PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
});


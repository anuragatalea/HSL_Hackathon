import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { initSocket } from './socket.js';
import path from 'path';
import { schedulesRouter } from './routes/schedules.js';
import { tasksRouter } from './routes/tasks.js';
import { devicesRouter } from './routes/devices.js';
import { assistanceRouter } from './routes/assistance.js';
import { auditRouter } from './routes/audit.js';
import { locationsRouter } from './routes/locations.js';
import { residentsRouter } from './routes/residents.js';
import { activitiesRouter } from './routes/activities.js';
import { healthLogsRouter } from './routes/healthLogs.js';
import { mediaRouter } from './routes/media.js';
import { authRouter } from './routes/auth.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '15mb' }));

// Static file serving for uploads (local disk fallback)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'HSL Care Smart Rover API',
    roverMode: process.env.ROVER_MODE || 'HARDWARE',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/rover/auth', authRouter);
app.use('/api/rover/residents', residentsRouter);
app.use('/api/rover/activities', activitiesRouter);
app.use('/api/rover/health-logs', healthLogsRouter);
app.use('/api/rover/media', mediaRouter);
app.use('/api/rover/schedules', schedulesRouter);
app.use('/api/rover/tasks', tasksRouter);
app.use('/api/rover/devices', devicesRouter);
app.use('/api/rover/assistance', assistanceRouter);
app.use('/api/rover/logs', auditRouter);
app.use('/api/rover/locations', locationsRouter);


// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log('🤖 ==============================================================');
  console.log(`🤖 HSL CARE SMART ROVER — BACKEND API SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🤖 Real-time WebSocket: ws://localhost:${PORT}`);
  console.log(`🤖 Rover Operation Mode: ${process.env.ROVER_MODE || 'SIMULATION'}`);
  console.log('🤖 ==============================================================');
});

export { app, server };

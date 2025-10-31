// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';
import officeRoutes from './routes/offices';
import agentRoutes from './routes/agents';
import studentRoutes from './routes/students';
import courseRoutes from './routes/courses';
import applicationRoutes from './routes/applications';
import paymentRoutes from './routes/payments';
import notificationRoutes from './routes/notifications';
import chatRoutes from './routes/chats';
import announcementRoutes from './routes/announcements';
import metaRoutes from './routes/meta';
import learningResourceRoutes from './routes/learningResources';

// Import middleware
import errorHandler from './middlewares/errorHandler';

// Import database connection
import connectDB from './config/db';

// Import Socket.IO service
import SocketService from './services/socketService';
import { setSocketService } from './services/socketBus';


const app: Application = express();
const server = createServer(app);
const PORT: string | number = process.env.PORT || 5000;

// Initialize Socket.IO service
const socketService = new SocketService(server);
setSocketService(socketService);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS
app.use(cors());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Travel Agency Backend is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/learning-resources', learningResourceRoutes);

// 404 handler
app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`💬 Socket.IO server initialized for real-time chat`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
export { socketService };


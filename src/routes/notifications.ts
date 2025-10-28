import express from 'express';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications
} from '../controllers/notification';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// Routes
router.get('/', authenticateToken, getNotifications);
router.put('/:id/read', authenticateToken, markNotificationAsRead);
router.put('/read-all', authenticateToken, markAllNotificationsAsRead);
router.delete('/:id', authenticateToken, deleteNotification);
router.delete('/', authenticateToken, deleteAllNotifications);

export default router;


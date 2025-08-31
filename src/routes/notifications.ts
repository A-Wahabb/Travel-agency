import express from 'express';
import { body } from 'express-validator';
import {
    getNotifications,
    getNotification,
    createNotification,
    updateNotification,
    markAsRead,
    markAsUnread,
    deleteNotification,
    getUnreadCount
} from '../controllers/notification';
import {
    authenticateToken,
    authorizeAgent
} from '../middlewares/auth';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const createNotificationValidation = [
    body('officeId')
        .isMongoId()
        .withMessage('Invalid office ID'),
    body('agentId')
        .isMongoId()
        .withMessage('Invalid agent ID'),
    body('message')
        .isLength({ min: 1, max: 500 })
        .withMessage('Message must be between 1 and 500 characters'),
    body('title')
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters'),
    body('type')
        .isIn(['info', 'success', 'warning', 'error', 'payment', 'student', 'system'])
        .withMessage('Invalid notification type'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Please enter a valid date')
];

const updateNotificationValidation = [
    body('message')
        .optional()
        .isLength({ min: 1, max: 500 })
        .withMessage('Message must be between 1 and 500 characters'),
    body('title')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters'),
    body('type')
        .optional()
        .isIn(['info', 'success', 'warning', 'error', 'payment', 'student', 'system'])
        .withMessage('Invalid notification type'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Please enter a valid date')
];

// Routes
router.get('/', authenticateToken, authorizeAgent, getNotifications);
router.get('/unread/count', authenticateToken, authorizeAgent, getUnreadCount);
router.get('/:id', authenticateToken, authorizeAgent, getNotification);
router.post('/', authenticateToken, authorizeAgent, createNotificationValidation, validate, createNotification);
router.put('/:id', authenticateToken, authorizeAgent, updateNotificationValidation, validate, updateNotification);
router.put('/:id/read', authenticateToken, authorizeAgent, markAsRead);
router.put('/:id/unread', authenticateToken, authorizeAgent, markAsUnread);
router.delete('/:id', authenticateToken, authorizeAgent, deleteNotification);

export default router;


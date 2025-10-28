import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../types';

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { isRead, limit = '50' } = req.query;
        const limitNum = parseInt(limit as string);

        const query: any = { userId: req.user.id };

        if (isRead !== undefined) {
            query.isRead = isRead === 'true';
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum);

        const unreadCount = await Notification.countDocuments({
            userId: req.user.id,
            isRead: false
        });

        res.status(200).json({
            success: true,
            message: 'Notifications retrieved successfully',
            data: {
                notifications,
                unreadCount,
                total: notifications.length
            }
        });
    } catch (error: any) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { id } = req.params;

        const notification = await Notification.findOne({
            _id: id,
            userId: req.user.id
        });

        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
            return;
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error: any) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const result = await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { 
                isRead: true,
                readAt: new Date()
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} notifications marked as read`,
            data: {
                modifiedCount: result.modifiedCount
            }
        });
    } catch (error: any) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create notification (internal use)
// @route   POST /api/notifications
// @access  Private
export const createNotification = async (notificationData: {
    userId: string;
    type: string;
    title: string;
    message: string;
    applicationId?: string;
    studentId?: string;
    authorId?: string;
    authorName?: string;
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
}): Promise<any> => {
    try {
        const notification = new Notification({
            userId: notificationData.userId,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            applicationId: notificationData.applicationId,
            studentId: notificationData.studentId,
            authorId: notificationData.authorId,
            authorName: notificationData.authorName,
            priority: notificationData.priority || 'medium',
            metadata: notificationData.metadata,
            isRead: false
        });

        await notification.save();
        console.log(`✅ Notification created for user ${notificationData.userId}`);
        return notification;
    } catch (error) {
        console.error('Create notification error:', error);
        return null;
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId: req.user.id
        });

        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully',
            data: notification
        });
    } catch (error: any) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications
// @access  Private
export const deleteAllNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const result = await Notification.deleteMany({ userId: req.user.id });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} notifications deleted`,
            data: {
                deletedCount: result.deletedCount
            }
        });
    } catch (error: any) {
        console.error('Delete all notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

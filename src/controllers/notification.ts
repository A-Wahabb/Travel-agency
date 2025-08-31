import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { AuthenticatedRequest, CreateNotificationRequest, NotificationQuery } from '../types';

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Agent, Admin, SuperAdmin
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { page = '1', limit = '10', status = '', type = '', sortBy = 'createdAt', sortOrder = 'desc' }: NotificationQuery = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query based on role
        const query: any = {};

        if (req.user.role === 'Agent') {
            query.agentId = req.user.id;
        } else if (req.user.role === 'Admin') {
            query.officeId = req.user.officeId;
        }

        if (status) {
            query.status = status;
        }

        if (type) {
            query.type = type;
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const notifications = await Notification.find(query)
            .populate('officeId', 'name')
            .populate('agentId', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Notification.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Notifications retrieved successfully',
            data: notifications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Agent, Admin, SuperAdmin
export const getNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const notification = await Notification.findById(req.params.id)
            .populate('officeId', 'name')
            .populate('agentId', 'name email');

        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent' && notification.agentId.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        if (req.user.role === 'Admin' && notification.officeId.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Notification retrieved successfully',
            data: notification
        });
    } catch (error) {
        console.error('Get notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create notification
// @route   POST /api/notifications
// @access  Agent, Admin, SuperAdmin
export const createNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { officeId, agentId, message, title, type, priority, expiresAt }: CreateNotificationRequest = req.body;

        // Validate access permissions
        if (req.user.role === 'Agent') {
            if (agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Can only create notifications for yourself'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            if (officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Can only create notifications for your own office'
                });
                return;
            }
        }

        const notification = await Notification.create({
            officeId,
            agentId,
            message,
            title,
            type,
            priority,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });

        await notification.populate('officeId', 'name');
        await notification.populate('agentId', 'name email');

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            data: notification
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update notification
// @route   PUT /api/notifications/:id
// @access  Agent, Admin, SuperAdmin
export const updateNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { message, title, type, priority, expiresAt } = req.body;

        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent' && notification.agentId.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        if (req.user.role === 'Admin' && notification.officeId.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Update fields
        if (message) notification.message = message;
        if (title) notification.title = title;
        if (type) notification.type = type;
        if (priority) notification.priority = priority;
        if (expiresAt) notification.expiresAt = new Date(expiresAt);

        await notification.save();
        await notification.populate('officeId', 'name');
        await notification.populate('agentId', 'name email');

        res.status(200).json({
            success: true,
            message: 'Notification updated successfully',
            data: notification
        });
    } catch (error) {
        console.error('Update notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Agent, Admin, SuperAdmin
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent' && notification.agentId.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        if (req.user.role === 'Admin' && notification.officeId.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        await notification.markAsRead();

        res.status(200).json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Mark notification as unread
// @route   PUT /api/notifications/:id/unread
// @access  Agent, Admin, SuperAdmin
export const markAsUnread = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent' && notification.agentId.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        if (req.user.role === 'Admin' && notification.officeId.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        await notification.markAsUnread();

        res.status(200).json({
            success: true,
            message: 'Notification marked as unread'
        });
    } catch (error) {
        console.error('Mark as unread error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Agent, Admin, SuperAdmin
export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent' && notification.agentId.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        if (req.user.role === 'Admin' && notification.officeId.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        await Notification.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread/count
// @access  Agent, Admin, SuperAdmin
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Build query based on role
        const query: any = { status: 'unread' };

        if (req.user.role === 'Agent') {
            query.agentId = req.user.id;
        } else if (req.user.role === 'Admin') {
            query.officeId = req.user.officeId;
        }

        const count = await Notification.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Unread count retrieved successfully',
            data: { count }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Announcement from '../models/Announcement';
import Agent from '../models/Agent';
import Notification from '../models/Notification';
import { getSocketService } from '../services/socketBus';

export const createAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }

        const { message, title, officeIds, startsAt, endsAt, audienceRoles } = req.body as {
            message: string;
            title?: string;
            officeIds: string[];
            startsAt: string;
            endsAt: string;
            audienceRoles?: Array<'Admin' | 'Agent'>;
        };

        if (!message || !officeIds || !startsAt || !endsAt) {
            res.status(400).json({ success: false, message: 'message, officeIds, startsAt, and endsAt are required' });
            return;
        }

        // Admins can only create for their own office
        if (req.user.role === 'Admin') {
            if (!req.user.officeId) {
                res.status(400).json({ success: false, message: 'Admin must have an officeId' });
                return;
            }
            const onlyOwnOffice = officeIds.length === 1 && officeIds[0] === req.user.officeId;
            if (!onlyOwnOffice) {
                res.status(403).json({ success: false, message: 'Admins can only create announcements for their own office' });
                return;
            }
        }

        const starts = new Date(startsAt);
        const ends = new Date(endsAt);
        if (isNaN(starts.getTime()) || isNaN(ends.getTime()) || starts >= ends) {
            res.status(400).json({ success: false, message: 'Invalid time window' });
            return;
        }

        const announcement = await Announcement.create({
            message,
            title,
            officeIds,
            startsAt: starts,
            endsAt: ends,
            audienceRoles: audienceRoles && audienceRoles.length ? audienceRoles : ['Admin', 'Agent'],
            createdBy: req.user.id,
            createdByRole: req.user.role as 'SuperAdmin' | 'Admin'
        });

        // Create notifications for targeted users
        const rolesToNotify = announcement.audienceRoles;
        const agents = await Agent.find({
            role: { $in: rolesToNotify },
            officeId: { $in: announcement.officeIds },
            isActive: true
        }).select('_id name role officeId');

        const titleText = announcement.title || 'New Announcement';
        const messageText = `You have new Announcement: ${announcement.message}`;
        const notifications = agents.map(a => ({
            userId: a._id.toString(),
            type: 'info',
            title: titleText,
            message: messageText,
            isRead: false,
            metadata: {
                announcementId: announcement._id.toString(),
                startsAt: announcement.startsAt,
                endsAt: announcement.endsAt,
                officeIds: announcement.officeIds
            }
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        // Emit real-time event to targeted users
        const socket = getSocketService();
        if (socket && agents.length > 0) {
            const userIds = agents.map(a => a._id.toString());
            socket.sendNotificationToUsers(userIds, {
                type: 'announcement:new',
                title: titleText,
                message: messageText,
                announcement: {
                    _id: announcement._id,
                    title: announcement.title,
                    message: announcement.message,
                    startsAt: announcement.startsAt,
                    endsAt: announcement.endsAt,
                    officeIds: announcement.officeIds,
                    audienceRoles: announcement.audienceRoles
                },
                timestamp: new Date()
            });
        }

        res.status(201).json({ success: true, message: 'Announcement created', data: announcement });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const getActiveAnnouncements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }

        const now = new Date();
        const officeFilter = req.user.role === 'SuperAdmin' ? {} : { officeIds: { $in: [req.user.officeId] } };
        const audienceFilter = req.user.role === 'SuperAdmin' ? {} : { audienceRoles: { $in: [req.user.role] } };

        const announcements = await Announcement.find({
            startsAt: { $lte: now },
            endsAt: { $gte: now },
            ...(officeFilter as any),
            ...(audienceFilter as any)
        }).sort({ startsAt: -1 });

        res.status(200).json({ success: true, message: 'Active announcements', data: announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const updateAnnouncementTimeWindow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }

        const { id } = req.params;
        const { startsAt, endsAt } = req.body as { startsAt?: string; endsAt?: string };

        const announcement = await Announcement.findById(id);
        if (!announcement) {
            res.status(404).json({ success: false, message: 'Announcement not found' });
            return;
        }

        // Permission: SuperAdmin can edit any; Admin can edit only their office announcements
        if (req.user.role === 'Admin') {
            if (!req.user.officeId || !announcement.officeIds.includes(req.user.officeId)) {
                res.status(403).json({ success: false, message: 'Access denied' });
                return;
            }
        }

        const nextStarts = startsAt ? new Date(startsAt) : announcement.startsAt;
        const nextEnds = endsAt ? new Date(endsAt) : announcement.endsAt;
        if (isNaN(nextStarts.getTime()) || isNaN(nextEnds.getTime()) || nextStarts >= nextEnds) {
            res.status(400).json({ success: false, message: 'Invalid time window' });
            return;
        }

        announcement.startsAt = nextStarts;
        announcement.endsAt = nextEnds;
        await announcement.save();

        res.status(200).json({ success: true, message: 'Time window updated', data: announcement });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const listAnnouncements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }

        const officeId = req.query.officeId as string | undefined;
        const filter: any = {};
        if (req.user.role === 'Admin') {
            filter.officeIds = req.user.officeId;
        } else if (officeId) {
            filter.officeIds = officeId;
        }

        const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: 'Announcements', data: announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const deleteAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }

        const { id } = req.params;
        const announcement = await (await Announcement.findById(id));
        if (!announcement) {
            res.status(404).json({ success: false, message: 'Announcement not found' });
            return;
        }

        // Only SuperAdmin can delete
        if (req.user.role !== 'SuperAdmin') {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        await Announcement.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};



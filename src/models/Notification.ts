import mongoose, { Schema, Document } from 'mongoose';
import { INotification } from '../types';

export interface INotificationDocument extends INotification, Document { }

const notificationSchema = new Schema<INotificationDocument>({
    officeId: {
        type: String,
        required: [true, 'officeId:Office ID is required']
    },
    agentId: {
        type: String,
        required: [true, 'agentId:Agent ID is required']
    },
    message: {
        type: String,
        required: [true, 'message:Message is required'],
        trim: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    title: {
        type: String,
        required: [true, 'title:Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'payment', 'student', 'system'],
        default: 'info'
    },
    status: {
        type: String,
        enum: ['unread', 'read'],
        default: 'unread'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    readAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function (): Promise<void> {
    this.status = 'read';
    this.readAt = new Date();
    await this.save();
};

// Method to mark notification as unread
notificationSchema.methods.markAsUnread = async function (): Promise<void> {
    this.status = 'unread';
    this.readAt = undefined;
    await this.save();
};

export default mongoose.model<INotificationDocument>('Notification', notificationSchema);


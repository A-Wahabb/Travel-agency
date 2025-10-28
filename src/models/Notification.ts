import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    userId: string;
    type: 'comment_notification' | 'application_notification' | 'system' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    isRead: boolean;
    readAt?: Date;
    applicationId?: string;
    studentId?: string;
    authorId?: string;
    authorName?: string;
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
    userId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['comment_notification', 'application_notification', 'system', 'info', 'warning', 'error'],
        default: 'info'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    applicationId: {
        type: String
    },
    studentId: {
        type: String
    },
    authorId: {
        type: String
    },
    authorName: {
        type: String
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    metadata: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);

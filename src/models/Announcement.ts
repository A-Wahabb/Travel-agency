import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
    message: string;
    title?: string;
    officeIds: string[]; // Targeted offices; for Admin this must be their own office
    audienceRoles: Array<'Admin' | 'Agent'>; // Who should see it
    startsAt: Date;
    endsAt: Date;
    createdBy: string; // Agent ID
    createdByRole: 'SuperAdmin' | 'Admin';
    createdAt: Date;
    updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>({
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    title: {
        type: String,
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    officeIds: {
        type: [String],
        required: true,
        validate: [(arr: string[]) => Array.isArray(arr) && arr.length > 0, 'At least one office required']
    },
    audienceRoles: {
        type: [String],
        enum: ['Admin', 'Agent'],
        default: ['Admin', 'Agent']
    },
    startsAt: {
        type: Date,
        required: true
    },
    endsAt: {
        type: Date,
        required: true
    },
    createdBy: {
        type: String,
        required: true
    },
    createdByRole: {
        type: String,
        enum: ['SuperAdmin', 'Admin'],
        required: true
    }
}, {
    timestamps: true
});

announcementSchema.index({ startsAt: 1, endsAt: 1 });
announcementSchema.index({ officeIds: 1 });

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);




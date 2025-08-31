import mongoose, { Schema, Document } from 'mongoose';
import { IOffice } from '../types';

export interface IOfficeDocument extends IOffice, Document { }

const officeSchema = new Schema<IOfficeDocument>({
    name: {
        type: String,
        required: [true, 'Office name is required'],
        trim: true,
        maxlength: [100, 'Office name cannot exceed 100 characters']
    },
    address: {
        type: String,
        required: [true, 'Office address is required'],
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters']
    },
    createdBy: {
        type: String,
        required: [true, 'Created by field is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for agent count
officeSchema.virtual('agentCount', {
    ref: 'Agent',
    localField: '_id',
    foreignField: 'officeId',
    count: true
});

// Virtual for student count
officeSchema.virtual('studentCount', {
    ref: 'Student',
    localField: '_id',
    foreignField: 'officeId',
    count: true
});

export default mongoose.model<IOfficeDocument>('Office', officeSchema);


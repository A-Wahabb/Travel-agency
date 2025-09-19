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
    location: {
        type: String,
        trim: true,
        maxlength: [1000, 'Location cannot exceed 1000 characters'],
        validate: {
            validator: function (value: string) {
                if (!value) return true; // Optional field
                // Allow Google Maps links, coordinates, or other location formats
                const urlPattern = /^https?:\/\/.+/;
                const coordinatePattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
                return urlPattern.test(value) || coordinatePattern.test(value) || value.length > 0;
            },
            message: 'Location must be a valid URL, coordinates, or location description'
        }
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


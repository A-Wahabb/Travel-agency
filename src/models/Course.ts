import mongoose, { Schema, Document } from 'mongoose';
import { ICourse } from '../types';

export interface ICourseDocument extends ICourse, Document { }

const courseSchema = new Schema<ICourseDocument>({
    name: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true,
        maxlength: [200, 'Course name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    duration: {
        type: String,
        required: [true, 'Course duration is required'],
        trim: true,
        maxlength: [100, 'Duration cannot exceed 100 characters']
    },
    level: {
        type: String,
        required: [true, 'Course level is required'],
        enum: ['certificate', 'diploma', 'bachelor', 'master', 'phd', 'other'],
        default: 'other'
    },
    field: {
        type: String,
        required: [true, 'Course field is required'],
        trim: true,
        maxlength: [100, 'Field cannot exceed 100 characters']
    },
    university: {
        type: String,
        required: [true, 'University name is required'],
        trim: true,
        maxlength: [200, 'University name cannot exceed 200 characters']
    },
    country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        maxlength: [100, 'Country cannot exceed 100 characters']
    },
    tuitionFee: {
        type: Number,
        required: [true, 'Tuition fee is required'],
        min: [0, 'Tuition fee cannot be negative']
    },
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        trim: true,
        maxlength: [10, 'Currency cannot exceed 10 characters'],
        default: 'USD'
    },
    requirements: [{
        type: String,
        trim: true,
        maxlength: [500, 'Requirement cannot exceed 500 characters']
    }],
    intakeMonths: [{
        type: String,
        enum: ['january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december']
    }],
    languageRequirements: {
        ielts: {
            minScore: {
                type: Number,
                min: 0,
                max: 9
            },
            required: {
                type: Boolean,
                default: false
            }
        },
        toefl: {
            minScore: {
                type: Number,
                min: 0,
                max: 120
            },
            required: {
                type: Boolean,
                default: false
            }
        },
        other: {
            type: String,
            trim: true,
            maxlength: [200, 'Other language requirements cannot exceed 200 characters']
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        required: [true, 'Created by field is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for student count enrolled in this course
courseSchema.virtual('studentCount', {
    ref: 'Student',
    localField: '_id',
    foreignField: 'courseId',
    count: true
});

// Index for better search performance
courseSchema.index({ name: 'text', description: 'text', field: 'text', university: 'text' });
courseSchema.index({ country: 1, field: 1, level: 1 });
courseSchema.index({ isActive: 1 });

export default mongoose.model<ICourseDocument>('Course', courseSchema);


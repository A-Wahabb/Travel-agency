import mongoose, { Schema, Document } from 'mongoose';
import { ICourse } from '../types';

export interface ICourseDocument extends ICourse, Document { }

const courseSchema = new Schema<ICourseDocument>({
    name: {
        type: String,
        required: [true, 'name:Course name is required'],
        trim: true,
        maxlength: [200, 'Course name cannot exceed 200 characters']
    },
    university: {
        type: String,
        required: [true, 'university:University name is required'],
        trim: true,
        maxlength: [200, 'University name cannot exceed 200 characters']
    },
    department: {
        type: String,
        required: [true, 'department:Department is required'],
        trim: true,
        maxlength: [100, 'Department cannot exceed 100 characters']
    },
    country: {
        type: String,
        required: [true, 'country:Country is required'],
        trim: true,
        maxlength: [100, 'Country cannot exceed 100 characters']
    },
    city: {
        type: String,
        required: [true, 'city:City is required'],
        trim: true,
        maxlength: [100, 'City cannot exceed 100 characters']
    },
    intake: {
        type: String,
        required: [true, 'intake:Intake is required'],
        trim: true,
        maxlength: [50, 'Intake cannot exceed 50 characters']
    },
    isPrivate: {
        type: String,
        required: [true, 'isPrivate:IsPrivate field is required'],
        enum: ['Yes', 'No'],
        default: 'No'
    },
    type: {
        type: String,
        required: [true, 'type:Course type is required'],
        trim: true,
        maxlength: [50, 'Course type cannot exceed 50 characters']
    },
    fee: {
        type: String,
        required: [true, 'fee:Fee is required'],
        trim: true,
        maxlength: [50, 'Fee cannot exceed 50 characters']
    },
    timePeriod: {
        type: String,
        required: [true, 'timePeriod:Time period is required'],
        trim: true,
        maxlength: [50, 'Time period cannot exceed 50 characters']
    },
    percentageRequirement: {
        type: String,
        required: [true, 'percentageRequirement:Percentage requirement is required'],
        trim: true,
        maxlength: [10, 'Percentage requirement cannot exceed 10 characters']
    },
    cgpaRequirement: {
        type: String,
        required: [true, 'cgpaRequirement:CGPA requirement is required'],
        trim: true,
        maxlength: [10, 'CGPA requirement cannot exceed 10 characters']
    },
    languageTest: {
        type: String,
        required: [true, 'languageTest:Language test requirement is required'],
        trim: true,
        maxlength: [100, 'Language test requirement cannot exceed 100 characters']
    },
    minBands: {
        type: String,
        required: [true, 'minBands:Minimum bands requirement is required'],
        trim: true,
        maxlength: [50, 'Minimum bands requirement cannot exceed 50 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        required: [true, 'createdBy:Created by field is required']
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
courseSchema.index({ name: 'text', university: 'text', department: 'text' });
courseSchema.index({ country: 1, city: 1, type: 1 });
courseSchema.index({ isActive: 1 });

export default mongoose.model<ICourseDocument>('Course', courseSchema);


import mongoose, { Schema, Document } from 'mongoose';
import { IApplication, IApplicationComment } from '../types';

export interface IApplicationDocument extends IApplication, Document { }

// Comment schema for applications
const applicationCommentSchema = new Schema<IApplicationComment>({
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        trim: true,
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    authorId: {
        type: String,
        required: [true, 'Author ID is required'],
        ref: 'Agent'
    },
    authorName: {
        type: String,
        required: [true, 'Author name is required'],
        trim: true,
        maxlength: [100, 'Author name cannot exceed 100 characters']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const applicationSchema = new Schema<IApplicationDocument>({
    applicationNumber: {
        type: String,
        required: [true, 'Application number is required'],
        unique: true,
        trim: true,
        maxlength: [20, 'Application number cannot exceed 20 characters']
    },
    studentId: {
        type: String,
        required: [true, 'Student ID is required'],
        ref: 'Student'
    },
    courseId: {
        type: String,
        required: [true, 'Course ID is required'],
        ref: 'Course'
    },
    status: {
        type: String,
        enum: ['pending', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'],
        default: 'pending'
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    submissionDate: {
        type: Date
    },
    reviewDate: {
        type: Date
    },
    decisionDate: {
        type: Date
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    documents: [{
        filename: {
            type: String,
            required: true
        },
        originalName: {
            type: String,
            required: true
        },
        path: {
            type: String,
            required: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        documentType: {
            type: String,
            enum: ['application_form', 'transcript', 'recommendation', 'essay', 'portfolio', 'other'],
            default: 'other'
        },
        s3Key: {
            type: String,
            required: false
        },
        s3Url: {
            type: String,
            required: false
        },
        size: {
            type: Number,
            required: false
        },
        mimetype: {
            type: String,
            required: false
        }
    }],
    comments: [applicationCommentSchema],
    createdBy: {
        type: String,
        required: [true, 'Created by field is required'],
        ref: 'Agent'
    },
    updatedBy: {
        type: String,
        ref: 'Agent'
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

// Virtual for student information
applicationSchema.virtual('student', {
    ref: 'Student',
    localField: 'studentId',
    foreignField: '_id',
    justOne: true
});

// Virtual for course information
applicationSchema.virtual('course', {
    ref: 'Course',
    localField: 'courseId',
    foreignField: '_id',
    justOne: true
});

// Virtual for creator information
applicationSchema.virtual('creator', {
    ref: 'Agent',
    localField: 'createdBy',
    foreignField: '_id',
    justOne: true
});

// Virtual for updater information
applicationSchema.virtual('updater', {
    ref: 'Agent',
    localField: 'updatedBy',
    foreignField: '_id',
    justOne: true
});

// Indexes for better search performance
applicationSchema.index({ applicationNumber: 1 }, { unique: true });
applicationSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
applicationSchema.index({ status: 1 });
applicationSchema.index({ applicationDate: -1 });
applicationSchema.index({ priority: 1 });
applicationSchema.index({ createdBy: 1 });
applicationSchema.index({ isActive: 1 });

// Compound indexes for common queries
applicationSchema.index({ studentId: 1, status: 1 });
applicationSchema.index({ courseId: 1, status: 1 });
applicationSchema.index({ createdBy: 1, status: 1 });

// Text search index
applicationSchema.index({ 
    notes: 'text',
    'comments.content': 'text'
});

export default mongoose.model<IApplicationDocument>('Application', applicationSchema);

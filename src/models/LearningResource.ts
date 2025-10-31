import mongoose, { Schema, Document } from 'mongoose';
import { ILearningResource } from '../types';

export interface ILearningResourceDocument extends ILearningResource, Document { }

const learningResourceFileSchema = new Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    s3Key: {
        type: String,
        required: true
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
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    uploadedBy: {
        type: String,
        required: true
    }
}, { _id: true });

const learningResourceSchema = new Schema<ILearningResourceDocument>({
    country: {
        type: String,
        required: [true, 'country:Country is required'],
        trim: true,
        unique: true,
        maxlength: [100, 'Country name cannot exceed 100 characters']
    },
    files: {
        type: [learningResourceFileSchema],
        validate: {
            validator: function(files: any[]) {
                return files.length <= 2;
            },
            message: 'Maximum 2 files allowed per country'
        },
        default: []
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for better query performance
learningResourceSchema.index({ country: 1 });

export default mongoose.model<ILearningResourceDocument>('LearningResource', learningResourceSchema);


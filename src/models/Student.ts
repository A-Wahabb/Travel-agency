import mongoose, { Schema, Document } from 'mongoose';
import { IStudent, IDocument } from '../types';
import { hashPassword } from '../config/auth';

export interface IStudentDocument extends IStudent, Document { }

const documentSchema = new Schema<IDocument>({
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
        enum: ['passport', 'visa', 'certificate', 'other'],
        default: 'other'
    }
});

const studentSchema = new Schema<IStudentDocument>({
    name: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    officeId: {
        type: String,
        required: [true, 'Office ID is required']
    },
    agentId: {
        type: String,
        required: [true, 'Agent ID is required']
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    dateOfBirth: {
        type: Date
    },
    nationality: {
        type: String,
        trim: true,
        maxlength: [50, 'Nationality cannot exceed 50 characters']
    },
    passportNumber: {
        type: String,
        trim: true,
        maxlength: [50, 'Passport number cannot exceed 50 characters']
    },
    documents: [documentSchema],
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'completed'],
        default: 'active'
    },
    studentOptions: {
        clients: {
            type: Boolean,
            default: false
        },
        initialPayment: {
            type: Boolean,
            default: false
        },
        documents: {
            type: Boolean,
            default: false
        },
        applications: {
            type: Boolean,
            default: false
        },
        offerLetterSecured: {
            type: Boolean,
            default: false
        },
        secondPaymentDone: {
            type: Boolean,
            default: false
        },
        visaApplication: {
            type: Boolean,
            default: false
        },
        visaSecured: {
            type: Boolean,
            default: false
        },
        finalPayment: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total paid amount
studentSchema.virtual('totalPaid', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'studentId',
    pipeline: [
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ],
    justOne: true
});

// Virtual for total amount (all payments)
studentSchema.virtual('totalAmount', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'studentId',
    pipeline: [
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ],
    justOne: true
});

// Hash password before saving
studentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        this.password = await hashPassword(this.password);
        next();
    } catch (error) {
        next(error as Error);
    }
});

export default mongoose.model<IStudentDocument>('Student', studentSchema);


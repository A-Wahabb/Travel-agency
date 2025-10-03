import mongoose, { Schema, Document } from 'mongoose';
import { IStudent, IDocument, IStudentDocuments } from '../types';
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
});

// Schema for student documents with specific fields
const studentDocumentsSchema = new Schema<IStudentDocuments>({
    profilePicture: documentSchema,
    matricCertificate: documentSchema,
    matricMarksSheet: documentSchema,
    intermediateCertificate: documentSchema,
    intermediateMarkSheet: documentSchema,
    degree: documentSchema,
    transcript: documentSchema,
    languageCertificate: documentSchema,
    passport: documentSchema,
    experienceLetter: documentSchema,
    birthCertificate: documentSchema,
    familyRegistration: documentSchema,
    otherDocs: [documentSchema]
}, { _id: false });

const studentSchema = new Schema<IStudentDocument>({
    studentCode: {
        type: String,
        required: [true, 'Student code is required'],
        unique: true,
        trim: true,
        maxlength: [50, 'Student code cannot exceed 50 characters']
    },
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
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    officeId: {
        type: String,
        required: [true, 'Office ID is required']
    },
    agentId: {
        type: String,
        required: [true, 'Agent ID is required']
    },
    courseId: {
        type: String,
        ref: 'Course'
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
    studentDocuments: studentDocumentsSchema,
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'completed'],
        default: 'active'
    },

    // Academic Information
    qualification: {
        type: String,
        required: [true, 'Qualification is required'],
        trim: true,
        maxlength: [200, 'Qualification cannot exceed 200 characters']
    },
    score: {
        type: Number,
        required: [true, 'Score is required'],
        min: [0, 'Score cannot be negative'],
        max: [1000, 'Score cannot exceed 1000']
    },
    percentage: {
        type: Number,
        required: [true, 'Percentage is required'],
        min: [0, 'Percentage cannot be negative'],
        max: [100, 'Percentage cannot exceed 100']
    },
    lastInstitute: {
        type: String,
        required: [true, 'Last institute is required'],
        trim: true,
        maxlength: [200, 'Last institute cannot exceed 200 characters']
    },
    experience: {
        type: String,
        required: [true, 'Experience is required'],
        trim: true,
        maxlength: [500, 'Experience cannot exceed 500 characters']
    },
    test: {
        type: String,
        required: [true, 'Test is required'],
        trim: true,
        maxlength: [100, 'Test cannot exceed 100 characters']
    },
    testScore: {
        type: Number,
        required: [true, 'Test score is required'],
        min: [0, 'Test score cannot be negative'],
        max: [1000, 'Test score cannot exceed 1000']
    },

    // Attestation Status
    boardAttestation: {
        type: String,
        required: [true, 'Board attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },
    ibccAttestation: {
        type: String,
        required: [true, 'IBCC attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },
    hecAttestation: {
        type: String,
        required: [true, 'HEC attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },
    mofaAttestation: {
        type: String,
        required: [true, 'MOFA attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },
    apostilleAttestation: {
        type: String,
        required: [true, 'Apostille attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },

    // Country Preferences
    country1: {
        type: String,
        required: [true, 'Primary country preference is required'],
        trim: true,
        maxlength: [100, 'Country name cannot exceed 100 characters']
    },
    country2: {
        type: String,
        required: [true, 'Secondary country preference is required'],
        trim: true,
        maxlength: [100, 'Country name cannot exceed 100 characters']
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


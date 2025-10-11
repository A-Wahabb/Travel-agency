import mongoose, { Schema, Document } from 'mongoose';
import { IStudent, IDocument, IStudentDocuments } from '../types';

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
        required: [true, 'studentCode:Student code is required'],
        unique: true,
        trim: true,
        maxlength: [50, 'Student code cannot exceed 50 characters']
    },
    name: {
        type: String,
        required: [true, 'name:Student name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'email:Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    countryCode: {
        type: String,
        required: [true, 'countryCode:Country code is required'],
        trim: true,
        match: [/^\+?[1-9]\d{0,3}$/, 'Please enter a valid country code (e.g., +1, +92, +44)']
    },
    phoneNumber: {
        type: String,
        required: [true, 'phoneNumber:Phone number is required'],
        trim: true,
        match: [/^[0-9]{6,15}$/, 'Please enter a valid phone number (6-15 digits)']
    },
    officeId: {
        type: String,
        required: [true, 'officeId:Office ID is required']
    },
    agentId: {
        type: String,
        required: [true, 'agentId:Agent ID is required']
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
        required: [true, 'qualification:Qualification is required'],
        trim: true,
        maxlength: [200, 'Qualification cannot exceed 200 characters']
    },
    score: {
        type: Number,
        required: [true, 'score:Score is required'],
        min: [0, 'Score cannot be negative'],
        max: [1000, 'Score cannot exceed 1000']
    },
    percentage: {
        type: Number,
        required: [true, 'percentage:Percentage is required'],
        min: [0, 'Percentage cannot be negative'],
        max: [100, 'Percentage cannot exceed 100']
    },
    lastInstitute: {
        type: String,
        required: [true, 'lastInstitute:Last institute is required'],
        trim: true,
        maxlength: [200, 'Last institute cannot exceed 200 characters']
    },
    experience: {
        type: String,
        required: [true, 'experience:Experience is required'],
        trim: true,
        maxlength: [500, 'Experience cannot exceed 500 characters']
    },
    test: {
        type: String,
        required: [true, 'test:Test is required'],
        trim: true,
        maxlength: [100, 'Test cannot exceed 100 characters']
    },
    testScore: {
        type: Number,
        required: [true, 'testScore:Test score is required'],
        min: [0, 'Test score cannot be negative'],
        max: [1000, 'Test score cannot exceed 1000']
    },

    // Attestation Status
    boardAttestation: {
        type: String,
        required: [true, 'boardAttestation:Board attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },
    ibccAttestation: {
        type: String,
        required: [true, 'ibccAttestation:IBCC attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },
    hecAttestation: {
        type: String,
        required: [true, 'hecAttestation:HEC attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },
    mofaAttestation: {
        type: String,
        required: [true, 'mofaAttestation:MOFA attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },
    apostilleAttestation: {
        type: String,
        required: [true, 'apostilleAttestation:Apostille attestation status is required'],
        enum: ['Yes', 'No', 'Partial'],
        default: 'No'
    },

    // Country Preferences
    country1: {
        type: String,
        required: [true, 'country1:Primary country preference is required'],
        trim: true,
        maxlength: [100, 'Country name cannot exceed 100 characters']
    },
    country2: {
        type: String,
        required: [true, 'country2:Secondary country preference is required'],
        trim: true,
        maxlength: [100, 'Country name cannot exceed 100 characters']
    },
    studentOptions: {
        clients: {
            type: Boolean,
            default: false
        },
        clientsComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        initialPayment: {
            type: Boolean,
            default: false
        },
        initialPaymentComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        documents: {
            type: Boolean,
            default: false
        },
        documentsComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        applications: {
            type: Boolean,
            default: false
        },
        applicationsComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        offerLetterSecured: {
            type: Boolean,
            default: false
        },
        offerLetterSecuredComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        secondPaymentDone: {
            type: Boolean,
            default: false
        },
        secondPaymentDoneComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        visaApplication: {
            type: Boolean,
            default: false
        },
        visaApplicationComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        visaSecured: {
            type: Boolean,
            default: false
        },
        visaSecuredComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
        },
        finalPayment: {
            type: Boolean,
            default: false
        },
        finalPaymentComment: {
            type: String,
            default: '',
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters']
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

export default mongoose.model<IStudentDocument>('Student', studentSchema);


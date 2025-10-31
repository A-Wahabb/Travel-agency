import { Request } from 'express';
import { Document } from 'mongoose';

// User roles
export type UserRole = 'SuperAdmin' | 'Admin' | 'Agent';

// Base document interface
export interface BaseDocument extends Document {
    createdAt: Date;
    updatedAt: Date;
}

// Office interface
export interface IOffice extends BaseDocument {
    name: string;
    address: string;
    location?: string; // Can contain Google Maps link or pin location coordinates
    createdBy: string;
    isActive: boolean;
    agentCount?: number;
    studentCount?: number;
}

// Agent interface
export interface IAgent extends BaseDocument {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    officeId?: string;
    phone?: string;
    isActive: boolean;
    isGhost?: boolean;
    lastLogin?: Date;
    refreshTokens?: Array<{
        token: string;
        createdAt: Date;
        expiresAt: Date;
    }>;
}

// Course interface
export interface ICourse extends BaseDocument {
    name: string;
    university: string;
    department: string;
    country: string;
    city: string;
    intake: string;
    isPrivate: 'Yes' | 'No';
    openAdmission: boolean;
    type: string;
    fee: string;
    timePeriod: string;
    percentageRequirement: string;
    cgpaRequirement: string;
    languageTest: string;
    minBands: string;
    isActive: boolean;
    createdBy: string;
    studentCount?: number;
}

// Student interface
export interface IStudent extends BaseDocument {
    studentCode: string;
    name: string;
    email: string;
    countryCode: string;
    phoneNumber: string;
    officeId: string;
    agentId: string;
    courseId?: string;
    dateOfBirth?: Date;
    nationality?: string;
    passportNumber?: string;
    documents: IDocument[];
    studentDocuments?: IStudentDocuments;
    status: 'active' | 'inactive' | 'pending' | 'completed';
    totalPaid?: number;
    totalAmount?: number;

    // Academic Information
    qualification: string;
    score: number;
    percentage: number;
    lastInstitute: string;
    experience: string;
    test: string;
    testScore: number;

    // Attestation Status
    boardAttestation: 'Yes' | 'No' | 'Partial';
    ibccAttestation: 'Yes' | 'No' | 'Partial';
    hecAttestation: 'Yes' | 'No' | 'Partial';
    mofaAttestation: 'Yes' | 'No' | 'Partial';
    apostilleAttestation: 'Yes' | 'No' | 'Partial';

    // Country Preferences
    country1: string;
    country2: string;

    // Student application stages/options
    studentOptions: {
        clients: boolean;
        clientsComment?: string;
        initialPayment: boolean;
        initialPaymentComment?: string;
        documents: boolean;
        documentsComment?: string;
        applications: boolean;
        applicationsComment?: string;
        offerLetterSecured: boolean;
        offerLetterSecuredComment?: string;
        secondPaymentDone: boolean;
        secondPaymentDoneComment?: string;
        visaApplication: boolean;
        visaApplicationComment?: string;
        visaSecured: boolean;
        visaSecuredComment?: string;
        finalPayment: boolean;
        finalPaymentComment?: string;
    };
}

// Document interface
export interface IDocument {
    filename: string;
    originalName: string;
    path: string;
    uploadedAt: Date;
    documentType: 'passport' | 'visa' | 'certificate' | 'other';
    s3Key?: string;
    s3Url?: string;
    size?: number;
    mimetype?: string;
}

// Specific document types for student documents
export type StudentDocumentType =
    | 'profilePicture'
    | 'matricCertificate'
    | 'matricMarksSheet'
    | 'intermediateCertificate'
    | 'intermediateMarkSheet'
    | 'degree'
    | 'transcript'
    | 'languageCertificate'
    | 'passport'
    | 'recommendationLetter1'
    | 'recommendationLetter2'
    | 'experienceLetter'
    | 'birthCertificate'
    | 'familyRegistration'
    | 'otherDocs';

// Student documents interface
export interface IStudentDocuments {
    profilePicture?: IDocument;
    matricCertificate?: IDocument;
    matricMarksSheet?: IDocument;
    intermediateCertificate?: IDocument;
    intermediateMarkSheet?: IDocument;
    degree?: IDocument;
    transcript?: IDocument;
    languageCertificate?: IDocument;
    passport?: IDocument;
    recommendationLetter1?: IDocument;
    recommendationLetter2?: IDocument;
    experienceLetter?: IDocument;
    birthCertificate?: IDocument;
    familyRegistration?: IDocument;
    otherDocs?: IDocument[];
}

// Payment interface
export interface IPayment extends BaseDocument {
    studentId: string;
    amount: number;
    date: Date;
    createdBy: string;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    receiptNumber?: string;
    notes?: string;
}

// Notification interface
export interface INotification extends BaseDocument {
    officeId: string;
    agentId: string;
    message: string;
    title: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'payment' | 'student' | 'system';
    status: 'unread' | 'read';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    readAt?: Date;
    expiresAt?: Date;
    markAsRead(): Promise<void>;
    markAsUnread(): Promise<void>;
}

// JWT payload interface
export interface JWTPayload {
    userId: string;
    role: UserRole;
    officeId?: string;
    iat: number;
    exp: number;
}

// Extended Request interface with user
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: UserRole;
        officeId?: string;
    };
}

// API Response interfaces
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errors?: any[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Pagination interface
export interface PaginationQuery {
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// Notification query interface
export interface NotificationQuery extends PaginationQuery {
    status?: string;
    type?: string;
}

// File upload interface
export interface FileUpload {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
}

// Validation error interface
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

// Login request interface
export interface LoginRequest {
    email: string;
    password: string;
}

// Refresh token request interface
export interface RefreshTokenRequest {
    refreshToken: string;
}

// Create/Update interfaces
export interface CreateOfficeRequest {
    name: string;
    address: string;
    location?: string;
}

export interface CreateAgentRequest {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    officeId?: string;
    phone?: string;
}

export interface CreateStudentRequest {
    studentCode: string;
    name: string;
    email: string;
    countryCode: string;
    phoneNumber: string;
    officeId?: string;
    agentId?: string;
    dateOfBirth?: string;
    nationality?: string;
    passportNumber?: string;

    // Academic Information
    qualification: string;
    score: number;
    percentage: number;
    lastInstitute: string;
    experience: string;
    test: string;
    testScore: number;

    // Attestation Status
    boardAttestation: 'Yes' | 'No' | 'Partial';
    ibccAttestation: 'Yes' | 'No' | 'Partial';
    hecAttestation: 'Yes' | 'No' | 'Partial';
    mofaAttestation: 'Yes' | 'No' | 'Partial';
    apostilleAttestation: 'Yes' | 'No' | 'Partial';

    // Country Preferences
    country1: string;
    country2: string;
}

export interface UpdateStudentRequest {
    studentCode?: string;
    name?: string;
    email?: string;
    countryCode?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    nationality?: string;
    passportNumber?: string;

    // Academic Information
    qualification?: string;
    score?: number;
    percentage?: number;
    lastInstitute?: string;
    experience?: string;
    test?: string;
    testScore?: number;

    // Attestation Status
    boardAttestation?: 'Yes' | 'No' | 'Partial';
    ibccAttestation?: 'Yes' | 'No' | 'Partial';
    hecAttestation?: 'Yes' | 'No' | 'Partial';
    mofaAttestation?: 'Yes' | 'No' | 'Partial';
    apostilleAttestation?: 'Yes' | 'No' | 'Partial';

    // Country Preferences
    country1?: string;
    country2?: string;
}

export interface UpdateStudentOptionsRequest {
    clients?: boolean;
    clientsComment?: string;
    initialPayment?: boolean;
    initialPaymentComment?: string;
    documents?: boolean;
    documentsComment?: string;
    applications?: boolean;
    applicationsComment?: string;
    offerLetterSecured?: boolean;
    offerLetterSecuredComment?: string;
    secondPaymentDone?: boolean;
    secondPaymentDoneComment?: string;
    visaApplication?: boolean;
    visaApplicationComment?: string;
    visaSecured?: boolean;
    visaSecuredComment?: string;
    finalPayment?: boolean;
    finalPaymentComment?: string;
}

export interface CreatePaymentRequest {
    studentId: string;
    amount: number;
    date: string;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
    notes?: string;
}

export interface CreateNotificationRequest {
    officeId: string;
    agentId: string;
    message: string;
    title: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'payment' | 'student' | 'system';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    expiresAt?: string;
}

export interface CreateCourseRequest {
    name: string;
    university: string;
    department: string;
    country: string;
    city: string;
    intake: string;
    isPrivate: 'Yes' | 'No';
    openAdmission: boolean;
    type: string;
    fee: string;
    timePeriod: string;
    percentageRequirement: string;
    cgpaRequirement: string;
    languageTest: string;
    minBands: string;
}

export interface UpdateCourseRequest {
    name?: string;
    university?: string;
    department?: string;
    country?: string;
    city?: string;
    intake?: string;
    isPrivate?: 'Yes' | 'No';
    openAdmission?: boolean;
    type?: string;
    fee?: string;
    timePeriod?: string;
    percentageRequirement?: string;
    cgpaRequirement?: string;
    languageTest?: string;
    minBands?: string;
    isActive?: boolean;
}

export interface LinkStudentToCourseRequest {
    courseId: string;
}

// Bulk document upload request interface
export interface BulkDocumentUploadRequest {
    studentId: string;
    documents: {
        profilePicture?: Express.Multer.File;
        matricCertificate?: Express.Multer.File;
        matricMarksSheet?: Express.Multer.File;
        intermediateCertificate?: Express.Multer.File;
        intermediateMarkSheet?: Express.Multer.File;
        degree?: Express.Multer.File;
        transcript?: Express.Multer.File;
        languageCertificate?: Express.Multer.File;
        passport?: Express.Multer.File;
        recommendationLetter1?: Express.Multer.File;
        recommendationLetter2?: Express.Multer.File;
        experienceLetter?: Express.Multer.File;
        birthCertificate?: Express.Multer.File;
        familyRegistration?: Express.Multer.File;
        otherDocs?: Express.Multer.File[];
    };
}

// Document upload result interface
export interface DocumentUploadResult {
    documentType: StudentDocumentType;
    success: boolean;
    document?: IDocument;
    error?: string;
}

// Chat interface
export interface IChat extends BaseDocument {
    participants: string[]; // Array of agent IDs
    chatType: 'direct' | 'group';
    lastMessage?: string;
    lastMessageAt?: Date;
    lastMessageBy?: string; // ObjectId reference to Agent
    isActive: boolean;
    createdBy: string; // ObjectId reference to Agent
}

// Message interface
export interface IMessage extends BaseDocument {
    chatId: string;
    senderId: string;
    content: string;
    messageType: 'text' | 'file' | 'image' | 'system';
    isRead: boolean;
    readBy: string[]; // Array of user IDs who read the message
    attachments?: IMessageAttachment[];
    replyTo?: string; // Message ID being replied to
    editedAt?: Date;
    isEdited: boolean;
}

// Message attachment interface
export interface IMessageAttachment {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
    uploadedAt: Date;
    s3Key?: string;
    s3Url?: string;
}

// Application Comment interface
export interface IApplicationComment {
    content: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
}

// Application interface
export interface IApplication extends BaseDocument {
    applicationNumber: string;
    studentId: string;
    courseId: string;
    applicationDate: Date;
    submissionDate?: Date;
    reviewDate?: Date;
    decisionDate?: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
    documents: IApplicationDocument[];
    comments: IApplicationComment[];
    createdBy: string;
    updatedBy?: string;
    isActive: boolean;
    student?: IStudent;
    course?: ICourse;
    creator?: IAgent;
    updater?: IAgent;
}

// Application Document interface
export interface IApplicationDocument {
    filename: string;
    originalName: string;
    path: string;
    uploadedAt: Date;
    documentType: 'application_form' | 'transcript' | 'recommendation' | 'essay' | 'portfolio' | 'other';
    s3Key?: string;
    s3Url?: string;
    size?: number;
    mimetype?: string;
}

// Application request interfaces
export interface CreateApplicationRequest {
    studentId: string;
    courseId: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
}

export interface UpdateApplicationRequest {
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
    submissionDate?: string;
    reviewDate?: string;
    decisionDate?: string;
}

export interface AddApplicationCommentRequest {
    content: string;
}

export interface ApplicationQuery extends PaginationQuery {
    studentId?: string;
    courseId?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    dateField?: string;
}

// Chat request interfaces
export interface CreateChatRequest {
    participantIds: string[];
    chatType: 'direct' | 'group';
}

export interface SendMessageRequest {
    content: string;
    messageType?: 'text' | 'file' | 'image' | 'system';
    replyTo?: string;
}

export interface ChatQuery extends PaginationQuery {
    search?: string;
    chatType?: string;
}

// Learning Resource interfaces
export interface ILearningResourceFile {
    _id?: string;
    filename: string;
    originalName: string;
    s3Key: string;
    s3Url?: string;
    size?: number;
    mimetype?: string;
    uploadedAt: Date;
    uploadedBy: string;
}

export interface ILearningResource extends BaseDocument {
    country: string;
    files: ILearningResourceFile[];
}

export interface CreateLearningResourceRequest {
    country: string;
}

export interface UploadLearningResourceFileRequest {
    country: string;
}

export interface DeleteLearningResourceFileRequest {
    country: string;
    fileId: string;
}
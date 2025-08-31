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
    lastLogin?: Date;
    refreshTokens?: Array<{
        token: string;
        createdAt: Date;
        expiresAt: Date;
    }>;
}

// Student interface
export interface IStudent extends BaseDocument {
    name: string;
    email: string;
    password: string;
    officeId: string;
    agentId: string;
    phone?: string;
    dateOfBirth?: Date;
    nationality?: string;
    passportNumber?: string;
    documents: IDocument[];
    status: 'active' | 'inactive' | 'pending' | 'completed';
    totalPaid?: number;
    totalAmount?: number;
}

// Document interface
export interface IDocument {
    filename: string;
    originalName: string;
    path: string;
    uploadedAt: Date;
    documentType: 'passport' | 'visa' | 'certificate' | 'other';
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
    name: string;
    email: string;
    password: string;
    officeId?: string;
    agentId?: string;
    phone?: string;
    dateOfBirth?: string;
    nationality?: string;
    passportNumber?: string;
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


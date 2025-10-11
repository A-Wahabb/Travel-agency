import mongoose, { Schema, Document } from 'mongoose';
import { IAgent, UserRole } from '../types';
import { hashPassword } from '../config/auth';

export interface IAgentDocument extends IAgent, Document { }

const agentSchema = new Schema<IAgentDocument>({
    name: {
        type: String,
        required: [true, 'name:Agent name is required'],
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
    password: {
        type: String,
        required: [true, 'password:Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['SuperAdmin', 'Admin', 'Agent'] as UserRole[],
        default: 'Agent'
    },
    officeId: {
        type: String,
        required: function (this: IAgentDocument) {
            return this.role !== 'SuperAdmin';
        }
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isGhost: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    refreshTokens: [{
        token: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        }
    }]
}, {
    timestamps: true
});

// Hash password before saving
agentSchema.pre('save', async function (next) {
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

export default mongoose.model<IAgentDocument>('Agent', agentSchema);


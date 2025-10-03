import mongoose, { Schema, Document } from 'mongoose';
import { IPayment } from '../types';

export interface IPaymentDocument extends IPayment, Document { }

const paymentSchema = new Schema<IPaymentDocument>({
    studentId: {
        type: String,
        required: [true, 'studentId:Student ID is required']
    },
    amount: {
        type: Number,
        required: [true, 'amount:Payment amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    date: {
        type: Date,
        required: [true, 'date:Payment date is required'],
        default: Date.now
    },
    createdBy: {
        type: String,
        required: [true, 'createdBy:Created by field is required']
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'bank_transfer', 'check', 'other'],
        default: 'cash'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'completed'
    },
    receiptNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Generate receipt number before saving
paymentSchema.pre('save', function (next) {
    if (!this.receiptNumber) {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.receiptNumber = `RCP-${timestamp}-${random}`;
    }
    next();
});

export default mongoose.model<IPaymentDocument>('Payment', paymentSchema);


import { Request, Response } from 'express';
import Payment from '../models/Payment';
import Student from '../models/Student';
import { AuthenticatedRequest, CreatePaymentRequest, PaginationQuery } from '../types';

// @desc    Get all payments
// @route   GET /api/payments
// @access  Agent, Admin, SuperAdmin
export const getPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { page = '1', limit = '10', search = '', sortBy = 'date', sortOrder = 'desc' }: PaginationQuery = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query based on role
        const query: any = {};

        if (req.user.role === 'Agent') {
            // Agent can only see payments for their students
            const studentIds = await Student.find({ agentId: req.user.id }).select('_id');
            query.studentId = { $in: studentIds.map(s => s._id) };
        } else if (req.user.role === 'Admin') {
            // Admin can see payments for their office students
            const studentIds = await Student.find({ officeId: req.user.officeId }).select('_id');
            query.studentId = { $in: studentIds.map(s => s._id) };
        }

        if (search) {
            query.$or = [
                { receiptNumber: { $regex: search, $options: 'i' } },
                { notes: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const payments = await Payment.find(query)
            .populate('studentId', 'name email')
            .populate('createdBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Payment.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Payments retrieved successfully',
            data: payments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Agent, Admin, SuperAdmin
export const getPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const payment = await Payment.findById(req.params.id)
            .populate('studentId', 'name email officeId agentId')
            .populate('createdBy', 'name email');

        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            const student = await Student.findById(payment.studentId);
            if (student && student.agentId.toString() !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
                return;
            }
        }

        if (req.user.role === 'Admin') {
            const student = await Student.findById(payment.studentId);
            if (student && student.officeId.toString() !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
                return;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment retrieved successfully',
            data: payment
        });
    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create payment
// @route   POST /api/payments
// @access  Agent
export const createPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (req.user.role !== 'Agent') {
            res.status(403).json({
                success: false,
                message: 'Only agents can create payments'
            });
            return;
        }

        const { studentId, amount, date, paymentMethod, notes }: CreatePaymentRequest = req.body;

        // Validate student exists and belongs to agent
        const student = await Student.findById(studentId);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        if (student.agentId.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Can only create payments for your own students'
            });
            return;
        }

        const payment = await Payment.create({
            studentId,
            amount,
            date: new Date(date),
            createdBy: req.user.id,
            paymentMethod,
            notes
        });

        await payment.populate('studentId', 'name email');
        await payment.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data: payment
        });
    } catch (error: any) {
        console.error('Create payment error:', error);

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const validationErrors: { [key: string]: string } = {};
            Object.keys(error.errors).forEach(key => {
                validationErrors[key] = error.errors[key].message;
            });
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
            return;
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: 'Duplicate field value entered'
            });
            return;
        }

        // For other errors, let the error handler middleware handle them
        throw error;
    }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Agent
export const updatePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (req.user.role !== 'Agent') {
            res.status(403).json({
                success: false,
                message: 'Only agents can update payments'
            });
            return;
        }

        const { amount, date, paymentMethod, notes, status } = req.body;

        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
            return;
        }

        // Check if agent owns this payment
        if (payment.createdBy.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Update fields
        if (amount) payment.amount = amount;
        if (date) payment.date = new Date(date);
        if (paymentMethod) payment.paymentMethod = paymentMethod;
        if (notes !== undefined) payment.notes = notes;
        if (status) payment.status = status;

        await payment.save();
        await payment.populate('studentId', 'name email');
        await payment.populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Payment updated successfully',
            data: payment
        });
    } catch (error: any) {
        console.error('Update payment error:', error);

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const validationErrors: { [key: string]: string } = {};
            Object.keys(error.errors).forEach(key => {
                validationErrors[key] = error.errors[key].message;
            });
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
            return;
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: 'Duplicate field value entered'
            });
            return;
        }

        // For other errors, let the error handler middleware handle them
        throw error;
    }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Agent
export const deletePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (req.user.role !== 'Agent') {
            res.status(403).json({
                success: false,
                message: 'Only agents can delete payments'
            });
            return;
        }

        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
            return;
        }

        // Check if agent owns this payment
        if (payment.createdBy.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        await Payment.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Payment deleted successfully'
        });
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Agent, Admin, SuperAdmin
export const getPaymentStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Build query based on role
        const query: any = {};

        if (req.user.role === 'Agent') {
            const studentIds = await Student.find({ agentId: req.user.id }).select('_id');
            query.studentId = { $in: studentIds.map(s => s._id) };
        } else if (req.user.role === 'Admin') {
            const studentIds = await Student.find({ officeId: req.user.officeId }).select('_id');
            query.studentId = { $in: studentIds.map(s => s._id) };
        }

        const stats = await Payment.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    totalPayments: { $sum: 1 },
                    avgAmount: { $avg: '$amount' }
                }
            }
        ]);

        const monthlyStats = await Payment.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.status(200).json({
            success: true,
            message: 'Payment statistics retrieved successfully',
            data: {
                summary: stats[0] || { totalAmount: 0, totalPayments: 0, avgAmount: 0 },
                monthly: monthlyStats
            }
        });
    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


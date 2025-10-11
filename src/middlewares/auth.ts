import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/auth';
import Agent from '../models/Agent';
import { AuthenticatedRequest, UserRole } from '../types';
import mongoose from 'mongoose';

export const authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token required'
            });
            return;
        }

        const decoded = verifyToken(token);

        // Check if user still exists and is active
        const user = await Agent.findById(decoded.userId).select('-password');

        if (!user || !user.isActive) {
            res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
            return;
        }

        req.user = {
            id: decoded.userId,
            role: decoded.role,
            ...(decoded.officeId && { officeId: decoded.officeId })
        };

        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

export const authorizeRoles = (...roles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
            return;
        }

        next();
    };
};

export const authorizeSuperAdmin = authorizeRoles('SuperAdmin');
export const authorizeAdmin = authorizeRoles('SuperAdmin', 'Admin');
export const authorizeAgent = authorizeRoles('SuperAdmin', 'Admin', 'Agent');

// Chat-specific authorization middleware
export const authorizeChatAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // All authenticated users (SuperAdmin, Admin, and Agent) can access chat
        // No role restrictions for chat access
        next();
    } catch (error) {
        console.error('Chat authorization error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authorization'
        });
    }
};

// Student-specific authorization middleware
export const authorizeStudentAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const studentId = req.params.id;
        if (!studentId) {
            res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
            return;
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
            return;
        }

        // Import Student model dynamically to avoid circular dependencies
        const Student = (await import('../models/Student')).default;
        const student = await Student.findById(studentId);

        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // SuperAdmin can access all students
        if (req.user.role === 'SuperAdmin') {
            return next();
        }

        // Admin can access students in their office
        if (req.user.role === 'Admin') {
            if (student.officeId.toString() !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to your office.'
                });
                return;
            }
            return next();
        }

        // Agent can only access their own students
        if (req.user.role === 'Agent') {
            if (student.agentId.toString() !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to you.'
                });
                return;
            }
            return next();
        }

        res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions. you role is ' + req.user.role
        });
    } catch (error) {
        console.error('Student authorization error:', error);

        // Handle specific MongoDB errors
        if (error instanceof mongoose.Error.CastError) {
            res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
            return;
        }

        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({
                success: false,
                message: 'Validation error: ' + error.message
            });
            return;
        }

        // Handle other known errors
        if (error instanceof Error) {
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
            return;
        }

        // Fallback for unknown errors
        res.status(500).json({
            success: false,
            message: 'Server error during authorization'
        });
    }
};

// Payment-specific authorization middleware
export const authorizePaymentAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const paymentId = req.params.id;
        if (!paymentId) {
            res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
            return;
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid payment ID format'
            });
            return;
        }

        // Import Payment model dynamically to avoid circular dependencies
        const Payment = (await import('../models/Payment')).default;
        const payment = await Payment.findById(paymentId).populate<{ studentId: { officeId: string; agentId: string } }>('studentId');

        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
            return;
        }

        // SuperAdmin can access all payments
        if (req.user.role === 'SuperAdmin') {
            return next();
        }

        // Admin can access payments for students in their office
        if (req.user.role === 'Admin') {
            if ((payment.studentId as any).officeId.toString() !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Payment does not belong to your office.'
                });
                return;
            }
            return next();
        }

        // Agent can only access payments for their own students
        if (req.user.role === 'Agent') {
            if ((payment.studentId as any).agentId.toString() !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Payment does not belong to your students.'
                });
                return;
            }
            return next();
        }

        res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions. you role is ' + req.user.role
        });
    } catch (error) {
        console.error('Payment authorization error:', error);

        // Handle specific MongoDB errors
        if (error instanceof mongoose.Error.CastError) {
            res.status(400).json({
                success: false,
                message: 'Invalid payment ID format'
            });
            return;
        }

        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({
                success: false,
                message: 'Validation error: ' + error.message
            });
            return;
        }

        // Handle other known errors
        if (error instanceof Error) {
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
            return;
        }

        // Fallback for unknown errors
        res.status(500).json({
            success: false,
            message: 'Server error during authorization'
        });
    }
};


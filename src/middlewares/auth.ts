import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/auth';
import Agent from '../models/Agent';
import { AuthenticatedRequest, UserRole } from '../types';

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


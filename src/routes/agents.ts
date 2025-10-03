import express from 'express';
import { body } from 'express-validator';
import {
    getAgents,
    getAgent,
    createAgent,
    updateAgent,
    activateAgent,
    deactivateAgent,
    hardDeleteAgent,
    updateAgentPassword,
    checkAgentDependenciesEndpoint
} from '../controllers/agent';
import {
    authenticateToken,
    authorizeAdmin,
    authorizeAgent,
    authorizeSuperAdmin
} from '../middlewares/auth';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const createAgentValidation = [
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('name:Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .withMessage('email:Please enter a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('password:Password must be at least 6 characters'),
    body('role')
        .isIn(['SuperAdmin', 'Admin', 'Agent'])
        .withMessage('role:Invalid role'),
    body('officeId')
        .optional()
        .isMongoId()
        .withMessage('officeId:Invalid office ID'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('phone:Please enter a valid phone number')
];

const updateAgentValidation = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('name:Name must be between 2 and 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('email:Please enter a valid email'),
    body('role')
        .optional()
        .isIn(['SuperAdmin', 'Admin', 'Agent'])
        .withMessage('role:Invalid role'),
    body('officeId')
        .optional()
        .isMongoId()
        .withMessage('officeId:Invalid office ID'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('phone:Please enter a valid phone number'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive:isActive must be a boolean')
];

const updateAgentPasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('currentPassword:Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('newPassword:New password must be at least 6 characters'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match new password');
            }
            return true;
        })
];

// Routes
router.get('/', authenticateToken, authorizeAdmin, getAgents);
router.get('/:id', authenticateToken, authorizeAdmin, getAgent);
router.post('/', authenticateToken, authorizeAdmin, createAgentValidation, validate, createAgent);
router.put('/:id', authenticateToken, authorizeAdmin, updateAgentValidation, validate, updateAgent);
router.put('/:id/activate', authenticateToken, authorizeAdmin, activateAgent);
router.put('/:id/deactivate', authenticateToken, authorizeAdmin, deactivateAgent);
router.put('/:id/password', authenticateToken, authorizeAgent, updateAgentPasswordValidation, validate, updateAgentPassword);
router.get('/:id/dependencies', authenticateToken, authorizeSuperAdmin, checkAgentDependenciesEndpoint);
router.delete('/:id', authenticateToken, authorizeSuperAdmin, hardDeleteAgent);

export default router;


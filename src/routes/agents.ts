import express from 'express';
import { body } from 'express-validator';
import {
    getAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent
} from '../controllers/agent';
import {
    authenticateToken,
    authorizeAdmin
} from '../middlewares/auth';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const createAgentValidation = [
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('role')
        .isIn(['SuperAdmin', 'Admin', 'Agent'])
        .withMessage('Invalid role'),
    body('officeId')
        .optional()
        .isMongoId()
        .withMessage('Invalid office ID'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please enter a valid phone number')
];

const updateAgentValidation = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please enter a valid email'),
    body('role')
        .optional()
        .isIn(['SuperAdmin', 'Admin', 'Agent'])
        .withMessage('Invalid role'),
    body('officeId')
        .optional()
        .isMongoId()
        .withMessage('Invalid office ID'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please enter a valid phone number'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
];

// Routes
router.get('/', authenticateToken, authorizeAdmin, getAgents);
router.get('/:id', authenticateToken, authorizeAdmin, getAgent);
router.post('/', authenticateToken, authorizeAdmin, createAgentValidation, validate, createAgent);
router.put('/:id', authenticateToken, authorizeAdmin, updateAgentValidation, validate, updateAgent);
router.delete('/:id', authenticateToken, authorizeAdmin, deleteAgent);

export default router;


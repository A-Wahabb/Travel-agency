import express from 'express';
import { body } from 'express-validator';
import {
    getPayments,
    getPayment,
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentStats
} from '../controllers/payment';
import {
    authenticateToken,
    authorizeAgent
} from '../middlewares/auth';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const createPaymentValidation = [
    body('studentId')
        .isMongoId()
        .withMessage('Invalid student ID'),
    body('amount')
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),
    body('date')
        .isISO8601()
        .withMessage('Please enter a valid date'),
    body('paymentMethod')
        .isIn(['cash', 'card', 'bank_transfer', 'check', 'other'])
        .withMessage('Invalid payment method'),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
];

const updatePaymentValidation = [
    body('amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Please enter a valid date'),
    body('paymentMethod')
        .optional()
        .isIn(['cash', 'card', 'bank_transfer', 'check', 'other'])
        .withMessage('Invalid payment method'),
    body('status')
        .optional()
        .isIn(['pending', 'completed', 'failed', 'refunded'])
        .withMessage('Invalid status'),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
];

// Routes
router.get('/', authenticateToken, authorizeAgent, getPayments);
router.get('/stats', authenticateToken, authorizeAgent, getPaymentStats);
router.get('/:id', authenticateToken, authorizeAgent, getPayment);
router.post('/', authenticateToken, authorizeAgent, createPaymentValidation, validate, createPayment);
router.put('/:id', authenticateToken, authorizeAgent, updatePaymentValidation, validate, updatePayment);
router.delete('/:id', authenticateToken, authorizeAgent, deletePayment);

export default router;


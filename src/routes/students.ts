import express from 'express';
import { body } from 'express-validator';
import {
    getStudents,
    getStudent,
    createStudent,
    updateStudent,
    uploadDocument,
    deleteStudent,
    updateStudentOptions,
    getStudentOptions
} from '../controllers/student';
import {
    authenticateToken,
    authorizeAgent
} from '../middlewares/auth';
import { uploadSingleMiddleware } from '../middlewares/upload';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const createStudentValidation = [
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('officeId')
        .optional()
        .isMongoId()
        .withMessage('Invalid office ID'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please enter a valid phone number'),
    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Please enter a valid date'),
    body('nationality')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Nationality must be between 2 and 50 characters'),
    body('passportNumber')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Passport number must be between 1 and 50 characters')
];

const updateStudentValidation = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please enter a valid email'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please enter a valid phone number'),
    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Please enter a valid date'),
    body('nationality')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Nationality must be between 2 and 50 characters'),
    body('passportNumber')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Passport number must be between 1 and 50 characters'),
    body('status')
        .optional()
        .isIn(['active', 'inactive', 'pending', 'completed'])
        .withMessage('Invalid status')
];

const documentValidation = [
    body('documentType')
        .optional()
        .isIn(['passport', 'visa', 'certificate', 'other'])
        .withMessage('Invalid document type')
];

const studentOptionsValidation = [
    body('clients')
        .optional()
        .isBoolean()
        .withMessage('Clients must be a boolean value'),
    body('initialPayment')
        .optional()
        .isBoolean()
        .withMessage('Initial payment must be a boolean value'),
    body('documents')
        .optional()
        .isBoolean()
        .withMessage('Documents must be a boolean value'),
    body('applications')
        .optional()
        .isBoolean()
        .withMessage('Applications must be a boolean value'),
    body('offerLetterSecured')
        .optional()
        .isBoolean()
        .withMessage('Offer letter secured must be a boolean value'),
    body('secondPaymentDone')
        .optional()
        .isBoolean()
        .withMessage('Second payment done must be a boolean value'),
    body('visaApplication')
        .optional()
        .isBoolean()
        .withMessage('Visa application must be a boolean value'),
    body('visaSecured')
        .optional()
        .isBoolean()
        .withMessage('Visa secured must be a boolean value'),
    body('finalPayment')
        .optional()
        .isBoolean()
        .withMessage('Final payment must be a boolean value')
];

// Routes
router.get('/', authenticateToken, authorizeAgent, getStudents);
router.get('/:id', authenticateToken, authorizeAgent, getStudent);
router.post('/', authenticateToken, createStudentValidation, validate, createStudent);
router.put('/:id', authenticateToken, authorizeAgent, updateStudentValidation, validate, updateStudent);
router.post('/:id/documents', authenticateToken, authorizeAgent, uploadSingleMiddleware, documentValidation, validate, uploadDocument);
router.delete('/:id', authenticateToken, authorizeAgent, deleteStudent);

// Student options routes
router.get('/:id/options', authenticateToken, authorizeAgent, getStudentOptions);
router.put('/:id/options', authenticateToken, authorizeAgent, studentOptionsValidation, validate, updateStudentOptions);

export default router;


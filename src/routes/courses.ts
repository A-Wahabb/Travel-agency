import express from 'express';
import { body } from 'express-validator';
import {
    getCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    linkStudentToCourse,
    unlinkStudentFromCourse,
    getCourseStudents
} from '../controllers/course';
import {
    authenticateToken,
    authorizeSuperAdmin,
    authorizeAgent,
    authorizeRoles
} from '../middlewares/auth';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const createCourseValidation = [
    body('name')
        .isLength({ min: 2, max: 200 })
        .withMessage('Course name must be between 2 and 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('duration')
        .isLength({ min: 1, max: 100 })
        .withMessage('Duration must be between 1 and 100 characters'),
    body('level')
        .isIn(['certificate', 'diploma', 'bachelor', 'master', 'phd', 'other'])
        .withMessage('Invalid course level'),
    body('field')
        .isLength({ min: 2, max: 100 })
        .withMessage('Field must be between 2 and 100 characters'),
    body('university')
        .isLength({ min: 2, max: 200 })
        .withMessage('University name must be between 2 and 200 characters'),
    body('country')
        .isLength({ min: 2, max: 100 })
        .withMessage('Country must be between 2 and 100 characters'),
    body('tuitionFee')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Tuition fee must be a positive number'),
    body('currency')
        .optional()
        .isLength({ max: 10 })
        .withMessage('Currency cannot exceed 10 characters'),
    body('requirements')
        .optional()
        .isArray()
        .withMessage('Requirements must be an array'),
    body('intakeMonths')
        .optional()
        .isArray()
        .withMessage('Intake months must be an array'),
    body('languageRequirements.ielts.minScore')
        .optional()
        .isFloat({ min: 0, max: 9 })
        .withMessage('IELTS score must be between 0 and 9'),
    body('languageRequirements.toefl.minScore')
        .optional()
        .isFloat({ min: 0, max: 120 })
        .withMessage('TOEFL score must be between 0 and 120'),
    body('languageRequirements.other')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Other language requirements cannot exceed 200 characters')
];

const updateCourseValidation = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 200 })
        .withMessage('Course name must be between 2 and 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('duration')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Duration must be between 1 and 100 characters'),
    body('level')
        .optional()
        .isIn(['certificate', 'diploma', 'bachelor', 'master', 'phd', 'other'])
        .withMessage('Invalid course level'),
    body('field')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Field must be between 2 and 100 characters'),
    body('university')
        .optional()
        .isLength({ min: 2, max: 200 })
        .withMessage('University name must be between 2 and 200 characters'),
    body('country')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Country must be between 2 and 100 characters'),
    body('tuitionFee')
        .optional()
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Tuition fee must be a positive number'),
    body('currency')
        .optional()
        .isLength({ max: 10 })
        .withMessage('Currency cannot exceed 10 characters'),
    body('requirements')
        .optional()
        .isArray()
        .withMessage('Requirements must be an array'),
    body('intakeMonths')
        .optional()
        .isArray()
        .withMessage('Intake months must be an array'),
    body('languageRequirements.ielts.minScore')
        .optional()
        .isFloat({ min: 0, max: 9 })
        .withMessage('IELTS score must be between 0 and 9'),
    body('languageRequirements.toefl.minScore')
        .optional()
        .isFloat({ min: 0, max: 120 })
        .withMessage('TOEFL score must be between 0 and 120'),
    body('languageRequirements.other')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Other language requirements cannot exceed 200 characters'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
];

// Routes
// Get all courses (accessible by all authenticated users)
router.get('/', authenticateToken, authorizeAgent, getCourses);

// Get single course (accessible by all authenticated users)
router.get('/:id', authenticateToken, authorizeAgent, getCourse);

// Get students enrolled in a course (accessible by all authenticated users)
router.get('/:id/students', authenticateToken, authorizeAgent, getCourseStudents);

// Course management routes (SuperAdmin only)
router.post('/', authenticateToken, authorizeSuperAdmin, createCourseValidation, validate, createCourse);
router.put('/:id', authenticateToken, authorizeSuperAdmin, updateCourseValidation, validate, updateCourse);
router.delete('/:id', authenticateToken, authorizeSuperAdmin, deleteCourse);

// Student-course linking routes (Agent and Admin)
router.put('/:courseId/students/:studentId', authenticateToken, authorizeRoles('Agent', 'Admin'), linkStudentToCourse);
router.delete('/:courseId/students/:studentId', authenticateToken, authorizeRoles('Agent', 'Admin'), unlinkStudentFromCourse);

export default router;


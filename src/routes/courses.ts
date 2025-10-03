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
        .withMessage('name:Course name must be between 2 and 200 characters'),
    body('university')
        .isLength({ min: 2, max: 200 })
        .withMessage('university:University name must be between 2 and 200 characters'),
    body('department')
        .isLength({ min: 2, max: 100 })
        .withMessage('department:Department must be between 2 and 100 characters'),
    body('country')
        .isLength({ min: 2, max: 100 })
        .withMessage('country:Country must be between 2 and 100 characters'),
    body('city')
        .isLength({ min: 2, max: 100 })
        .withMessage('city:City must be between 2 and 100 characters'),
    body('intake')
        .isLength({ min: 1, max: 50 })
        .withMessage('intake:Intake must be between 1 and 50 characters'),
    body('isPrivate')
        .isIn(['Yes', 'No'])
        .withMessage('isPrivate:IsPrivate must be either Yes or No'),
    body('type')
        .isLength({ min: 2, max: 50 })
        .withMessage('type:Type must be between 2 and 50 characters'),
    body('fee')
        .isLength({ min: 1, max: 50 })
        .withMessage('fee:Fee must be between 1 and 50 characters'),
    body('timePeriod')
        .isLength({ min: 1, max: 50 })
        .withMessage('timePeriod:Time period must be between 1 and 50 characters'),
    body('percentageRequirement')
        .isLength({ min: 1, max: 10 })
        .withMessage('percentageRequirement:Percentage requirement must be between 1 and 10 characters'),
    body('cgpaRequirement')
        .isLength({ min: 1, max: 10 })
        .withMessage('cgpaRequirement:CGPA requirement must be between 1 and 10 characters'),
    body('languageTest')
        .isLength({ min: 1, max: 100 })
        .withMessage('languageTest:Language test requirement must be between 1 and 100 characters'),
    body('minBands')
        .isLength({ min: 1, max: 50 })
        .withMessage('minBands:Minimum bands requirement must be between 1 and 50 characters')
];

const updateCourseValidation = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 200 })
        .withMessage('name:Course name must be between 2 and 200 characters'),
    body('university')
        .optional()
        .isLength({ min: 2, max: 200 })
        .withMessage('university:University name must be between 2 and 200 characters'),
    body('department')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('department:Department must be between 2 and 100 characters'),
    body('country')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('country:Country must be between 2 and 100 characters'),
    body('city')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('city:City must be between 2 and 100 characters'),
    body('intake')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('intake:Intake must be between 1 and 50 characters'),
    body('isPrivate')
        .optional()
        .isIn(['Yes', 'No'])
        .withMessage('isPrivate:IsPrivate must be either Yes or No'),
    body('type')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('type:Type must be between 2 and 50 characters'),
    body('fee')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('fee:Fee must be between 1 and 50 characters'),
    body('timePeriod')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('timePeriod:Time period must be between 1 and 50 characters'),
    body('percentageRequirement')
        .optional()
        .isLength({ min: 1, max: 10 })
        .withMessage('percentageRequirement:Percentage requirement must be between 1 and 10 characters'),
    body('cgpaRequirement')
        .optional()
        .isLength({ min: 1, max: 10 })
        .withMessage('cgpaRequirement:CGPA requirement must be between 1 and 10 characters'),
    body('languageTest')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('languageTest:Language test requirement must be between 1 and 100 characters'),
    body('minBands')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('minBands:Minimum bands requirement must be between 1 and 50 characters'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive:isActive must be a boolean value')
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


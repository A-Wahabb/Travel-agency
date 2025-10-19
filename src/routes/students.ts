import express from 'express';
import { body } from 'express-validator';
import {
    getStudents,
    getStudentsByAgent,
    getStudent,
    createStudent,
    updateStudent,
    uploadDocument,
    deleteStudent,
    updateStudentOptions,
    getStudentOptions,
    getStudentOptionsCount,
    linkStudentToCourse,
    unlinkStudentFromCourse,
    uploadBulkDocuments,
    getStudentDocuments,
    deleteStudentDocument,
    cleanupOrphanedDocuments,
    getStorageStats,
    searchStudents
} from '../controllers/student';
import {
    authenticateToken,
    authorizeAgent,
    authorizeStudentAccess,
    authorizeRoles
} from '../middlewares/auth';
import { uploadSingleMiddleware } from '../middlewares/upload';
import { uploadStudentDocumentsMiddleware } from '../middlewares/studentDocumentUpload';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const createStudentValidation = [
    body('studentCode')
        .notEmpty()
        .withMessage('Student code is required')
        .isLength({ max: 50 })
        .withMessage('Student code cannot exceed 50 characters'),
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),
    body('countryCode')
        .notEmpty()
        .withMessage('Country code is required')
        .matches(/^\+?[1-9]\d{0,3}$/)
        .withMessage('Please enter a valid country code (e.g., +1, +92, +44)'),
    body('phoneNumber')
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[0-9]{6,15}$/)
        .withMessage('Please enter a valid phone number (6-15 digits)'),
    body('officeId')
        .optional()
        .isMongoId()
        .withMessage('Invalid office ID'),
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
    // Academic Information
    body('qualification')
        .notEmpty()
        .withMessage('Qualification is required')
        .isLength({ max: 200 })
        .withMessage('Qualification cannot exceed 200 characters'),
    body('score')
        .notEmpty()
        .withMessage('Score is required')
        .isNumeric()
        .withMessage('Score must be a number')
        .custom((value) => value >= 0 && value <= 1000)
        .withMessage('Score must be between 0 and 1000'),
    body('percentage')
        .notEmpty()
        .withMessage('Percentage is required')
        .isNumeric()
        .withMessage('Percentage must be a number')
        .custom((value) => value >= 0 && value <= 100)
        .withMessage('Percentage must be between 0 and 100'),
    body('lastInstitute')
        .notEmpty()
        .withMessage('Last institute is required')
        .isLength({ max: 200 })
        .withMessage('Last institute cannot exceed 200 characters'),
    body('experience')
        .notEmpty()
        .withMessage('Experience is required')
        .isLength({ max: 500 })
        .withMessage('Experience cannot exceed 500 characters'),
    body('test')
        .notEmpty()
        .withMessage('Test is required')
        .isLength({ max: 100 })
        .withMessage('Test cannot exceed 100 characters'),
    body('testScore')
        .notEmpty()
        .withMessage('Test score is required')
        .isNumeric()
        .withMessage('Test score must be a number')
        .custom((value) => value >= 0 && value <= 1000)
        .withMessage('Test score must be between 0 and 1000'),
    // Attestation Status
    body('boardAttestation')
        .notEmpty()
        .withMessage('Board attestation status is required')
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('Board attestation must be Yes, No, or Partial'),
    body('ibccAttestation')
        .notEmpty()
        .withMessage('IBCC attestation status is required')
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('IBCC attestation must be Yes, No, or Partial'),
    body('hecAttestation')
        .notEmpty()
        .withMessage('HEC attestation status is required')
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('HEC attestation must be Yes, No, or Partial'),
    body('mofaAttestation')
        .notEmpty()
        .withMessage('MOFA attestation status is required')
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('MOFA attestation must be Yes, No, or Partial'),
    body('apostilleAttestation')
        .notEmpty()
        .withMessage('Apostille attestation status is required')
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('Apostille attestation must be Yes, No, or Partial'),
    // Country Preferences
    body('country1')
        .notEmpty()
        .withMessage('Primary country preference is required')
        .isLength({ max: 100 })
        .withMessage('Country name cannot exceed 100 characters'),
    body('country2')
        .notEmpty()
        .withMessage('Secondary country preference is required')
        .isLength({ max: 100 })
        .withMessage('Country name cannot exceed 100 characters')
];

const updateStudentValidation = [
    body('studentCode')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Student code cannot exceed 50 characters'),
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please enter a valid email'),
    body('countryCode')
        .optional()
        .matches(/^\+?[1-9]\d{0,3}$/)
        .withMessage('Please enter a valid country code (e.g., +1, +92, +44)'),
    body('phoneNumber')
        .optional()
        .matches(/^[0-9]{6,15}$/)
        .withMessage('Please enter a valid phone number (6-15 digits)'),
    body('agentId')
        .optional()
        .isMongoId()
        .withMessage('Invalid agent ID'),
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
        .withMessage('Invalid status'),
    // Academic Information
    body('qualification')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Qualification cannot exceed 200 characters'),
    body('score')
        .optional()
        .isNumeric()
        .withMessage('Score must be a number')
        .custom((value) => value >= 0 && value <= 1000)
        .withMessage('Score must be between 0 and 1000'),
    body('percentage')
        .optional()
        .isNumeric()
        .withMessage('Percentage must be a number')
        .custom((value) => value >= 0 && value <= 100)
        .withMessage('Percentage must be between 0 and 100'),
    body('lastInstitute')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Last institute cannot exceed 200 characters'),
    body('experience')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Experience cannot exceed 500 characters'),
    body('test')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Test cannot exceed 100 characters'),
    body('testScore')
        .optional()
        .isNumeric()
        .withMessage('Test score must be a number')
        .custom((value) => value >= 0 && value <= 1000)
        .withMessage('Test score must be between 0 and 1000'),
    // Attestation Status
    body('boardAttestation')
        .optional()
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('Board attestation must be Yes, No, or Partial'),
    body('ibccAttestation')
        .optional()
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('IBCC attestation must be Yes, No, or Partial'),
    body('hecAttestation')
        .optional()
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('HEC attestation must be Yes, No, or Partial'),
    body('mofaAttestation')
        .optional()
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('MOFA attestation must be Yes, No, or Partial'),
    body('apostilleAttestation')
        .optional()
        .isIn(['Yes', 'No', 'Partial'])
        .withMessage('Apostille attestation must be Yes, No, or Partial'),
    // Country Preferences
    body('country1')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Country name cannot exceed 100 characters'),
    body('country2')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Country name cannot exceed 100 characters')
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
    body('clientsComment')
        .optional()
        .isString()
        .withMessage('Clients comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Clients comment cannot exceed 500 characters'),
    body('initialPayment')
        .optional()
        .isBoolean()
        .withMessage('Initial payment must be a boolean value'),
    body('initialPaymentComment')
        .optional()
        .isString()
        .withMessage('Initial payment comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Initial payment comment cannot exceed 500 characters'),
    body('documents')
        .optional()
        .isBoolean()
        .withMessage('Documents must be a boolean value'),
    body('documentsComment')
        .optional()
        .isString()
        .withMessage('Documents comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Documents comment cannot exceed 500 characters'),
    body('applications')
        .optional()
        .isBoolean()
        .withMessage('Applications must be a boolean value'),
    body('applicationsComment')
        .optional()
        .isString()
        .withMessage('Applications comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Applications comment cannot exceed 500 characters'),
    body('offerLetterSecured')
        .optional()
        .isBoolean()
        .withMessage('Offer letter secured must be a boolean value'),
    body('offerLetterSecuredComment')
        .optional()
        .isString()
        .withMessage('Offer letter secured comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Offer letter secured comment cannot exceed 500 characters'),
    body('secondPaymentDone')
        .optional()
        .isBoolean()
        .withMessage('Second payment done must be a boolean value'),
    body('secondPaymentDoneComment')
        .optional()
        .isString()
        .withMessage('Second payment done comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Second payment done comment cannot exceed 500 characters'),
    body('visaApplication')
        .optional()
        .isBoolean()
        .withMessage('Visa application must be a boolean value'),
    body('visaApplicationComment')
        .optional()
        .isString()
        .withMessage('Visa application comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Visa application comment cannot exceed 500 characters'),
    body('visaSecured')
        .optional()
        .isBoolean()
        .withMessage('Visa secured must be a boolean value'),
    body('visaSecuredComment')
        .optional()
        .isString()
        .withMessage('Visa secured comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Visa secured comment cannot exceed 500 characters'),
    body('finalPayment')
        .optional()
        .isBoolean()
        .withMessage('Final payment must be a boolean value'),
    body('finalPaymentComment')
        .optional()
        .isString()
        .withMessage('Final payment comment must be a string')
        .isLength({ max: 500 })
        .withMessage('Final payment comment cannot exceed 500 characters')
];

const linkCourseValidation = [
    body('courseId')
        .isMongoId()
        .withMessage('Invalid course ID')
];

// Routes
router.get('/', authenticateToken, authorizeAgent, getStudents);
router.get('/search', authenticateToken, authorizeAgent, searchStudents);
router.get('/options/count', authenticateToken, authorizeAgent, getStudentOptionsCount);
router.get('/agent/:agentId', authenticateToken, authorizeAgent, getStudentsByAgent);
router.get('/:id', authenticateToken, authorizeStudentAccess, getStudent);
router.post('/', authenticateToken, authorizeRoles('Agent', 'SuperAdmin'), createStudentValidation, validate, createStudent);
router.put('/:id', authenticateToken, authorizeStudentAccess, updateStudentValidation, validate, updateStudent);
router.post('/:id/documents', authenticateToken, authorizeStudentAccess, authorizeRoles('Agent'), uploadSingleMiddleware, documentValidation, validate, uploadDocument);
router.post('/:id/documents/bulk', authenticateToken, authorizeStudentAccess, authorizeRoles('Agent', 'Admin'), uploadStudentDocumentsMiddleware, uploadBulkDocuments);
router.get('/:id/documents', authenticateToken, authorizeStudentAccess, getStudentDocuments);
router.delete('/:id/documents/:documentType', authenticateToken, authorizeStudentAccess, authorizeRoles('Agent', 'Admin'), deleteStudentDocument);
router.delete('/:id', authenticateToken, authorizeStudentAccess, deleteStudent);

// Student options routes
router.get('/:id/options', authenticateToken, authorizeStudentAccess, getStudentOptions);
router.put('/:id/options', authenticateToken, authorizeStudentAccess, studentOptionsValidation, validate, updateStudentOptions);

// Course linking routes
router.put('/:id/course', authenticateToken, authorizeStudentAccess, authorizeRoles('Agent', 'Admin'), linkCourseValidation, validate, linkStudentToCourse);
router.delete('/:id/course', authenticateToken, authorizeStudentAccess, authorizeRoles('Agent', 'Admin'), unlinkStudentFromCourse);

// Storage management routes (SuperAdmin only)
router.post('/cleanup/documents', authenticateToken, authorizeRoles('SuperAdmin'), cleanupOrphanedDocuments);
router.get('/storage/stats', authenticateToken, authorizeRoles('SuperAdmin'), getStorageStats);

export default router;


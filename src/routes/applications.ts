import express from 'express';
import {
    getApplications,
    getApplication,
    createApplication,
    updateApplication,
    deleteApplication,
    addApplicationComment,
    getApplicationsByStudent,
    getApplicationsByCourse,
    searchApplications,
    getApplicationStats
} from '../controllers/application';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// @route   GET /api/applications
// @desc    Get all applications with filtering and pagination
// @access  Agent, Admin, SuperAdmin
router.get('/', getApplications);

// @route   GET /api/applications/stats
// @desc    Get application statistics
// @access  Agent, Admin, SuperAdmin
router.get('/stats', getApplicationStats);

// @route   GET /api/applications/search
// @desc    Search applications
// @access  Agent, Admin, SuperAdmin
router.get('/search', searchApplications);

// @route   GET /api/applications/student/:studentId
// @desc    Get applications by student ID
// @access  Agent, Admin, SuperAdmin
router.get('/student/:studentId', getApplicationsByStudent);

// @route   GET /api/applications/course/:courseId
// @desc    Get applications by course ID
// @access  Agent, Admin, SuperAdmin
router.get('/course/:courseId', getApplicationsByCourse);

// @route   GET /api/applications/:id
// @desc    Get single application by ID
// @access  Agent, Admin, SuperAdmin
router.get('/:id', getApplication);

// @route   POST /api/applications
// @desc    Create new application
// @access  Agent, Admin, SuperAdmin
router.post('/', createApplication);

// @route   PUT /api/applications/:id
// @desc    Update application
// @access  Agent, Admin, SuperAdmin
router.put('/:id', updateApplication);

// @route   DELETE /api/applications/:id
// @desc    Delete application (soft delete)
// @access  Agent, Admin, SuperAdmin
router.delete('/:id', deleteApplication);

// @route   POST /api/applications/:id/comments
// @desc    Add comment to application
// @access  Agent, Admin, SuperAdmin
router.post('/:id/comments', addApplicationComment);

export default router;

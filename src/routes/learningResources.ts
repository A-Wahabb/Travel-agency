import express from 'express';
import {
    getLearningResources,
    getLearningResourceByCountry,
    uploadLearningResourceFile,
    deleteLearningResourceFile,
    downloadLearningResourceFile
} from '../controllers/learningResource';
import {
    authenticateToken,
    authorizeRoles
} from '../middlewares/auth';
import { uploadLearningResourceMiddleware } from '../middlewares/learningResourceUpload';

const router = express.Router();

// @route   GET /api/learning-resources
// @desc    Get all learning resources
// @access  SuperAdmin, Admin, Agent
router.get('/', authenticateToken, authorizeRoles('SuperAdmin', 'Admin', 'Agent'), getLearningResources);

// @route   GET /api/learning-resources/:country
// @desc    Get learning resource by country
// @access  SuperAdmin, Admin, Agent
router.get('/:country', authenticateToken, authorizeRoles('SuperAdmin', 'Admin', 'Agent'), getLearningResourceByCountry);

// @route   POST /api/learning-resources/:country/upload
// @desc    Upload file to learning resource
// @access  SuperAdmin only
router.post('/:country/upload', authenticateToken, authorizeRoles('SuperAdmin'), uploadLearningResourceMiddleware, uploadLearningResourceFile);

// @route   DELETE /api/learning-resources/:country/files/:fileId
// @desc    Delete file from learning resource
// @access  SuperAdmin only
router.delete('/:country/files/:fileId', authenticateToken, authorizeRoles('SuperAdmin'), deleteLearningResourceFile);

// @route   GET /api/learning-resources/:country/files/:fileId/download
// @desc    Get download URL for file
// @access  SuperAdmin, Admin, Agent
router.get('/:country/files/:fileId/download', authenticateToken, authorizeRoles('SuperAdmin', 'Admin', 'Agent'), downloadLearningResourceFile);

export default router;


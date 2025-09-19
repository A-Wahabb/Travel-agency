import express from 'express';
import { body } from 'express-validator';
import {
    getOffices,
    getOffice,
    createOffice,
    updateOffice,
    deleteOffice
} from '../controllers/office';
import {
    authenticateToken,
    authorizeSuperAdmin
} from '../middlewares/auth';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const createOfficeValidation = [
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Office name must be between 2 and 100 characters'),
    body('address')
        .isLength({ min: 5, max: 500 })
        .withMessage('Address must be between 5 and 500 characters'),
    body('location')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Location cannot exceed 1000 characters')
        .custom((value) => {
            if (!value) return true; // Optional field
            // Allow Google Maps links, coordinates, or other location formats
            const urlPattern = /^https?:\/\/.+/;
            const coordinatePattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
            if (urlPattern.test(value) || coordinatePattern.test(value) || value.length > 0) {
                return true;
            }
            throw new Error('Location must be a valid URL, coordinates, or location description');
        })
];

const updateOfficeValidation = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Office name must be between 2 and 100 characters'),
    body('address')
        .optional()
        .isLength({ min: 5, max: 500 })
        .withMessage('Address must be between 5 and 500 characters'),
    body('location')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Location cannot exceed 1000 characters')
        .custom((value) => {
            if (!value) return true; // Optional field
            // Allow Google Maps links, coordinates, or other location formats
            const urlPattern = /^https?:\/\/.+/;
            const coordinatePattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
            if (urlPattern.test(value) || coordinatePattern.test(value) || value.length > 0) {
                return true;
            }
            throw new Error('Location must be a valid URL, coordinates, or location description');
        })
];

// Routes
router.get('/', authenticateToken, authorizeSuperAdmin, getOffices);
router.get('/:id', authenticateToken, authorizeSuperAdmin, getOffice);
router.post('/', authenticateToken, authorizeSuperAdmin, createOfficeValidation, validate, createOffice);
router.put('/:id', authenticateToken, authorizeSuperAdmin, updateOfficeValidation, validate, updateOffice);
router.delete('/:id', authenticateToken, authorizeSuperAdmin, deleteOffice);

export default router;


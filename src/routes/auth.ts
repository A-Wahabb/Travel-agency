import express from 'express';
import { body } from 'express-validator';
import { login, getProfile, updateProfile, changePassword, logout, refreshToken } from '../controllers/auth';
import { authenticateToken } from '../middlewares/auth';
import validate from '../middlewares/validate';

const router = express.Router();

// Validation rules
const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
];

const updateProfileValidation = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please enter a valid phone number')
];

const changePasswordValidation = [
    body('currentPassword')
        .isLength({ min: 6 })
        .withMessage('Current password must be at least 6 characters'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        })
];

const refreshTokenValidation = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
];

// Routes
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refreshTokenValidation, validate, refreshToken);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, validate, updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, validate, changePassword);
router.post('/logout', authenticateToken, logout);

export default router;


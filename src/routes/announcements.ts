import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, authorizeAdmin, authorizeAgent, authorizeSuperAdmin } from '../middlewares/auth';
import { createAnnouncement, getActiveAnnouncements, updateAnnouncementTimeWindow, listAnnouncements, deleteAnnouncement } from '../controllers/announcement';
import validate from '../middlewares/validate';

const router = express.Router();

const createValidation = [
    body('message').isString().isLength({ min: 1, max: 2000 }),
    body('title').optional().isString().isLength({ max: 200 }),
    body('officeIds').isArray({ min: 1 }),
    body('startsAt').isISO8601(),
    body('endsAt').isISO8601(),
    body('audienceRoles').optional().isArray().custom((arr) => arr.every((r: string) => ['Admin', 'Agent'].includes(r)))
];

const updateWindowValidation = [
    body('startsAt').optional().isISO8601(),
    body('endsAt').optional().isISO8601()
];

router.post('/', authenticateToken, authorizeAdmin, createValidation, validate, createAnnouncement);
router.get('/active', authenticateToken, authorizeAgent, getActiveAnnouncements);
router.get('/', authenticateToken, authorizeAdmin, listAnnouncements);
router.patch('/:id/time-window', authenticateToken, authorizeAdmin, updateWindowValidation, validate, updateAnnouncementTimeWindow);
router.delete('/:id', authenticateToken, authorizeSuperAdmin, deleteAnnouncement);

export default router;



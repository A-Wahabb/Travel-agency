import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';

// File filter for learning resource uploads
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Only PDF, images, and Office documents are allowed.`));
    }
};

// Configure multer for memory storage (since we're uploading to S3)
const storage = multer.memoryStorage();

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
    }
});

// Middleware for single file upload
export const uploadLearningResourceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    upload.single('file')(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            let errorMessage = 'File upload error: ';

            switch (err.code) {
                case 'LIMIT_FILE_SIZE':
                    errorMessage += 'File size too large. Maximum size is 10MB per file.';
                    break;
                case 'LIMIT_UNEXPECTED_FILE':
                    errorMessage += 'Unexpected field name.';
                    break;
                default:
                    errorMessage += err.message;
            }

            res.status(400).json({
                success: false,
                message: errorMessage
            });
            return;
        } else if (err) {
            res.status(400).json({
                success: false,
                message: err.message
            });
            return;
        }

        // Validate that a file is uploaded
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
            return;
        }

        next();
    });
};


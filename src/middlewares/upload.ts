import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { FileUpload } from '../types';

// Create upload directories if they don't exist
const docsDir = path.join(__dirname, '../../uploads', 'docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, docsDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, images, and Office documents are allowed.'));
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5 // Maximum 5 files
    }
});

// Middleware for single file upload
export const uploadSingleMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    upload.single('document')(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            res.status(400).json({
                success: false,
                message: err.message
            });
            return;
        } else if (err) {
            res.status(400).json({
                success: false,
                message: err.message
            });
            return;
        }
        next();
    });
};

// Middleware for multiple file upload
export const uploadMultipleMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    upload.array('documents', 5)(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            res.status(400).json({
                success: false,
                message: err.message
            });
            return;
        } else if (err) {
            res.status(400).json({
                success: false,
                message: err.message
            });
            return;
        }
        next();
    });
};

// Helper function to delete file
export const deleteFile = (filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

// Helper function to get file info
export const getFileInfo = (file: Express.Multer.File): FileUpload => {
    return {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        destination: file.destination,
        filename: file.filename,
        path: file.path
    };
};


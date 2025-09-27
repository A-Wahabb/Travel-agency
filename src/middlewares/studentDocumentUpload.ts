import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { StudentDocumentType } from '../types';

// File filter for document uploads
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
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
        cb(new Error(`Invalid file type for ${file.fieldname}. Only PDF, images, and Office documents are allowed.`));
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
        files: 15 // Maximum 15 files (12 specific + up to 3 otherDocs)
    }
});

// Define the fields for student documents
const studentDocumentFields = [
    { name: 'profilePicture', maxCount: 1 },
    { name: 'matricCertificate', maxCount: 1 },
    { name: 'matricMarksSheet', maxCount: 1 },
    { name: 'intermediateCertificate', maxCount: 1 },
    { name: 'intermediateMarkSheet', maxCount: 1 },
    { name: 'degree', maxCount: 1 },
    { name: 'transcript', maxCount: 1 },
    { name: 'languageCertificate', maxCount: 1 },
    { name: 'passport', maxCount: 1 },
    { name: 'experienceLetter', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 },
    { name: 'familyRegistration', maxCount: 1 },
    { name: 'otherDocs', maxCount: 10 }
];

// Middleware for bulk document upload
export const uploadStudentDocumentsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    upload.fields(studentDocumentFields)(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            let errorMessage = 'File upload error: ';

            switch (err.code) {
                case 'LIMIT_FILE_SIZE':
                    errorMessage += 'File size too large. Maximum size is 10MB per file.';
                    break;
                case 'LIMIT_FILE_COUNT':
                    errorMessage += 'Too many files uploaded.';
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

        // Validate that at least one file is uploaded
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (!files || Object.keys(files).length === 0) {
            res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
            return;
        }

        next();
    });
};

// Helper function to organize uploaded files by document type
export const organizeUploadedFiles = (files: { [fieldname: string]: Express.Multer.File[] }) => {
    const organizedFiles: { [key: string]: Express.Multer.File | Express.Multer.File[] } = {};

    Object.keys(files).forEach(fieldname => {
        const fileArray = files[fieldname];

        if (fieldname === 'otherDocs') {
            // otherDocs can have multiple files
            organizedFiles[fieldname] = fileArray;
        } else {
            // Single file fields
            organizedFiles[fieldname] = fileArray[0];
        }
    });

    return organizedFiles;
};

// Helper function to validate document types
export const validateDocumentTypes = (files: { [fieldname: string]: Express.Multer.File | Express.Multer.File[] }) => {
    const validDocumentTypes: StudentDocumentType[] = [
        'profilePicture', 'matricCertificate', 'matricMarksSheet',
        'intermediateCertificate', 'intermediateMarkSheet', 'degree',
        'transcript', 'languageCertificate', 'passport',
        'experienceLetter', 'birthCertificate', 'familyRegistration', 'otherDocs'
    ];

    const invalidFields = Object.keys(files).filter(fieldname =>
        !validDocumentTypes.includes(fieldname as StudentDocumentType)
    );

    if (invalidFields.length > 0) {
        throw new Error(`Invalid document types: ${invalidFields.join(', ')}`);
    }

    return true;
};

// Helper function to get file info for S3 upload
export const getFileInfoForS3 = (file: Express.Multer.File): Express.Multer.File => {
    return {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
        stream: file.stream,
        destination: file.destination,
        filename: file.filename,
        path: file.path
    };
};

import crypto from 'crypto';

export interface DocumentValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fileHash?: string;
    duplicateFound?: boolean;
}

export interface ValidationOptions {
    maxFileSize: number; // in bytes
    allowedMimeTypes: string[];
    checkDuplicates: boolean;
    generateHash: boolean;
}

/**
 * Validate uploaded document
 */
export const validateDocument = async (
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    options: ValidationOptions
): Promise<DocumentValidationResult> => {
    const result: DocumentValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Check file size
    if (buffer.length > options.maxFileSize) {
        result.errors.push(`File size exceeds maximum allowed size of ${formatFileSize(options.maxFileSize)}`);
        result.isValid = false;
    }

    // Check MIME type
    if (!options.allowedMimeTypes.includes(mimetype)) {
        result.errors.push(`File type ${mimetype} is not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`);
        result.isValid = false;
    }

    // Check filename
    if (!originalname || originalname.trim().length === 0) {
        result.errors.push('Filename is required');
        result.isValid = false;
    }

    // Check for suspicious file extensions vs MIME type mismatch
    const extension = originalname.toLowerCase().split('.').pop();
    const mimeTypeMap: { [key: string]: string[] } = {
        'pdf': ['application/pdf'],
        'jpg': ['image/jpeg'],
        'jpeg': ['image/jpeg'],
        'png': ['image/png'],
        'gif': ['image/gif'],
        'webp': ['image/webp'],
        'doc': ['application/msword'],
        'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'xls': ['application/vnd.ms-excel'],
        'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'ppt': ['application/vnd.ms-powerpoint'],
        'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation']
    };

    if (extension && mimeTypeMap[extension]) {
        if (!mimeTypeMap[extension].includes(mimetype)) {
            result.warnings.push(`File extension (.${extension}) doesn't match MIME type (${mimetype})`);
        }
    }

    // Check for empty files
    if (buffer.length === 0) {
        result.errors.push('File is empty');
        result.isValid = false;
    }

    // Check for suspiciously large files (warn only)
    const suspiciousSize = 50 * 1024 * 1024; // 50MB
    if (buffer.length > suspiciousSize) {
        result.warnings.push(`File is unusually large (${formatFileSize(buffer.length)}). Consider optimizing.`);
    }

    // Generate file hash if requested
    if (options.generateHash) {
        result.fileHash = generateFileHash(buffer);
    }

    return result;
};

/**
 * Check for duplicate documents based on file hash
 */
export const checkForDuplicates = async (
    fileHash: string,
    studentId: string,
    documentType?: string
): Promise<{ isDuplicate: boolean; existingDocument?: any }> => {
    // This would typically query the database for existing documents with the same hash
    // For now, return false as we don't have database access in this service
    return { isDuplicate: false };
};

/**
 * Generate SHA-256 hash of file buffer
 */
export const generateFileHash = (buffer: Buffer): string => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Sanitize filename to prevent directory traversal and other issues
 */
export const sanitizeFilename = (filename: string): string => {
    // Remove or replace dangerous characters
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        .substring(0, 255); // Limit length
};

/**
 * Validate document metadata
 */
export const validateDocumentMetadata = (metadata: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!metadata.studentId) {
        errors.push('Student ID is required');
    }

    if (!metadata.documentType) {
        errors.push('Document type is required');
    }

    if (!metadata.originalName) {
        errors.push('Original filename is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Get default validation options for student documents
 */
export const getDefaultValidationOptions = (): ValidationOptions => {
    return {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
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
        ],
        checkDuplicates: true,
        generateHash: true
    };
};

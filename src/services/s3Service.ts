import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { optimizeFile, shouldOptimizeFile, getFileSizeString, OptimizationOptions } from './fileOptimizationService';

// Load environment variables
dotenv.config();
// Validate required environment variables
const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

if (missingVars.length > 0) {
    console.error('Missing required AWS environment variables:', missingVars.join(', '));
    console.error('Please check your .env file and ensure all AWS S3 configuration variables are set.');
}

// Initialize S3 client
const s3Client = new S3Client({
    region: requiredEnvVars.AWS_REGION,
    credentials: {
        accessKeyId: requiredEnvVars.AWS_ACCESS_KEY_ID!,
        secretAccessKey: requiredEnvVars.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = requiredEnvVars.AWS_S3_BUCKET_NAME!;

export interface S3UploadResult {
    key: string;
    url: string;
    originalName: string;
    size: number;
    mimetype: string;
    uploadedAt: Date;
}

export interface DocumentUploadData {
    file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
        fieldname: string;
    };
    documentType: string;
    studentId: string;
}

/**
 * Upload a single file to S3 with optional optimization
 */
export const uploadFileToS3 = async (
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number; fieldname: string },
    documentType: string,
    studentId: string,
    optimizationOptions?: OptimizationOptions
): Promise<S3UploadResult & { optimizationInfo?: any }> => {
    try {
        let finalBuffer = file.buffer;
        let finalMimetype = file.mimetype;
        let optimizationInfo: any = null;

        // Optimize file if needed
        if (shouldOptimizeFile(file.buffer, file.mimetype, optimizationOptions?.maxSizeKB || 1024)) {
            console.log(`Optimizing file: ${file.originalname} (${getFileSizeString(file.buffer.length)})`);

            const optimizationResult = await optimizeFile(file.buffer, file.mimetype, optimizationOptions);

            if (optimizationResult.wasOptimized) {
                finalBuffer = optimizationResult.optimizedBuffer;
                finalMimetype = optimizationResult.optimizedMimetype;

                optimizationInfo = {
                    originalSize: optimizationResult.originalSize,
                    optimizedSize: optimizationResult.optimizedSize,
                    compressionRatio: optimizationResult.compressionRatio,
                    originalSizeString: getFileSizeString(optimizationResult.originalSize),
                    optimizedSizeString: getFileSizeString(optimizationResult.optimizedSize)
                };

                console.log(`File optimized: ${file.originalname} - ${optimizationInfo.originalSizeString} → ${optimizationInfo.optimizedSizeString} (${optimizationResult.compressionRatio.toFixed(1)}% reduction)`);
            }
        }

        // Generate unique filename with appropriate extension
        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `${studentId}/${documentType}/${uuidv4()}${fileExtension}`;

        // Upload to S3
        const uploadCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueFilename,
            Body: finalBuffer,
            ContentType: finalMimetype,
            Metadata: {
                originalName: file.originalname,
                documentType: documentType,
                studentId: studentId,
                uploadedAt: new Date().toISOString(),
                optimized: optimizationInfo ? 'true' : 'false',
                ...(optimizationInfo && {
                    originalSize: optimizationInfo.originalSize.toString(),
                    compressionRatio: optimizationInfo.compressionRatio.toFixed(1)
                })
            },
        });

        await s3Client.send(uploadCommand);

        
        // Generate presigned URL for access (valid for 1 hour)
        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueFilename,
        });

        const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

        return {
            key: uniqueFilename,
            url: presignedUrl,
            originalName: file.originalname,
            size: finalBuffer.length,
            mimetype: finalMimetype,
            uploadedAt: new Date(),
            optimizationInfo
        };
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw new Error('Failed to upload file to S3');
    }
};

/**
 * Upload multiple files to S3 with optional optimization
 */
export const uploadMultipleFilesToS3 = async (
    files: DocumentUploadData[],
    optimizationOptions?: OptimizationOptions
): Promise<(S3UploadResult & { optimizationInfo?: any })[]> => {
    try {
        const uploadPromises = files.map(({ file, documentType, studentId }) =>
            uploadFileToS3(file, documentType, studentId, optimizationOptions)
        );

        const results = await Promise.all(uploadPromises);
        return results;
    } catch (error) {
        console.error('Error uploading multiple files to S3:', error);
        throw new Error('Failed to upload files to S3');
    }
};

/**
 * Delete a file from S3
 */
export const deleteFileFromS3 = async (key: string): Promise<void> => {
    try {
        const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(deleteCommand);
    } catch (error) {
        console.error('Error deleting file from S3:', error);
        throw new Error('Failed to delete file from S3');
    }
};

/**
 * Delete multiple files from S3
 */
export const deleteMultipleFilesFromS3 = async (keys: string[]): Promise<{ success: string[]; failed: { key: string; error: string }[] }> => {
    try {
        const results = { success: [] as string[], failed: [] as { key: string; error: string }[] };

        // Process files in parallel for better performance
        const deletePromises = keys.map(async (key) => {
            try {
                await deleteFileFromS3(key);
                results.success.push(key);
            } catch (error) {
                results.failed.push({
                    key,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        await Promise.all(deletePromises);
        return results;
    } catch (error) {
        console.error('Error deleting multiple files from S3:', error);
        throw new Error('Failed to delete multiple files from S3');
    }
};

/**
 * Generate presigned URL for file access
 */
export const getPresignedUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
    try {
        const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        return await getSignedUrl(s3Client, getCommand, { expiresIn });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        throw new Error('Failed to generate presigned URL');
    }
};

/**
 * Generate presigned URLs for multiple files
 */
export const getPresignedUrls = async (keys: string[], expiresIn: number = 3600): Promise<{ key: string; url: string }[]> => {
    try {
        const urlPromises = keys.map(async (key) => ({
            key,
            url: await getPresignedUrl(key, expiresIn),
        }));

        return await Promise.all(urlPromises);
    } catch (error) {
        console.error('Error generating presigned URLs:', error);
        throw new Error('Failed to generate presigned URLs');
    }
};

/**
 * Clean up files from S3 (for rollback scenarios)
 */
export const cleanupFilesFromS3 = async (keys: string[]): Promise<void> => {
    try {
        const deletePromises = keys.map(key => deleteFileFromS3(key));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error cleaning up files from S3:', error);
        throw new Error('Failed to cleanup files from S3');
    }
};

/**
 * Extract S3 keys from old documents that need to be deleted
 */
export const getOldDocumentKeys = (oldDocuments: any, documentTypes: string[]): string[] => {
    const keysToDelete: string[] = [];

    documentTypes.forEach(documentType => {
        if (oldDocuments && oldDocuments[documentType]) {
            const document = oldDocuments[documentType];
            if (document.s3Key) {
                keysToDelete.push(document.s3Key);
            }
        }
    });

    return keysToDelete;
};

/**
 * Extract S3 keys from old otherDocs array
 */
export const getOldOtherDocsKeys = (oldOtherDocs: any[]): string[] => {
    const keysToDelete: string[] = [];

    if (oldOtherDocs && Array.isArray(oldOtherDocs)) {
        oldOtherDocs.forEach(doc => {
            if (doc.s3Key) {
                keysToDelete.push(doc.s3Key);
            }
        });
    }

    return keysToDelete;
};

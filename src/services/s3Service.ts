import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
// Validate required environment variables
const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION || 'eu-north-1',
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
 * Upload a single file to S3
 */
export const uploadFileToS3 = async (file: { buffer: Buffer; originalname: string; mimetype: string; size: number; fieldname: string }, documentType: string, studentId: string): Promise<S3UploadResult> => {
    try {
        // Generate unique filename
        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `${studentId}/${documentType}/${uuidv4()}${fileExtension}`;

        // Upload to S3
        const uploadCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueFilename,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
                originalName: file.originalname,
                documentType: documentType,
                studentId: studentId,
                uploadedAt: new Date().toISOString(),
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
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date(),
        };
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw new Error('Failed to upload file to S3');
    }
};

/**
 * Upload multiple files to S3
 */
export const uploadMultipleFilesToS3 = async (files: DocumentUploadData[]): Promise<S3UploadResult[]> => {
    try {
        const uploadPromises = files.map(({ file, documentType, studentId }) =>
            uploadFileToS3(file, documentType, studentId)
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

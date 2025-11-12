import { Request, Response } from 'express';
import LearningResource from '../models/LearningResource';
import { AuthenticatedRequest } from '../types';
import { uploadFileToS3, deleteFileFromS3, getPresignedUrl } from '../services/s3Service';
import { COUNTRIES } from '../constants/countries';

// @desc    Get all learning resources
// @route   GET /api/learning-resources
// @access  SuperAdmin, Admin, Agent
export const getLearningResources = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const resources = await LearningResource.find({}).sort({ country: 1 });

        // Generate presigned URLs for all files
        const resourcesWithUrls = await Promise.all(
            resources.map(async (resource) => {
                const filesWithUrls = await Promise.all(
                    resource.files.map(async (file: any) => {
                        const url = await getPresignedUrl(file.s3Key, 3600);
                        return {
                            _id: file._id?.toString(),
                            filename: file.filename,
                            originalName: file.originalName,
                            s3Key: file.s3Key,
                            s3Url: url,
                            size: file.size,
                            mimetype: file.mimetype,
                            uploadedAt: file.uploadedAt,
                            uploadedBy: file.uploadedBy
                        };
                    })
                );
                return {
                    ...resource.toObject(),
                    files: filesWithUrls
                };
            })
        );

        res.status(200).json({
            success: true,
            message: 'Learning resources retrieved successfully',
            data: resourcesWithUrls
        });
    } catch (error) {
        console.error('Get learning resources error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get learning resource by country
// @route   GET /api/learning-resources/:country
// @access  SuperAdmin, Admin, Agent
export const getLearningResourceByCountry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { country } = req.params;

        let resource = await LearningResource.findOne({ country });

        // Generate presigned URLs for files
        if (resource && resource.files.length > 0) {
            const filesWithUrls = await Promise.all(
                resource.files.map(async (file: any) => {
                    const url = await getPresignedUrl(file.s3Key, 3600);
                    return {
                        _id: file._id?.toString(),
                        filename: file.filename,
                        originalName: file.originalName,
                        s3Key: file.s3Key,
                        s3Url: url,
                        size: file.size,
                        mimetype: file.mimetype,
                        uploadedAt: file.uploadedAt,
                        uploadedBy: file.uploadedBy
                    };
                })
            );

            resource = {
                ...resource.toObject(),
                files: filesWithUrls
            } as any;
        }

        if (!resource) {
            res.status(200).json({
                success: true,
                message: 'Learning resource not found for this country',
                data: {
                    country,
                    files: []
                }
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Learning resource retrieved successfully',
            data: resource
        });
    } catch (error) {
        console.error('Get learning resource by country error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Upload file to learning resource
// @route   POST /api/learning-resources/:country/upload
// @access  SuperAdmin only
export const uploadLearningResourceFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let uploadedS3Key: string | null = null;

    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. Only SuperAdmin can upload files.'
            });
            return;
        }

        const { country } = req.params;

        if (!COUNTRIES.includes(country)) {
            res.status(400).json({
                success: false,
                message: 'Invalid country'
            });
            return;
        }

        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
            return;
        }

        // Find or create learning resource for this country
        let resource = await LearningResource.findOne({ country });

        if (!resource) {
            resource = await LearningResource.create({ country, files: [] });
        }

        // Check if maximum files limit reached
        if (resource.files.length >= 2) {
            res.status(400).json({
                success: false,
                message: 'Maximum 2 files allowed per country'
            });
            return;
        }

        // Convert multer file to format expected by uploadFileToS3
        const fileData = {
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            fieldname: req.file.fieldname || 'file'
        };

        const s3Result = await uploadFileToS3(
            fileData,
            'learning-resource',
            country
        );
        uploadedS3Key = s3Result.key;

        // Add file to resource
        resource.files.push({
            filename: s3Result.key.split('/').pop() || '',
            originalName: s3Result.originalName,
            s3Key: s3Result.key,
            s3Url: s3Result.url,
            size: s3Result.size,
            mimetype: s3Result.mimetype,
            uploadedAt: s3Result.uploadedAt,
            uploadedBy: req.user.id
        });

        await resource.save();

        // Reload resource to get fresh data
        const savedResource = await LearningResource.findById(resource._id);
        if (!savedResource) {
            throw new Error('Failed to reload resource after save');
        }

        // Build files array with presigned URLs
        const filesWithUrls = await Promise.all(
            savedResource.files.map(async (file: any) => {
                const fileUrl = await getPresignedUrl(file.s3Key, 3600);
                return {
                    _id: file._id?.toString(),
                    filename: file.filename,
                    originalName: file.originalName,
                    s3Key: file.s3Key,
                    s3Url: fileUrl,
                    size: file.size,
                    mimetype: file.mimetype,
                    uploadedAt: file.uploadedAt,
                    uploadedBy: file.uploadedBy
                };
            })
        );

        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                ...savedResource.toObject(),
                files: filesWithUrls
            }
        });
    } catch (error: any) {
        console.error('Upload learning resource file error:', error);

        // Cleanup uploaded file from S3 if there was an error
        if (uploadedS3Key) {
            try {
                await deleteFileFromS3(uploadedS3Key);
                console.log(`Cleaned up uploaded file due to error: ${uploadedS3Key}`);
            } catch (cleanupError) {
                console.error('Error cleaning up uploaded file:', cleanupError);
            }
        }

        if (error.name === 'ValidationError') {
            const validationErrors: { [key: string]: string } = {};
            Object.keys(error.errors).forEach(key => {
                validationErrors[key] = error.errors[key].message;
            });
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete file from learning resource
// @route   DELETE /api/learning-resources/:country/files/:fileId
// @access  SuperAdmin only
export const deleteLearningResourceFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. Only SuperAdmin can delete files.'
            });
            return;
        }

        const { country, fileId } = req.params;

        const resource = await LearningResource.findOne({ country });

        if (!resource) {
            res.status(404).json({
                success: false,
                message: 'Learning resource not found for this country'
            });
            return;
        }

        const fileIndex = resource.files.findIndex(
            (file: any) => file._id.toString() === fileId
        );

        if (fileIndex === -1) {
            res.status(404).json({
                success: false,
                message: 'File not found'
            });
            return;
        }

        const fileToDelete = resource.files[fileIndex];
        const s3Key = (fileToDelete as any).s3Key;

        // Remove file from array
        resource.files.splice(fileIndex, 1);
        await resource.save();

        // Delete file from S3
        try {
            await deleteFileFromS3(s3Key);
        } catch (s3Error) {
            console.error('Error deleting file from S3:', s3Error);
            // Continue even if S3 deletion fails
        }

        res.status(200).json({
            success: true,
            message: 'File deleted successfully',
            data: resource
        });
    } catch (error) {
        console.error('Delete learning resource file error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Download file from learning resource
// @route   GET /api/learning-resources/:country/files/:fileId/download
// @access  SuperAdmin, Admin, Agent
export const downloadLearningResourceFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { country, fileId } = req.params;

        const resource = await LearningResource.findOne({ country });

        if (!resource) {
            res.status(404).json({
                success: false,
                message: 'Learning resource not found for this country'
            });
            return;
        }

        const file = resource.files.find(
            (file: any) => file._id.toString() === fileId
        );

        if (!file) {
            res.status(404).json({
                success: false,
                message: 'File not found'
            });
            return;
        }

        // Generate presigned URL for download (valid for 1 hour)
        const downloadUrl = await getPresignedUrl((file as any).s3Key, 3600);

        res.status(200).json({
            success: true,
            message: 'Download URL generated successfully',
            data: {
                downloadUrl,
                fileName: (file as any).originalName,
                fileSize: (file as any).size,
                mimetype: (file as any).mimetype
            }
        });
    } catch (error) {
        console.error('Download learning resource file error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


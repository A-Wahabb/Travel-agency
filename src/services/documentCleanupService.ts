import { deleteFileFromS3, deleteMultipleFilesFromS3 } from './s3Service';
import Student from '../models/Student';
import { Document } from 'mongoose';

export interface CleanupResult {
    totalFilesChecked: number;
    orphanedFiles: string[];
    deletedFiles: string[];
    failedDeletions: { key: string; error: string }[];
    totalSpaceSaved: number;
}

export interface OrphanedFile {
    key: string;
    size: number;
    lastModified: Date;
    reason: 'student_deleted' | 'document_replaced' | 'no_reference';
}

/**
 * Find and clean up orphaned files in S3
 * This service helps maintain storage efficiency by removing files that are no longer referenced
 */
export class DocumentCleanupService {

    /**
     * Find orphaned files by scanning all student documents
     */
    static async findOrphanedFiles(): Promise<OrphanedFile[]> {
        const orphanedFiles: OrphanedFile[] = [];

        try {
            // Get all students and their document references
            const students = await Student.find({
                status: { $ne: 'inactive' }, // Only check active students
                studentDocuments: { $exists: true }
            }).select('studentDocuments');

            // Collect all referenced S3 keys
            const referencedKeys = new Set<string>();

            students.forEach(student => {
                if (student.studentDocuments) {
                    const docTypes = [
                        'profilePicture', 'matricCertificate', 'matricMarksSheet',
                        'intermediateCertificate', 'intermediateMarkSheet', 'degree',
                        'transcript', 'languageCertificate', 'passport',
                        'experienceLetter', 'birthCertificate', 'familyRegistration'
                    ];

                    docTypes.forEach(docType => {
                        const doc = (student.studentDocuments as any)[docType];
                        if (doc && doc.s3Key) {
                            referencedKeys.add(doc.s3Key);
                        }
                    });

                    if (student.studentDocuments.otherDocs) {
                        student.studentDocuments.otherDocs.forEach(doc => {
                            if (doc.s3Key) {
                                referencedKeys.add(doc.s3Key);
                            }
                        });
                    }
                }
            });

            console.log(`Found ${referencedKeys.size} referenced S3 keys in database`);

            // Note: In a real implementation, you would also need to list all files in S3
            // and compare them with the referenced keys to find orphaned files
            // This requires additional AWS SDK calls to ListObjects

        } catch (error) {
            console.error('Error finding orphaned files:', error);
        }

        return orphanedFiles;
    }

    /**
     * Clean up orphaned files
     */
    static async cleanupOrphanedFiles(orphanedFiles: OrphanedFile[]): Promise<CleanupResult> {
        const result: CleanupResult = {
            totalFilesChecked: orphanedFiles.length,
            orphanedFiles: orphanedFiles.map(f => f.key),
            deletedFiles: [],
            failedDeletions: [],
            totalSpaceSaved: 0
        };

        if (orphanedFiles.length === 0) {
            return result;
        }

        try {
            const keysToDelete = orphanedFiles.map(f => f.key);
            const deleteResults = await deleteMultipleFilesFromS3(keysToDelete);

            result.deletedFiles = deleteResults.success;
            result.failedDeletions = deleteResults.failed;

            // Calculate space saved
            orphanedFiles.forEach(file => {
                if (deleteResults.success.includes(file.key)) {
                    result.totalSpaceSaved += file.size;
                }
            });

            console.log(`Cleanup completed: ${result.deletedFiles.length} files deleted, ${result.totalSpaceSaved} bytes saved`);

        } catch (error) {
            console.error('Error during cleanup:', error);
        }

        return result;
    }

    /**
     * Clean up old document versions (keep only the latest)
     */
    static async cleanupOldVersions(studentId: string, documentType: string): Promise<void> {
        try {
            // This would implement versioning logic
            // For now, we rely on the replacement logic in the upload functions
            console.log(`Cleaning up old versions for student ${studentId}, document type ${documentType}`);
        } catch (error) {
            console.error('Error cleaning up old versions:', error);
        }
    }

    /**
     * Schedule periodic cleanup (to be called by a cron job or scheduler)
     */
    static async performScheduledCleanup(): Promise<CleanupResult> {
        console.log('Starting scheduled document cleanup...');

        try {
            const orphanedFiles = await this.findOrphanedFiles();
            const cleanupResult = await this.cleanupOrphanedFiles(orphanedFiles);

            console.log('Scheduled cleanup completed:', {
                orphanedFilesFound: orphanedFiles.length,
                filesDeleted: cleanupResult.deletedFiles.length,
                spaceSaved: this.formatFileSize(cleanupResult.totalSpaceSaved)
            });

            return cleanupResult;
        } catch (error) {
            console.error('Error during scheduled cleanup:', error);
            throw error;
        }
    }

    /**
     * Format file size in human readable format
     */
    static formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';

        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Get storage statistics
     */
    static async getStorageStats(): Promise<{
        totalStudents: number;
        totalDocuments: number;
        estimatedStorageUsed: number;
        lastCleanupDate?: Date;
    }> {
        try {
            const totalStudents = await Student.countDocuments({ status: { $ne: 'inactive' } });

            // Count documents (simplified - in reality you'd need to query S3 for actual storage usage)
            const studentsWithDocs = await Student.countDocuments({
                studentDocuments: { $exists: true },
                status: { $ne: 'inactive' }
            });

            return {
                totalStudents,
                totalDocuments: studentsWithDocs * 10, // Rough estimate
                estimatedStorageUsed: 0 // Would need S3 API calls to get real data
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            throw error;
        }
    }
}

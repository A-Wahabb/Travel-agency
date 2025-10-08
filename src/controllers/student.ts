import { Request, Response } from 'express';
import Student from '../models/Student';
import Agent from '../models/Agent';
import Office from '../models/Office';
import Course from '../models/Course';
import { AuthenticatedRequest, CreateStudentRequest, PaginationQuery, IDocument, UpdateStudentOptionsRequest, LinkStudentToCourseRequest, BulkDocumentUploadRequest, DocumentUploadResult, StudentDocumentType } from '../types';
import { getFileInfo } from '../middlewares/upload';
import { uploadFileToS3, uploadMultipleFilesToS3, cleanupFilesFromS3, deleteMultipleFilesFromS3, getOldDocumentKeys, getOldOtherDocsKeys, deleteFileFromS3 } from '../services/s3Service';
import { DocumentCleanupService } from '../services/documentCleanupService';
import { organizeUploadedFiles, validateDocumentTypes, getFileInfoForS3 } from '../middlewares/studentDocumentUpload';

// @desc    Get all students
// @route   GET /api/students
// @access  Agent, Admin, SuperAdmin
export const getStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { page = '1', limit = '10', search = '', sortBy = 'createdAt', sortOrder = 'desc' }: PaginationQuery = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query based on role
        const query: any = { status: { $ne: 'deleted' } };

        if (req.user.role === 'Agent') {
            query.agentId = req.user.id;
        } else if (req.user.role === 'Admin') {
            query.officeId = req.user.officeId;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { passportNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const students = await Student.find(query)
            .populate('officeId', 'name address location')
            .populate('agentId', 'name email officeId')
            .populate('courseId', 'name university country field level')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Student.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Students retrieved successfully',
            data: students,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Agent, Admin, SuperAdmin
export const getStudent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const student = await Student.findById(req.params.id)
            .populate('officeId', 'name address location')
            .populate('agentId', 'name email officeId')
            .populate('courseId', 'name university country field level');

        res.status(200).json({
            success: true,
            message: 'Student retrieved successfully',
            data: student
        });
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create student
// @route   POST /api/students
// @access  Agent, SuperAdmin
export const createStudent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const {
            studentCode,
            name,
            email,
            officeId,
            agentId,
            phone,
            dateOfBirth,
            nationality,
            passportNumber,
            // Academic Information
            qualification,
            score,
            percentage,
            lastInstitute,
            experience,
            test,
            testScore,
            // Attestation Status
            boardAttestation,
            ibccAttestation,
            hecAttestation,
            mofaAttestation,
            apostilleAttestation,
            // Country Preferences
            country1,
            country2
        }: CreateStudentRequest = req.body;

        // Check if email already exists
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
            return;
        }

        // Check if student code already exists
        const existingStudentCode = await Student.findOne({ studentCode });
        if (existingStudentCode) {
            res.status(400).json({
                success: false,
                message: 'Student code already exists'
            });
            return;
        }

        let finalOfficeId: string;
        let finalAgentId: string;

        // Handle role-based logic
        if (req.user!.role === 'Agent') {
            // Agent: auto-set office to agent's office, agentId to current user
            finalOfficeId = req.user!.officeId!;
            finalAgentId = req.user!.id;

            // Validate that provided officeId matches agent's office (if provided)
            if (officeId && officeId !== req.user!.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Can only create students for your own office'
                });
                return;
            }
        } else if (req.user!.role === 'SuperAdmin') {
            // SuperAdmin: officeId is required, agentId is optional
            if (!officeId) {
                res.status(400).json({
                    success: false,
                    message: 'Office ID is required for SuperAdmin'
                });
                return;
            }

            finalOfficeId = officeId;
            finalAgentId = agentId || req.user!.id; // Use provided agentId or default to SuperAdmin
        }

        // Validate office exists
        const office = await Office.findById(finalOfficeId);
        if (!office) {
            res.status(400).json({
                success: false,
                message: 'Office not found'
            });
            return;
        }

        // Validate agent exists and belongs to the office (if provided)
        if (finalAgentId && finalAgentId !== req.user!.id) {
            const agent = await Agent.findById(finalAgentId);
            if (!agent) {
                res.status(400).json({
                    success: false,
                    message: 'Agent not found'
                });
                return;
            }
            if (agent.officeId !== finalOfficeId) {
                res.status(400).json({
                    success: false,
                    message: 'Agent does not belong to the specified office'
                });
                return;
            }
        }

        const student = await Student.create({
            studentCode,
            name,
            email,
            officeId: finalOfficeId,
            agentId: finalAgentId,
            phone,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            nationality,
            passportNumber,
            // Academic Information
            qualification,
            score,
            percentage,
            lastInstitute,
            experience,
            test,
            testScore,
            // Attestation Status
            boardAttestation,
            ibccAttestation,
            hecAttestation,
            mofaAttestation,
            apostilleAttestation,
            // Country Preferences
            country1,
            country2
        });

        await student.populate('officeId', 'name address location');
        await student.populate('agentId', 'name email officeId');

        const studentResponse = {
            _id: student._id,
            studentCode: student.studentCode,
            name: student.name,
            email: student.email,
            officeId: student.officeId,
            agentId: student.agentId,
            phone: student.phone,
            dateOfBirth: student.dateOfBirth,
            nationality: student.nationality,
            passportNumber: student.passportNumber,
            // Academic Information
            qualification: student.qualification,
            score: student.score,
            percentage: student.percentage,
            lastInstitute: student.lastInstitute,
            experience: student.experience,
            test: student.test,
            testScore: student.testScore,
            // Attestation Status
            boardAttestation: student.boardAttestation,
            ibccAttestation: student.ibccAttestation,
            hecAttestation: student.hecAttestation,
            mofaAttestation: student.mofaAttestation,
            apostilleAttestation: student.apostilleAttestation,
            // Country Preferences
            country1: student.country1,
            country2: student.country2,
            documents: student.documents,
            status: student.status,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt
        };

        res.status(201).json({
            success: true,
            message: 'Student created successfully',
            data: studentResponse
        });
    } catch (error: any) {
        console.error('Create student error:', error);

        // Handle Mongoose validation errors
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

        // Handle duplicate key error (email already exists)
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
            return;
        }

        // For other errors, let the error handler middleware handle them
        throw error;
    }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Agent, Admin
export const updateStudent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const {
            studentCode,
            name,
            email,
            phone,
            dateOfBirth,
            nationality,
            passportNumber,
            status,
            // Academic Information
            qualification,
            score,
            percentage,
            lastInstitute,
            experience,
            test,
            testScore,
            // Attestation Status
            boardAttestation,
            ibccAttestation,
            hecAttestation,
            mofaAttestation,
            apostilleAttestation,
            // Country Preferences
            country1,
            country2
        } = req.body;

        const student = await Student.findById(req.params.id);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check if email already exists (if changing email)
        if (email && email !== student.email) {
            const existingStudent = await Student.findOne({ email });
            if (existingStudent) {
                res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
                return;
            }
        }

        // Check if student code already exists (if changing student code)
        if (studentCode && studentCode !== student.studentCode) {
            const existingStudentCode = await Student.findOne({ studentCode });
            if (existingStudentCode) {
                res.status(400).json({
                    success: false,
                    message: 'Student code already exists'
                });
                return;
            }
        }

        // Update fields
        if (studentCode) student.studentCode = studentCode;
        if (name) student.name = name;
        if (email) student.email = email;
        if (phone !== undefined) student.phone = phone;
        if (dateOfBirth) student.dateOfBirth = new Date(dateOfBirth);
        if (nationality) student.nationality = nationality;
        if (passportNumber) student.passportNumber = passportNumber;
        if (status) student.status = status;
        // Academic Information
        if (qualification) student.qualification = qualification;
        if (score !== undefined) student.score = score;
        if (percentage !== undefined) student.percentage = percentage;
        if (lastInstitute) student.lastInstitute = lastInstitute;
        if (experience) student.experience = experience;
        if (test) student.test = test;
        if (testScore !== undefined) student.testScore = testScore;
        // Attestation Status
        if (boardAttestation) student.boardAttestation = boardAttestation;
        if (ibccAttestation) student.ibccAttestation = ibccAttestation;
        if (hecAttestation) student.hecAttestation = hecAttestation;
        if (mofaAttestation) student.mofaAttestation = mofaAttestation;
        if (apostilleAttestation) student.apostilleAttestation = apostilleAttestation;
        // Country Preferences
        if (country1) student.country1 = country1;
        if (country2) student.country2 = country2;

        await student.save();
        await student.populate('officeId', 'name address location');
        await student.populate('agentId', 'name email officeId');

        const studentResponse = {
            _id: student._id,
            studentCode: student.studentCode,
            name: student.name,
            email: student.email,
            officeId: student.officeId,
            agentId: student.agentId,
            phone: student.phone,
            dateOfBirth: student.dateOfBirth,
            nationality: student.nationality,
            passportNumber: student.passportNumber,
            // Academic Information
            qualification: student.qualification,
            score: student.score,
            percentage: student.percentage,
            lastInstitute: student.lastInstitute,
            experience: student.experience,
            test: student.test,
            testScore: student.testScore,
            // Attestation Status
            boardAttestation: student.boardAttestation,
            ibccAttestation: student.ibccAttestation,
            hecAttestation: student.hecAttestation,
            mofaAttestation: student.mofaAttestation,
            apostilleAttestation: student.apostilleAttestation,
            // Country Preferences
            country1: student.country1,
            country2: student.country2,
            documents: student.documents,
            status: student.status,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt
        };

        res.status(200).json({
            success: true,
            message: 'Student updated successfully',
            data: studentResponse
        });
    } catch (error: any) {
        console.error('Update student error:', error);

        // Handle Mongoose validation errors
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

        // Handle duplicate key error (email already exists)
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
            return;
        }

        // For other errors, let the error handler middleware handle them
        throw error;
    }
};

// @desc    Upload document
// @route   POST /api/students/:id/documents
// @access  Agent
export const uploadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let uploadedS3Key: string | null = null;
    let oldS3Key: string | null = null;

    try {
        const { documentType = 'other' } = req.body;

        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
            return;
        }

        const student = await Student.findById(req.params.id);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check if there's an existing document of this type to replace
        const currentStudentDocuments = student.studentDocuments || {};
        const existingDocument = currentStudentDocuments[documentType as keyof typeof currentStudentDocuments];

        // Only handle single documents for this endpoint (not otherDocs array)
        if (existingDocument && !Array.isArray(existingDocument) && existingDocument.s3Key) {
            oldS3Key = existingDocument.s3Key;
        }

        // Upload to S3 with optimization
        const optimizationOptions = {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 85,
            maxSizeKB: 1024 // 1MB
        };
        const s3Result = await uploadFileToS3(req.file, documentType, req.params.id, optimizationOptions);
        uploadedS3Key = s3Result.key;

        const document: IDocument = {
            filename: s3Result.key.split('/').pop() || '',
            originalName: s3Result.originalName,
            path: s3Result.url,
            uploadedAt: s3Result.uploadedAt,
            documentType: documentType as 'passport' | 'visa' | 'certificate' | 'other',
            s3Key: s3Result.key,
            s3Url: s3Result.url,
            size: s3Result.size,
            mimetype: s3Result.mimetype
        };

        // Initialize studentDocuments if it doesn't exist
        if (!student.studentDocuments) {
            student.studentDocuments = {};
        }

        // Replace the document in studentDocuments
        (student.studentDocuments as any)[documentType] = document;

        await student.save();

        // Delete old document from S3 after successful upload and save
        if (oldS3Key) {
            try {
                await deleteFileFromS3(oldS3Key);
                console.log(`Deleted old ${documentType} document from S3: ${oldS3Key}`);
            } catch (deleteError) {
                console.error('Error deleting old document from S3:', deleteError);
                // Don't fail the entire operation if cleanup fails
            }
        }

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                ...document,
                oldDocumentDeleted: !!oldS3Key
            }
        });
    } catch (error) {
        console.error('Upload document error:', error);

        // Cleanup uploaded file from S3 if there was an error
        if (uploadedS3Key) {
            try {
                await deleteFileFromS3(uploadedS3Key);
                console.log(`Cleaned up uploaded file due to error: ${uploadedS3Key}`);
            } catch (cleanupError) {
                console.error('Error cleaning up uploaded file:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete student (soft delete)
// @route   DELETE /api/students/:id
// @access  Agent, Admin
export const deleteStudent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Collect all S3 keys to delete
        const s3KeysToDelete: string[] = [];

        if (student.studentDocuments) {
            // Get keys from individual documents
            const documentTypes = [
                'profilePicture', 'matricCertificate', 'matricMarksSheet',
                'intermediateCertificate', 'intermediateMarkSheet', 'degree',
                'transcript', 'languageCertificate', 'passport',
                'experienceLetter', 'birthCertificate', 'familyRegistration'
            ];

            documentTypes.forEach(docType => {
                const doc = (student.studentDocuments as any)[docType];
                if (doc && doc.s3Key) {
                    s3KeysToDelete.push(doc.s3Key);
                }
            });

            // Get keys from otherDocs array
            if (student.studentDocuments.otherDocs) {
                student.studentDocuments.otherDocs.forEach(doc => {
                    if (doc.s3Key) {
                        s3KeysToDelete.push(doc.s3Key);
                    }
                });
            }
        }

        // Soft delete
        student.status = 'inactive';
        await student.save();

        // Delete all documents from S3 after successful save
        if (s3KeysToDelete.length > 0) {
            try {
                const deleteResults = await deleteMultipleFilesFromS3(s3KeysToDelete);
                console.log(`Deleted ${deleteResults.success.length} student documents from S3`);
                if (deleteResults.failed.length > 0) {
                    console.warn(`Failed to delete ${deleteResults.failed.length} documents:`, deleteResults.failed);
                }
            } catch (deleteError) {
                console.error('Error deleting student documents from S3:', deleteError);
                // Don't fail the operation if S3 cleanup fails
            }
        }

        res.status(200).json({
            success: true,
            message: 'Student deleted successfully',
            data: {
                documentsDeleted: s3KeysToDelete.length
            }
        });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update student options
// @route   PUT /api/students/:id/options
// @access  Agent, Admin
export const updateStudentOptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const studentOptions: UpdateStudentOptionsRequest = req.body;

        const student = await Student.findById(req.params.id);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Update student options
        if (studentOptions.clients !== undefined) student.studentOptions.clients = studentOptions.clients;
        if (studentOptions.initialPayment !== undefined) student.studentOptions.initialPayment = studentOptions.initialPayment;
        if (studentOptions.documents !== undefined) student.studentOptions.documents = studentOptions.documents;
        if (studentOptions.applications !== undefined) student.studentOptions.applications = studentOptions.applications;
        if (studentOptions.offerLetterSecured !== undefined) student.studentOptions.offerLetterSecured = studentOptions.offerLetterSecured;
        if (studentOptions.secondPaymentDone !== undefined) student.studentOptions.secondPaymentDone = studentOptions.secondPaymentDone;
        if (studentOptions.visaApplication !== undefined) student.studentOptions.visaApplication = studentOptions.visaApplication;
        if (studentOptions.visaSecured !== undefined) student.studentOptions.visaSecured = studentOptions.visaSecured;
        if (studentOptions.finalPayment !== undefined) student.studentOptions.finalPayment = studentOptions.finalPayment;

        await student.save();
        await student.populate('officeId', 'name address location');
        await student.populate('agentId', 'name email officeId');

        res.status(200).json({
            success: true,
            message: 'Student options updated successfully',
            data: {
                _id: student._id,
                name: student.name,
                email: student.email,
                studentOptions: student.studentOptions
            }
        });
    } catch (error: any) {
        console.error('Update student options error:', error);

        // Handle Mongoose validation errors
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

        // For other errors, let the error handler middleware handle them
        throw error;
    }
};

// @desc    Get student options
// @route   GET /api/students/:id/options
// @access  Agent, Admin, SuperAdmin
export const getStudentOptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const student = await Student.findById(req.params.id)
            .select('name email studentOptions');

        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Student options retrieved successfully',
            data: {
                _id: student._id,
                name: student.name,
                email: student.email,
                studentOptions: student.studentOptions
            }
        });
    } catch (error) {
        console.error('Get student options error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get student options count
// @route   GET /api/students/options/count
// @access  Agent, Admin, SuperAdmin
export const getStudentOptionsCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Build match query based on role
        const matchQuery: any = { status: { $ne: 'deleted' } };

        if (req.user.role === 'Agent') {
            matchQuery.agentId = req.user.id;
        } else if (req.user.role === 'Admin') {
            matchQuery.officeId = req.user.officeId;
        }
        // SuperAdmin can access all students (no additional filter)

        const pipeline = [
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalStudents: { $sum: 1 },
                    clients: { $sum: { $cond: ['$studentOptions.clients', 1, 0] } },
                    initialPayment: { $sum: { $cond: ['$studentOptions.initialPayment', 1, 0] } },
                    documents: { $sum: { $cond: ['$studentOptions.documents', 1, 0] } },
                    applications: { $sum: { $cond: ['$studentOptions.applications', 1, 0] } },
                    offerLetterSecured: { $sum: { $cond: ['$studentOptions.offerLetterSecured', 1, 0] } },
                    secondPaymentDone: { $sum: { $cond: ['$studentOptions.secondPaymentDone', 1, 0] } },
                    visaApplication: { $sum: { $cond: ['$studentOptions.visaApplication', 1, 0] } },
                    visaSecured: { $sum: { $cond: ['$studentOptions.visaSecured', 1, 0] } },
                    finalPayment: { $sum: { $cond: ['$studentOptions.finalPayment', 1, 0] } }
                }
            }
        ];

        const result = await Student.aggregate(pipeline);

        if (result.length === 0) {
            // No students found, return zero counts
            const emptyCounts = {
                totalStudents: 0,
                clients: 0,
                initialPayment: 0,
                documents: 0,
                applications: 0,
                offerLetterSecured: 0,
                secondPaymentDone: 0,
                visaApplication: 0,
                visaSecured: 0,
                finalPayment: 0
            };

            res.status(200).json({
                success: true,
                message: 'Student options count retrieved successfully',
                data: emptyCounts
            });
            return;
        }

        const counts = result[0];
        delete counts._id; // Remove the _id field from the response

        res.status(200).json({
            success: true,
            message: 'Student options count retrieved successfully',
            data: counts
        });
    } catch (error) {
        console.error('Get student options count error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Link student to course
// @route   PUT /api/students/:id/course
// @access  Agent, Admin
export const linkStudentToCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { courseId }: LinkStudentToCourseRequest = req.body;

        // Find student and check access
        const student = await Student.findById(req.params.id);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            if (student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to you.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            if (student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to your office.'
                });
                return;
            }
        }

        // Check if course exists and is active
        const course = await Course.findById(courseId);
        if (!course || !course.isActive) {
            res.status(404).json({
                success: false,
                message: 'Course not found or inactive'
            });
            return;
        }

        // Link student to course
        student.courseId = courseId;
        await student.save();

        await student.populate('officeId', 'name address location');
        await student.populate('agentId', 'name email officeId');
        await student.populate('courseId', 'name university country field level');

        res.status(200).json({
            success: true,
            message: 'Student linked to course successfully',
            data: {
                _id: student._id,
                name: student.name,
                email: student.email,
                courseId: student.courseId,
                course: student.courseId
            }
        });
    } catch (error) {
        console.error('Link student to course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Unlink student from course
// @route   DELETE /api/students/:id/course
// @access  Agent, Admin
export const unlinkStudentFromCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Find student and check access
        const student = await Student.findById(req.params.id);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            if (student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to you.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            if (student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to your office.'
                });
                return;
            }
        }

        // Unlink student from course
        student.courseId = undefined;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Student unlinked from course successfully'
        });
    } catch (error) {
        console.error('Unlink student from course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Upload multiple documents for a student
// @route   POST /api/students/:id/documents/bulk
// @access  Agent, Admin
export const uploadBulkDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let uploadedS3Keys: string[] = [];
    let oldS3KeysToDelete: string[] = [];

    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const studentId = req.params.id;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Find student and check access
        const student = await Student.findById(studentId);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            if (student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to you.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            if (student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to your office.'
                });
                return;
            }
        }

        // Organize and validate uploaded files
        const organizedFiles = organizeUploadedFiles(files);
        validateDocumentTypes(organizedFiles);

        // Store current student documents for cleanup
        const currentStudentDocuments = student.studentDocuments || {};
        const documentTypesToReplace = Object.keys(organizedFiles);

        // Extract old S3 keys that need to be deleted
        oldS3KeysToDelete = getOldDocumentKeys(currentStudentDocuments, documentTypesToReplace);

        // Handle otherDocs replacement
        if (organizedFiles.otherDocs) {
            const oldOtherDocsKeys = getOldOtherDocsKeys(currentStudentDocuments.otherDocs || []);
            oldS3KeysToDelete.push(...oldOtherDocsKeys);
        }

        // Prepare documents for S3 upload
        const documentsToUpload: Array<{ file: { buffer: Buffer; originalname: string; mimetype: string; size: number; fieldname: string }; documentType: string; studentId: string }> = [];
        const uploadResults: DocumentUploadResult[] = [];

        // Process each document type
        Object.keys(organizedFiles).forEach(fieldname => {
            const fileData = organizedFiles[fieldname];

            if (fieldname === 'otherDocs' && Array.isArray(fileData)) {
                // Handle multiple otherDocs
                fileData.forEach((file, index) => {
                    documentsToUpload.push({
                        file: {
                            buffer: file.buffer,
                            originalname: file.originalname,
                            mimetype: file.mimetype,
                            size: file.size,
                            fieldname: file.fieldname
                        },
                        documentType: `${fieldname}_${index}`,
                        studentId: studentId
                    });
                });
            } else if (!Array.isArray(fileData)) {
                // Handle single file
                documentsToUpload.push({
                    file: {
                        buffer: fileData.buffer,
                        originalname: fileData.originalname,
                        mimetype: fileData.mimetype,
                        size: fileData.size,
                        fieldname: fileData.fieldname
                    },
                    documentType: fieldname,
                    studentId: studentId
                });
            }
        });

        // Upload files to S3 with optimization
        const optimizationOptions = {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 85,
            maxSizeKB: 1024 // 1MB
        };
        const s3Results = await uploadMultipleFilesToS3(documentsToUpload, optimizationOptions);

        // Process S3 results and create document records
        let s3ResultIndex = 0;

        Object.keys(organizedFiles).forEach(fieldname => {
            const fileData = organizedFiles[fieldname];

            if (fieldname === 'otherDocs' && Array.isArray(fileData)) {
                // Handle multiple otherDocs
                const otherDocs: IDocument[] = [];

                fileData.forEach((file, index) => {
                    const s3Result = s3Results[s3ResultIndex++];
                    uploadedS3Keys.push(s3Result.key);

                    const document: IDocument = {
                        filename: s3Result.key.split('/').pop() || '',
                        originalName: s3Result.originalName,
                        path: s3Result.url,
                        uploadedAt: s3Result.uploadedAt,
                        documentType: 'other',
                        s3Key: s3Result.key,
                        s3Url: s3Result.url,
                        size: s3Result.size,
                        mimetype: s3Result.mimetype
                    };

                    otherDocs.push(document);

                    uploadResults.push({
                        documentType: fieldname as StudentDocumentType,
                        success: true,
                        document: document
                    });
                });

                // Update student documents
                if (!student.studentDocuments) {
                    student.studentDocuments = {};
                }
                student.studentDocuments.otherDocs = otherDocs;

            } else if (!Array.isArray(fileData)) {
                // Handle single file
                const s3Result = s3Results[s3ResultIndex++];
                uploadedS3Keys.push(s3Result.key);

                const document: IDocument = {
                    filename: s3Result.key.split('/').pop() || '',
                    originalName: s3Result.originalName,
                    path: s3Result.url,
                    uploadedAt: s3Result.uploadedAt,
                    documentType: fieldname === 'passport' ? 'passport' : 'certificate',
                    s3Key: s3Result.key,
                    s3Url: s3Result.url,
                    size: s3Result.size,
                    mimetype: s3Result.mimetype
                };

                // Update student documents
                if (!student.studentDocuments) {
                    student.studentDocuments = {};
                }

                (student.studentDocuments as any)[fieldname] = document;

                uploadResults.push({
                    documentType: fieldname as StudentDocumentType,
                    success: true,
                    document: document
                });
            }
        });

        // Save student with updated documents
        await student.save();

        // Delete old documents from S3 after successful upload and save
        if (oldS3KeysToDelete.length > 0) {
            try {
                const deleteResults = await deleteMultipleFilesFromS3(oldS3KeysToDelete);
                console.log(`Deleted ${deleteResults.success.length} old documents from S3`);
                if (deleteResults.failed.length > 0) {
                    console.warn(`Failed to delete ${deleteResults.failed.length} old documents:`, deleteResults.failed);
                }
            } catch (deleteError) {
                console.error('Error deleting old documents from S3:', deleteError);
                // Don't fail the entire operation if cleanup fails
            }
        }

        res.status(200).json({
            success: true,
            message: 'Documents uploaded successfully',
            data: {
                studentId: student._id,
                uploadResults: uploadResults,
                totalUploaded: uploadResults.filter(r => r.success).length,
                totalFailed: uploadResults.filter(r => !r.success).length,
                oldDocumentsDeleted: oldS3KeysToDelete.length
            }
        });

    } catch (error: any) {
        console.error('Bulk document upload error:', error);

        // Cleanup uploaded files from S3 if there was an error
        try {
            if (uploadedS3Keys.length > 0) {
                await cleanupFilesFromS3(uploadedS3Keys);
                console.log(`Cleaned up ${uploadedS3Keys.length} uploaded files due to error`);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up S3 files:', cleanupError);
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Server error during document upload'
        });
    }
};

// @desc    Get student documents
// @route   GET /api/students/:id/documents
// @access  Agent, Admin, SuperAdmin
export const getStudentDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const student = await Student.findById(req.params.id)
            .select('name email studentDocuments');

        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            if (student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to you.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            if (student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to your office.'
                });
                return;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Student documents retrieved successfully',
            data: {
                studentId: student._id,
                studentName: student.name,
                studentEmail: student.email,
                documents: student.studentDocuments || {}
            }
        });
    } catch (error) {
        console.error('Get student documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete a specific document
// @route   DELETE /api/students/:id/documents/:documentType
// @access  Agent, Admin
export const deleteStudentDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { documentType } = req.params;
        const student = await Student.findById(req.params.id);

        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            if (student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to you.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            if (student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Student does not belong to your office.'
                });
                return;
            }
        }

        if (!student.studentDocuments) {
            res.status(404).json({
                success: false,
                message: 'No documents found for this student'
            });
            return;
        }

        // Get the document to delete
        let documentToDelete: IDocument | undefined;

        if (documentType === 'otherDocs') {
            // For otherDocs, we need to specify which one to delete
            const { index } = req.query;
            if (index === undefined) {
                res.status(400).json({
                    success: false,
                    message: 'Index is required for deleting otherDocs'
                });
                return;
            }

            const docIndex = parseInt(index as string);
            if (student.studentDocuments.otherDocs && student.studentDocuments.otherDocs[docIndex]) {
                documentToDelete = student.studentDocuments.otherDocs[docIndex];
                student.studentDocuments.otherDocs.splice(docIndex, 1);
            }
        } else {
            // For single document types
            documentToDelete = (student.studentDocuments as any)[documentType];
            if (documentToDelete) {
                (student.studentDocuments as any)[documentType] = undefined;
            }
        }

        if (!documentToDelete) {
            res.status(404).json({
                success: false,
                message: 'Document not found'
            });
            return;
        }

        // Delete from S3 if s3Key exists
        if (documentToDelete.s3Key) {
            try {
                await deleteFileFromS3(documentToDelete.s3Key);
                console.log(`Successfully deleted document from S3: ${documentToDelete.s3Key}`);
            } catch (s3Error) {
                console.error('Error deleting file from S3:', s3Error);
                // Continue with database deletion even if S3 deletion fails
                // This ensures the database stays consistent even if S3 cleanup fails
            }
        }

        // Save the updated student
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully',
            data: {
                deletedDocument: {
                    documentType: documentType,
                    originalName: documentToDelete.originalName,
                    deletedAt: new Date()
                }
            }
        });
    } catch (error) {
        console.error('Delete student document error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Clean up orphaned documents (Admin only)
// @route   POST /api/students/cleanup/documents
// @access  SuperAdmin
export const cleanupOrphanedDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. SuperAdmin role required.'
            });
            return;
        }

        console.log('Starting orphaned document cleanup...');
        const cleanupResult = await DocumentCleanupService.performScheduledCleanup();

        res.status(200).json({
            success: true,
            message: 'Document cleanup completed successfully',
            data: {
                orphanedFilesFound: cleanupResult.orphanedFiles.length,
                filesDeleted: cleanupResult.deletedFiles.length,
                failedDeletions: cleanupResult.failedDeletions.length,
                spaceSaved: DocumentCleanupService.formatFileSize(cleanupResult.totalSpaceSaved),
                cleanupDetails: cleanupResult
            }
        });
    } catch (error) {
        console.error('Document cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during document cleanup'
        });
    }
};

// @desc    Get storage statistics
// @route   GET /api/students/storage/stats
// @access  SuperAdmin
export const getStorageStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. SuperAdmin role required.'
            });
            return;
        }

        const stats = await DocumentCleanupService.getStorageStats();

        res.status(200).json({
            success: true,
            message: 'Storage statistics retrieved successfully',
            data: stats
        });
    } catch (error) {
        console.error('Get storage stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving storage statistics'
        });
    }
};


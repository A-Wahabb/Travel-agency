import { Request, Response } from 'express';
import Student from '../models/Student';
import Agent from '../models/Agent';
import Office from '../models/Office';
import Course from '../models/Course';
import { AuthenticatedRequest, CreateStudentRequest, PaginationQuery, IDocument, UpdateStudentOptionsRequest, LinkStudentToCourseRequest } from '../types';
import { getFileInfo } from '../middlewares/upload';

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
            .select('-password')
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
            .populate('courseId', 'name university country field level')
            .select('-password');

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
        const { name, email, password, officeId, agentId, phone, dateOfBirth, nationality, passportNumber }: CreateStudentRequest = req.body;

        // Check if email already exists
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            res.status(400).json({
                success: false,
                message: 'Email already registered'
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
            name,
            email,
            password,
            officeId: finalOfficeId,
            agentId: finalAgentId,
            phone,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            nationality,
            passportNumber
        });

        await student.populate('officeId', 'name address location');
        await student.populate('agentId', 'name email officeId');

        const studentResponse = {
            _id: student._id,
            name: student.name,
            email: student.email,
            officeId: student.officeId,
            agentId: student.agentId,
            phone: student.phone,
            dateOfBirth: student.dateOfBirth,
            nationality: student.nationality,
            passportNumber: student.passportNumber,
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
        const { name, email, phone, dateOfBirth, nationality, passportNumber, status } = req.body;

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

        // Update fields
        if (name) student.name = name;
        if (email) student.email = email;
        if (phone !== undefined) student.phone = phone;
        if (dateOfBirth) student.dateOfBirth = new Date(dateOfBirth);
        if (nationality) student.nationality = nationality;
        if (passportNumber) student.passportNumber = passportNumber;
        if (status) student.status = status;

        await student.save();
        await student.populate('officeId', 'name address location');
        await student.populate('agentId', 'name email officeId');

        const studentResponse = {
            _id: student._id,
            name: student.name,
            email: student.email,
            officeId: student.officeId,
            agentId: student.agentId,
            phone: student.phone,
            dateOfBirth: student.dateOfBirth,
            nationality: student.nationality,
            passportNumber: student.passportNumber,
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

        const fileInfo = getFileInfo(req.file);
        const document: IDocument = {
            filename: fileInfo.filename,
            originalName: fileInfo.originalname,
            path: fileInfo.path,
            uploadedAt: new Date(),
            documentType: documentType as 'passport' | 'visa' | 'certificate' | 'other'
        };

        student.documents.push(document);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document
        });
    } catch (error) {
        console.error('Upload document error:', error);
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

        // Soft delete
        student.status = 'inactive';
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Student deleted successfully'
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


import { Request, Response } from 'express';
import Student from '../models/Student';
import Agent from '../models/Agent';
import Office from '../models/Office';
import { AuthenticatedRequest, CreateStudentRequest, PaginationQuery, IDocument, UpdateStudentOptionsRequest } from '../types';
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
            .populate('officeId', 'name address')
            .populate('agentId', 'name email')
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
            .populate('officeId', 'name address')
            .populate('agentId', 'name email')
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

        await student.populate('officeId', 'name address');
        await student.populate('agentId', 'name email');

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
    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
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
        await student.populate('officeId', 'name address');
        await student.populate('agentId', 'name email');

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
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
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
        await student.populate('officeId', 'name address');
        await student.populate('agentId', 'name email');

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
    } catch (error) {
        console.error('Update student options error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
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


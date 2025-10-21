import { Request, Response } from 'express';
import Application from '../models/Application';
import Student from '../models/Student';
import Course from '../models/Course';
import Agent from '../models/Agent';
import { getNextApplicationNumber } from '../utils/applicationNumberGenerator';
import { 
    AuthenticatedRequest, 
    CreateApplicationRequest, 
    UpdateApplicationRequest, 
    AddApplicationCommentRequest,
    ApplicationQuery,
    PaginationQuery 
} from '../types';

// @desc    Get all applications
// @route   GET /api/applications
// @access  Agent, Admin, SuperAdmin
export const getApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const {
            page = '1',
            limit = '10',
            search = '',
            sortBy = 'applicationDate',
            sortOrder = 'desc',
            studentId,
            courseId,
            priority,
            startDate,
            endDate,
            dateField = 'applicationDate'
        }: ApplicationQuery = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query based on role
        const query: any = { isActive: true };

        if (req.user.role === 'Agent') {
            // Agent can only see applications for their students
            query['student.agentId'] = req.user.id;
        } else if (req.user.role === 'Admin') {
            // Admin can see applications for students in their office
            query['student.officeId'] = req.user.officeId;
        }
        // SuperAdmin can see all applications (no additional filter)

        // Add filters
        if (studentId) {
            query.studentId = studentId;
        }
        if (courseId) {
            query.courseId = courseId;
        }
        if (priority) {
            query.priority = priority;
        }

        // Add search functionality
        if (search) {
            query.$or = [
                { notes: { $regex: search, $options: 'i' } },
                { 'comments.content': { $regex: search, $options: 'i' } },
                { 'student.name': { $regex: search, $options: 'i' } },
                { 'student.studentCode': { $regex: search, $options: 'i' } },
                { 'course.name': { $regex: search, $options: 'i' } },
                { 'course.university': { $regex: search, $options: 'i' } }
            ];
        }

        // Add date filtering
        if (startDate || endDate) {
            const validDateField = ['applicationDate', 'submissionDate', 'reviewDate', 'decisionDate', 'createdAt', 'updatedAt'].includes(dateField) ? dateField : 'applicationDate';
            query[validDateField] = {};

            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    start.setHours(0, 0, 0, 0);
                    query[validDateField].$gte = start;
                }
            }

            if (endDate) {
                const end = new Date(endDate);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    query[validDateField].$lte = end;
                }
            }
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const applications = await Application.find(query)
            .populate('studentId', 'name email studentCode agentId officeId')
            .populate('courseId', 'name university country city department')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('comments.authorId', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Application.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Applications retrieved successfully',
            data: applications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single application by ID
// @route   GET /api/applications/:id
// @access  Agent, Admin, SuperAdmin
export const getApplication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('studentId', 'name email studentCode agentId officeId')
            .populate('courseId', 'name university country city department')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('comments.authorId', 'name email');

        if (!application) {
            res.status(404).json({
                success: false,
                message: 'Application not found'
            });
            return;
        }

        // Check access permissions
        if (req.user!.role === 'Agent') {
            const student = await Student.findById(application.studentId);
            if (!student || student.agentId !== req.user!.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your students.'
                });
                return;
            }
        } else if (req.user!.role === 'Admin') {
            const student = await Student.findById(application.studentId);
            if (!student || student.officeId !== req.user!.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your office.'
                });
                return;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Application retrieved successfully',
            data: application
        });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create application
// @route   POST /api/applications
// @access  Agent, Admin, SuperAdmin
export const createApplication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { studentId, courseId, priority = 'medium', notes }: CreateApplicationRequest = req.body;

        // Validate student exists
        const student = await Student.findById(studentId);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check access permissions for student
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

        // Validate course exists and is active
        const course = await Course.findById(courseId);
        if (!course || !course.isActive) {
            res.status(404).json({
                success: false,
                message: 'Course not found or inactive'
            });
            return;
        }

        // Check if application already exists
        const existingApplication = await Application.findOne({
            studentId,
            courseId,
            isActive: true
        });

        if (existingApplication) {
            res.status(400).json({
                success: false,
                message: 'Application already exists for this student and course'
            });
            return;
        }

        // Generate unique application number
        const applicationNumber = await getNextApplicationNumber();

        // Create application
        const application = await Application.create({
            applicationNumber,
            studentId,
            courseId,
            priority,
            notes,
            createdBy: req.user.id
        });

        await application.populate('studentId', 'name email studentCode agentId officeId');
        await application.populate('courseId', 'name university country city department');
        await application.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Application created successfully',
            data: application
        });
    } catch (error: any) {
        console.error('Create application error:', error);

        // Handle application number generation errors
        if (error.message === 'Failed to generate application number') {
            res.status(500).json({
                success: false,
                message: 'Failed to generate application number. Please try again.'
            });
            return;
        }

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

        // Handle duplicate key error
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: 'Application already exists for this student and course'
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update application
// @route   PUT /api/applications/:id
// @access  Agent, Admin, SuperAdmin
export const updateApplication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { priority, notes, submissionDate, reviewDate, decisionDate }: UpdateApplicationRequest = req.body;

        const application = await Application.findById(req.params.id);
        if (!application) {
            res.status(404).json({
                success: false,
                message: 'Application not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            const student = await Student.findById(application.studentId);
            if (!student || student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your students.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            const student = await Student.findById(application.studentId);
            if (!student || student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your office.'
                });
                return;
            }
        }

        // Update fields
        if (priority) application.priority = priority;
        if (notes !== undefined) application.notes = notes;
        if (submissionDate) application.submissionDate = new Date(submissionDate);
        if (reviewDate) application.reviewDate = new Date(reviewDate);
        if (decisionDate) application.decisionDate = new Date(decisionDate);
        
        application.updatedBy = req.user.id;

        await application.save();
        await application.populate('studentId', 'name email studentCode agentId officeId');
        await application.populate('courseId', 'name university country city department');
        await application.populate('createdBy', 'name email');
        await application.populate('updatedBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Application updated successfully',
            data: application
        });
    } catch (error: any) {
        console.error('Update application error:', error);

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

        throw error;
    }
};

// @desc    Delete application (soft delete)
// @route   DELETE /api/applications/:id
// @access  Agent, Admin, SuperAdmin
export const deleteApplication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const application = await Application.findById(req.params.id);
        if (!application) {
            res.status(404).json({
                success: false,
                message: 'Application not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            const student = await Student.findById(application.studentId);
            if (!student || student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your students.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            const student = await Student.findById(application.studentId);
            if (!student || student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your office.'
                });
                return;
            }
        }

        // Soft delete
        application.isActive = false;
        application.updatedBy = req.user.id;
        await application.save();

        res.status(200).json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        console.error('Delete application error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Add comment to application
// @route   POST /api/applications/:id/comments
// @access  Agent, Admin, SuperAdmin
export const addApplicationComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { content }: AddApplicationCommentRequest = req.body;

        const application = await Application.findById(req.params.id);
        if (!application) {
            res.status(404).json({
                success: false,
                message: 'Application not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            const student = await Student.findById(application.studentId);
            if (!student || student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your students.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            const student = await Student.findById(application.studentId);
            if (!student || student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your office.'
                });
                return;
            }
        }

        // Get agent information for comment
        const agent = await Agent.findById(req.user.id);
        if (!agent) {
            res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
            return;
        }

        // Add comment
        const comment = {
            content,
            authorId: req.user.id,
            authorName: agent.name,
            createdAt: new Date()
        };

        application.comments.push(comment);
        application.updatedBy = req.user.id;
        await application.save();

        await application.populate('studentId', 'name email studentCode agentId officeId');
        await application.populate('courseId', 'name university country city department');
        await application.populate('createdBy', 'name email');
        await application.populate('updatedBy', 'name email');

        // Import socket service and broadcast the new comment
        const { socketService } = require('../server');
        if (socketService) {
            socketService.broadcastApplicationComment(req.params.id, comment);
        }

        res.status(200).json({
            success: true,
            message: 'Comment added successfully',
            data: {
                application,
                newComment: comment
            }
        });
    } catch (error: any) {
        console.error('Add application comment error:', error);

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

        throw error;
    }
};

// @desc    Get applications by student ID
// @route   GET /api/applications/student/:studentId
// @access  Agent, Admin, SuperAdmin
export const getApplicationsByStudent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { studentId } = req.params;
        const {
            page = '1',
            limit = '10',
            sortBy = 'applicationDate',
            sortOrder = 'desc',
            priority
        }: ApplicationQuery = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Find the student to verify they exist and check access
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

        // Build query
        const query: any = {
            studentId: studentId,
            isActive: true
        };

        if (priority) {
            query.priority = priority;
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const applications = await Application.find(query)
            .populate('studentId', 'name email studentCode agentId officeId')
            .populate('courseId', 'name university country city department')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('comments.authorId', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Application.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Student applications retrieved successfully',
            data: applications,
            student: {
                _id: student._id,
                name: student.name,
                email: student.email,
                studentCode: student.studentCode
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get applications by student error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get applications by course ID
// @route   GET /api/applications/course/:courseId
// @access  Agent, Admin, SuperAdmin
export const getApplicationsByCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { courseId } = req.params;
        const {
            page = '1',
            limit = '10',
            sortBy = 'applicationDate',
            sortOrder = 'desc',
            priority
        }: ApplicationQuery = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Find the course to verify it exists
        const course = await Course.findById(courseId);
        if (!course) {
            res.status(404).json({
                success: false,
                message: 'Course not found'
            });
            return;
        }

        // Build query based on role
        const query: any = {
            courseId: courseId,
            isActive: true
        };

        if (req.user.role === 'Agent') {
            // Agent can only see applications for their students
            query['student.agentId'] = req.user.id;
        } else if (req.user.role === 'Admin') {
            // Admin can see applications for students in their office
            query['student.officeId'] = req.user.officeId;
        }

        if (priority) {
            query.priority = priority;
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const applications = await Application.find(query)
            .populate('studentId', 'name email studentCode agentId officeId')
            .populate('courseId', 'name university country city department')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('comments.authorId', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Application.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Course applications retrieved successfully',
            data: applications,
            course: {
                _id: course._id,
                name: course.name,
                university: course.university,
                country: course.country,
                city: course.city
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get applications by course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Search applications
// @route   GET /api/applications/search?q=searchTerm
// @access  Agent, Admin, SuperAdmin
export const searchApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const {
            q = '',
            page = '1',
            limit = '10',
            sortBy = 'applicationDate',
            sortOrder = 'desc'
        }: { q?: string; page?: string; limit?: string; sortBy?: string; sortOrder?: string } = req.query;

        if (!q || q.trim() === '') {
            res.status(400).json({
                success: false,
                message: 'Search query parameter "q" is required'
            });
            return;
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query based on role
        const query: any = { isActive: true };

        if (req.user.role === 'Agent') {
            // Agent can only see applications for their students
            query['student.agentId'] = req.user.id;
        } else if (req.user.role === 'Admin') {
            // Admin can see applications for students in their office
            query['student.officeId'] = req.user.officeId;
        }

        // Search across multiple fields
        query.$or = [
            { notes: { $regex: q, $options: 'i' } },
            { 'comments.content': { $regex: q, $options: 'i' } },
            { 'student.name': { $regex: q, $options: 'i' } },
            { 'student.studentCode': { $regex: q, $options: 'i' } },
            { 'student.email': { $regex: q, $options: 'i' } },
            { 'course.name': { $regex: q, $options: 'i' } },
            { 'course.university': { $regex: q, $options: 'i' } },
            { 'course.country': { $regex: q, $options: 'i' } },
            { 'course.city': { $regex: q, $options: 'i' } }
        ];

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const applications = await Application.find(query)
            .populate('studentId', 'name email studentCode agentId officeId')
            .populate('courseId', 'name university country city department')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('comments.authorId', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Application.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Applications search completed successfully',
            data: applications,
            searchQuery: q,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Search applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get application statistics
// @route   GET /api/applications/stats
// @access  Agent, Admin, SuperAdmin
export const getApplicationStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Build match query based on role
        const matchQuery: any = { isActive: true };

        if (req.user.role === 'Agent') {
            // Agent can only see statistics for their students
            matchQuery['student.agentId'] = req.user.id;
        } else if (req.user.role === 'Admin') {
            // Admin can see statistics for students in their office
            matchQuery['student.officeId'] = req.user.officeId;
        }

        const pipeline = [
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalApplications: { $sum: 1 },
                    lowPriority: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
                    mediumPriority: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
                    highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
                    urgentPriority: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
                }
            }
        ];

        const result = await Application.aggregate(pipeline);

        if (result.length === 0) {
            // No applications found, return zero counts
            const emptyStats = {
                totalApplications: 0,
                lowPriority: 0,
                mediumPriority: 0,
                highPriority: 0,
                urgentPriority: 0
            };

            res.status(200).json({
                success: true,
                message: 'Application statistics retrieved successfully',
                data: emptyStats
            });
            return;
        }

        const stats = result[0];
        delete stats._id; // Remove the _id field from the response

        res.status(200).json({
            success: true,
            message: 'Application statistics retrieved successfully',
            data: stats
        });
    } catch (error) {
        console.error('Get application stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update application comment
// @route   PUT /api/applications/:id/comments/:commentId
// @access  Agent, Admin, SuperAdmin
export const updateApplicationComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { content } = req.body;
        const { id: applicationId, commentId } = req.params;

        const application = await Application.findById(applicationId);
        if (!application) {
            res.status(404).json({
                success: false,
                message: 'Application not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            const student = await Student.findById(application.studentId);
            if (!student || student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your students.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            const student = await Student.findById(application.studentId);
            if (!student || student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your office.'
                });
                return;
            }
        }

        // Find the comment
        const comment = application.comments.find((c: any) => c._id.toString() === commentId);
        if (!comment) {
            res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
            return;
        }

        // Check if user is the author of the comment
        if (comment.authorId !== req.user.id && req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. You can only edit your own comments.'
            });
            return;
        }

        // Update comment
        comment.content = content;
        application.updatedBy = req.user.id;
        await application.save();

        // Import socket service and broadcast the comment update
        const { socketService } = require('../server');
        if (socketService) {
            socketService.broadcastApplicationCommentUpdate(applicationId, commentId, comment);
        }

        res.status(200).json({
            success: true,
            message: 'Comment updated successfully',
            data: {
                comment
            }
        });
    } catch (error: any) {
        console.error('Update application comment error:', error);

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

        throw error;
    }
};

// @desc    Delete application comment
// @route   DELETE /api/applications/:id/comments/:commentId
// @access  Agent, Admin, SuperAdmin
export const deleteApplicationComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { id: applicationId, commentId } = req.params;

        const application = await Application.findById(applicationId);
        if (!application) {
            res.status(404).json({
                success: false,
                message: 'Application not found'
            });
            return;
        }

        // Check access permissions
        if (req.user.role === 'Agent') {
            const student = await Student.findById(application.studentId);
            if (!student || student.agentId !== req.user.id) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your students.'
                });
                return;
            }
        } else if (req.user.role === 'Admin') {
            const student = await Student.findById(application.studentId);
            if (!student || student.officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Application does not belong to your office.'
                });
                return;
            }
        }

        // Find the comment
        const comment = application.comments.find((c: any) => c._id.toString() === commentId);
        if (!comment) {
            res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
            return;
        }

        // Check if user is the author of the comment or SuperAdmin
        if (comment.authorId !== req.user.id && req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own comments.'
            });
            return;
        }

        // Remove comment from array
        application.comments = application.comments.filter((c: any) => c._id.toString() !== commentId);
        application.updatedBy = req.user.id;
        await application.save();

        // Import socket service and broadcast the comment deletion
        const { socketService } = require('../server');
        if (socketService) {
            socketService.broadcastApplicationCommentDeletion(applicationId, commentId);
        }

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error: any) {
        console.error('Delete application comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

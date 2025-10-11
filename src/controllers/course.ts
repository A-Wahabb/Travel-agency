import { Request, Response } from 'express';
import Course from '../models/Course';
import Student from '../models/Student';
import { AuthenticatedRequest, CreateCourseRequest, UpdateCourseRequest, LinkStudentToCourseRequest, PaginationQuery } from '../types';
import ExcelJS from 'exceljs';

// @desc    Get all courses
// @route   GET /api/courses
// @access  SuperAdmin, Admin, Agent
export const getCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { page = '1', limit = '10', search = '', sortBy = 'createdAt', sortOrder = 'desc', country, city, type }: PaginationQuery & { country?: string; city?: string; type?: string } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query
        const query: any = { isActive: true };

        // Add search functionality
        if (search) {
            query.$text = { $search: search };
        }

        // Add filters
        if (country) {
            query.country = { $regex: country, $options: 'i' };
        }
        if (city) {
            query.city = { $regex: city, $options: 'i' };
        }
        if (type) {
            query.type = { $regex: type, $options: 'i' };
        }

        // Build sort
        const sort: any = {};
        if (search) {
            sort.score = { $meta: 'textScore' };
        } else {
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        }

        const courses = await Course.find(query)
            .populate('createdBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Course.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Courses retrieved successfully',
            data: courses,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  SuperAdmin, Admin, Agent
export const getCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('studentCount');

        if (!course) {
            res.status(404).json({
                success: false,
                message: 'Course not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Course retrieved successfully',
            data: course
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create course
// @route   POST /api/courses
// @access  SuperAdmin
export const createCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const courseData: CreateCourseRequest = req.body;

        // Create course with simplified structure
        const course = await Course.create({
            ...courseData,
            createdBy: req.user.id
        });

        await course.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: course
        });
    } catch (error: any) {
        console.error('Create course error:', error);

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
                message: 'Duplicate field value entered'
            });
            return;
        }

        // For other errors, let the error handler middleware handle them
        throw error;
    }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  SuperAdmin
export const updateCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const courseData: UpdateCourseRequest = req.body;

        const course = await Course.findById(req.params.id);
        if (!course) {
            res.status(404).json({
                success: false,
                message: 'Course not found'
            });
            return;
        }

        // Update fields with simplified structure
        Object.keys(courseData).forEach(key => {
            if (courseData[key as keyof UpdateCourseRequest] !== undefined) {
                (course as any)[key] = courseData[key as keyof UpdateCourseRequest];
            }
        });

        await course.save();
        await course.populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error: any) {
        console.error('Update course error:', error);

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
                message: 'Duplicate field value entered'
            });
            return;
        }

        // For other errors, let the error handler middleware handle them
        throw error;
    }
};

// @desc    Delete course (soft delete)
// @route   DELETE /api/courses/:id
// @access  SuperAdmin
export const deleteCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const course = await Course.findById(req.params.id);
        if (!course) {
            res.status(404).json({
                success: false,
                message: 'Course not found'
            });
            return;
        }

        // Soft delete
        course.isActive = false;
        await course.save();

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Link student to course
// @route   PUT /api/courses/:courseId/students/:studentId
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

        const { courseId, studentId } = req.params;

        // Check if course exists and is active
        const course = await Course.findById(courseId);
        if (!course || !course.isActive) {
            res.status(404).json({
                success: false,
                message: 'Course not found or inactive'
            });
            return;
        }

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

        // Link student to course
        student.courseId = courseId;
        await student.save();

        await student.populate('officeId', 'name address location');
        await student.populate('agentId', 'name email officeId');
        await student.populate('courseId', 'name university country');

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
// @route   DELETE /api/courses/:courseId/students/:studentId
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

        const { courseId, studentId } = req.params;

        // Find student and check access
        const student = await Student.findById(studentId);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found'
            });
            return;
        }

        // Check if student is linked to the specified course
        if (student.courseId !== courseId) {
            res.status(400).json({
                success: false,
                message: 'Student is not linked to this course'
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

// @desc    Get students enrolled in a course
// @route   GET /api/courses/:id/students
// @access  SuperAdmin, Admin, Agent
export const getCourseStudents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { page = '1', limit = '10' }: PaginationQuery = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query based on role
        const query: any = {
            courseId: req.params.id,
            status: { $ne: 'deleted' }
        };

        if (req.user.role === 'Agent') {
            query.agentId = req.user.id;
        } else if (req.user.role === 'Admin') {
            query.officeId = req.user.officeId;
        }

        const students = await Student.find(query)
            .populate('officeId', 'name address location')
            .populate('agentId', 'name email officeId')
            .populate('courseId', 'name university country')
            .select('-password')
            .skip(skip)
            .limit(limitNum);

        const total = await Student.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Course students retrieved successfully',
            data: students,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get course students error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Export all courses (JSON or Excel)
// @route   GET /api/courses/export?format=json|excel
// @access  SuperAdmin
export const exportCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Check if user is SuperAdmin
        if (req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. Only SuperAdmin can export courses'
            });
            return;
        }

        const { format = 'json' } = req.query;

        // Get all courses (both active and inactive)
        const courses = await Course.find({})
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        if (courses.length === 0) {
            res.status(404).json({
                success: false,
                message: 'No courses found'
            });
            return;
        }

        // Format courses data for export
        const coursesData = courses.map(course => ({
            'Course ID': course._id.toString(),
            'Course Name': course.name,
            'University': course.university,
            'Department': course.department,
            'Country': course.country,
            'City': course.city,
            'Intake': course.intake,
            'Is Private': course.isPrivate,
            'Type': course.type,
            'Fee': course.fee,
            'Time Period': course.timePeriod,
            'Percentage Requirement': course.percentageRequirement,
            'CGPA Requirement': course.cgpaRequirement,
            'Language Test': course.languageTest,
            'Min Bands': course.minBands,
            'Is Active': course.isActive ? 'Yes' : 'No',
            'Student Count': course.studentCount || 0,
            'Created By': (course.createdBy as any)?.name || 'N/A',
            'Created At': course.createdAt.toISOString(),
            'Updated At': course.updatedAt.toISOString()
        }));

        if (format === 'excel') {
            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Courses');

            // Define columns
            worksheet.columns = [
                { header: 'Course ID', key: 'Course ID', width: 30 },
                { header: 'Course Name', key: 'Course Name', width: 40 },
                { header: 'University', key: 'University', width: 40 },
                { header: 'Department', key: 'Department', width: 30 },
                { header: 'Country', key: 'Country', width: 20 },
                { header: 'City', key: 'City', width: 20 },
                { header: 'Intake', key: 'Intake', width: 20 },
                { header: 'Is Private', key: 'Is Private', width: 15 },
                { header: 'Type', key: 'Type', width: 20 },
                { header: 'Fee', key: 'Fee', width: 20 },
                { header: 'Time Period', key: 'Time Period', width: 20 },
                { header: 'Percentage Requirement', key: 'Percentage Requirement', width: 25 },
                { header: 'CGPA Requirement', key: 'CGPA Requirement', width: 20 },
                { header: 'Language Test', key: 'Language Test', width: 20 },
                { header: 'Min Bands', key: 'Min Bands', width: 15 },
                { header: 'Is Active', key: 'Is Active', width: 15 },
                { header: 'Student Count', key: 'Student Count', width: 15 },
                { header: 'Created By', key: 'Created By', width: 25 },
                { header: 'Created At', key: 'Created At', width: 25 },
                { header: 'Updated At', key: 'Updated At', width: 25 }
            ];

            // Add rows
            coursesData.forEach(course => {
                worksheet.addRow(course);
            });

            // Style the header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `courses_export_${timestamp}.xlsx`;

            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            // Write to response
            await workbook.xlsx.write(res);
            res.end();

        } else {
            // JSON format
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `courses_export_${timestamp}.json`;

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            res.status(200).json({
                success: true,
                message: 'Courses exported successfully',
                exportedAt: new Date().toISOString(),
                totalCourses: courses.length,
                data: coursesData
            });
        }
    } catch (error) {
        console.error('Export courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during export'
        });
    }
};
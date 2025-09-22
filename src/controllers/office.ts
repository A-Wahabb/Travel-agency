import { Request, Response } from 'express';
import Office from '../models/Office';
import { AuthenticatedRequest, CreateOfficeRequest, PaginationQuery, ApiResponse } from '../types';

// @desc    Get all offices
// @route   GET /api/offices
// @access  SuperAdmin
export const getOffices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { page = '1', limit = '10', search = '', sortBy = 'createdAt', sortOrder = 'desc' }: PaginationQuery = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query
        const query: any = { isActive: true };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const offices = await Office.find(query)
            .populate('createdBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Office.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Offices retrieved successfully',
            data: offices,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get offices error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single office
// @route   GET /api/offices/:id
// @access  SuperAdmin
export const getOffice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const office = await Office.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('agentCount')
            .populate('studentCount');

        if (!office) {
            res.status(404).json({
                success: false,
                message: 'Office not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Office retrieved successfully',
            data: office
        });
    } catch (error) {
        console.error('Get office error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create office
// @route   POST /api/offices
// @access  SuperAdmin
export const createOffice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { name, address, location }: CreateOfficeRequest = req.body;

        const office = await Office.create({
            name,
            address,
            location,
            createdBy: req.user.id
        });

        await office.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Office created successfully',
            data: office
        });
    } catch (error: any) {
        console.error('Create office error:', error);

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

// @desc    Update office
// @route   PUT /api/offices/:id
// @access  SuperAdmin
export const updateOffice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { name, address, location } = req.body;

        const office = await Office.findById(req.params.id);
        if (!office) {
            res.status(404).json({
                success: false,
                message: 'Office not found'
            });
            return;
        }

        if (name) office.name = name;
        if (address) office.address = address;
        if (location !== undefined) office.location = location;

        await office.save();
        await office.populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Office updated successfully',
            data: office
        });
    } catch (error: any) {
        console.error('Update office error:', error);

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

// @desc    Delete office (soft delete)
// @route   DELETE /api/offices/:id
// @access  SuperAdmin
export const deleteOffice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const office = await Office.findById(req.params.id);
        if (!office) {
            res.status(404).json({
                success: false,
                message: 'Office not found'
            });
            return;
        }

        // Soft delete
        office.isActive = false;
        await office.save();

        res.status(200).json({
            success: true,
            message: 'Office deleted successfully'
        });
    } catch (error) {
        console.error('Delete office error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


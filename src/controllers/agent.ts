import { Request, Response } from 'express';
import Agent from '../models/Agent';
import Office from '../models/Office';
import { AuthenticatedRequest, CreateAgentRequest, PaginationQuery, UserRole } from '../types';

// @desc    Get all agents
// @route   GET /api/agents
// @access  SuperAdmin, Admin
export const getAgents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        const query: any = { isActive: true };

        if (req.user.role === 'Admin') {
            query.officeId = req.user.officeId;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const agents = await Agent.find(query)
            .populate('officeId', 'name address location')
            .select('-password')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const total = await Agent.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        res.status(200).json({
            success: true,
            message: 'Agents retrieved successfully',
            data: agents,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single agent
// @route   GET /api/agents/:id
// @access  SuperAdmin, Admin
export const getAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const agent = await Agent.findById(req.params.id)
            .populate('officeId', 'name address location')
            .select('-password');

        if (!agent) {
            res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
            return;
        }

        // Check if Admin can access this agent
        if (req.user.role === 'Admin' && agent.officeId?.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Agent retrieved successfully',
            data: agent
        });
    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create agent
// @route   POST /api/agents
// @access  SuperAdmin, Admin
export const createAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { name, email, password, role, officeId, phone }: CreateAgentRequest = req.body;

        // Check if email already exists
        const existingAgent = await Agent.findOne({ email });
        if (existingAgent) {
            res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
            return;
        }

        // Validate office access for Admin
        if (req.user.role === 'Admin') {
            if (officeId !== req.user.officeId) {
                res.status(403).json({
                    success: false,
                    message: 'Can only create agents for your own office'
                });
                return;
            }
        }

        // Validate office exists
        if (officeId && role !== 'SuperAdmin') {
            const office = await Office.findById(officeId);
            if (!office) {
                res.status(400).json({
                    success: false,
                    message: 'Office not found'
                });
                return;
            }
        }

        const agent = await Agent.create({
            name,
            email,
            password,
            role,
            officeId,
            phone
        });

        await agent.populate('officeId', 'name address location');
        const agentResponse = {
            _id: agent._id,
            name: agent.name,
            email: agent.email,
            role: agent.role,
            officeId: agent.officeId,
            phone: agent.phone,
            isActive: agent.isActive,
            lastLogin: agent.lastLogin,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt
        };

        res.status(201).json({
            success: true,
            message: 'Agent created successfully',
            data: agentResponse
        });
    } catch (error: any) {
        console.error('Create agent error:', error);

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

// @desc    Update agent
// @route   PUT /api/agents/:id
// @access  SuperAdmin, Admin
export const updateAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { name, email, role, officeId, phone, isActive } = req.body;

        const agent = await Agent.findById(req.params.id);
        if (!agent) {
            res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
            return;
        }

        // Check if Admin can update this agent
        if (req.user.role === 'Admin' && agent.officeId?.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Check if email already exists (if changing email)
        if (email && email !== agent.email) {
            const existingAgent = await Agent.findOne({ email });
            if (existingAgent) {
                res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
                return;
            }
        }

        // Update fields
        if (name) agent.name = name;
        if (email) agent.email = email;
        if (role) agent.role = role;
        if (officeId) agent.officeId = officeId;
        if (phone !== undefined) agent.phone = phone;
        if (isActive !== undefined) agent.isActive = isActive;

        await agent.save();
        await agent.populate('officeId', 'name address location');

        const agentResponse = {
            _id: agent._id,
            name: agent.name,
            email: agent.email,
            role: agent.role,
            officeId: agent.officeId,
            phone: agent.phone,
            isActive: agent.isActive,
            lastLogin: agent.lastLogin,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt
        };

        res.status(200).json({
            success: true,
            message: 'Agent updated successfully',
            data: agentResponse
        });
    } catch (error: any) {
        console.error('Update agent error:', error);

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

// @desc    Delete agent (soft delete)
// @route   DELETE /api/agents/:id
// @access  SuperAdmin, Admin
export const deleteAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const agent = await Agent.findById(req.params.id);
        if (!agent) {
            res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
            return;
        }

        // Check if Admin can delete this agent
        if (req.user.role === 'Admin' && agent.officeId?.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Prevent deleting own account
        if (agent._id.toString() === req.user.id) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
            return;
        }

        // Soft delete
        agent.isActive = false;
        await agent.save();

        res.status(200).json({
            success: true,
            message: 'Agent deleted successfully'
        });
    } catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


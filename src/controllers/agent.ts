import { Request, Response } from 'express';
import Agent from '../models/Agent';
import Office from '../models/Office';
import Student from '../models/Student';
import Notification from '../models/Notification';
import Message from '../models/Message';
import Chat from '../models/Chat';
import { AuthenticatedRequest, CreateAgentRequest, PaginationQuery, UserRole } from '../types';
import { comparePassword, hashPassword } from '../config/auth';

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
        const query: any = {};

        // SuperAdmin can see all agents (active and inactive)
        // Admin can only see active agents in their office
        if (req.user.role === 'SuperAdmin') {
            // No isActive filter for SuperAdmin - they see all agents
        } else if (req.user.role === 'Admin') {
            query.isActive = true; // Admin only sees active agents
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
            .select('-password -refreshTokens -createdAt -updatedAt')
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
            .select('-password -refreshTokens -createdAt -updatedAt');

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

// @desc    Activate agent
// @route   PUT /api/agents/:id/activate
// @access  SuperAdmin, Admin
export const activateAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

        // Check if Admin can activate this agent
        if (req.user.role === 'Admin' && agent.officeId?.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        if (agent.isActive) {
            res.status(400).json({
                success: false,
                message: 'Agent is already active'
            });
            return;
        }

        agent.isActive = true;
        await agent.save();

        res.status(200).json({
            success: true,
            message: 'Agent activated successfully',
            data: {
                id: agent._id,
                name: agent.name,
                email: agent.email,
                isActive: agent.isActive
            }
        });
    } catch (error) {
        console.error('Activate agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Deactivate agent
// @route   PUT /api/agents/:id/deactivate
// @access  SuperAdmin, Admin
export const deactivateAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

        // Check if Admin can deactivate this agent
        if (req.user.role === 'Admin' && agent.officeId?.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Prevent deactivating own account
        if (agent._id.toString() === req.user.id) {
            res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
            return;
        }

        if (!agent.isActive) {
            res.status(400).json({
                success: false,
                message: 'Agent is already inactive'
            });
            return;
        }

        agent.isActive = false;
        await agent.save();

        res.status(200).json({
            success: true,
            message: 'Agent deactivated successfully',
            data: {
                id: agent._id,
                name: agent.name,
                email: agent.email,
                isActive: agent.isActive
            }
        });
    } catch (error) {
        console.error('Deactivate agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Hard delete agent with dependency checking
// @route   DELETE /api/agents/:id
// @access  SuperAdmin only
export const hardDeleteAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Only SuperAdmin can hard delete
        if (req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Only SuperAdmin can permanently delete agents'
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

        // Prevent deleting own account
        if (agent._id.toString() === req.user.id) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
            return;
        }

        // Check dependencies
        const dependencies = await checkAgentDependencies(req.params.id);

        if (dependencies.hasDependencies) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete agent due to existing dependencies',
                dependencies: dependencies.dependencies,
                suggestions: dependencies.suggestions
            });
            return;
        }

        // Hard delete the agent
        await Agent.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Agent permanently deleted successfully',
            data: {
                id: agent._id,
                name: agent.name,
                email: agent.email
            }
        });
    } catch (error) {
        console.error('Hard delete agent error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Check agent dependencies before deletion
// @route   GET /api/agents/:id/dependencies
// @access  SuperAdmin only
export const checkAgentDependenciesEndpoint = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Only SuperAdmin can check dependencies
        if (req.user.role !== 'SuperAdmin') {
            res.status(403).json({
                success: false,
                message: 'Only SuperAdmin can check agent dependencies'
            });
            return;
        }

        const agent = await Agent.findById(req.params.id).select('name email');
        if (!agent) {
            res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
            return;
        }

        // Check dependencies
        const dependencies = await checkAgentDependencies(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Dependency check completed',
            agent: {
                id: agent._id,
                name: agent.name,
                email: agent.email
            },
            dependencies: dependencies.dependencies,
            suggestions: dependencies.suggestions,
            hasDependencies: dependencies.hasDependencies,
            canDelete: !dependencies.hasDependencies
        });
    } catch (error) {
        console.error('Check agent dependencies error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update agent password
// @route   PUT /api/agents/:id/password
// @access  SuperAdmin, Admin, Agent (own account)
export const updateAgentPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        // Validate required fields
        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Both current password and new password are required'
            });
            return;
        }

        // Validate new password strength
        if (newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
            return;
        }

        // Find the agent
        const agent = await Agent.findById(req.params.id);
        if (!agent) {
            res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
            return;
        }

        // Authorization check
        if (req.user.role === 'Admin' && agent.officeId?.toString() !== req.user.officeId) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Additional check for Agent role - can only update own password
        if (req.user.role === 'Agent' && agent._id.toString() !== req.user.id) {
            res.status(403).json({
                success: false,
                message: 'Can only update your own password'
            });
            return;
        }

        // Verify current password
        const isCurrentPasswordValid = await comparePassword(currentPassword, agent.password);
        if (!isCurrentPasswordValid) {
            res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
            return;
        }

        // Check if new password is different from current password
        const isSamePassword = await comparePassword(newPassword, agent.password);
        if (isSamePassword) {
            res.status(400).json({
                success: false,
                message: 'New password must be different from current password'
            });
            return;
        }

        // Update password
        agent.password = newPassword; // Hash password happens in pre-save middleware
        await agent.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error: any) {
        console.error('Update agent password error:', error);

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

// Helper function to check agent dependencies
const checkAgentDependencies = async (agentId: string) => {
    const dependencies = {
        hasDependencies: false,
        dependencies: {} as any,
        suggestions: [] as string[]
    };

    try {
        // Check students
        const students = await Student.find({ agentId: agentId });
        if (students.length > 0) {
            dependencies.hasDependencies = true;
            dependencies.dependencies.students = {
                count: students.length,
                studentIds: students.map(s => s._id),
                studentNames: students.map(s => s.name)
            };
            dependencies.suggestions.push(`Reassign ${students.length} student(s) to other agents or remove the agent assignment`);
        }

        // Check notifications
        const notifications = await Notification.find({ agentId: agentId });
        if (notifications.length > 0) {
            dependencies.hasDependencies = true;
            dependencies.dependencies.notifications = {
                count: notifications.length,
                notificationIds: notifications.map(n => n._id)
            };
            dependencies.suggestions.push(`Delete or reassign ${notifications.length} notification(s) associated with this agent`);
        }

        // Check messages (where agent is sender)
        const messages = await Message.find({ senderId: agentId });
        if (messages.length > 0) {
            dependencies.hasDependencies = true;
            dependencies.dependencies.messages = {
                count: messages.length,
                messageIds: messages.map(m => m._id)
            };
            dependencies.suggestions.push(`Archive or delete ${messages.length} message(s) sent by this agent`);
        }

        // Check chats where agent is participant
        const chatsAsParticipant = await Chat.find({ participants: agentId });
        if (chatsAsParticipant.length > 0) {
            dependencies.hasDependencies = true;
            dependencies.dependencies.chatsAsParticipant = {
                count: chatsAsParticipant.length,
                chatIds: chatsAsParticipant.map(c => c._id)
            };
            dependencies.suggestions.push(`Remove agent from ${chatsAsParticipant.length} chat(s) or delete those chats`);
        }

        // Check chats created by agent
        const chatsAsCreator = await Chat.find({ createdBy: agentId });
        if (chatsAsCreator.length > 0) {
            dependencies.hasDependencies = true;
            dependencies.dependencies.chatsAsCreator = {
                count: chatsAsCreator.length,
                chatIds: chatsAsCreator.map(c => c._id)
            };
            dependencies.suggestions.push(`Transfer ownership of ${chatsAsCreator.length} chat(s) to another agent or delete those chats`);
        }

        return dependencies;
    } catch (error) {
        console.error('Error checking agent dependencies:', error);
        return dependencies;
    }
};

import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Chat from '../models/Chat';
import Message from '../models/Message';
import Agent from '../models/Agent';
import { AuthenticatedRequest, CreateChatRequest, SendMessageRequest, ChatQuery } from '../types';
import mongoose from 'mongoose';

// Create a new chat
export const createChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const { participantIds, chatType }: CreateChatRequest = req.body;
        const currentUserId = req.user!.id;

        // Validate participants
        if (participantIds.length < 1) {
            res.status(400).json({
                success: false,
                message: 'At least one participant is required'
            });
            return;
        }

        // For direct chat, ensure exactly 2 participants (including current user)
        if (chatType === 'direct') {
            const allParticipants = [...participantIds, currentUserId];
            if (allParticipants.length !== 2) {
                res.status(400).json({
                    success: false,
                    message: 'Direct chat requires exactly 2 participants'
                });
                return;
            }

            // Check if direct chat already exists
            const existingChat = await Chat.findOrCreateDirectChat(
                allParticipants[0],
                allParticipants[1],
                currentUserId
            );

            res.status(200).json({
                success: true,
                message: 'Chat retrieved/created successfully',
                data: await existingChat.populate('participants', 'name email role')
            });
            return;
        }

        // For group chat, add current user to participants
        const allParticipants = [...participantIds, currentUserId];

        // Validate that all participants exist and are active
        const participants = await Agent.find({
            _id: { $in: allParticipants },
            isActive: true
        }).select('_id name email role');

        if (participants.length !== allParticipants.length) {
            res.status(400).json({
                success: false,
                message: 'One or more participants not found or inactive'
            });
            return;
        }

        // Create new group chat
        const newChat = new Chat({
            participants: allParticipants,
            chatType,
            createdBy: currentUserId
        });

        const savedChat = await newChat.save();
        await savedChat.populate('participants', 'name email role');

        res.status(201).json({
            success: true,
            message: 'Group chat created successfully',
            data: savedChat
        });

    } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get user's chats
export const getUserChats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const currentUserId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const chatType = req.query.chatType as string;

        // Build query
        const query: any = {
            participants: currentUserId,
            isActive: true
        };

        if (chatType && ['direct', 'group'].includes(chatType)) {
            query.chatType = chatType;
        }

        const skip = (page - 1) * limit;

        let chats = await Chat.find(query)
            .populate('participants', 'name email role')
            .populate('lastMessageBy', 'name')
            .sort({ lastMessageAt: -1 })
            .skip(skip)
            .limit(limit);

        // Apply search filter if provided
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            chats = chats.filter(chat => {
                // Search in participant names
                return chat.participants.some((participant: any) =>
                    participant.name.match(searchRegex)
                );
            });
        }

        const total = await Chat.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Chats retrieved successfully',
            data: chats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get user chats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get chat messages
export const getChatMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const chatId = req.params.chatId;
        const currentUserId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        // Verify user has access to this chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
            res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
            return;
        }

        if (!chat.isParticipant(currentUserId)) {
            res.status(403).json({
                success: false,
                message: 'Access denied. You are not a participant of this chat.'
            });
            return;
        }

        // Mark messages as read
        await Message.markMessagesAsRead(chatId, currentUserId);

        const skip = (page - 1) * limit;

        const messages = await Message.getChatMessages(chatId, page, limit);
        const total = await Message.countDocuments({ chatId });

        res.status(200).json({
            success: true,
            message: 'Messages retrieved successfully',
            data: messages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get chat messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Send message
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const { chatId, content, messageType = 'text', replyTo }: SendMessageRequest = req.body;
        const currentUserId = req.user!.id;

        // Verify user has access to this chat
        const chat = await Chat.findById(chatId);
        if (!chat) {
            res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
            return;
        }

        if (!chat.isParticipant(currentUserId)) {
            res.status(403).json({
                success: false,
                message: 'Access denied. You are not a participant of this chat.'
            });
            return;
        }

        // Validate replyTo message if provided
        if (replyTo) {
            const repliedMessage = await Message.findById(replyTo);
            if (!repliedMessage || repliedMessage.chatId.toString() !== chatId) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid reply message'
                });
                return;
            }
        }

        // Create new message
        const newMessage = new Message({
            chatId,
            senderId: currentUserId,
            content,
            messageType,
            replyTo,
            readBy: [currentUserId] // Sender has read their own message
        });

        const savedMessage = await newMessage.save();
        await savedMessage.populate('senderId', 'name email role');
        if (replyTo) {
            await savedMessage.populate('replyTo', 'content senderId createdAt');
        }

        // Update chat's last message
        await Chat.findByIdAndUpdate(chatId, {
            lastMessage: content,
            lastMessageAt: savedMessage.createdAt,
            lastMessageBy: currentUserId
        });

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: savedMessage
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Edit message
export const editMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const messageId = req.params.messageId;
        const { content } = req.body;
        const currentUserId = req.user!.id;

        // Find message
        const message = await Message.findById(messageId);
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Message not found'
            });
            return;
        }

        // Verify user is the sender
        if (message.senderId.toString() !== currentUserId) {
            res.status(403).json({
                success: false,
                message: 'Access denied. You can only edit your own messages.'
            });
            return;
        }

        // Verify user has access to the chat
        const chat = await Chat.findById(message.chatId);
        if (!chat || !chat.isParticipant(currentUserId)) {
            res.status(403).json({
                success: false,
                message: 'Access denied. You are not a participant of this chat.'
            });
            return;
        }

        // Edit message
        message.editMessage(content);
        const updatedMessage = await message.save();
        await updatedMessage.populate('senderId', 'name email role');

        res.status(200).json({
            success: true,
            message: 'Message edited successfully',
            data: updatedMessage
        });

    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete message
export const deleteMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const messageId = req.params.messageId;
        const currentUserId = req.user!.id;

        // Find message
        const message = await Message.findById(messageId);
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Message not found'
            });
            return;
        }

        // Verify user is the sender or has admin privileges
        if (message.senderId.toString() !== currentUserId && req.user!.role === 'Agent') {
            res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own messages.'
            });
            return;
        }

        // Verify user has access to the chat
        const chat = await Chat.findById(message.chatId);
        if (!chat || !chat.isParticipant(currentUserId)) {
            res.status(403).json({
                success: false,
                message: 'Access denied. You are not a participant of this chat.'
            });
            return;
        }

        await Message.findByIdAndDelete(messageId);

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });

    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get unread message count
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const currentUserId = req.user!.id;
        const chatId = req.query.chatId as string;

        const unreadCount = await Message.getUnreadCount(currentUserId, chatId);

        res.status(200).json({
            success: true,
            message: 'Unread count retrieved successfully',
            data: { unreadCount }
        });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get chat participants
export const getChatParticipants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
            return;
        }

        const chatId = req.params.chatId;
        const currentUserId = req.user!.id;

        // Verify user has access to this chat
        const chat = await Chat.findById(chatId).populate('participants', 'name email role');
        if (!chat) {
            res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
            return;
        }

        if (!chat.isParticipant(currentUserId)) {
            res.status(403).json({
                success: false,
                message: 'Access denied. You are not a participant of this chat.'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Participants retrieved successfully',
            data: chat.participants
        });

    } catch (error) {
        console.error('Get chat participants error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Validation rules
export const validateCreateChat = [
    body('participantIds')
        .isArray({ min: 1 })
        .withMessage('At least one participant is required'),
    body('participantIds.*')
        .isMongoId()
        .withMessage('Invalid participant ID'),
    body('chatType')
        .isIn(['direct', 'group'])
        .withMessage('Chat type must be either direct or group')
];

export const validateChatId = [
    param('chatId')
        .isMongoId()
        .withMessage('Invalid chat ID')
];

export const validateMessageId = [
    param('messageId')
        .isMongoId()
        .withMessage('Invalid message ID')
];

export const validateSendMessage = [
    body('chatId')
        .isMongoId()
        .withMessage('Invalid chat ID'),
    body('content')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Message content must be between 1 and 2000 characters'),
    body('messageType')
        .optional()
        .isIn(['text', 'file', 'image', 'system'])
        .withMessage('Invalid message type'),
    body('replyTo')
        .optional()
        .isMongoId()
        .withMessage('Invalid reply message ID')
];

export const validateEditMessage = [
    body('content')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Message content must be between 1 and 2000 characters')
];

export const validateChatQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search query cannot exceed 100 characters'),
    query('chatType')
        .optional()
        .isIn(['direct', 'group'])
        .withMessage('Chat type must be either direct or group')
];

import express from 'express';
import {
    createChat,
    getUserChats,
    getChatMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    getUnreadCount,
    getChatParticipants,
    validateCreateChat,
    validateChatId,
    validateMessageId,
    validateSendMessage,
    validateEditMessage,
    validateChatQuery
} from '../controllers/chat';
import { authenticateToken, authorizeChatAccess } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication and chat access
router.use(authenticateToken);
router.use(authorizeChatAccess);

// Chat routes
router.post('/', validateCreateChat, createChat);
router.get('/', validateChatQuery, getUserChats);
router.get('/unread-count', getUnreadCount);

// Specific chat routes
router.get('/:chatId', validateChatId, getChatMessages);
router.get('/:chatId/participants', validateChatId, getChatParticipants);

// Message routes
router.post('/:chatId/messages', validateChatId, validateSendMessage, sendMessage);
router.put('/messages/:messageId', validateMessageId, validateEditMessage, editMessage);
router.delete('/messages/:messageId', validateMessageId, deleteMessage);

export default router;

import express from 'express';
import {
    createChat,
    getUserChats,
    getChatMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    getUnreadCount,
    markMessagesAsRead,
    getChatParticipants,
    searchUsers,
    getUserPresence,
    validateCreateChat,
    validateChatId,
    validateMessageId,
    validateSendMessage,
    validateEditMessage,
    validateChatQuery,
    validateSearchUsers
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
router.get('/search-users', validateSearchUsers, searchUsers);
router.get('/user-presence/:userId', validateChatId, getUserPresence);

// Specific chat routes
router.get('/:chatId', validateChatId, getChatMessages);
router.get('/:chatId/participants', validateChatId, getChatParticipants);

// Message routes
router.post('/:chatId/messages', validateChatId, validateSendMessage, sendMessage);
router.post('/:chatId/messages/read', validateChatId, markMessagesAsRead);
router.put('/messages/:messageId', validateMessageId, validateEditMessage, editMessage);
router.delete('/messages/:messageId', validateMessageId, deleteMessage);

export default router;

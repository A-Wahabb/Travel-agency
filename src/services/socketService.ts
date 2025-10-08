import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import Chat from '../models/Chat';
import Message from '../models/Message';
import Agent from '../models/Agent';
import { UserRole } from '../types';

interface AuthenticatedSocket {
    userId: string;
    role: UserRole;
    officeId?: string;
}

interface SocketData {
    user: AuthenticatedSocket;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export class SocketService {
    private io: SocketIOServer;
    private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
    private userPresence: Map<string, { status: 'online' | 'away' | 'offline', lastSeen: Date }> = new Map();

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.CLIENT_URL || "*",
                methods: ["GET", "POST"]
            }
        });

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    private setupMiddleware(): void {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }

                const decoded = jwt.verify(token, JWT_SECRET) as any;

                // Verify user exists and is active
                const user = await Agent.findById(decoded.userId).select('-password');
                if (!user || !user.isActive) {
                    return next(new Error('Authentication error: User not found or inactive'));
                }

                // All authenticated users (SuperAdmin, Admin, and Agent) can access chat
                // No role restrictions for Socket.IO chat access

                socket.data.user = {
                    userId: decoded.userId,
                    role: decoded.role,
                    officeId: decoded.officeId
                };
                next();
            } catch (error) {
                next(new Error('Authentication error: Invalid token'));
            }
        });
    }

    private setupEventHandlers(): void {
        this.io.on('connection', (socket) => {
            const user = socket.data.user as AuthenticatedSocket;

            console.log(`User ${user.userId} connected with socket ${socket.id}`);

            // Store user connection
            this.connectedUsers.set(user.userId, socket.id);
            this.userPresence.set(user.userId, { status: 'online', lastSeen: new Date() });

            // Join user to their personal room for notifications
            socket.join(`user:${user.userId}`);

            // Join user to office room if they have an office
            if (user.officeId) {
                socket.join(`office:${user.officeId}`);
            }

            // Notify other users about online status
            this.broadcastUserPresence(user.userId, 'online');

            // Handle joining chat room
            socket.on('join_chat', async (chatId: string) => {
                try {
                    // Verify user has access to this chat
                    const chatRoom = await Chat.findById(chatId);
                    if (!chatRoom || !chatRoom.isParticipant(user.userId)) {
                        socket.emit('error', { message: 'Access denied to this chat' });
                        return;
                    }

                    socket.join(`chat:${chatId}`);
                    socket.emit('joined_chat', { chatId });

                    // Mark messages as read
                    await Message.markMessagesAsRead(chatId, user.userId);

                    // Notify other participants
                    socket.to(`chat:${chatId}`).emit('user_joined', {
                        chatId,
                        userId: user.userId
                    });

                } catch (error) {
                    console.error('Join chat error:', error);
                    socket.emit('error', { message: 'Failed to join chat' });
                }
            });

            // Handle leaving chat room
            socket.on('leave_chat', (chatId: string) => {
                socket.leave(`chat:${chatId}`);
                socket.emit('left_chat', { chatId });

                // Notify other participants
                socket.to(`chat:${chatId}`).emit('user_left', {
                    chatId,
                    userId: user.userId
                });
            });

            // Handle sending messages
            socket.on('send_message', async (data: {
                chatId: string;
                content: string;
                messageType?: string;
                replyTo?: string;
            }) => {
                try {
                    const { chatId, content, messageType = 'text', replyTo } = data;

                    // Verify user has access to this chat
                    const chatRoom = await Chat.findById(chatId);
                    if (!chatRoom || !chatRoom.isParticipant(user.userId)) {
                        socket.emit('error', { message: 'Access denied to this chat' });
                        return;
                    }

                    // Validate replyTo message if provided
                    if (replyTo) {
                        const repliedMessage = await Message.findById(replyTo);
                        if (!repliedMessage || repliedMessage.chatId.toString() !== chatId) {
                            socket.emit('error', { message: 'Invalid reply message' });
                            return;
                        }
                    }

                    // Create new message
                    const newMessage = new Message({
                        chatId,
                        senderId: user.userId,
                        content,
                        messageType,
                        replyTo,
                        readBy: [user.userId]
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
                        lastMessageBy: user.userId
                    });

                    // Emit message to all participants in the chat
                    this.io.to(`chat:${chatId}`).emit('new_message', {
                        message: savedMessage,
                        chatId
                    });

                    // Send notification to offline participants
                    const chatWithParticipants = await Chat.findById(chatId).populate('participants');
                    if (chatWithParticipants) {
                        chatWithParticipants.participants.forEach((participant: any) => {
                            if (participant._id.toString() !== user.userId) {
                                const isOnline = this.connectedUsers.has(participant._id.toString());
                                if (!isOnline) {
                                    // Store notification for when user comes online
                                    this.sendNotificationToUser(participant._id.toString(), {
                                        type: 'new_message',
                                        title: 'New Message',
                                        message: `${(savedMessage.senderId as any).name}: ${savedMessage.content}`,
                                        chatId: chatId,
                                        senderId: user.userId,
                                        timestamp: new Date()
                                    });
                                }
                            }
                        });
                    }

                    // Send success response to sender
                    socket.emit('message_sent', {
                        messageId: savedMessage._id,
                        chatId
                    });

                } catch (error) {
                    console.error('Send message error:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            // Handle typing indicators
            socket.on('typing_start', (chatId: string) => {
                socket.to(`chat:${chatId}`).emit('user_typing', {
                    chatId,
                    userId: user.userId,
                    isTyping: true
                });
            });

            socket.on('typing_stop', (chatId: string) => {
                socket.to(`chat:${chatId}`).emit('user_typing', {
                    chatId,
                    userId: user.userId,
                    isTyping: false
                });
            });

            // Handle message read status
            socket.on('mark_read', async (data: { chatId: string; messageIds?: string[] }) => {
                try {
                    const { chatId, messageIds } = data;

                    // Verify user has access to this chat
                    const chat = await Chat.findById(chatId);
                    if (!chat || !chat.isParticipant(user.userId)) {
                        socket.emit('error', { message: 'Access denied to this chat' });
                        return;
                    }

                    if (messageIds && messageIds.length > 0) {
                        // Mark specific messages as read
                        await Message.updateMany(
                            {
                                _id: { $in: messageIds },
                                senderId: { $ne: user.userId },
                                readBy: { $ne: user.userId }
                            },
                            {
                                $addToSet: { readBy: user.userId },
                                $set: { isRead: true }
                            }
                        );
                    } else {
                        // Mark all messages in chat as read
                        await Message.markMessagesAsRead(chatId, user.userId);
                    }

                    // Notify other participants
                    socket.to(`chat:${chatId}`).emit('messages_read', {
                        chatId,
                        userId: user.userId,
                        messageIds
                    });

                } catch (error) {
                    console.error('Mark read error:', error);
                    socket.emit('error', { message: 'Failed to mark messages as read' });
                }
            });

            // Handle test authentication event
            socket.on('test_auth', (data) => {
                socket.emit('auth_test_response', {
                    success: true,
                    user: user,
                    message: 'Authentication working correctly'
                });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`User ${user.userId} disconnected`);
                this.connectedUsers.delete(user.userId);
                this.userPresence.set(user.userId, { status: 'offline', lastSeen: new Date() });

                // Notify other users about offline status
                this.broadcastUserPresence(user.userId, 'offline');
            });
        });
    }

    // Method to send notification to specific user
    public sendNotificationToUser(userId: string, notification: any): void {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit('notification', notification);
        }
    }

    // Method to send notification to office
    public sendNotificationToOffice(officeId: string, notification: any): void {
        this.io.to(`office:${officeId}`).emit('notification', notification);
    }

    // Method to broadcast to all connected users
    public broadcastToAll(event: string, data: any): void {
        this.io.emit(event, data);
    }

    // Method to get connected users count
    public getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }

    // Method to check if user is online
    public isUserOnline(userId: string): boolean {
        return this.connectedUsers.has(userId);
    }

    // Method to get user presence
    public getUserPresence(userId: string): { status: 'online' | 'away' | 'offline', lastSeen: Date } | null {
        return this.userPresence.get(userId) || null;
    }

    // Method to broadcast user presence
    private broadcastUserPresence(userId: string, status: 'online' | 'away' | 'offline'): void {
        this.io.emit('user_presence', {
            userId,
            status,
            timestamp: new Date()
        });
    }

    // Method to get all online users
    public getOnlineUsers(): string[] {
        return Array.from(this.connectedUsers.keys());
    }

    // Method to send enhanced notification
    public sendEnhancedNotification(userId: string, notification: {
        type: 'new_message' | 'system' | 'info' | 'warning' | 'error';
        title: string;
        message: string;
        chatId?: string;
        senderId?: string;
        timestamp: Date;
        priority?: 'low' | 'medium' | 'high';
    }): void {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit('enhanced_notification', notification);
        }
    }

    // Method to send notification to multiple users
    public sendNotificationToUsers(userIds: string[], notification: any): void {
        userIds.forEach(userId => {
            this.sendNotificationToUser(userId, notification);
        });
    }
}

export default SocketService;

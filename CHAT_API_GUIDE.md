# Chat API Guide

This guide explains how to use the chat system implemented in the Travel Agency Management System.

## Overview

The chat system allows communication between:
- **SuperAdmin to Admin**: SuperAdmin can chat with any Admin
- **SuperAdmin to Agent**: SuperAdmin can chat with any Agent
- **Admin to Admin**: Admins can chat with each other
- **Admin to Agent**: Admins can chat with any Agent
- **Agent to Agent**: Agents can chat with each other
- **Group chats**: Multiple users can participate in group conversations

**Note**: All authenticated users (SuperAdmin, Admin, and Agent) can access the chat system.

## Authentication

All chat endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## REST API Endpoints

### 1. Create Chat
**POST** `/api/chats`

Create a new direct or group chat.

**Request Body:**
```json
{
  "participantIds": ["userId1", "userId2"],
  "chatType": "direct" // or "group"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat created successfully",
  "data": {
    "_id": "chatId",
    "participants": [...],
    "chatType": "direct",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get User's Chats
**GET** `/api/chats`

Retrieve all chats for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by participant names
- `chatType` (optional): Filter by "direct" or "group"

**Response:**
```json
{
  "success": true,
  "message": "Chats retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### 3. Get Chat Messages
**GET** `/api/chats/:chatId`

Retrieve messages for a specific chat.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": [
    {
      "_id": "messageId",
      "content": "Hello!",
      "senderId": {
        "_id": "userId",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "messageType": "text",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isRead": true
    }
  ]
}
```

### 4. Send Message
**POST** `/api/chats/:chatId/messages`

Send a message to a chat.

**Request Body:**
```json
{
  "content": "Hello, how are you?",
  "messageType": "text", // optional, default: "text"
  "replyTo": "messageId" // optional, for replies
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "_id": "messageId",
    "content": "Hello, how are you?",
    "senderId": "userId",
    "chatId": "chatId",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Edit Message
**PUT** `/api/chats/messages/:messageId`

Edit a message (only by the sender).

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

### 6. Delete Message
**DELETE** `/api/chats/messages/:messageId`

Delete a message (sender can delete own messages, Admins can delete any message).

### 7. Get Unread Count
**GET** `/api/chats/unread-count`

Get unread message count.

**Query Parameters:**
- `chatId` (optional): Get count for specific chat

**Response:**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "unreadCount": 5
  }
}
```

### 8. Get Chat Participants
**GET** `/api/chats/:chatId/participants`

Get list of participants in a chat.

## Real-time Communication (Socket.IO)

### Connection

Connect to the Socket.IO server:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Client to Server Events:

1. **join_chat**
   ```javascript
   socket.emit('join_chat', 'chatId');
   ```

2. **leave_chat**
   ```javascript
   socket.emit('leave_chat', 'chatId');
   ```

3. **send_message**
   ```javascript
   socket.emit('send_message', {
     chatId: 'chatId',
     content: 'Hello!',
     messageType: 'text',
     replyTo: 'messageId' // optional
   });
   ```

4. **typing_start**
   ```javascript
   socket.emit('typing_start', 'chatId');
   ```

5. **typing_stop**
   ```javascript
   socket.emit('typing_stop', 'chatId');
   ```

6. **mark_read**
   ```javascript
   socket.emit('mark_read', {
     chatId: 'chatId',
     messageIds: ['messageId1', 'messageId2'] // optional
   });
   ```

#### Server to Client Events:

1. **new_message**
   ```javascript
   socket.on('new_message', (data) => {
     console.log('New message:', data.message);
     console.log('Chat ID:', data.chatId);
   });
   ```

2. **user_joined**
   ```javascript
   socket.on('user_joined', (data) => {
     console.log('User joined:', data.userId);
   });
   ```

3. **user_left**
   ```javascript
   socket.on('user_left', (data) => {
     console.log('User left:', data.userId);
   });
   ```

4. **user_typing**
   ```javascript
   socket.on('user_typing', (data) => {
     console.log('User typing:', data.userId, data.isTyping);
   });
   ```

5. **messages_read**
   ```javascript
   socket.on('messages_read', (data) => {
     console.log('Messages read by:', data.userId);
   });
   ```

6. **notification**
   ```javascript
   socket.on('notification', (data) => {
     console.log('Notification:', data);
   });
   ```

7. **error**
   ```javascript
   socket.on('error', (data) => {
     console.error('Socket error:', data.message);
   });
   ```

## Message Types

- **text**: Regular text messages
- **file**: File attachments
- **image**: Image attachments
- **system**: System-generated messages

## Access Control

- **SuperAdmin**: Can chat with any Admin, create group chats, access all chats
- **Admin**: Can chat with other Admins and SuperAdmin, participate in group chats
- **Agent**: Cannot access chat system

## Error Handling

All endpoints return standardized error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...] // validation errors if applicable
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

Chat endpoints are subject to rate limiting:
- 100 requests per 15 minutes per IP address

## Security Features

- JWT-based authentication
- Role-based access control
- Message validation
- Participant verification
- Real-time connection authentication

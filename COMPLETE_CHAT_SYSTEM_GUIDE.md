# Complete Chat System Guide

## 🚀 Overview

Your Travel Agency Management System now includes a comprehensive real-time chat system with the following features:

### ✅ **Core Features Implemented:**

1. **User Search & Discovery**
   - Search for users by name or email
   - Role-based filtering (Agents see office users, Admins see office users, SuperAdmin sees all)
   - Shows existing chat status for each user

2. **Real-time Messaging**
   - One-to-one direct messaging
   - Group chat support
   - Real-time message delivery via Socket.IO
   - Message read receipts
   - Typing indicators

3. **User Presence & Notifications**
   - Online/offline status tracking
   - Real-time presence updates
   - Enhanced notification system
   - Offline message notifications

4. **Modern Chat UI**
   - Responsive design
   - Real-time updates
   - Search functionality
   - Message history
   - Typing indicators

## 📋 **API Endpoints**

### **New Endpoints Added:**

#### 1. **Search Users**
```
GET /api/chats/search-users?search=john&page=1&limit=20
```
**Purpose:** Find users to chat with
**Response:** List of users with chat status

#### 2. **User Presence**
```
GET /api/chats/user-presence/:userId
```
**Purpose:** Check if a user is online
**Response:** User presence information

### **Existing Chat Endpoints:**

#### 1. **Create Chat**
```
POST /api/chats
Body: {
  "participantIds": ["userId1", "userId2"],
  "chatType": "direct"
}
```

#### 2. **Get User's Chats**
```
GET /api/chats?page=1&limit=20&search=john&chatType=direct
```

#### 3. **Get Chat Messages**
```
GET /api/chats/:chatId?page=1&limit=50
```

#### 4. **Send Message**
```
POST /api/chats/:chatId/messages
Body: {
  "content": "Hello!",
  "messageType": "text"
}
```

#### 5. **Get Unread Count**
```
GET /api/chats/unread-count?chatId=optional
```

## 🎯 **How to Use the Chat System**

### **Step 1: User Authentication**
1. Login to get your JWT token
2. The token is automatically stored in localStorage

### **Step 2: Open Chat UI**
1. Open `complete-chat-ui.html` in your browser
2. Enter your JWT token when prompted
3. The system will automatically connect to the chat server

### **Step 3: Search for Users**
1. Use the search bar in the sidebar
2. Type a user's name or email
3. Click on a user to start a new chat or continue existing conversation

### **Step 4: Send Messages**
1. Select a chat from the sidebar
2. Type your message in the input field
3. Press Enter or click Send
4. Messages appear in real-time

### **Step 5: Real-time Features**
- **Typing Indicators:** See when someone is typing
- **Online Status:** Green dot shows if user is online
- **Notifications:** Get notified of new messages
- **Read Receipts:** See when messages are read

## 🔧 **Socket.IO Events**

### **Client to Server Events:**

#### **Join Chat**
```javascript
socket.emit('join_chat', chatId);
```

#### **Send Message**
```javascript
socket.emit('send_message', {
  chatId: 'chatId',
  content: 'Hello!',
  messageType: 'text'
});
```

#### **Typing Indicators**
```javascript
socket.emit('typing_start', chatId);
socket.emit('typing_stop', chatId);
```

#### **Mark Messages as Read**
```javascript
socket.emit('mark_read', {
  chatId: 'chatId',
  messageIds: ['msg1', 'msg2'] // optional
});
```

### **Server to Client Events:**

#### **New Message**
```javascript
socket.on('new_message', (data) => {
  // data.message contains the message
  // data.chatId contains the chat ID
});
```

#### **User Typing**
```javascript
socket.on('user_typing', (data) => {
  // data.userId, data.isTyping, data.chatId
});
```

#### **User Presence**
```javascript
socket.on('user_presence', (data) => {
  // data.userId, data.status, data.timestamp
});
```

#### **Enhanced Notifications**
```javascript
socket.on('enhanced_notification', (notification) => {
  // notification.type, notification.title, notification.message
});
```

## 🎨 **UI Features**

### **Sidebar:**
- **User Info:** Shows current user name and role
- **Search Bar:** Find users to chat with
- **Chat List:** Shows all conversations with last message and timestamp
- **Unread Indicators:** Red badges show unread message counts

### **Main Chat Area:**
- **Chat Header:** Shows recipient info and online status
- **Messages:** Real-time message display with timestamps
- **Typing Indicators:** Animated dots when someone is typing
- **Message Input:** Auto-resizing textarea with send button

### **Responsive Design:**
- Works on desktop and mobile devices
- Adaptive layout for different screen sizes
- Touch-friendly interface

## 🔒 **Security Features**

### **Authentication:**
- JWT token-based authentication
- Token validation on all endpoints
- Secure Socket.IO connections

### **Authorization:**
- Role-based access control
- Users can only see users from their office (except SuperAdmin)
- Chat access verification

### **Data Validation:**
- Input sanitization
- Message length limits (2000 characters)
- File type validation for attachments

## 🚀 **Testing the System**

### **1. Basic Functionality Test:**
```bash
# 1. Start your server
npm run dev

# 2. Open complete-chat-ui.html in browser
# 3. Login with your credentials
# 4. Search for a user
# 5. Start a conversation
# 6. Send messages back and forth
```

### **2. Real-time Features Test:**
```bash
# 1. Open two browser windows/tabs
# 2. Login as different users
# 3. Start a chat between them
# 4. Test typing indicators
# 5. Test message delivery
# 6. Test online/offline status
```

### **3. API Testing with Postman:**
```bash
# Import the postman-collection.json
# Test all chat endpoints
# Verify authentication works
# Test error handling
```

## 📱 **Mobile Support**

The chat UI is fully responsive and works on:
- **Desktop:** Full-featured experience
- **Tablet:** Optimized layout
- **Mobile:** Touch-friendly interface with swipe gestures

## 🔧 **Configuration**

### **Environment Variables:**
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000  # For CORS
```

### **Socket.IO Configuration:**
- CORS enabled for cross-origin requests
- Authentication middleware for secure connections
- Automatic reconnection handling

## 🎯 **Usage Scenarios**

### **Scenario 1: Agent to Agent Communication**
1. Agent A searches for Agent B
2. Starts a direct chat
3. Sends messages about student inquiries
4. Gets real-time responses

### **Scenario 2: SuperAdmin to Office Communication**
1. SuperAdmin searches for office users
2. Creates group chats for announcements
3. Sends important updates
4. All office members receive notifications

### **Scenario 3: Customer Support**
1. Admin creates support chat with Agent
2. Real-time problem resolution
3. File sharing for documents
4. Message history for reference

## 🚀 **Future Enhancements**

### **Possible Additions:**
- **File Attachments:** Share documents and images
- **Message Reactions:** Emoji reactions to messages
- **Message Search:** Search within conversations
- **Chat Export:** Export chat history
- **Voice Messages:** Audio message support
- **Video Calls:** Integrated video calling
- **Chat Groups:** Create custom group chats
- **Message Scheduling:** Schedule messages for later

## 🐛 **Troubleshooting**

### **Common Issues:**

#### **1. Connection Issues:**
```bash
# Check if server is running
npm run dev

# Check Socket.IO connection
# Look for connection events in browser console
```

#### **2. Authentication Errors:**
```bash
# Verify JWT token is valid
# Check token expiration
# Ensure token is in Authorization header
```

#### **3. Message Not Sending:**
```bash
# Check network connection
# Verify user has access to chat
# Check server logs for errors
```

#### **4. Real-time Features Not Working:**
```bash
# Check Socket.IO connection
# Verify WebSocket support in browser
# Check CORS configuration
```

## 📞 **Support**

If you encounter any issues:
1. Check the browser console for errors
2. Verify server logs
3. Test with Postman collection
4. Check network connectivity
5. Verify authentication tokens

## 🎉 **Conclusion**

Your chat system is now fully functional with:
- ✅ User search and discovery
- ✅ Real-time messaging
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Notifications
- ✅ Modern UI
- ✅ Mobile support
- ✅ Security features

The system is ready for production use and can handle multiple concurrent users with real-time communication!


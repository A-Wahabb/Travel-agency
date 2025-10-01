# Chat System Testing Guide

This guide provides multiple ways to test the chat functionality in your application.

## Prerequisites

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Ensure you have SuperAdmin, Admin, and Agent users created** (use the existing seed script or create them manually)

3. **Get authentication tokens** for testing (you'll need at least 2 different users)

## Method 1: Using Postman Collection

### Step 1: Import the Chat API Collection

I'll create a Postman collection for you to import and test all chat endpoints.

### Step 2: Authentication Setup

1. **Login as SuperAdmin:**
   - POST `/api/auth/login`
   - Body: `{"email": "superadmin@example.com", "password": "your_password"}`
   - Copy the `accessToken` from response

2. **Login as Admin:**
   - POST `/api/auth/login`
   - Body: `{"email": "admin@example.com", "password": "your_password"}`
   - Copy the `accessToken` from response

3. **Set Authorization Headers:**
   - For all chat requests, add header: `Authorization: Bearer <access_token>`

### Step 3: Test Sequence

1. **Create a Direct Chat**
2. **Send Messages**
3. **Get Chat Messages**
4. **Test Real-time Features**

## Method 2: Using cURL Commands

### Step 1: Get Authentication Tokens

```bash
# Login as SuperAdmin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@example.com", "password": "your_password"}'

# Login as Admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your_password"}'
```

### Step 2: Test Chat Endpoints

```bash
# Set your tokens (replace with actual tokens)
SUPERADMIN_TOKEN="your_superadmin_token"
ADMIN_TOKEN="your_admin_token"

# 1. Create a direct chat
curl -X POST http://localhost:5000/api/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -d '{"participantIds": ["admin_user_id"], "chatType": "direct"}'

# 2. Get user's chats
curl -X GET http://localhost:5000/api/chats \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"

# 3. Send a message (replace chatId with actual chat ID)
curl -X POST http://localhost:5000/api/chats/CHAT_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -d '{"content": "Hello from SuperAdmin!"}'

# 4. Get chat messages
curl -X GET http://localhost:5000/api/chats/CHAT_ID \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"

# 5. Get unread count
curl -X GET http://localhost:5000/api/chats/unread-count \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Method 3: Using a Simple HTML Test Client

I'll create a simple HTML file that you can open in a browser to test the real-time features.

## Method 4: Using Node.js Test Script

I've created a comprehensive Node.js test script (`test-chat-system.js`) that automates testing of the entire chat system.

### Setup:
```bash
# Install required dependencies
npm install axios socket.io-client

# Run the test script
node test-chat-system.js
```

### What it tests:
- ✅ Authentication (SuperAdmin and Admin login)
- ✅ Chat creation (direct and group chats)
- ✅ Chat retrieval and listing
- ✅ Message sending and receiving
- ✅ Message editing and replies
- ✅ Unread message counting
- ✅ Chat participants management
- ✅ Access control (Agent denial)
- ✅ Socket.IO real-time communication
- ✅ Error handling and validation

### Expected Output:
```
ℹ️ Starting Chat System Tests...
==================================================
✅ [timestamp] PASSED: SuperAdmin Login
✅ [timestamp] PASSED: Admin Login
✅ [timestamp] PASSED: Create Direct Chat
✅ [timestamp] PASSED: Create Group Chat
...
==================================================
ℹ️ Test Results Summary:
✅ Passed: 15
❌ Failed: 0
📊 Total: 15
🎉 All tests passed!
```

## Testing Checklist

### ✅ REST API Tests
- [ ] Create direct chat
- [ ] Create group chat
- [ ] Get user chats
- [ ] Send text message
- [ ] Edit message
- [ ] Delete message
- [ ] Get chat messages
- [ ] Get unread count
- [ ] Get chat participants

### ✅ Real-time Tests
- [ ] Socket.IO connection
- [ ] Join chat room
- [ ] Send real-time message
- [ ] Receive real-time message
- [ ] Typing indicators
- [ ] Message read status
- [ ] User join/leave notifications

### ✅ Security Tests
- [ ] Unauthorized access (no token)
- [ ] Invalid token
- [ ] Agent role access (should be denied)
- [ ] Cross-chat access (should be denied)
- [ ] Message validation

### ✅ Error Handling Tests
- [ ] Invalid chat ID
- [ ] Invalid message ID
- [ ] Empty message content
- [ ] Message too long
- [ ] Invalid participant IDs

## Common Issues and Solutions

### Issue 1: "Access denied. Chat is only available for SuperAdmin and Admin users."
**Solution:** Make sure you're using a SuperAdmin or Admin account token, not an Agent token.

### Issue 2: "Authentication error: Invalid token"
**Solution:** 
- Check if the token is expired (15 minutes lifetime)
- Make sure you're including "Bearer " prefix
- Verify the token format

### Issue 3: Socket.IO connection fails
**Solution:**
- Check if the server is running
- Verify CORS settings
- Make sure you're passing the token correctly in auth

### Issue 4: "Chat not found"
**Solution:**
- Verify the chat ID exists
- Make sure the user is a participant in the chat
- Check if the chat is active

## Performance Testing

For production readiness, test:
- Multiple concurrent users
- Large message history
- High-frequency messaging
- Memory usage during long sessions
- Database query performance

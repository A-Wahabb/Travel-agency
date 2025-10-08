# Chat System Setup Guide

## 🚀 Quick Start

### **Step 1: Start Your Server**
```bash
# Make sure you're in the project directory
cd D:\WebDevelopment\Hassan\Just-for-git

# Start the development server
npm run dev
```

Your server should start on `http://localhost:5000`

### **Step 2: Get Your JWT Token**

#### **Option A: Using Postman**
1. Open Postman
2. Import the `postman-collection.json` file
3. Go to Authentication → SuperAdmin Login
4. Send the request to get your token
5. Copy the token from the response

#### **Option B: Using Browser**
1. Open your browser
2. Go to `http://localhost:5000/api/auth/login`
3. Send a POST request with:
   ```json
   {
     "email": "superadmin@travelagency.com",
     "password": "SuperAdmin123!"
   }
   ```
4. Copy the token from the response

### **Step 3: Open the Chat UI**
1. Open `complete-chat-ui.html` in your browser
2. When prompted, paste your JWT token
3. The chat system should now work!

## 🔧 **Configuration**

### **If Your Server Runs on a Different Port:**
Edit the `complete-chat-ui.html` file and change these lines:

```javascript
this.apiBaseUrl = 'http://localhost:YOUR_PORT/api';
this.socketUrl = 'http://localhost:YOUR_PORT';
```

### **If Your Server Runs on a Different Host:**
```javascript
this.apiBaseUrl = 'http://YOUR_HOST:5000/api';
this.socketUrl = 'http://YOUR_HOST:5000';
```

## 🐛 **Troubleshooting**

### **Issue: "Failed to fetch" or CORS errors**
**Solution:** Make sure your server is running and the URLs are correct.

### **Issue: "Authentication error"**
**Solution:** 
1. Check if your JWT token is valid
2. Make sure the token hasn't expired
3. Try getting a new token

### **Issue: "Socket connection failed"**
**Solution:**
1. Make sure your server is running
2. Check if Socket.IO is properly configured
3. Verify the socket URL is correct

### **Issue: "No users found"**
**Solution:**
1. Make sure you have other users in your database
2. Check if users are active
3. Verify your role permissions

## 🧪 **Testing**

### **Test with Multiple Users:**
1. Open `complete-chat-ui.html` in two different browsers
2. Login with different user accounts
3. Search for each other and start chatting
4. Test real-time messaging

### **Test with Postman:**
1. Import the postman collection
2. Test all chat endpoints
3. Verify authentication works

## 📱 **Mobile Testing**

The chat UI is responsive and works on mobile devices:
1. Open `complete-chat-ui.html` on your phone
2. The interface will adapt to mobile screens
3. All features work on touch devices

## 🎯 **Expected Behavior**

### **When Everything Works:**
1. ✅ Server starts without errors
2. ✅ Chat UI loads and asks for token
3. ✅ After entering token, you see your user info
4. ✅ You can search for users
5. ✅ You can start chats and send messages
6. ✅ Real-time messaging works between users
7. ✅ Typing indicators appear
8. ✅ Online/offline status updates

### **API Endpoints That Should Work:**
- `GET /api/auth/profile` - Get current user
- `GET /api/chats` - Get user's chats
- `GET /api/chats/search-users` - Search for users
- `POST /api/chats` - Create new chat
- `GET /api/chats/:chatId` - Get chat messages
- `POST /api/chats/:chatId/messages` - Send message

## 🔒 **Security Notes**

1. **JWT Tokens:** Store securely, they expire
2. **CORS:** Configure properly for production
3. **Authentication:** All endpoints require valid tokens
4. **Authorization:** Users can only access their own chats

## 🚀 **Production Deployment**

### **For Production:**
1. Change the API URLs to your production server
2. Configure proper CORS settings
3. Use HTTPS for security
4. Set up proper JWT secret keys
5. Configure MongoDB Atlas connection

### **Environment Variables:**
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret
CLIENT_URL=https://yourdomain.com
```

## 📞 **Need Help?**

If you're still having issues:

1. **Check the browser console** for JavaScript errors
2. **Check the server logs** for backend errors
3. **Verify your MongoDB connection** is working
4. **Test the API endpoints** with Postman first
5. **Make sure all dependencies** are installed (`npm install`)

## 🎉 **Success!**

Once everything is working, you'll have:
- ✅ Real-time chat system
- ✅ User search functionality
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Message notifications
- ✅ Modern, responsive UI
- ✅ Mobile support

Your Travel Agency chat system is ready for use! 🚀


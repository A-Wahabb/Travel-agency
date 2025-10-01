# 📮 Postman Collection Guide

## 🚀 **Postman Collection Status (UPDATED)**

The Postman collection has been **verified and updated** with:
- ✅ **Courses Routes** - Fixed missing `/api/courses` routes in server.ts
- ✅ **Bulk Document Upload** - Verified S3-integrated bulk document upload system
- ✅ **Refresh Token Support** - New endpoints for token refresh
- ✅ **Correct Agent Creation** - Fixed role validation issues
- ✅ **Multiple Agent Examples** - Different roles (Agent, Admin, SuperAdmin)
- ✅ **Enhanced Logout** - Includes refresh token invalidation
- ✅ **Environment Variables** - Added refreshToken variable
- ✅ **Office Location Support** - Google Maps, coordinates, and description support

## 📋 **Environment Variables Setup**

### **Required Variables:**
```json
{
  "baseUrl": "http://localhost:5000",
  "token": "your-jwt-token-here",
  "refreshToken": "your-refresh-token-here",
  "officeId": "your-office-id-here",
  "agentId": "your-agent-id-here",
  "studentId": "your-student-id-here",
  "paymentId": "your-payment-id-here",
  "notificationId": "your-notification-id-here"
}
```

## 🔐 **Authentication Flow**

### **1. SuperAdmin Login**
```json
POST {{baseUrl}}/api/auth/login
{
  "email": "superadmin@travelagency.com",
  "password": "SuperAdmin123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SuperAdmin login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### **2. Set Environment Variables**
After login, set these variables:
- `token` = `data.token`
- `refreshToken` = `data.refreshToken`

### **3. Refresh Token (When Access Token Expires)**
```json
POST {{baseUrl}}/api/auth/refresh
{
  "refreshToken": "{{refreshToken}}"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "new-access-token-here"
  }
}
```

### **4. Logout (Invalidates Refresh Token)**
```json
POST {{baseUrl}}/api/auth/logout
{
  "refreshToken": "{{refreshToken}}"
}
```

## 👥 **Agent Creation Examples**

### **Create Regular Agent**
```json
POST {{baseUrl}}/api/agents
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "Agent",
  "officeId": "{{officeId}}",
  "phone": "+1234567890"
}
```

### **Create Admin Agent**
```json
POST {{baseUrl}}/api/agents
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "role": "Admin",
  "officeId": "{{officeId}}",
  "phone": "+1234567890"
}
```

### **Create SuperAdmin Agent**
```json
POST {{baseUrl}}/api/agents
{
  "name": "Super Admin User",
  "email": "superadmin2@example.com",
  "password": "password123",
  "role": "SuperAdmin",
  "phone": "+1234567890"
}
```

## 👨‍🎓 **Student Creation Examples**

### **Create Student (Agent)**
```json
POST {{baseUrl}}/api/students
{
  "name": "Sarah Johnson",
  "email": "sarah.johnson@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "dateOfBirth": "1995-05-15",
  "nationality": "American",
  "passportNumber": "A12345678"
}
```
**Note:** For Agents, `officeId` and `agentId` are automatically set to the agent's office and ID. Optional fields like `dateOfBirth`, `nationality`, and `passportNumber` can be included.

### **Create Student (SuperAdmin)**
```json
POST {{baseUrl}}/api/students
{
  "name": "John Student",
  "email": "john.student@example.com",
  "password": "password123",
  "officeId": "{{officeId}}",
  "agentId": "{{agentId}}",
  "phone": "+1234567890"
}
```
**Note:** For SuperAdmin, `officeId` is required, `agentId` is optional.

## 💳 **Payment Creation Examples**

### **Create Payment (Cash)**
```json
POST {{baseUrl}}/api/payments
{
  "studentId": "{{studentId}}",
  "amount": 1000,
  "date": "2024-01-15",
  "paymentMethod": "cash",
  "notes": "Initial payment"
}
```

### **Create Payment (Bank Transfer)**
```json
POST {{baseUrl}}/api/payments
{
  "studentId": "{{studentId}}",
  "amount": 2500,
  "date": "2024-01-20",
  "paymentMethod": "bank_transfer",
  "notes": "Bank transfer payment"
}
```

## 🔔 **Notification Creation Examples**

### **Create Notification**
```json
POST {{baseUrl}}/api/notifications
{
  "officeId": "{{officeId}}",
  "agentId": "{{agentId}}",
  "message": "New student registration completed",
  "title": "Student Registration",
  "type": "student",
  "priority": "medium"
}
```

## 📊 **Statistics & Reports**

### **Get Payment Statistics**
```json
GET {{baseUrl}}/api/payments/stats
```

### **Get Unread Notifications Count**
```json
GET {{baseUrl}}/api/notifications/unread/count
```

## ⚠️ **Important Notes**

### **Role Validation:**
- ✅ Valid roles: `"SuperAdmin"`, `"Admin"`, `"Agent"`
- ❌ Invalid roles: `"superadmin"`, `"admin"`, `"agent"` (lowercase)
- ❌ Invalid roles: `"Super Admin"`, `"super admin"` (spaces)

### **Required Fields for Agent Creation:**
- `name` (string, 2-100 characters)
- `email` (valid email format, unique)
- `password` (string, minimum 6 characters)
- `role` (one of: "SuperAdmin", "Admin", "Agent")
- `officeId` (required for Agent and Admin, optional for SuperAdmin)
- `phone` (optional, valid phone format)

### **Required Fields for Student Creation:**
- `name` (string, 2-100 characters)
- `email` (valid email format, unique)
- `password` (string, minimum 6 characters)
- `officeId` (required for SuperAdmin, auto-set for Agent)
- `agentId` (optional for SuperAdmin, auto-set for Agent)
- `phone` (optional, valid phone format)
- `dateOfBirth` (optional, ISO date format)
- `nationality` (optional, 2-50 characters)
- `passportNumber` (optional, 1-50 characters)

### **Required Fields for Payment Creation:**
- `studentId` (valid MongoDB ObjectId)
- `amount` (number, positive value)
- `date` (ISO date format)
- `paymentMethod` (one of: "cash", "card", "bank_transfer", "check", "other")
- `notes` (optional, string)

### **Required Fields for Notification Creation:**
- `officeId` (valid MongoDB ObjectId)
- `agentId` (valid MongoDB ObjectId)
- `message` (string)
- `title` (string)
- `type` (one of: "info", "success", "warning", "error", "payment", "student", "system")
- `priority` (optional, one of: "low", "medium", "high", "urgent")

### **Token Management:**
- **Access Token**: Valid for 15 minutes
- **Refresh Token**: Valid for 7 days
- **Auto-refresh**: Use refresh token when access token expires
- **Logout**: Removes refresh token from database

## 🔄 **Testing Workflow**

### **Complete Testing Sequence:**

1. **Login as SuperAdmin**
   ```bash
   POST {{baseUrl}}/api/auth/login
   ```

2. **Create Office**
   ```bash
   POST {{baseUrl}}/api/offices
   ```

3. **Create Agent**
   ```bash
   POST {{baseUrl}}/api/agents
   ```

4. **Create Student**
   ```bash
   POST {{baseUrl}}/api/students
   ```

5. **Create Payment**
   ```bash
   POST {{baseUrl}}/api/payments
   ```

6. **Create Notification**
   ```bash
   POST {{baseUrl}}/api/notifications
   ```

7. **Test Refresh Token**
   ```bash
   POST {{baseUrl}}/api/auth/refresh
   ```

8. **Logout**
   ```bash
   POST {{baseUrl}}/api/auth/logout
   ```

## 🛠 **Troubleshooting**

### **Common Issues:**

1. **"Invalid role" Error**
   - Check role spelling and case
   - Use exact values: "SuperAdmin", "Admin", "Agent"

2. **"Validation failed" Error**
   - Check all required fields
   - Verify email format
   - Ensure password is at least 6 characters
   - For SuperAdmin creating students: `officeId` is required
   - For Agent creating students: `officeId` and `agentId` are auto-set

3. **"Invalid token" Error**
   - Token may have expired
   - Use refresh token to get new access token

4. **"Route not found" Error**
   - Check baseUrl is correct
   - Ensure server is running on port 5000

### **Environment Setup:**
1. Import `postman-collection.json`
2. Set `baseUrl` to `http://localhost:5000`
3. Run `npm run seed` to create SuperAdmin
4. Login and set `token` and `refreshToken` variables

## 📚 **API Endpoints Summary**

| Method | Endpoint | Description | Auth Required | Status |
|--------|----------|-------------|---------------|--------|
| POST | `/api/auth/login` | Login | No | ✅ Updated |
| POST | `/api/auth/refresh` | Refresh token | No | ✅ Updated |
| GET | `/api/auth/profile` | Get profile | Yes | ✅ Verified |
| PUT | `/api/auth/profile` | Update profile | Yes | ✅ Verified |
| PUT | `/api/auth/change-password` | Change password | Yes | ✅ Verified |
| POST | `/api/auth/logout` | Logout | Yes | ✅ Updated |
| GET | `/api/offices` | Get offices | Yes | ✅ Verified |
| POST | `/api/offices` | Create office | Yes | ✅ Verified |
| GET | `/api/agents` | Get agents | Yes | ✅ Verified |
| POST | `/api/agents` | Create agent | Yes | ✅ Verified |
| GET | `/api/students` | Get students | Yes | ✅ Verified |
| POST | `/api/students` | Create student | Yes | ✅ Verified |
| POST | `/api/students/:id/documents/bulk` | Bulk upload documents | Yes | ✅ Verified |
| GET | `/api/students/:id/documents` | Get student documents | Yes | ✅ Verified |
| DELETE | `/api/students/:id/documents/:type` | Delete document | Yes | ✅ Verified |
| GET | `/api/courses` | Get courses | Yes | ✅ Fixed |
| POST | `/api/courses` | Create course | Yes | ✅ Fixed |
| PUT | `/api/courses/:id/students/:studentId` | Link student to course | Yes | ✅ Fixed |
| GET | `/api/payments` | Get payments | Yes | ✅ Verified |
| POST | `/api/payments` | Create payment | Yes | ✅ Verified |
| GET | `/api/notifications` | Get notifications | Yes | ✅ Verified |
| POST | `/api/notifications` | Create notification | Yes | ✅ Verified |

---

## **🔧 Recent Fixes Applied**

1. **✅ Fixed Missing Courses Route**: Added `app.use('/api/courses', courseRoutes)` to `src/server.ts`
2. **✅ Verified Document Upload**: All bulk document upload endpoints are properly implemented with S3 integration
3. **✅ Updated Documentation**: This guide now reflects the current API status

---

**Happy Testing! 🚀**

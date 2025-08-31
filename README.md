# Travel Agency Backend API

A comprehensive TypeScript-based backend API for Travel Agency Management System built with Node.js, Express, and MongoDB.

## 🚀 Features

- **TypeScript**: Full TypeScript implementation with strict type checking
- **Role-Based Access Control**: SuperAdmin, Admin, and Agent roles with different permissions
- **JWT Authentication**: Secure token-based authentication
- **File Upload**: Document upload functionality for students
- **Payment Management**: Manual payment tracking with receipt generation
- **Notification System**: Real-time notifications with read/unread status
- **Pagination**: Built-in pagination for all list endpoints
- **Input Validation**: Comprehensive validation using express-validator
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Security**: Helmet, CORS, and rate limiting for enhanced security
- **Logging**: Morgan HTTP request logging

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: Bcrypt
- **File Upload**: Multer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Express Rate Limit
- **Logging**: Morgan

## 📁 Project Structure

```
src/
├── config/           # Database and authentication configuration
├── controllers/      # Business logic and API handlers
├── middlewares/      # Custom middleware (auth, validation, upload)
├── models/          # Mongoose schemas and models
├── routes/          # API route definitions
├── types/           # TypeScript interfaces and types
└── server.ts        # Main application entry point

uploads/
└── docs/           # Document uploads directory

dist/               # Compiled JavaScript output (generated)
```

## 🔐 Role-Based Access Control (RBAC)

### SuperAdmin
- Full access to all resources
- Can manage offices, agents, students, payments, and notifications
- Can create and manage other SuperAdmins

### Admin
- Limited to their office's agents and students
- Can manage agents within their office
- Can view all students and payments in their office
- Can create notifications for their office

### Agent
- Limited to their own students and payments
- Can create and manage students
- Can upload student documents
- Can create payments for their students
- Can manage their own notifications

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travel-agency-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/travel_agency_db
   JWT_SECRET=your_super_secret_jwt_key_here
   NODE_ENV=development
   ```

4. **Seed SuperAdmin (First Time Setup)**
   ```bash
   npm run seed
   ```
   This will create the initial SuperAdmin user:
   - **Email**: `superadmin@travelagency.com`
   - **Password**: `SuperAdmin123!`
   - **Role**: `SuperAdmin`

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Start the server**
   ```bash
   # Development mode (with hot reload)
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | User login (SuperAdmin/Admin/Agent) | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public |
| GET | `/api/auth/profile` | Get current user profile | Private |
| PUT | `/api/auth/profile` | Update current user profile | Private |
| PUT | `/api/auth/change-password` | Change user password | Private |
| POST | `/api/auth/logout` | Logout user | Private |

### Offices (SuperAdmin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/offices` | Get all offices |
| GET | `/api/offices/:id` | Get single office |
| POST | `/api/offices` | Create office |
| PUT | `/api/offices/:id` | Update office |
| DELETE | `/api/offices/:id` | Delete office |

### Agents (SuperAdmin, Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | Get all agents |
| GET | `/api/agents/:id` | Get single agent |
| POST | `/api/agents` | Create agent |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |

### Students (Agent, SuperAdmin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | Get all students |
| GET | `/api/students/:id` | Get single student |
| POST | `/api/students` | Create student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| POST | `/api/students/:id/documents` | Upload student document |

**Note:** 
- **Agent**: `officeId` and `agentId` are automatically set to the agent's office and ID
- **SuperAdmin**: `officeId` is required, `agentId` is optional

### Payments (Agent, Admin, SuperAdmin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | Get all payments |
| GET | `/api/payments/:id` | Get single payment |
| POST | `/api/payments` | Create payment |
| PUT | `/api/payments/:id` | Update payment |
| DELETE | `/api/payments/:id` | Delete payment |
| GET | `/api/payments/stats` | Get payment statistics |

### Notifications (Agent, Admin, SuperAdmin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| GET | `/api/notifications/:id` | Get single notification |
| POST | `/api/notifications` | Create notification |
| PUT | `/api/notifications/:id` | Update notification |
| DELETE | `/api/notifications/:id` | Delete notification |
| PUT | `/api/notifications/:id/read` | Mark as read |
| PUT | `/api/notifications/:id/unread` | Mark as unread |
| GET | `/api/notifications/unread/count` | Get unread count |

## 🔐 Authentication & Authorization

### User Roles & Permissions

**SuperAdmin**
- Full access to all resources across all offices
- Can create, read, update, delete offices
- Can manage all agents and students (officeId required for student creation)
- Can view all payments and notifications
- Can access system-wide statistics

**Admin**
- Access limited to their assigned office
- Can manage agents within their office
- Can view and manage students in their office
- Can create payments for students in their office
- Can manage notifications for their office

**Agent**
- Access limited to their own students and payments
- Can create and manage their assigned students (officeId and agentId auto-set)
- Can upload student documents
- Can create payments for their students
- Can view notifications assigned to them

### Authentication Flow

1. **Login**: User provides email and password
2. **Validation**: Server validates credentials
3. **Token Generation**: JWT token is created with user role and office info
4. **Authorization**: Token is validated on each protected request
5. **Role Check**: Server verifies user has required permissions

### Initial Setup

After running `npm run seed`, you'll have a SuperAdmin account:
- **Email**: `superadmin@travelagency.com`
- **Password**: `SuperAdmin123!`

### Login Examples

**SuperAdmin Login:**
```json
POST /api/auth/login
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
    "user": {
      "_id": "...",
      "name": "Super Administrator",
      "email": "superadmin@travelagency.com",
      "role": "SuperAdmin",
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Refresh Token:**
```json
POST /api/auth/refresh
{
  "refreshToken": "your_refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "new_access_token_here"
  }
}
```

### Token Usage

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Security Features

- **JWT Authentication**: Secure token-based authentication with short-lived access tokens (15 minutes)
- **Refresh Tokens**: Long-lived refresh tokens (7 days) for seamless user experience
- **Password Hashing**: All passwords are hashed using bcrypt
- **Token Expiration**: JWT tokens have expiration time
- **Role-Based Access**: Strict permission checking
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: API endpoints are rate-limited
- **CORS Protection**: Cross-origin requests are controlled
- **Token Storage**: Refresh tokens stored securely in database with expiration tracking

## 🔧 Query Parameters

Most list endpoints support the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term for filtering
- `sortBy`: Field to sort by (default: createdAt)
- `sortOrder`: Sort order - 'asc' or 'desc' (default: desc)

### Example
```
GET /api/students?page=1&limit=20&search=john&sortBy=name&sortOrder=asc
```

## 📁 File Upload

### Supported File Types
- PDF documents
- Images (JPEG, JPG, PNG, GIF)
- Office documents (Word, Excel)

### File Size Limits
- Maximum file size: 10MB
- Maximum files per request: 5

### Upload Endpoint
```
POST /api/students/:id/documents
Content-Type: multipart/form-data

Fields:
- document: File
- documentType: 'passport' | 'visa' | 'certificate' | 'other'
```

## 🗄 Database Schema

### Office
```typescript
{
  name: string,
  address: string,
  createdBy: ObjectId (ref: Agent),
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Agent
```typescript
{
  name: string,
  email: string (unique),
  password: string (hashed),
  role: 'SuperAdmin' | 'Admin' | 'Agent',
  officeId: ObjectId (ref: Office),
  phone: string,
  isActive: boolean,
  lastLogin: Date,
  refreshTokens: [{
    token: string,
    createdAt: Date,
    expiresAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Student
```typescript
{
  name: string,
  email: string (unique),
  password: string (hashed),
  officeId: ObjectId (ref: Office),
  agentId: ObjectId (ref: Agent),
  phone: string,
  dateOfBirth: Date,
  nationality: string,
  passportNumber: string,
  documents: [{
    filename: string,
    originalName: string,
    path: string,
    uploadedAt: Date,
    documentType: 'passport' | 'visa' | 'certificate' | 'other'
  }],
  status: 'active' | 'inactive' | 'pending' | 'completed',
  createdAt: Date,
  updatedAt: Date
}
```

### Payment
```typescript
{
  studentId: ObjectId (ref: Student),
  amount: number,
  date: Date,
  createdBy: ObjectId (ref: Agent),
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other',
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  receiptNumber: string (auto-generated),
  notes: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Notification
```typescript
{
  officeId: ObjectId (ref: Office),
  agentId: ObjectId (ref: Agent),
  message: string,
  title: string,
  type: 'info' | 'success' | 'warning' | 'error' | 'payment' | 'student' | 'system',
  status: 'unread' | 'read',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  readAt: Date,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with 12 salt rounds
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security Headers**: Helmet for security headers
- **CORS**: Configurable cross-origin resource sharing
- **File Upload Security**: File type and size validation

## 🚀 Deployment

### DigitalOcean App Platform

1. **Connect your repository** to DigitalOcean App Platform
2. **Configure environment variables**:
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your JWT secret key
   - `NODE_ENV`: `production`
3. **Set build command**: `npm run build`
4. **Set run command**: `npm start`
5. **Deploy**

### Environment Variables for Production

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/travel_agency_db
JWT_SECRET=your_production_jwt_secret_key
NODE_ENV=production
```

## 🧪 Testing

### Postman Collection
Import the provided `postman-collection.json` file into Postman for API testing.

### Environment Variables for Testing
```env
baseUrl: http://localhost:5000/api
token: <your_jwt_token>
```

## 📝 Scripts

```json
{
  "start": "node dist/server.js",     // Production start
  "dev": "nodemon src/server.ts",     // Development with hot reload
  "build": "tsc",                     // TypeScript compilation
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Note**: This is a TypeScript-based backend API. Make sure you have Node.js 16+ installed and run `npm run build` before starting the production server.


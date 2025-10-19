# Application System Implementation Guide

## Overview
The application system allows students to be linked to multiple courses through applications. Each application represents a single student applying to a single course, but a student can have multiple applications for different courses.

## Database Structure

### Application Model
- **studentId**: Reference to Student (one student per application)
- **courseId**: Reference to Course (one course per application)
- **status**: Application status (pending, submitted, under_review, accepted, rejected, waitlisted)
- **priority**: Priority level (low, medium, high, urgent)
- **comments**: Array of comments with author information and timestamps
- **documents**: Application-specific documents
- **notes**: Additional notes about the application

### Key Relationships
- **1 Application = 1 Student + 1 Course** (unique constraint on studentId + courseId)
- **1 Student can have multiple Applications** (one-to-many relationship)
- **1 Course can have multiple Applications** (one-to-many relationship)

## API Endpoints

### Application Management
```
GET    /api/applications                    # Get all applications (with filters)
GET    /api/applications/:id                # Get single application
POST   /api/applications                    # Create new application
PUT    /api/applications/:id                # Update application
DELETE /api/applications/:id                # Soft delete application
```

### Application Search & Filtering
```
GET    /api/applications/search?q=term      # Search applications
GET    /api/applications/stats              # Get application statistics
GET    /api/applications/student/:studentId # Get applications by student
GET    /api/applications/course/:courseId   # Get applications by course
```

### Comments System
```
POST   /api/applications/:id/comments       # Add comment to application
```

## Access Control

### Agent Level
- Can only see applications for their own students
- Can create applications for their students
- Can update applications for their students
- Can add comments to applications for their students

### Admin Level
- Can see applications for students in their office
- Can manage applications for students in their office
- Can add comments to applications for students in their office

### SuperAdmin Level
- Can see all applications
- Can manage all applications
- Can add comments to any application

## Usage Examples

### 1. Create Application
```javascript
POST /api/applications
{
  "studentId": "64a1b2c3d4e5f6789012345",
  "courseId": "64a1b2c3d4e5f6789012346",
  "priority": "high",
  "notes": "Student is very interested in this program"
}
```

### 2. Add Comment to Application
```javascript
POST /api/applications/64a1b2c3d4e5f6789012347/comments
{
  "content": "Application submitted successfully. Waiting for university response."
}
```

### 3. Search Applications
```javascript
GET /api/applications/search?q=computer science
```

### 4. Get Student's Applications
```javascript
GET /api/applications/student/64a1b2c3d4e5f6789012345
```

### 5. Update Application Status
```javascript
PUT /api/applications/64a1b2c3d4e5f6789012347
{
  "status": "accepted",
  "decisionDate": "2024-01-15"
}
```

## Features Implemented

### ✅ Application Management
- Create, read, update, delete applications
- Unique constraint prevents duplicate applications (same student + course)
- Soft delete functionality

### ✅ Search & Filtering
- Search by student name, course name, notes, comments
- Filter by status, priority, date ranges
- Pagination support

### ✅ Comments System
- Add comments with author name and timestamp
- Comments are tied to specific applications
- Author information is automatically populated

### ✅ Access Control
- Role-based access (Agent, Admin, SuperAdmin)
- Agents can only access their students' applications
- Admins can access applications for students in their office
- SuperAdmins have full access

### ✅ Statistics
- Application counts by status
- Priority distribution
- Role-based statistics

## Database Indexes
- Compound index on (studentId, courseId) for uniqueness
- Indexes on status, priority, applicationDate for performance
- Text search index on notes and comments
- Compound indexes for common query patterns

## Migration Notes
- Existing `courseId` field in Student model is kept for backward compatibility
- New `applications` virtual field provides access to all student applications
- No breaking changes to existing functionality

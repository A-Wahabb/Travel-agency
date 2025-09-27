# Student Document Upload System with S3

This document explains how to use the new bulk document upload system for students that integrates with AWS S3.

## Overview

The system allows uploading multiple specific document types for students in a single request. All documents are stored in AWS S3 with organized folder structure and proper metadata.

## Supported Document Types

The following document types are supported:

1. **profilePicture** - Student's profile picture
2. **matricCertificate** - Matriculation certificate
3. **matricMarksSheet** - Matriculation marks sheet
4. **intermediateCertificate** - Intermediate certificate
5. **intermediateMarkSheet** - Intermediate marks sheet
6. **degree** - Degree certificate
7. **transcript** - Academic transcript
8. **languageCertificate** - Language proficiency certificate
9. **passport** - Passport document
10. **experienceLetter** - Work experience letter
11. **birthCertificate** - Birth certificate
12. **familyRegistration** - Family registration document
13. **otherDocs** - Additional documents (up to 10 files)

## API Endpoints

### 1. Bulk Document Upload
**POST** `/api/students/:id/documents/bulk`

Upload multiple documents for a student in a single request.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `profilePicture`: File (optional)
- `matricCertificate`: File (optional)
- `matricMarksSheet`: File (optional)
- `intermediateCertificate`: File (optional)
- `intermediateMarkSheet`: File (optional)
- `degree`: File (optional)
- `transcript`: File (optional)
- `languageCertificate`: File (optional)
- `passport`: File (optional)
- `experienceLetter`: File (optional)
- `birthCertificate`: File (optional)
- `familyRegistration`: File (optional)
- `otherDocs`: File[] (optional, up to 10 files)

**Response:**
```json
{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": {
    "studentId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "uploadResults": [
      {
        "documentType": "profilePicture",
        "success": true,
        "document": {
          "filename": "profilePicture-1234567890.jpg",
          "originalName": "student_photo.jpg",
          "path": "https://s3.amazonaws.com/bucket/...",
          "uploadedAt": "2023-09-15T10:30:00.000Z",
          "documentType": "certificate",
          "s3Key": "studentId/profilePicture/uuid.jpg",
          "s3Url": "https://s3.amazonaws.com/bucket/...",
          "size": 1024000,
          "mimetype": "image/jpeg"
        }
      }
    ],
    "totalUploaded": 5,
    "totalFailed": 0
  }
}
```

### 2. Get Student Documents
**GET** `/api/students/:id/documents`

Retrieve all documents for a specific student.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Student documents retrieved successfully",
  "data": {
    "studentId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "studentName": "John Doe",
    "studentEmail": "john@example.com",
    "documents": {
      "profilePicture": {
        "filename": "profilePicture-1234567890.jpg",
        "originalName": "student_photo.jpg",
        "path": "https://s3.amazonaws.com/bucket/...",
        "uploadedAt": "2023-09-15T10:30:00.000Z",
        "documentType": "certificate",
        "s3Key": "studentId/profilePicture/uuid.jpg",
        "s3Url": "https://s3.amazonaws.com/bucket/...",
        "size": 1024000,
        "mimetype": "image/jpeg"
      },
      "otherDocs": [
        {
          "filename": "otherDocs-1234567890.pdf",
          "originalName": "additional_doc.pdf",
          "path": "https://s3.amazonaws.com/bucket/...",
          "uploadedAt": "2023-09-15T10:30:00.000Z",
          "documentType": "other",
          "s3Key": "studentId/otherDocs_0/uuid.pdf",
          "s3Url": "https://s3.amazonaws.com/bucket/...",
          "size": 2048000,
          "mimetype": "application/pdf"
        }
      ]
    }
  }
}
```

### 3. Delete Specific Document
**DELETE** `/api/students/:id/documents/:documentType`

Delete a specific document type for a student.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parameters:**
- `id`: Student ID
- `documentType`: Document type to delete
- `index`: Query parameter required for `otherDocs` (specifies which document to delete)

**Examples:**
```
DELETE /api/students/64f8a1b2c3d4e5f6a7b8c9d0/documents/profilePicture
DELETE /api/students/64f8a1b2c3d4e5f6a7b8c9d0/documents/otherDocs?index=0
```

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "data": {
    "deletedDocument": {
      "documentType": "profilePicture",
      "originalName": "student_photo.jpg",
      "deletedAt": "2023-09-15T11:00:00.000Z"
    }
  }
}
```

## File Upload Constraints

- **File Size**: Maximum 10MB per file
- **Total Files**: Maximum 15 files per request
- **Allowed Types**: PDF, Images (JPEG, PNG, GIF, WebP), Office documents (Word, Excel, PowerPoint)
- **OtherDocs Limit**: Up to 10 additional documents

## S3 Storage Structure

Documents are stored in S3 with the following structure:
```
bucket-name/
├── studentId/
│   ├── profilePicture/
│   │   └── uuid.jpg
│   ├── matricCertificate/
│   │   └── uuid.pdf
│   ├── otherDocs/
│   │   ├── uuid_0.pdf
│   │   └── uuid_1.docx
│   └── ...
```

## Environment Configuration

Add the following environment variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
```

## Frontend Integration Example

### HTML Form
```html
<form id="documentUploadForm" enctype="multipart/form-data">
  <div>
    <label for="profilePicture">Profile Picture:</label>
    <input type="file" id="profilePicture" name="profilePicture" accept="image/*">
  </div>
  
  <div>
    <label for="matricCertificate">Matric Certificate:</label>
    <input type="file" id="matricCertificate" name="matricCertificate" accept=".pdf,.doc,.docx">
  </div>
  
  <div>
    <label for="otherDocs">Additional Documents:</label>
    <input type="file" id="otherDocs" name="otherDocs" multiple accept=".pdf,.doc,.docx,.jpg,.png">
  </div>
  
  <button type="submit">Upload Documents</button>
</form>
```

### JavaScript Implementation
```javascript
document.getElementById('documentUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  const studentId = '64f8a1b2c3d4e5f6a7b8c9d0';
  
  // Add files to form data
  const profilePicture = document.getElementById('profilePicture').files[0];
  if (profilePicture) {
    formData.append('profilePicture', profilePicture);
  }
  
  const matricCertificate = document.getElementById('matricCertificate').files[0];
  if (matricCertificate) {
    formData.append('matricCertificate', matricCertificate);
  }
  
  const otherDocs = document.getElementById('otherDocs').files;
  for (let i = 0; i < otherDocs.length; i++) {
    formData.append('otherDocs', otherDocs[i]);
  }
  
  try {
    const response = await fetch(`/api/students/${studentId}/documents/bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Documents uploaded successfully:', result.data);
      alert(`Successfully uploaded ${result.data.totalUploaded} documents`);
    } else {
      console.error('Upload failed:', result.message);
      alert('Upload failed: ' + result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred during upload');
  }
});
```

## Error Handling

The system provides comprehensive error handling:

1. **File Type Validation**: Only allowed file types are accepted
2. **File Size Validation**: Files exceeding 10MB are rejected
3. **File Count Validation**: Maximum 15 files per request
4. **S3 Upload Errors**: Automatic cleanup of partially uploaded files
5. **Access Control**: Role-based access control for document operations

## Security Features

1. **Authentication**: JWT token required for all operations
2. **Authorization**: Role-based access (Agent, Admin, SuperAdmin)
3. **File Validation**: Strict file type and size validation
4. **S3 Security**: Presigned URLs with expiration
5. **Access Control**: Users can only access documents for their assigned students

## Database Schema Updates

The Student model now includes a `studentDocuments` field with the following structure:

```typescript
interface IStudentDocuments {
  profilePicture?: IDocument;
  matricCertificate?: IDocument;
  matricMarksSheet?: IDocument;
  intermediateCertificate?: IDocument;
  intermediateMarkSheet?: IDocument;
  degree?: IDocument;
  transcript?: IDocument;
  languageCertificate?: IDocument;
  passport?: IDocument;
  experienceLetter?: IDocument;
  birthCertificate?: IDocument;
  familyRegistration?: IDocument;
  otherDocs?: IDocument[];
}
```

## Migration Notes

- The existing `documents` array field is preserved for backward compatibility
- New documents will be stored in the `studentDocuments` field
- Both fields can coexist in the same student record
- Consider migrating existing documents to the new structure if needed

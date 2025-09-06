# Lost & Found System - API Documentation

This document provides detailed information about the key API endpoints in the Lost & Found Person Tracker system.

## Table of Contents
1. [GET /alert/{user_id}](#get-alertuser_id) vol
2. [GET /get_records_by_user/{user_id}](#get-get_records_by_useruser_id) vol
3. [POST /upload_lost](#post-upload_lost) vol

---

## GET /alert/{user_id}

**Description**: Returns notification alerts for a user when their lost/found person records have been matched (status changed to 'found').

### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| user_id | string | Path | Yes | Unique identifier for the user |

### Request Example
```http
GET /alert/demo_user_123
```

### Response Format

#### Success Response (200 OK)
```json
{
  "user_id": "demo_user_123",
  "total_alerts": 2,
  "alerts": [
    {
      "type": "lost",
      "data": {
        "face_id": "abc123-def456",
        "name": "John Doe",
        "gender": "Male",
        "age": 25,
        "where_lost": "Central Park, NYC",
        "reporter_name": "Jane Doe",
        "relation_with_lost": "Sister",
        "user_id": "demo_user_123",
        "contact_details": {
          "mobile_no": "1234567890",
          "email_id": "jane.doe@email.com"
        },
        "upload_time": "2025-01-01T10:30:00",
        "status": "found",
        "status_updated_time": "2025-01-01T14:45:00"
      }
    },
    {
      "type": "found",
      "data": {
        "face_id": "xyz789-uvw012",
        "name": "Mary Smith",
        "gender": "Female",
        "age": 30,
        "location_found": "Times Square, NYC",
        "reported_by": {
          "name": "Officer Johnson",
          "organization": "NYPD",
          "designation": "Police Officer"
        },
        "user_id": "demo_user_123",
        "contact_details": {
          "mobile_no": "9876543210",
          "email_id": "officer.johnson@nypd.gov"
        },
        "upload_time": "2025-01-01T12:15:00",
        "status": "found",
        "status_updated_time": "2025-01-01T16:20:00"
      }
    }
  ]
}
```

#### No Alerts Response (200 OK)
```json
{
  "user_id": "demo_user_123",
  "total_alerts": 0,
  "alerts": []
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "detail": "Error retrieving alerts: Database connection failed"
}
```

### Use Cases
- **Notification System**: Display alerts when user's reports have been matched
- **Mobile App Notifications**: Trigger push notifications for matched persons
- **Dashboard Updates**: Show real-time status updates for user's submissions

---

## GET /get_records_by_user/{user_id}

**Description**: Retrieves all records (lost people, found people, and match records) uploaded or associated with a specific user.

### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| user_id | string | Path | Yes | Unique identifier for the user |

### Request Example
```http
GET /get_records_by_user/demo_user_123
```

### Response Format

#### Success Response with Records (200 OK)
```json
{
  "message": "Found 3 records for user demo_user_123.",
  "user_id": "demo_user_123",
  "total_records": 3,
  "records": [
    {
      "source": "lost_people",
      "data": {
        "face_id": "abc123-def456",
        "name": "John Doe",
        "gender": "Male",
        "age": 25,
        "where_lost": "Central Park, NYC",
        "reporter_name": "Jane Doe",
        "relation_with_lost": "Sister",
        "user_id": "demo_user_123",
        "contact_details": {
          "mobile_no": "1234567890",
          "email_id": "jane.doe@email.com"
        },
        "face_blob": "base64_encoded_image_data...",
        "upload_time": "2025-01-01T10:30:00",
        "status": "found",
        "status_updated_time": "2025-01-01T14:45:00"
      }
    },
    {
      "source": "found_people",
      "data": {
        "face_id": "xyz789-uvw012",
        "name": "Mary Smith",
        "gender": "Female",
        "age": 30,
        "location_found": "Times Square, NYC",
        "reported_by": {
          "name": "Officer Johnson",
          "organization": "NYPD",
          "designation": "Police Officer"
        },
        "user_id": "demo_user_123",
        "contact_details": {
          "mobile_no": "9876543210",
          "email_id": "officer.johnson@nypd.gov"
        },
        "face_blob": "base64_encoded_image_data...",
        "upload_time": "2025-01-01T12:15:00",
        "status": "pending"
      }
    },
    {
      "source": "match_records",
      "data": {
        "match_id": "match123-456789",
        "lost_face_id": "abc123-def456",
        "found_face_id": "def456-ghi789",
        "match_time": "2025-01-01T14:45:00",
        "match_status": "confirmed",
        "lost_person": {
          "name": "John Doe",
          "age": 25
        },
        "found_person": {
          "name": "John Doe",
          "age": 25
        }
      }
    }
  ]
}
```

#### No Records Response (200 OK)
```json
{
  "message": "No records found for user demo_user_123.",
  "user_id": "demo_user_123",
  "total_records": 0,
  "records": []
}
```

#### Error Response (500 Internal Server Error)
```json
{
  "detail": "Error retrieving records: Database query failed"
}
```

### Record Sources
- **lost_people**: Records of reported missing persons
- **found_people**: Records of found persons
- **match_records**: Records of confirmed matches between lost and found persons

### Use Cases
- **User Dashboard**: Display all user's submissions and their status
- **History Tracking**: Show complete history of user's interactions
- **Progress Monitoring**: Track the status of all user's reports

---

## POST /upload_lost

**Description**: Uploads a lost person record with face recognition capabilities. Automatically matches against existing found people and updates statuses when matches are detected.

### Parameters

#### Form Data Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Full name of the lost person |
| gender | string | Yes | Gender (Male/Female/Other) |
| age | integer | Yes | Age of the lost person |
| where_lost | string | Yes | Location where person was last seen |
| your_name | string | Yes | Name of the person reporting |
| relation_with_lost | string | Yes | Relationship to the lost person |
| user_id | string | Yes | Unique identifier for the reporting user |
| mobile_no | string | Yes | Contact mobile number |
| email_id | string | Yes | Contact email address |
| file | file | Yes | Photo of the lost person (JPG/PNG) |

### Request Example
```http
POST /upload_lost
Content-Type: multipart/form-data

name: John Doe
gender: Male
age: 25
where_lost: Central Park, NYC
your_name: Jane Doe
relation_with_lost: Sister
user_id: demo_user_123
mobile_no: 1234567890
email_id: jane.doe@email.com
file: [binary image data]
```

### Response Format

#### Success Response - No Matches (200 OK)
```json
{
  "message": "Lost person uploaded successfully.",
  "face_id": "abc123-def456",
  "matched_found": [],
  "total_matches": 0,
  "status_updates": {
    "lost_updated": 0,
    "found_updated": 0,
    "errors": []
  }
}
```

#### Success Response - With Matches (200 OK)
```json
{
  "message": "Lost person uploaded successfully.",
  "face_id": "abc123-def456",
  "matched_found": [
    {
      "face_id": "xyz789-uvw012",
      "name": "John Doe",
      "gender": "Male",
      "age": 25,
      "location_found": "Times Square, NYC",
      "reported_by": {
        "name": "Officer Johnson",
        "organization": "NYPD",
        "designation": "Police Officer"
      },
      "user_id": "another_user_456",
      "contact_details": {
        "mobile_no": "9876543210",
        "email_id": "officer.johnson@nypd.gov"
      },
      "face_blob": "base64_encoded_image_data...",
      "upload_time": "2025-01-01T12:15:00",
      "status": "found"
    }
  ],
  "total_matches": 1,
  "status_updates": {
    "lost_updated": 1,
    "found_updated": 1,
    "errors": []
  }
}
```

#### Error Responses

##### Invalid Image (400 Bad Request)
```json
{
  "detail": "Invalid image file"
}
```

##### No Face Detected (400 Bad Request)
```json
{
  "detail": "No face detected in the image"
}
```

##### Face Detection Model Unavailable (500 Internal Server Error)
```json
{
  "detail": "Face detection model not available"
}
```

##### General Server Error (500 Internal Server Error)
```json
{
  "detail": "Internal server error: Database connection failed"
}
```

### Response Fields Explanation

#### Status Updates Object
- **lost_updated**: Number of lost person records updated to "found" status
- **found_updated**: Number of found person records updated to "found" status
- **errors**: Array of error messages if any status updates failed

#### Match Process
1. **Face Detection**: Uses YOLO model to detect and crop face from uploaded image
2. **Face Matching**: Compares against all found person records using DeepFace ArcFace model
3. **Match Creation**: Creates match records for confirmed matches
4. **Status Updates**: Automatically updates status to "found" for matched records
5. **Response Generation**: Returns comprehensive results including matches and status updates

### Use Cases
- **Missing Person Reports**: Primary function for reporting missing individuals
- **Automatic Matching**: System automatically finds potential matches
- **Status Tracking**: Real-time status updates when matches are found
- **Family Notifications**: Enables notification systems for successful matches

### Image Requirements
- **Formats**: JPG, PNG
- **Quality**: Clear, well-lit face photo
- **Face Visibility**: Single person's face should be clearly visible
- **Size**: Reasonable file size (recommended < 10MB)

### Face Recognition Details
- **Model**: DeepFace with ArcFace backend
- **Accuracy**: High accuracy face verification
- **Matching**: Automatic comparison against all found person records
- **Duplicate Handling**: System handles duplicate submissions intelligently

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "detail": "Human-readable error message"
}
```

Common HTTP status codes:
- **200**: Success
- **400**: Bad Request (invalid input)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error (server-side issues)

## Rate Limiting

Currently, no rate limiting is implemented. For production use, consider implementing rate limiting to prevent abuse.

## Authentication

Currently, no authentication is required. The `user_id` parameter serves as a simple identifier. For production use, implement proper authentication and authorization mechanisms.

## Data Privacy

- Face images are stored as base64 encoded strings in the database
- Personal information should be handled according to privacy regulations
- Consider implementing data retention policies for inactive records

---

*Last updated: September 5, 2025*
*API Version: 1.0.0*

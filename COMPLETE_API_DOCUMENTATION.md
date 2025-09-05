# Complete API Documentation - Lost & Found System

## Overview
This document provides comprehensive documentation for all API endpoints in the Lost & Found Person Tracker system, including request/response formats, error conditions, and usage examples.

---

## 1. Upload Found Person

### **POST** `/upload_found`

Upload a found person record with face recognition and automatic duplicate detection.

#### **Request Format**
- **Content-Type**: `multipart/form-data`
- **Method**: POST

#### **Form Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Name of the found person |
| `gender` | string | Yes | Gender of the found person |
| `age` | integer | Yes | Age of the found person |
| `where_found` | string | Yes | Location where person was found |
| `your_name` | string | Yes | Name of the reporter |
| `organization` | string | Yes | Reporter's organization |
| `designation` | string | Yes | Reporter's designation/position |
| `user_id` | string | Yes | Unique identifier for the reporter |
| `mobile_no` | string | Yes | Contact mobile number |
| `email_id` | string | Yes | Contact email address |
| `file` | file | Yes | Image file containing the found person's face |

#### **Success Response (200)**
```json
{
  "message": "Found person uploaded successfully.",
  "face_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "matched_lost": [
    {
      "face_id": "lost123-456-789",
      "name": "John Doe",
      "gender": "Male",
      "age": 25,
      "status": "found",
      "upload_time": "2025-09-05T10:30:00.123456"
    }
  ],
  "total_matches": 1,
  "duplicate_removal": {
    "duplicates_found": 2,
    "records_removed": 1,
    "kept_record": {
      "face_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Jane Smith",
      "upload_time": "2025-09-05T10:30:00.123456"
    },
    "removed_records": [
      {
        "face_id": "old123-456-789",
        "name": "Jane Smith",
        "upload_time": "2025-09-04T08:15:00.123456",
        "similarity_percentage": 95.2
      }
    ],
    "errors": []
  },
  "status_updates": {
    "lost_updated": 1,
    "found_updated": 1,
    "errors": []
  }
}
```

#### **Error Responses**

**400 - Invalid Image**
```json
{
  "detail": "Invalid image file"
}
```

**400 - No Face Detected**
```json
{
  "detail": "No face detected in the image"
}
```

**500 - Server Error**
```json
{
  "detail": "Internal server error: [specific error message]"
}
```

---

## 2. Search Face by ID

### **GET** `/search_face/{face_id}`

Search for a specific face ID across all collections (lost, found, matches).

#### **Request Format**
- **Method**: GET
- **URL Parameter**: `face_id` (string) - The face ID to search for

#### **Example Request**
```
GET /search_face/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

#### **Success Response (200)**
```json
{
  "message": "Face found in lost_people.",
  "collection": "lost_people",
  "face_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "record": {
    "face_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "John Doe",
    "gender": "Male",
    "age": 25,
    "where_lost": "Central Park, NYC",
    "reporter_name": "Jane Doe",
    "relation_with_lost": "Sister",
    "user_id": "user123",
    "contact_details": {
      "mobile_no": "+1234567890",
      "email_id": "jane.doe@email.com"
    },
    "upload_time": "2025-09-05T10:30:00.123456",
    "status": "pending"
  }
}
```

#### **Error Response (404)**
```json
{
  "detail": "Face ID a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found in any collection."
}
```

---

## 3. Get All Lost People

### **GET** `/get_all_lost`

Retrieve all lost people records from the database, sorted by upload time (newest first).

#### **Request Format**
- **Method**: GET
- **No parameters required**

#### **Success Response (200)**
```json
{
  "message": "Lost people records retrieved successfully.",
  "total_count": 2,
  "records": [
    {
      "face_id": "lost123-456-789",
      "name": "John Doe",
      "gender": "Male",
      "age": 25,
      "where_lost": "Central Park, NYC",
      "reporter_name": "Jane Doe",
      "relation_with_lost": "Sister",
      "user_id": "user123",
      "contact_details": {
        "mobile_no": "+1234567890",
        "email_id": "jane.doe@email.com"
      },
      "upload_time": "2025-09-05T10:30:00.123456",
      "status": "pending"
    },
    {
      "face_id": "lost456-789-012",
      "name": "Alice Johnson",
      "gender": "Female",
      "age": 30,
      "where_lost": "Times Square, NYC",
      "reporter_name": "Bob Johnson",
      "relation_with_lost": "Husband",
      "user_id": "user456",
      "contact_details": {
        "mobile_no": "+0987654321",
        "email_id": "bob.johnson@email.com"
      },
      "upload_time": "2025-09-05T09:15:00.123456",
      "status": "found"
    }
  ]
}
```

#### **Error Response (500)**
```json
{
  "detail": "Error retrieving lost people records"
}
```

---

## 4. Get All Found People

### **GET** `/get_all_found`

Retrieve all found people records from the database, sorted by upload time (newest first).

#### **Request Format**
- **Method**: GET
- **No parameters required**

#### **Success Response (200)**
```json
{
  "message": "Found people records retrieved successfully.",
  "total_count": 2,
  "records": [
    {
      "face_id": "found123-456-789",
      "name": "Unknown Person",
      "gender": "Male",
      "age": 25,
      "location_found": "Police Station Downtown",
      "reported_by": {
        "name": "Officer Smith",
        "organization": "NYPD",
        "designation": "Police Officer"
      },
      "user_id": "officer123",
      "contact_details": {
        "mobile_no": "+1122334455",
        "email_id": "officer.smith@nypd.gov"
      },
      "upload_time": "2025-09-05T11:00:00.123456",
      "status": "found"
    }
  ]
}
```

#### **Error Response (500)**
```json
{
  "detail": "Error retrieving found people records"
}
```

---

## 5. Get All Matches

### **GET** `/get_all_matches`

Retrieve all match records between lost and found people, sorted by match time (newest first).

#### **Request Format**
- **Method**: GET
- **No parameters required**

#### **Success Response (200)**
```json
{
  "message": "Match records retrieved successfully.",
  "total_count": 1,
  "records": [
    {
      "match_id": "match123-456-789",
      "lost_face_id": "lost123-456-789",
      "found_face_id": "found123-456-789",
      "match_time": "2025-09-05T11:30:00.123456",
      "match_status": "confirmed",
      "lost_person": {
        "face_id": "lost123-456-789",
        "name": "John Doe",
        "gender": "Male",
        "age": 25,
        "status": "found"
      },
      "found_person": {
        "face_id": "found123-456-789",
        "name": "Unknown Person",
        "gender": "Male",
        "age": 25,
        "status": "found"
      }
    }
  ]
}
```

#### **Error Response (500)**
```json
{
  "detail": "Error retrieving match records"
}
```

---

## 6. Health Check

### **GET** `/health`

Check the system health including database connectivity and model status.

#### **Request Format**
- **Method**: GET
- **No parameters required**

#### **Success Response (200) - Healthy System**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-05T12:00:00.123456",
  "database": "connected",
  "collections": {
    "lost_people": 15,
    "found_people": 8,
    "matches": 3
  },
  "face_model_loaded": true
}
```

#### **Response (200) - Unhealthy System**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-09-05T12:00:00.123456",
  "database": "error: connection timeout",
  "collections": {
    "error": "Database connection failed"
  },
  "face_model_loaded": false
}
```

#### **Error Response (500)**
```json
{
  "status": "error",
  "timestamp": "2025-09-05T12:00:00.123456",
  "error": "Unexpected system error occurred"
}
```

---

## 7. Get Statistics

### **GET** `/stats`

Get comprehensive system statistics including counts by status and collection.

#### **Request Format**
- **Method**: GET
- **No parameters required**

#### **Success Response (200)**
```json
{
  "lost_people": 15,
  "found_people": 8,
  "matches": 3,
  "lost_pending": 12,
  "lost_found": 3,
  "found_pending": 5,
  "found_matched": 3,
  "last_updated": "2025-09-05T12:00:00.123456"
}
```

#### **Error Response (500)**
```json
{
  "detail": "Error retrieving statistics"
}
```

---

## 8. Check Matches for Face ID

### **GET** `/check_matches/{face_id}`

Check if there are any matches for a specific face ID in the match records.

#### **Request Format**
- **Method**: GET
- **URL Parameter**: `face_id` (string) - The face ID to check matches for

#### **Example Request**
```
GET /check_matches/lost123-456-789
```

#### **Success Response (200) - Matches Found**
```json
{
  "message": "Found 2 matches for face ID lost123-456-789.",
  "face_id": "lost123-456-789",
  "total_matches": 2,
  "matches": [
    {
      "match_id": "match123-456-789",
      "lost_face_id": "lost123-456-789",
      "found_face_id": "found123-456-789",
      "match_time": "2025-09-05T11:30:00.123456",
      "match_status": "confirmed"
    },
    {
      "match_id": "match456-789-012",
      "lost_face_id": "lost123-456-789",
      "found_face_id": "found456-789-012",
      "match_time": "2025-09-05T10:15:00.123456",
      "match_status": "confirmed"
    }
  ]
}
```

#### **Success Response (200) - No Matches**
```json
{
  "message": "Found 0 matches for face ID lost123-456-789.",
  "face_id": "lost123-456-789",
  "total_matches": 0,
  "matches": []
}
```

#### **Error Response (500)**
```json
{
  "detail": "Error checking matches"
}
```

---

## 9. Manual Duplicate Cleanup

### **POST** `/cleanup_found_duplicates`

Manually trigger cleanup of duplicate records in the found collection based on face similarity.

#### **Request Format**
- **Method**: POST
- **Query Parameter**: `threshold` (float, optional) - Similarity threshold (default: 0.1 = ~90% accuracy)

#### **Example Request**
```
POST /cleanup_found_duplicates?threshold=0.15
```

#### **Success Response (200)**
```json
{
  "total_records_processed": 50,
  "duplicate_groups_found": 3,
  "total_records_removed": 5,
  "cleanup_details": [
    {
      "kept_record": {
        "face_id": "found123-456-789",
        "name": "John Smith",
        "upload_time": "2025-09-05T12:00:00.123456"
      },
      "removed_records": [
        {
          "face_id": "found456-789-012",
          "name": "John Smith",
          "upload_time": "2025-09-04T10:30:00.123456",
          "similarity_percentage": 92.5
        }
      ],
      "removed_count": 1
    },
    {
      "kept_record": {
        "face_id": "found789-012-345",
        "name": "Jane Doe",
        "upload_time": "2025-09-05T11:30:00.123456"
      },
      "removed_records": [
        {
          "face_id": "found345-678-901",
          "name": "Jane Doe",
          "upload_time": "2025-09-05T09:15:00.123456",
          "similarity_percentage": 94.8
        },
        {
          "face_id": "found567-890-123",
          "name": "Jane Doe",
          "upload_time": "2025-09-04T14:22:00.123456",
          "similarity_percentage": 91.3
        }
      ],
      "removed_count": 2
    }
  ],
  "errors": []
}
```

#### **Success Response (200) - No Duplicates Found**
```json
{
  "total_records_processed": 20,
  "duplicate_groups_found": 0,
  "total_records_removed": 0,
  "cleanup_details": [],
  "errors": []
}
```

#### **Success Response (200) - With Errors**
```json
{
  "total_records_processed": 30,
  "duplicate_groups_found": 1,
  "total_records_removed": 1,
  "cleanup_details": [...],
  "errors": [
    "Error comparing faces face123 and face456: Invalid image format",
    "Error removing duplicate face789: Database connection timeout"
  ]
}
```

#### **Error Response (500)**
```json
{
  "detail": "Error cleaning up duplicates: [specific error message]"
}
```

---

## Error Codes Summary

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid image, no face detected, malformed request |
| 404 | Not Found | Face ID not found in any collection |
| 422 | Validation Error | Missing required parameters, invalid data types |
| 500 | Internal Server Error | Database connection issues, model loading failures, unexpected errors |

## Common Response Fields

### Status Field Values
- `"pending"`: Record is waiting for matches
- `"found"`: Record has been matched with another record

### Timestamp Format
All timestamps follow ISO 8601 format: `YYYY-MM-DDTHH:MM:SS.microseconds`

### Face ID Format
Face IDs are UUID4 strings: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

## Usage Notes

1. **Image Requirements**: Images should contain clear, visible faces for optimal detection
2. **Duplicate Detection**: The system automatically removes duplicates with 90%+ similarity in found records
3. **Status Updates**: When matches occur, both lost and found records are automatically updated to "found" status
4. **Error Handling**: All endpoints include comprehensive error handling with descriptive messages
5. **Performance**: Large datasets may take longer for duplicate cleanup operations

## Rate Limiting
Currently no rate limiting is implemented. Consider implementing rate limiting for production use.

## Authentication
Currently no authentication is required. Consider implementing authentication for production use.

import os
import cv2
import base64
import uuid
import json
import logging
from datetime import datetime
import numpy as np

# Set DeepFace home directory before importing DeepFace
os.environ['DEEPFACE_HOME'] = '/tmp/.deepface'

from fastapi import FastAPI, HTTPException, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from deepface import DeepFace
from ultralytics import YOLO
from typing import Optional, List, Dict, Any

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "lost_and_found")

try:
    # Connect to MongoDB
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    lost_collection = db['lost_people']
    found_collection = db['found_people']
    match_collection = db['match_records']
    logger.info("Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    raise

# FastAPI setup
app = FastAPI(title="Simple Lost & Found Person Tracker API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YOLO face detection model
try:
    face_model = YOLO("yolov11s-face.pt")
    logger.info("YOLO face detection model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load YOLO model: {e}")
    face_model = None


def crop_face(image: np.ndarray) -> np.ndarray:
    """Extract and crop face from image using YOLO face detection."""
    if face_model is None:
        raise HTTPException(status_code=500, detail="Face detection model not available")

    results = face_model.predict(image, verbose=False)
    if results and results[0].boxes and results[0].boxes.xyxy.shape[0] > 0:
        x1, y1, x2, y2 = results[0].boxes.xyxy[0].cpu().numpy().astype(int)
        cropped_face = image[y1:y2, x1:x2]
        return cropped_face
    raise HTTPException(status_code=400, detail="No face detected in the image")


def save_metadata(collection, metadata: dict) -> str:
    """Save metadata to MongoDB collection and return the inserted ID as string."""
    result = collection.insert_one(metadata)
    return str(result.inserted_id)


def convert_objectid_to_str(data: Any) -> Any:
    """Recursively convert ObjectId fields to strings in MongoDB documents."""
    if isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    elif isinstance(data, dict):
        converted = {}
        for key, value in data.items():
            if isinstance(value, ObjectId):
                converted[key] = str(value)
            elif isinstance(value, dict):
                converted[key] = convert_objectid_to_str(value)
            elif isinstance(value, list):
                converted[key] = [convert_objectid_to_str(item) for item in value]
            else:
                converted[key] = value
        return converted
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data


def match_face_with_db(known_image: np.ndarray, collection) -> List[Dict]:
    """Match a face against faces in a MongoDB collection using DeepFace."""
    matches = []
    try:
        for doc in collection.find():
            try:
                face_blob = doc.get("face_blob")
                if not face_blob:
                    continue

                # Decode base64 image
                img_bytes = base64.b64decode(face_blob)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                compare_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if compare_image is None:
                    continue

                # Perform face verification
                result = DeepFace.verify(
                    known_image,
                    compare_image,
                    model_name="ArcFace",
                    enforce_detection=False
                )

                if result["verified"]:
                    # Convert ObjectIds to strings before adding to matches
                    match_doc = convert_objectid_to_str(doc)
                    matches.append(match_doc)

            except Exception as e:
                logger.error(f"Error matching individual face: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"Error in face matching process: {str(e)}")

    return matches


def check_duplicate_faces_in_found(known_image: np.ndarray, threshold: float = 0.1) -> List[Dict]:
    """Check for duplicate faces in found collection with specified accuracy threshold.
    
    Args:
        known_image: The face image to compare
        threshold: Distance threshold for similarity (lower = more similar)
                  0.1 corresponds to roughly 90% accuracy
    
    Returns:
        List of duplicate records found
    """
    duplicates = []
    try:
        for doc in found_collection.find():
            try:
                face_blob = doc.get("face_blob")
                if not face_blob:
                    continue

                # Decode base64 image
                img_bytes = base64.b64decode(face_blob)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                compare_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if compare_image is None:
                    continue

                # Perform face verification with distance
                result = DeepFace.verify(
                    known_image,
                    compare_image,
                    model_name="ArcFace",
                    enforce_detection=False,
                    distance_metric="cosine"
                )

                # Check if the distance is below threshold (high similarity)
                if result["distance"] < threshold:
                    # Convert ObjectIds to strings and add similarity info
                    duplicate_doc = convert_objectid_to_str(doc)
                    duplicate_doc["similarity_distance"] = result["distance"]
                    duplicate_doc["similarity_percentage"] = (1 - result["distance"]) * 100
                    duplicates.append(duplicate_doc)

            except Exception as e:
                logger.error(f"Error checking duplicate face: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"Error in duplicate face checking process: {str(e)}")

    return duplicates


def remove_old_duplicate_found_records(duplicates: List[Dict], current_face_id: str) -> Dict[str, Any]:
    """Remove old duplicate records from found collection, keeping only the newest one.
    
    Args:
        duplicates: List of duplicate records
        current_face_id: The face_id of the current record being uploaded
    
    Returns:
        Dictionary with removal results
    """
    removal_results = {
        "duplicates_found": len(duplicates),
        "records_removed": 0,
        "kept_record": None,
        "removed_records": [],
        "errors": []
    }
    
    if len(duplicates) == 0:
        return removal_results
    
    try:
        # Sort duplicates by upload_time (newest first)
        duplicates_sorted = sorted(duplicates, 
                                 key=lambda x: x.get("upload_time", ""), 
                                 reverse=True)
        
        # Keep the newest record (first in sorted list)
        newest_record = duplicates_sorted[0]
        removal_results["kept_record"] = newest_record
        
        # Remove all other older duplicates
        for duplicate in duplicates_sorted[1:]:
            try:
                # Delete from database using _id
                result = found_collection.delete_one({"face_id": duplicate.get("face_id")})
                
                if result.deleted_count > 0:
                    removal_results["records_removed"] += 1
                    removal_results["removed_records"].append({
                        "face_id": duplicate.get("face_id"),
                        "name": duplicate.get("name", "Unknown"),
                        "upload_time": duplicate.get("upload_time"),
                        "similarity_percentage": duplicate.get("similarity_percentage", 0)
                    })
                    logger.info(f"Removed duplicate found record: {duplicate.get('face_id')}")
                    
            except Exception as e:
                error_msg = f"Error removing duplicate {duplicate.get('face_id')}: {str(e)}"
                logger.error(error_msg)
                removal_results["errors"].append(error_msg)
    
    except Exception as e:
        error_msg = f"Error in duplicate removal process: {str(e)}"
        logger.error(error_msg)
        removal_results["errors"].append(error_msg)
    
    return removal_results


def remove_all_duplicates_keep_newest(all_duplicates: List[Dict]) -> Dict[str, Any]:
    """Remove all duplicate records except the newest one.
    
    Args:
        all_duplicates: List of all duplicate records including the current one
    
    Returns:
        Dictionary with removal results
    """
    removal_results = {
        "duplicates_found": len(all_duplicates),
        "records_removed": 0,
        "kept_record": None,
        "removed_records": [],
        "errors": []
    }
    
    if len(all_duplicates) <= 1:
        return removal_results
    
    try:
        # Sort all duplicates by upload_time (newest first)
        duplicates_sorted = sorted(all_duplicates, 
                                 key=lambda x: x.get("upload_time", ""), 
                                 reverse=True)
        
        # Keep the newest record (first in sorted list)
        newest_record = duplicates_sorted[0]
        removal_results["kept_record"] = newest_record
        
        # Remove ALL other duplicates (older ones)
        for duplicate in duplicates_sorted[1:]:
            try:
                # Delete from database using face_id
                result = found_collection.delete_one({"face_id": duplicate.get("face_id")})
                
                if result.deleted_count > 0:
                    removal_results["records_removed"] += 1
                    removal_results["removed_records"].append({
                        "face_id": duplicate.get("face_id"),
                        "name": duplicate.get("name", "Unknown"),
                        "upload_time": duplicate.get("upload_time"),
                        "similarity_percentage": duplicate.get("similarity_percentage", 0)
                    })
                    logger.info(f"Removed duplicate found record: {duplicate.get('face_id')}")
                    
            except Exception as e:
                error_msg = f"Error removing duplicate {duplicate.get('face_id')}: {str(e)}"
                logger.error(error_msg)
                removal_results["errors"].append(error_msg)
    
    except Exception as e:
        error_msg = f"Error in duplicate removal process: {str(e)}"
        logger.error(error_msg)
        removal_results["errors"].append(error_msg)
    
    return removal_results


def update_records_status_to_found(lost_face_ids: List[str], found_face_ids: List[str]) -> Dict[str, Any]:
    """Update the status of matched records to 'found' in both collections.
    
    Args:
        lost_face_ids: List of lost person face IDs to update
        found_face_ids: List of found person face IDs to update
    
    Returns:
        Dictionary with update results
    """
    update_results = {
        "lost_updated": 0,
        "found_updated": 0,
        "errors": []
    }
    
    try:
        # Update lost people records
        for face_id in lost_face_ids:
            try:
                result = lost_collection.update_one(
                    {"face_id": face_id},
                    {"$set": {"status": "found", "status_updated_time": datetime.now().isoformat()}}
                )
                if result.modified_count > 0:
                    update_results["lost_updated"] += 1
                    logger.info(f"Updated lost person status to 'found': {face_id}")
            except Exception as e:
                error_msg = f"Error updating lost person {face_id}: {str(e)}"
                logger.error(error_msg)
                update_results["errors"].append(error_msg)
        
        # Update found people records
        for face_id in found_face_ids:
            try:
                result = found_collection.update_one(
                    {"face_id": face_id},
                    {"$set": {"status": "found", "status_updated_time": datetime.now().isoformat()}}
                )
                if result.modified_count > 0:
                    update_results["found_updated"] += 1
                    logger.info(f"Updated found person status to 'found': {face_id}")
            except Exception as e:
                error_msg = f"Error updating found person {face_id}: {str(e)}"
                logger.error(error_msg)
                update_results["errors"].append(error_msg)
                
    except Exception as e:
        error_msg = f"Error in status update process: {str(e)}"
        logger.error(error_msg)
        update_results["errors"].append(error_msg)
    
    return update_results


@app.post("/upload_lost")
async def upload_lost_person(
        name: str = Form(...),
        gender: str = Form(...),
        age: int = Form(...),
        where_lost: str = Form(...),
        your_name: str = Form(...),
        relation_with_lost: str = Form(...),
        user_id: str = Form(...),
        mobile_no: str = Form(...),
        email_id: str = Form(...),
        file: UploadFile = File(...)
):
    """Upload a lost person record with face recognition."""
    try:
        # Read and process image
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Generate unique face ID
        face_id = str(uuid.uuid4())

        # Extract face from image
        cropped_face = crop_face(image)

        # Encode face image to base64
        _, buffer = cv2.imencode('.jpg', cropped_face)
        image_blob = base64.b64encode(buffer).decode('utf-8')

        # Create metadata
        metadata = {
            "face_id": face_id,
            "name": name,
            "gender": gender,
            "age": age,
            "where_lost": where_lost,
            "reporter_name": your_name,
            "relation_with_lost": relation_with_lost,
            "user_id": user_id,
            "contact_details": {
                "mobile_no": mobile_no,
                "email_id": email_id
            },
            "face_blob": image_blob,
            "upload_time": datetime.now().isoformat(),
            "status": "pending"
        }

        # Save to database
        save_metadata(lost_collection, metadata)
        logger.info(f"Lost person record created: {face_id}")

        # Match against found people
        matched_found = match_face_with_db(cropped_face, found_collection)

        # Process matches and create match records
        status_update_results = {"lost_updated": 0, "found_updated": 0, "errors": []}
        for match in matched_found:
            try:
                # Create match record
                match_data = {
                    "match_id": str(uuid.uuid4()),
                    "lost_face_id": face_id,
                    "found_face_id": match.get("face_id"),
                    "match_time": datetime.now().isoformat(),
                    "match_status": "confirmed",
                    "lost_person": convert_objectid_to_str(metadata),
                    "found_person": convert_objectid_to_str(match)
                }
                save_metadata(match_collection, match_data)

            except Exception as e:
                logger.error(f"Error processing match: {e}")

        # Update status to 'found' for both lost and found records if matches exist
        if matched_found:
            lost_face_ids = [face_id]
            found_face_ids = [match.get("face_id") for match in matched_found]
            status_update_results = update_records_status_to_found(lost_face_ids, found_face_ids)
            logger.info(f"Status update completed: {status_update_results['lost_updated']} lost + {status_update_results['found_updated']} found records updated")

        # Prepare response data with ObjectId conversion
        response_data = {
            "message": "Lost person uploaded successfully.",
            "face_id": face_id,
            "matched_found": convert_objectid_to_str(matched_found),
            "total_matches": len(matched_found),
            "status_updates": status_update_results
        }

        logger.info(f"Lost person upload completed: {face_id}")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading lost person: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/upload_found")
async def upload_found_person(
        name: str = Form(...),
        gender: str = Form(...),
        age: int = Form(...),
        where_found: str = Form(...),
        your_name: str = Form(...),
        organization: str = Form(...),
        designation: str = Form(...),
        user_id: str = Form(...),
        mobile_no: str = Form(...),
        email_id: str = Form(...),
        file: UploadFile = File(...)
):
    """Upload a found person record with face recognition."""
    try:
        # Read and process image
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Generate unique face ID
        face_id = str(uuid.uuid4())

        # Extract face from image
        cropped_face = crop_face(image)

        # Encode face image to base64
        _, buffer = cv2.imencode('.jpg', cropped_face)
        image_blob = base64.b64encode(buffer).decode('utf-8')

        # Check for duplicate faces in found collection (90% accuracy threshold)
        duplicates = check_duplicate_faces_in_found(cropped_face, threshold=0.1)
        
        # Create metadata
        metadata = {
            "face_id": face_id,
            "name": name,
            "gender": gender,
            "age": age,
            "location_found": where_found,
            "reported_by": {
                "name": your_name,
                "organization": organization,
                "designation": designation
            },
            "user_id": user_id,
            "contact_details": {
                "mobile_no": mobile_no,
                "email_id": email_id
            },
            "face_blob": image_blob,
            "upload_time": datetime.now().isoformat(),
            "status": "pending"
        }

        # Save to database first
        save_metadata(found_collection, metadata)
        logger.info(f"Found person record created: {face_id}")

        # Handle duplicates if any were found
        duplicate_removal_results = {"duplicates_found": 0, "records_removed": 0}
        if duplicates:
            logger.info(f"Found {len(duplicates)} duplicate faces for {face_id}")
            
            # Add the current record to duplicates list for comparison
            current_record = convert_objectid_to_str(metadata.copy())
            current_record["similarity_distance"] = 0.0  # Perfect match with itself
            current_record["similarity_percentage"] = 100.0
            
            all_duplicates = duplicates + [current_record]
            logger.info(f"Total duplicates including current record: {len(all_duplicates)}")
            
            # Remove old duplicate records (this will keep only the newest one)
            duplicate_removal_results = remove_all_duplicates_keep_newest(all_duplicates)
            logger.info(f"Duplicate removal completed: {duplicate_removal_results['records_removed']} records removed, kept: {duplicate_removal_results['kept_record']['face_id'] if duplicate_removal_results['kept_record'] else 'None'}")
        else:
            logger.info(f"No duplicates found for {face_id}")

        # Match against lost people
        matched_lost = match_face_with_db(cropped_face, lost_collection)

        # Process matches and create match records
        status_update_results = {"lost_updated": 0, "found_updated": 0, "errors": []}
        for match in matched_lost:
            try:
                # Create match record
                match_data = {
                    "match_id": str(uuid.uuid4()),
                    "lost_face_id": match.get("face_id"),
                    "found_face_id": face_id,
                    "match_time": datetime.now().isoformat(),
                    "match_status": "confirmed",
                    "lost_person": convert_objectid_to_str(match),
                    "found_person": convert_objectid_to_str(metadata)
                }
                save_metadata(match_collection, match_data)

            except Exception as e:
                logger.error(f"Error processing match: {e}")

        # Update status to 'found' for both lost and found records if matches exist
        if matched_lost:
            lost_face_ids = [match.get("face_id") for match in matched_lost]
            found_face_ids = [face_id]
            status_update_results = update_records_status_to_found(lost_face_ids, found_face_ids)
            logger.info(f"Status update completed: {status_update_results['lost_updated']} lost + {status_update_results['found_updated']} found records updated")

        # Prepare response data with ObjectId conversion
        response_data = {
            "message": "Found person uploaded successfully.",
            "face_id": face_id,
            "matched_lost": convert_objectid_to_str(matched_lost),
            "total_matches": len(matched_lost),
            "duplicate_removal": duplicate_removal_results,
            "status_updates": status_update_results
        }

        logger.info(f"Found person upload completed: {face_id}")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading found person: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/get_records_by_user/{user_id}")
async def get_records_by_user(user_id: str):
    """Get all records uploaded by a specific user."""
    try:
        collections_info = [
            ("lost_people", lost_collection),
            ("found_people", found_collection),
            ("match_records", match_collection)
        ]

        records = []

        for collection_name, collection in collections_info:
            try:
                docs = list(collection.find({"user_id": user_id}))
                for doc in docs:
                    doc = convert_objectid_to_str(doc)
                    records.append({"source": collection_name, "data": doc})
            except Exception as e:
                logger.error(f"Error querying {collection_name}: {e}")

        if records:
            return {
                "message": f"Found {len(records)} records for user {user_id}.",
                "user_id": user_id,
                "total_records": len(records),
                "records": records
            }
        else:
            return {
                "message": f"No records found for user {user_id}.",
                "user_id": user_id,
                "total_records": 0,
                "records": []
            }

    except Exception as e:
        logger.error(f"Error getting records for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving records: {str(e)}")


@app.get("/search_face/{face_id}")
async def search_face(face_id: str):
    """Search for a specific face ID across all collections."""
    try:
        collections_info = [
            ("lost_people", lost_collection),
            ("found_people", found_collection),
            ("match_records", match_collection)
        ]

        for collection_name, collection in collections_info:
            try:
                record = collection.find_one({"face_id": face_id})
                if record:
                    record = convert_objectid_to_str(record)
                    return {
                        "message": f"Face found in {collection_name}.",
                        "collection": collection_name,
                        "face_id": face_id,
                        "record": record
                    }
            except Exception as e:
                logger.error(f"Error searching in {collection_name}: {e}")

        raise HTTPException(status_code=404, detail=f"Face ID {face_id} not found in any collection.")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching for face {face_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching for face: {str(e)}")


@app.get("/get_all_lost")
async def get_all_lost_people():
    """Get all lost people records."""
    try:
        records = list(lost_collection.find().sort("upload_time", -1))
        records = convert_objectid_to_str(records)

        return {
            "message": "Lost people records retrieved successfully.",
            "total_count": len(records),
            "records": records
        }
    except Exception as e:
        logger.error(f"Error getting lost people: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving lost people records")


@app.get("/get_all_found")
async def get_all_found_people():
    """Get all found people records."""
    try:
        records = list(found_collection.find().sort("upload_time", -1))
        records = convert_objectid_to_str(records)

        return {
            "message": "Found people records retrieved successfully.",
            "total_count": len(records),
            "records": records
        }
    except Exception as e:
        logger.error(f"Error getting found people: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving found people records")


@app.get("/get_all_matches")
async def get_all_matches():
    """Get all match records."""
    try:
        records = list(match_collection.find().sort("match_time", -1))
        records = convert_objectid_to_str(records)

        return {
            "message": "Match records retrieved successfully.",
            "total_count": len(records),
            "records": records
        }
    except Exception as e:
        logger.error(f"Error getting matches: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving match records")


@app.get("/health")
async def health_check():
    """Check system health and configuration."""
    try:
        # Test database connection
        db_status = "connected"
        try:
            client.admin.command('ping')
        except Exception as e:
            db_status = f"error: {str(e)}"

        # Check collections
        collections_status = {}
        try:
            collections_status = {
                "lost_people": lost_collection.count_documents({}),
                "found_people": found_collection.count_documents({}),
                "matches": match_collection.count_documents({})
            }
        except Exception as e:
            collections_status = {"error": str(e)}

        return {
            "status": "healthy" if db_status == "connected" else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "database": db_status,
            "collections": collections_status,
            "face_model_loaded": face_model is not None
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


@app.get("/stats")
async def get_statistics():
    """Get system statistics."""
    try:
        # Basic counts
        lost_total = lost_collection.count_documents({})
        found_total = found_collection.count_documents({})
        matches_total = match_collection.count_documents({})
        
        # Status-based counts
        lost_pending = lost_collection.count_documents({"status": "pending"})
        lost_found = lost_collection.count_documents({"status": "found"})
        found_pending = found_collection.count_documents({"status": "pending"})
        found_matched = found_collection.count_documents({"status": "found"})
        
        stats = {
            "lost_people": lost_total,
            "found_people": found_total,
            "matches": matches_total,
            "lost_pending": lost_pending,
            "lost_found": lost_found,
            "found_pending": found_pending,
            "found_matched": found_matched,
            "last_updated": datetime.now().isoformat()
        }

        return stats

    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving statistics")


# Optional: Add a simple frontend endpoint to check if matches exist
@app.get("/check_matches/{face_id}")
async def check_matches(face_id: str):
    """Check if there are any matches for a specific face ID."""
    try:
        matches = list(match_collection.find({
            "$or": [
                {"lost_face_id": face_id},
                {"found_face_id": face_id}
            ]
        }))
        
        matches = convert_objectid_to_str(matches)
        
        return {
            "message": f"Found {len(matches)} matches for face ID {face_id}.",
            "face_id": face_id,
            "total_matches": len(matches),
            "matches": matches
        }
        
    except Exception as e:
        logger.error(f"Error checking matches for face {face_id}: {e}")
        raise HTTPException(status_code=500, detail="Error checking matches")


@app.post("/cleanup_found_duplicates")
async def cleanup_found_duplicates(threshold: float = 0.1):
    """Manually clean up duplicate records in found collection.
    
    Args:
        threshold: Distance threshold for similarity (default 0.1 = ~90% accuracy)
    """
    try:
        cleanup_results = {
            "total_records_processed": 0,
            "duplicate_groups_found": 0,
            "total_records_removed": 0,
            "cleanup_details": [],
            "errors": []
        }
        
        # Get all records from found collection
        all_records = list(found_collection.find().sort("upload_time", 1))
        cleanup_results["total_records_processed"] = len(all_records)
        
        processed_face_ids = set()
        
        for i, record in enumerate(all_records):
            face_id = record.get("face_id")
            
            # Skip if already processed
            if face_id in processed_face_ids:
                continue
                
            face_blob = record.get("face_blob")
            if not face_blob:
                continue
                
            try:
                # Decode the face image
                img_bytes = base64.b64decode(face_blob)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                known_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                
                if known_image is None:
                    continue
                
                # Find duplicates for this face
                duplicates = []
                for j, compare_record in enumerate(all_records[i+1:], i+1):
                    compare_face_id = compare_record.get("face_id")
                    
                    if compare_face_id in processed_face_ids:
                        continue
                        
                    compare_face_blob = compare_record.get("face_blob")
                    if not compare_face_blob:
                        continue
                    
                    try:
                        # Decode comparison image
                        compare_img_bytes = base64.b64decode(compare_face_blob)
                        compare_np_arr = np.frombuffer(compare_img_bytes, np.uint8)
                        compare_image = cv2.imdecode(compare_np_arr, cv2.IMREAD_COLOR)
                        
                        if compare_image is None:
                            continue
                        
                        # Perform face verification
                        result = DeepFace.verify(
                            known_image,
                            compare_image,
                            model_name="ArcFace",
                            enforce_detection=False,
                            distance_metric="cosine"
                        )
                        
                        # Check if it's a duplicate
                        if result["distance"] < threshold:
                            duplicate_doc = convert_objectid_to_str(compare_record)
                            duplicate_doc["similarity_distance"] = result["distance"]
                            duplicate_doc["similarity_percentage"] = (1 - result["distance"]) * 100
                            duplicates.append(duplicate_doc)
                            processed_face_ids.add(compare_face_id)
                            
                    except Exception as e:
                        error_msg = f"Error comparing faces {face_id} and {compare_face_id}: {str(e)}"
                        cleanup_results["errors"].append(error_msg)
                        continue
                
                # If duplicates found, remove older ones
                if duplicates:
                    # Add the original record to duplicates list for sorting
                    original_doc = convert_objectid_to_str(record)
                    duplicates.insert(0, original_doc)
                    
                    # Sort by upload_time (newest first)
                    duplicates_sorted = sorted(duplicates, 
                                             key=lambda x: x.get("upload_time", ""), 
                                             reverse=True)
                    
                    # Keep the newest, remove the rest
                    kept_record = duplicates_sorted[0]
                    records_to_remove = duplicates_sorted[1:]
                    
                    removed_count = 0
                    removed_details = []
                    
                    for dup_record in records_to_remove:
                        try:
                            result = found_collection.delete_one({"face_id": dup_record.get("face_id")})
                            if result.deleted_count > 0:
                                removed_count += 1
                                removed_details.append({
                                    "face_id": dup_record.get("face_id"),
                                    "name": dup_record.get("name", "Unknown"),
                                    "upload_time": dup_record.get("upload_time"),
                                    "similarity_percentage": dup_record.get("similarity_percentage", 0)
                                })
                        except Exception as e:
                            error_msg = f"Error removing duplicate {dup_record.get('face_id')}: {str(e)}"
                            cleanup_results["errors"].append(error_msg)
                    
                    if removed_count > 0:
                        cleanup_results["duplicate_groups_found"] += 1
                        cleanup_results["total_records_removed"] += removed_count
                        cleanup_results["cleanup_details"].append({
                            "kept_record": {
                                "face_id": kept_record.get("face_id"),
                                "name": kept_record.get("name", "Unknown"),
                                "upload_time": kept_record.get("upload_time")
                            },
                            "removed_records": removed_details,
                            "removed_count": removed_count
                        })
                
                processed_face_ids.add(face_id)
                
            except Exception as e:
                error_msg = f"Error processing record {face_id}: {str(e)}"
                cleanup_results["errors"].append(error_msg)
                continue
        
        logger.info(f"Duplicate cleanup completed: {cleanup_results['total_records_removed']} records removed")
        return cleanup_results
        
    except Exception as e:
        logger.error(f"Error in duplicate cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Error cleaning up duplicates: {str(e)}")


@app.get("/alert/{user_id}")
async def get_user_alerts(user_id: str):
    """Return notification alerts for a user when their lost/found person is matched (status 'found')."""
    try:
        # Find lost records for this user with status 'found'
        lost_alerts = list(lost_collection.find({"user_id": user_id, "status": "found"}))
        # Find found records for this user with status 'found'
        found_alerts = list(found_collection.find({"user_id": user_id, "status": "found"}))
        # Combine and convert ObjectIds
        alerts = [
            {"type": "lost", "data": convert_objectid_to_str(rec)} for rec in lost_alerts
        ] + [
            {"type": "found", "data": convert_objectid_to_str(rec)} for rec in found_alerts
        ]
        return {
            "user_id": user_id,
            "total_alerts": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Error getting alerts for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving alerts: {str(e)}")
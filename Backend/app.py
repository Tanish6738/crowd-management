
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import logging
import os
import json
import subprocess
import asyncio
import threading
import time
import time
from pathlib import Path
from dotenv import load_dotenv
import cv2
import numpy as np
import base64
import yt_dlp
import re
from simple_streaming import start_simple_stream, stop_simple_stream, get_current_frame

# Set up logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# FastAPI app
app = FastAPI(title="CCTV Management API", version="1.0.0")

# Shutdown handler to clean up streams
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up all active streams on server shutdown"""
    logger.info("Server shutting down, cleaning up active streams...")
    active_stream_ids = list(active_streams.keys())
    for cctv_id in active_stream_ids:
        try:
            stop_simple_stream(cctv_id, active_streams)
        except Exception as e:
            logger.error(f"Error stopping stream {cctv_id} during shutdown: {e}")
    logger.info("All streams cleaned up")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# MongoDB connection with fallback
try:
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    database_name = os.getenv("MONGODB_DATABASE", "cctv_management")
    client = MongoClient(mongo_uri)
    db = client[database_name]
    
    # Collections
    collection = db["cctvs"]
    areas_collection = db["areas"]
    zones_collection = db["zones"]
    gates_collection = db["gates"]
    poles_collection = db["poles"]
    markers_collection = db["markers"]  # New collection for map markers
    user_locations_collection = db["user_locations"]  # New collection for user location tracking
    
    # Test connection
    client.admin.command('ping')
    logger.info(f"Connected to MongoDB: {database_name}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    logger.info("Falling back to local MongoDB")
    client = MongoClient("mongodb://localhost:27017/")
    db = client["cctv_management"]
    collection = db["cctvs"]
    areas_collection = db["areas"]
    zones_collection = db["zones"]
    gates_collection = db["gates"]
    poles_collection = db["poles"]
    markers_collection = db["markers"]
    user_locations_collection = db["user_locations"]
    poles_collection = db["poles"]
    markers_collection = db["markers"]

# Active streams tracking
active_streams: Dict[str, Dict] = {}

# Marker types
MARKER_TYPES = [
    # Basic Facilities
    "toilets",
    "drinking_water",
    "food_distribution", 
    "tent_areas",
    "dharamshalas",
    
    # Health & Safety
    "hospitals",
    "first_aid",
    "police_booths",
    "fire_station",
    "lost_found",
    
    # Transit & Connectivity
    "railway_station",
    "bus_stands", 
    "parking_areas",
    "pickup_dropoff",
    
    # Religious Spots
    "mandir"
]

# Marker icons by type
MARKER_ICONS = {
    # Basic Facilities
    "toilets": "🚻",
    "drinking_water": "💧", 
    "food_distribution": "🍛",
    "tent_areas": "⛺",
    "dharamshalas": "🏨",
    
    # Health & Safety
    "hospitals": "�",
    "first_aid": "⛑️",
    "police_booths": "👮", 
    "fire_station": "🚒", 
    "lost_found": "�",
    
    # Transit & Connectivity
    "railway_station": "🚉",
    "bus_stands": "�",
    "parking_areas": "�️",
    "pickup_dropoff": "🚖",
    
    # Religious Spots
    "mandir": "🛕"
}

# Pydantic models for markers
class Marker(BaseModel):
    id: Optional[str] = None
    type: str
    name: str
    lat: float
    lng: float
    description: Optional[str] = None
    icon: Optional[str] = None
    area_id: Optional[str] = None
    zone_id: Optional[str] = None
    created_at: Optional[datetime] = None

class MarkerCreate(BaseModel):
    type: str
    name: str
    lat: float
    lng: float
    description: Optional[str] = None
    area_id: Optional[str] = None
    zone_id: Optional[str] = None

# Enhanced Area model with polygon support
class AreaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    polygon: Optional[Any] = None  # More flexible type for polygon data

class Area(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    polygon: Optional[Any] = None  # More flexible type for polygon data
    created_at: datetime

# Enhanced Zone model with polygon support
class ZoneCreate(BaseModel):
    name: str
    area_id: str
    description: Optional[str] = None
    polygon: Optional[Any] = None  # More flexible type for polygon data

class Zone(BaseModel):
    id: str
    name: str
    area_id: str
    area_name: str
    description: Optional[str] = None
    polygon: Optional[Any] = None  # More flexible type for polygon data
    created_at: datetime

# Updated CCTV models for universal video streaming
class CCTVCreate(BaseModel):
    name: str
    area: str
    zone: str
    location_type: str  # "gate" or "pole"
    location_name: str
    video_source: str  # Can be HTTP URL, local file path, or YouTube URL
    source_type: str  # "http", "file", or "youtube"
    status: str = "active"

class CCTVUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    zone: Optional[str] = None
    location_type: Optional[str] = None
    location_name: Optional[str] = None
    video_source: Optional[str] = None
    source_type: Optional[str] = None
    status: Optional[str] = None

class CCTV(BaseModel):
    id: str
    name: str
    area: str
    zone: str
    location_type: str
    location_name: str
    video_source: str
    source_type: str
    status: str
    created_at: datetime

# User Location Tracking Models
class UserLocationCreate(BaseModel):
    user_id: Optional[str] = None  # Optional user identifier
    device_id: Optional[str] = None  # Optional device identifier
    lat: float
    lng: float
    timestamp: Optional[datetime] = None
    accuracy: Optional[float] = None  # GPS accuracy in meters
    session_id: Optional[str] = None  # Track user sessions

class UserLocation(BaseModel):
    id: str
    user_id: Optional[str] = None
    device_id: Optional[str] = None
    lat: float
    lng: float
    timestamp: datetime
    accuracy: Optional[float] = None
    session_id: Optional[str] = None

class GateCreate(BaseModel):
    name: str
    area_id: str
    zone_id: str
    description: Optional[str] = None

class Gate(BaseModel):
    id: str
    name: str
    area_id: str
    zone_id: str
    area_name: str
    zone_name: str
    description: Optional[str] = None
    created_at: datetime

class PoleCreate(BaseModel):
    name: str
    area_id: str
    zone_id: str
    description: Optional[str] = None

class Pole(BaseModel):
    id: str
    name: str
    area_id: str
    zone_id: str
    area_name: str
    zone_name: str
    description: Optional[str] = None
    created_at: datetime

# Bulk operation models
class BulkStatusUpdate(BaseModel):
    cctv_ids: List[str]
    status: str

class BulkDelete(BaseModel):
    cctv_ids: List[str]

def marker_doc_to_model(doc) -> Marker:
    return Marker(
        id=str(doc["_id"]),
        type=doc["type"],
        name=doc["name"],
        lat=doc["lat"],
        lng=doc["lng"],
        description=doc.get("description"),
        icon=doc.get("icon"),
        area_id=doc.get("area_id"),
        zone_id=doc.get("zone_id"),
        created_at=doc.get("created_at", datetime.utcnow())
    )

def cctv_doc_to_model(doc) -> CCTV:
    # Handle both old format (with 'gate' field) and new format (with 'location_type' and 'location_name')
    if "location_type" in doc and "location_name" in doc:
        location_type = doc["location_type"]
        location_name = doc["location_name"]
    elif "gate" in doc:
        location_type = "gate"
        location_name = doc["gate"]
    else:
        location_type = "unknown"
        location_name = "unknown"
    
    # Handle migration from video_file to video_source/source_type
    video_source = doc.get("video_source")
    source_type = doc.get("source_type")
    
    # If using old format, convert video_file to new format
    if not video_source and doc.get("video_file"):
        video_source = doc["video_file"]
        source_type = "file"  # Assume local file for old entries
    
    return CCTV(
        id=str(doc["_id"]),
        name=doc["name"],
        area=doc.get("area", ""),
        zone=doc.get("zone", ""),
        location_type=location_type,
        location_name=location_name,
        video_source=video_source or "",
        source_type=source_type or "file",
        status=doc.get("status", "active"),
        created_at=doc.get("created_at", datetime.utcnow())
    )

# Routes

@app.get("/")
def read_root():
    return {"message": "CCTV Management API with Map Integration", "version": "1.0.0"}

# Marker endpoints
@app.post("/create_marker", response_model=Marker)
def create_marker(marker: MarkerCreate):
    if marker.type not in MARKER_TYPES:
        raise HTTPException(status_code=400, detail="Invalid marker type.")
    
    try:
        marker_doc = marker.dict()
        marker_doc["icon"] = MARKER_ICONS.get(marker.type)
        marker_doc["created_at"] = datetime.utcnow()
        
        result = markers_collection.insert_one(marker_doc)
        marker_doc["_id"] = result.inserted_id
        
        return marker_doc_to_model(marker_doc)
    except Exception as e:
        logger.error(f"Error creating marker: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating marker: {str(e)}")

@app.post("/edit", response_model=Marker)
def add_or_edit_marker(marker: Marker):
    if marker.type not in MARKER_TYPES:
        raise HTTPException(status_code=400, detail="Invalid marker type.")
    
    try:
        marker.icon = MARKER_ICONS.get(marker.type)
        
        if marker.id:
            # Edit existing
            update_data = {k: v for k, v in marker.dict().items() if v is not None and k != "id"}
            result = markers_collection.update_one(
                {"_id": ObjectId(marker.id)},
                {"$set": update_data}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Marker not found.")
            
            updated_doc = markers_collection.find_one({"_id": ObjectId(marker.id)})
            return marker_doc_to_model(updated_doc)
        else:
            # Add new
            marker_doc = marker.dict()
            marker_doc.pop("id", None)
            marker_doc["created_at"] = datetime.utcnow()
            
            result = markers_collection.insert_one(marker_doc)
            marker_doc["_id"] = result.inserted_id
            
            return marker_doc_to_model(marker_doc)
    except Exception as e:
        logger.error(f"Error editing marker: {e}")
        raise HTTPException(status_code=500, detail=f"Error editing marker: {str(e)}")

@app.get("/view", response_model=List[Marker])
def view_markers():
    try:
        markers = []
        for doc in markers_collection.find():
            markers.append(marker_doc_to_model(doc))
        return markers
    except Exception as e:
        logger.error(f"Error viewing markers: {e}")
        raise HTTPException(status_code=500, detail=f"Error viewing markers: {str(e)}")

@app.delete("/markers/{marker_id}")
def delete_marker(marker_id: str):
    try:
        result = markers_collection.delete_one({"_id": ObjectId(marker_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Marker not found")
        return {"message": "Marker deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid marker ID")
    except Exception as e:
        logger.error(f"Error deleting marker: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting marker: {str(e)}")

@app.get("/debug/areas")
def debug_areas():
    """Debug endpoint to see raw area data from database"""
    try:
        areas = []
        for doc in areas_collection.find():
            # Convert ObjectId to string for JSON serialization
            doc["_id"] = str(doc["_id"])
            areas.append(doc)
        return {"areas": areas, "count": len(areas)}
    except Exception as e:
        logger.error(f"Error in debug areas: {e}")
        raise HTTPException(status_code=500, detail=f"Error in debug areas: {str(e)}")

@app.get("/debug/single-area/{area_id}")
def debug_single_area(area_id: str):
    """Debug a single area to see what's happening with polygon field"""
    try:
        doc = areas_collection.find_one({"_id": ObjectId(area_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Area not found")
        
        # Convert ObjectId for JSON
        doc["_id"] = str(doc["_id"])
        
        # Check polygon field specifically
        polygon_field = doc.get("polygon")
        
        return {
            "raw_doc": doc,
            "polygon_field": polygon_field,
            "polygon_type": type(polygon_field).__name__,
            "polygon_exists": "polygon" in doc,
            "polygon_is_none": polygon_field is None
        }
    except Exception as e:
        logger.error(f"Error in debug single area: {e}")
        raise HTTPException(status_code=500, detail=f"Error in debug single area: {str(e)}")

# Enhanced Area Management with polygon support
@app.post("/areas", response_model=Area)
def create_area(area: AreaCreate):
    try:
        area_doc = area.dict()
        logger.info(f"Received area data: {area_doc}")
        area_doc["created_at"] = datetime.utcnow()
        result = areas_collection.insert_one(area_doc)
        area_doc["_id"] = result.inserted_id
        
        # Debug: Check what was actually stored
        stored_doc = areas_collection.find_one({"_id": result.inserted_id})
        logger.info(f"Stored area data: {stored_doc}")
        
        return Area(
            id=str(area_doc["_id"]),
            name=area_doc["name"],
            description=area_doc.get("description"),
            polygon=area_doc.get("polygon"),
            created_at=area_doc["created_at"]
        )
    except Exception as e:
        logger.error(f"Error creating area: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating area: {str(e)}")

@app.get("/areas")
async def get_areas():
    """Get all areas - optimized async version"""
    try:
        loop = asyncio.get_event_loop()
        
        def _get_areas():
            areas = []
            for doc in areas_collection.find():
                area_data = {
                    "id": str(doc["_id"]),
                    "name": doc["name"],
                    "description": doc.get("description"),
                    "polygon": doc.get("polygon"),
                    "created_at": doc.get("created_at", datetime.utcnow()).isoformat()
                }
                areas.append(area_data)
            return areas
        
        # Run database query in executor to prevent blocking
        areas = await loop.run_in_executor(None, _get_areas)
        return areas
    except Exception as e:
        logger.error(f"Error getting areas: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting areas: {str(e)}")

@app.put("/areas/{area_id}", response_model=Area)
def update_area(area_id: str, area_update: AreaCreate):
    try:
        update_data = {k: v for k, v in area_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = areas_collection.update_one(
            {"_id": ObjectId(area_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Area not found")
        
        updated_doc = areas_collection.find_one({"_id": ObjectId(area_id)})
        return Area(
            id=str(updated_doc["_id"]),
            name=updated_doc["name"],
            description=updated_doc.get("description"),
            polygon=updated_doc.get("polygon"),
            created_at=updated_doc.get("created_at", datetime.utcnow())
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error updating area: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating area: {str(e)}")

@app.delete("/areas/{area_id}")
def delete_area(area_id: str):
    try:
        result = areas_collection.delete_one({"_id": ObjectId(area_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Area not found")
        return {"message": "Area deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error deleting area: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting area: {str(e)}")

# Enhanced Zone Management with polygon support
@app.post("/zones", response_model=Zone)
def create_zone(zone: ZoneCreate):
    try:
        # Verify area exists
        area_doc = areas_collection.find_one({"_id": ObjectId(zone.area_id)})
        if not area_doc:
            raise HTTPException(status_code=404, detail="Area not found")
        
        zone_doc = zone.dict()
        zone_doc["created_at"] = datetime.utcnow()
        result = zones_collection.insert_one(zone_doc)
        zone_doc["_id"] = result.inserted_id
        
        return Zone(
            id=str(zone_doc["_id"]),
            name=zone_doc["name"],
            area_id=zone_doc["area_id"],
            area_name=area_doc["name"],
            description=zone_doc.get("description"),
            polygon=zone_doc.get("polygon"),
            created_at=zone_doc["created_at"]
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error creating zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating zone: {str(e)}")

@app.get("/zones")
def get_zones():
    """Get all zones - returning raw data to avoid Pydantic issues"""
    try:
        zones = []
        for doc in zones_collection.find():
            # Get area name
            area_doc = areas_collection.find_one({"_id": ObjectId(doc["area_id"])})
            area_name = area_doc["name"] if area_doc else "Unknown"
            
            zone_data = {
                "id": str(doc["_id"]),
                "name": doc["name"],
                "area_id": doc["area_id"],
                "area_name": area_name,
                "description": doc.get("description"),
                "polygon": doc.get("polygon"),
                "created_at": doc.get("created_at", datetime.utcnow()).isoformat()
            }
            zones.append(zone_data)
        return zones
    except Exception as e:
        logger.error(f"Error getting zones: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting zones: {str(e)}")

@app.get("/zones/by-area/{area_id}", response_model=List[Zone])
def get_zones_by_area(area_id: str):
    try:
        zones = []
        for doc in zones_collection.find({"area_id": area_id}):
            # Get area name
            area_doc = areas_collection.find_one({"_id": ObjectId(area_id)})
            area_name = area_doc["name"] if area_doc else "Unknown"
            
            zones.append(Zone(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc["area_id"],
                area_name=area_name,
                description=doc.get("description"),
                polygon=doc.get("polygon"),
                created_at=doc.get("created_at", datetime.utcnow())
            ))
        return zones
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error getting zones: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting zones: {str(e)}")

@app.put("/zones/{zone_id}", response_model=Zone)
def update_zone(zone_id: str, zone_update: ZoneCreate):
    try:
        update_data = {k: v for k, v in zone_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = zones_collection.update_one(
            {"_id": ObjectId(zone_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        updated_doc = zones_collection.find_one({"_id": ObjectId(zone_id)})
        
        # Get area name
        area_doc = areas_collection.find_one({"_id": ObjectId(updated_doc["area_id"])})
        area_name = area_doc["name"] if area_doc else "Unknown"
        
        return Zone(
            id=str(updated_doc["_id"]),
            name=updated_doc["name"],
            area_id=updated_doc["area_id"],
            area_name=area_name,
            description=updated_doc.get("description"),
            polygon=updated_doc.get("polygon"),
            created_at=updated_doc.get("created_at", datetime.utcnow())
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid zone ID")
    except Exception as e:
        logger.error(f"Error updating zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating zone: {str(e)}")

# Keep all your existing CCTV, Gate, Pole endpoints...

class ZoneCreate(BaseModel):
    name: str
    area_id: str
    description: Optional[str] = None
    polygon: Optional[List[List[float]]] = None  # Use polygon field to match existing data

class GateCreate(BaseModel):
    name: str
    area_id: str
    zone_id: str
    description: Optional[str] = None

class PoleCreate(BaseModel):
    name: str
    area_id: str
    zone_id: str
    description: Optional[str] = None

# Response models matching CCTV API exactly
class Area(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    # Map-specific fields for drawing areas
    coordinates: Optional[List[List[float]]] = None

class Zone(BaseModel):
    id: str
    name: str
    area_id: str
    area_name: str
    description: Optional[str] = None
    created_at: datetime
    # Map-specific fields for drawing zones - use polygon instead of coordinates
    polygon: Optional[List[List[float]]] = None

class Gate(BaseModel):
    id: str
    name: str
    area_id: str
    zone_id: str
    area_name: str
    zone_name: str
    description: Optional[str] = None
    created_at: datetime
    # Map-specific fields for positioning gates
    lat: Optional[float] = None
    lng: Optional[float] = None

class Pole(BaseModel):
    id: str
    name: str
    area_id: str
    zone_id: str
    area_name: str
    zone_name: str
    description: Optional[str] = None
    created_at: datetime
    # Map-specific fields for positioning poles
    lat: Optional[float] = None
    lng: Optional[float] = None

# Map-specific create models with coordinates
class AreaMapCreate(BaseModel):
    name: str
    description: Optional[str] = None
    coordinates: List[List[float]]  # Required for map areas

class GateMapCreate(BaseModel):
    name: str
    area_id: str
    zone_id: str
    description: Optional[str] = None
    lat: float  # Required for map gates
    lng: float

class PoleMapCreate(BaseModel):
    name: str
    area_id: str
    zone_id: str
    description: Optional[str] = None
    lat: float  # Required for map poles
    lng: float

# Map-specific models (with coordinates for drawing)
class Marker(BaseModel):
    id: Optional[str] = None
    type: str
    name: str
    lat: float
    lng: float
    description: Optional[str] = None
    icon: Optional[str] = None

# Helper functions
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

# Routes
@app.get("/")
def read_root():
    return {"message": "Infrastructure Management API", "version": "1.0.0"}

@app.get("/stats")
def get_stats():
    """Get system statistics for infrastructure and map data"""
    try:
        # Infrastructure counts
        total_areas = areas_collection.count_documents({})
        total_zones = zones_collection.count_documents({})
        total_gates = gates_collection.count_documents({})
        total_poles = poles_collection.count_documents({})
        
        # CCTV Statistics
        total_cctvs = collection.count_documents({})
        active_cctvs = collection.count_documents({"status": "active"})
        inactive_cctvs = collection.count_documents({"status": "inactive"})
        maintenance_cctvs = collection.count_documents({"status": "maintenance"})
        
        # Count by location type
        gate_cctvs = collection.count_documents({"location_type": "gate"})
        pole_cctvs = collection.count_documents({"location_type": "pole"})
        
        # Map Statistics
        total_markers = markers_collection.count_documents({})
        
        # Count markers by type
        marker_stats = {}
        for marker_type in MARKER_TYPES:
            marker_stats[f"{marker_type}_markers"] = markers_collection.count_documents({"type": marker_type})
        
        # Areas and zones with polygons (drawn on map)
        areas_with_coordinates = areas_collection.count_documents({"coordinates": {"$exists": True, "$ne": None}})
        zones_with_polygons = zones_collection.count_documents({"polygon": {"$exists": True, "$ne": None}})
        
        # Gates and poles with coordinates (positioned on map)
        gates_with_coordinates = gates_collection.count_documents({"lat": {"$exists": True, "$ne": None}})
        poles_with_coordinates = poles_collection.count_documents({"lat": {"$exists": True, "$ne": None}})
        
        response = {
            # Infrastructure Statistics
            "total_areas": total_areas,
            "total_zones": total_zones,
            "total_gates": total_gates,
            "total_poles": total_poles,
            
            # CCTV Statistics
            "total_cctvs": total_cctvs,
            "active_cctvs": active_cctvs,
            "inactive_cctvs": inactive_cctvs,
            "maintenance_cctvs": maintenance_cctvs,
            "gate_cctvs": gate_cctvs,
            "pole_cctvs": pole_cctvs,
            
            # Map Statistics
            "total_markers": total_markers,
            "areas_with_coordinates": areas_with_coordinates,
            "zones_with_polygons": zones_with_polygons,
            "gates_with_coordinates": gates_with_coordinates,
            "poles_with_coordinates": poles_with_coordinates,
            
            # Marker breakdown by type
            **marker_stats,
            
            "database": "MongoDB"
        }
        
        return response
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

# CCTV Management
# Helper functions
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

# Marker endpoints
@app.post("/create_marker", response_model=Marker)
def create_marker(marker: Marker):
    try:
        if marker.type not in MARKER_TYPES:
            raise HTTPException(status_code=400, detail="Invalid marker type.")
        
        marker_dict = marker.dict(exclude={"id"})
        marker_dict["icon"] = MARKER_ICONS.get(marker.type)
        marker_dict["created_at"] = datetime.utcnow()
        
        result = markers_collection.insert_one(marker_dict)
        marker_dict["id"] = str(result.inserted_id)
        return Marker(**marker_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/view", response_model=List[Marker])
def view_markers():
    try:
        markers = []
        for doc in markers_collection.find():
            doc = serialize_doc(doc)
            markers.append(Marker(**doc))
        return markers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Zone endpoints
@app.post("/zones", response_model=Zone)
def create_zone(zone: ZoneCreate):
    """Create a new zone"""
    try:
        # Verify area exists
        area_doc = areas_collection.find_one({"_id": ObjectId(zone.area_id)})
        if not area_doc:
            raise HTTPException(status_code=404, detail="Area not found")
        
        zone_dict = zone.dict()
        zone_dict["created_at"] = datetime.utcnow()
        
        result = zones_collection.insert_one(zone_dict)
        zone_dict["id"] = str(result.inserted_id)
        zone_dict["area_name"] = area_doc["name"]
        return Zone(**zone_dict)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error creating zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating zone: {str(e)}")

@app.get("/zones", response_model=List[Zone])
def get_zones():
    """Get all zones"""
    try:
        zones = []
        zone_docs = list(zones_collection.find())
        
        for doc in zone_docs:
            # Get area name safely
            try:
                area_doc = areas_collection.find_one({"_id": ObjectId(doc.get("area_id"))})
                area_name = area_doc["name"] if area_doc else "Unknown"
            except:
                area_name = "Unknown"
            
            zones.append(Zone(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc.get("area_id", ""),
                area_name=area_name,
                description=doc.get("description"),
                created_at=doc.get("created_at", datetime.utcnow()),
                coordinates=doc.get("coordinates")
            ))
        return zones
    except Exception as e:
        logger.error(f"Error getting zones: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting zones: {str(e)}")

@app.get("/zones/by-area/{area_id}", response_model=List[Zone])
def get_zones_by_area(area_id: str):
    """Get zones by area"""
    try:
        zones = []
        for doc in zones_collection.find({"area_id": area_id}):
            # Get area name
            area_doc = areas_collection.find_one({"_id": ObjectId(area_id)})
            area_name = area_doc["name"] if area_doc else "Unknown"
            
            zones.append(Zone(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc["area_id"],
                area_name=area_name,
                description=doc.get("description"),
                created_at=doc.get("created_at", datetime.utcnow()),
                coordinates=doc.get("coordinates")
            ))
        return zones
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error getting zones: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting zones: {str(e)}")

@app.delete("/zones/{zone_id}")
def delete_zone(zone_id: str):
    """Delete a zone"""
    try:
        result = zones_collection.delete_one({"_id": ObjectId(zone_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Zone not found")
        return {"message": "Zone deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid zone ID")
    except Exception as e:
        logger.error(f"Error deleting zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting zone: {str(e)}")

# Gate endpoints
@app.post("/gates", response_model=Gate)
def create_gate(gate: GateCreate):
    """Create a new gate"""
    try:
        # Verify area and zone exist
        area_doc = areas_collection.find_one({"_id": ObjectId(gate.area_id)})
        if not area_doc:
            raise HTTPException(status_code=404, detail="Area not found")
        
        zone_doc = zones_collection.find_one({"_id": ObjectId(gate.zone_id)})
        if not zone_doc:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        gate_dict = gate.dict()
        gate_dict["created_at"] = datetime.utcnow()
        
        result = gates_collection.insert_one(gate_dict)
        gate_dict["id"] = str(result.inserted_id)
        gate_dict["area_name"] = area_doc["name"]
        gate_dict["zone_name"] = zone_doc["name"]
        return Gate(**gate_dict)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area or zone ID")
    except Exception as e:
        logger.error(f"Error creating gate: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating gate: {str(e)}")

@app.get("/gates", response_model=List[Gate])
def get_gates():
    """Get all gates"""
    try:
        gates = []
        gate_docs = list(gates_collection.find())
        
        for doc in gate_docs:
            # Get area and zone names safely
            try:
                area_doc = areas_collection.find_one({"_id": ObjectId(doc.get("area_id"))})
                area_name = area_doc["name"] if area_doc else "Unknown"
            except:
                area_name = "Unknown"
                
            try:
                zone_doc = zones_collection.find_one({"_id": ObjectId(doc.get("zone_id"))})
                zone_name = zone_doc["name"] if zone_doc else "Unknown"
            except:
                zone_name = "Unknown"
            
            gates.append(Gate(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc.get("area_id", ""),
                zone_id=doc.get("zone_id", ""),
                area_name=area_name,
                zone_name=zone_name,
                description=doc.get("description"),
                created_at=doc.get("created_at", datetime.utcnow()),
                lat=doc.get("lat"),
                lng=doc.get("lng")
            ))
        return gates
    except Exception as e:
        logger.error(f"Error getting gates: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting gates: {str(e)}")
        logger.error(f"Error getting gates: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting gates: {str(e)}")

@app.get("/gates/by-zone/{zone_id}", response_model=List[Gate])
def get_gates_by_zone(zone_id: str):
    """Get gates by zone"""
    try:
        gates = []
        for doc in gates_collection.find({"zone_id": zone_id}):
            # Get area and zone names
            area_doc = areas_collection.find_one({"_id": ObjectId(doc["area_id"])})
            zone_doc = zones_collection.find_one({"_id": ObjectId(zone_id)})
            
            area_name = area_doc["name"] if area_doc else "Unknown"
            zone_name = zone_doc["name"] if zone_doc else "Unknown"
            
            gates.append(Gate(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc["area_id"],
                zone_id=doc["zone_id"],
                area_name=area_name,
                zone_name=zone_name,
                description=doc.get("description"),
                created_at=doc.get("created_at", datetime.utcnow()),
                lat=doc.get("lat"),
                lng=doc.get("lng")
            ))
        return gates
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid zone ID")
    except Exception as e:
        logger.error(f"Error getting gates by zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting gates by zone: {str(e)}")

@app.get("/gates/by-area/{area_id}", response_model=List[Gate])
def get_gates_by_area(area_id: str):
    """Get gates by area"""
    try:
        gates = []
        for doc in gates_collection.find({"area_id": area_id}):
            # Get area and zone names
            area_doc = areas_collection.find_one({"_id": ObjectId(area_id)})
            zone_doc = zones_collection.find_one({"_id": ObjectId(doc["zone_id"])})
            
            area_name = area_doc["name"] if area_doc else "Unknown"
            zone_name = zone_doc["name"] if zone_doc else "Unknown"
            
            gates.append(Gate(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc["area_id"],
                zone_id=doc["zone_id"],
                area_name=area_name,
                zone_name=zone_name,
                description=doc.get("description"),
                created_at=doc.get("created_at", datetime.utcnow()),
                lat=doc.get("lat"),
                lng=doc.get("lng")
            ))
        return gates
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error getting gates by area: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting gates by area: {str(e)}")

# Map-specific gate endpoint with coordinates
@app.post("/gates/map", response_model=Gate)
def create_gate_with_coordinates(gate: GateMapCreate):
    """Create a new gate with map coordinates"""
    try:
        # Verify area and zone exist
        area_doc = areas_collection.find_one({"_id": ObjectId(gate.area_id)})
        if not area_doc:
            raise HTTPException(status_code=404, detail="Area not found")
        
        zone_doc = zones_collection.find_one({"_id": ObjectId(gate.zone_id)})
        if not zone_doc:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        gate_dict = gate.dict()
        gate_dict["created_at"] = datetime.utcnow()
        
        result = gates_collection.insert_one(gate_dict)
        gate_dict["id"] = str(result.inserted_id)
        gate_dict["area_name"] = area_doc["name"]
        gate_dict["zone_name"] = zone_doc["name"]
        return Gate(**gate_dict)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area or zone ID")
    except Exception as e:
        logger.error(f"Error creating gate with coordinates: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating gate with coordinates: {str(e)}")

@app.put("/gates/{gate_id}/coordinates")
def update_gate_coordinates(gate_id: str, lat: float, lng: float):
    """Update gate coordinates for map positioning"""
    try:
        result = gates_collection.update_one(
            {"_id": ObjectId(gate_id)},
            {"$set": {"lat": lat, "lng": lng}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Gate not found")
        
        return {"message": "Gate coordinates updated successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid gate ID")
    except Exception as e:
        logger.error(f"Error updating gate coordinates: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating gate coordinates: {str(e)}")

@app.delete("/gates/{gate_id}")
def delete_gate(gate_id: str):
    """Delete a gate"""
    try:
        result = gates_collection.delete_one({"_id": ObjectId(gate_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Gate not found")
        return {"message": "Gate deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid gate ID")
    except Exception as e:
        logger.error(f"Error deleting gate: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting gate: {str(e)}")

# Pole endpoints
@app.post("/poles", response_model=Pole)
def create_pole(pole: PoleCreate):
    """Create a new pole"""
    try:
        # Verify area and zone exist
        area_doc = areas_collection.find_one({"_id": ObjectId(pole.area_id)})
        if not area_doc:
            raise HTTPException(status_code=404, detail="Area not found")
        
        zone_doc = zones_collection.find_one({"_id": ObjectId(pole.zone_id)})
        if not zone_doc:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        pole_dict = pole.dict()
        pole_dict["created_at"] = datetime.utcnow()
        
        result = poles_collection.insert_one(pole_dict)
        pole_dict["id"] = str(result.inserted_id)
        pole_dict["area_name"] = area_doc["name"]
        pole_dict["zone_name"] = zone_doc["name"]
        return Pole(**pole_dict)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area or zone ID")
    except Exception as e:
        logger.error(f"Error creating pole: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating pole: {str(e)}")

@app.get("/poles", response_model=List[Pole])
def get_poles():
    """Get all poles"""
    try:
        poles = []
        pole_docs = list(poles_collection.find())
        
        for doc in pole_docs:
            # Get area and zone names safely
            try:
                area_doc = areas_collection.find_one({"_id": ObjectId(doc.get("area_id"))})
                area_name = area_doc["name"] if area_doc else "Unknown"
            except:
                area_name = "Unknown"
                
            try:
                zone_doc = zones_collection.find_one({"_id": ObjectId(doc.get("zone_id"))})
                zone_name = zone_doc["name"] if zone_doc else "Unknown"
            except:
                zone_name = "Unknown"
            
            poles.append(Pole(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc.get("area_id", ""),
                zone_id=doc.get("zone_id", ""),
                area_name=area_name,
                zone_name=zone_name,
                description=doc.get("description"),
                created_at=doc.get("created_at", datetime.utcnow()),
                lat=doc.get("lat"),
                lng=doc.get("lng")
            ))
        return poles
    except Exception as e:
        logger.error(f"Error getting poles: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting poles: {str(e)}")

@app.get("/poles/by-zone/{zone_id}", response_model=List[Pole])
def get_poles_by_zone(zone_id: str):
    """Get poles by zone"""
    try:
        poles = []
        for doc in poles_collection.find({"zone_id": zone_id}):
            # Get area and zone names
            area_doc = areas_collection.find_one({"_id": ObjectId(doc["area_id"])})
            zone_doc = zones_collection.find_one({"_id": ObjectId(zone_id)})
            
            area_name = area_doc["name"] if area_doc else "Unknown"
            zone_name = zone_doc["name"] if zone_doc else "Unknown"
            
            poles.append(Pole(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc["area_id"],
                zone_id=doc["zone_id"],
                area_name=area_name,
                zone_name=zone_name,
                description=doc.get("description"),
                created_at=doc.get("created_at", datetime.utcnow()),
                lat=doc.get("lat"),
                lng=doc.get("lng")
            ))
        return poles
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid zone ID")
    except Exception as e:
        logger.error(f"Error getting poles by zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting poles by zone: {str(e)}")

@app.get("/poles/by-area/{area_id}", response_model=List[Pole])
def get_poles_by_area(area_id: str):
    """Get poles by area"""
    try:
        poles = []
        for doc in poles_collection.find({"area_id": area_id}):
            # Get area and zone names
            area_doc = areas_collection.find_one({"_id": ObjectId(area_id)})
            zone_doc = zones_collection.find_one({"_id": ObjectId(doc["zone_id"])})
            
            area_name = area_doc["name"] if area_doc else "Unknown"
            zone_name = zone_doc["name"] if zone_doc else "Unknown"
            
            poles.append(Pole(
                id=str(doc["_id"]),
                name=doc["name"],
                area_id=doc["area_id"],
                zone_id=doc["zone_id"],
                area_name=area_name,
                zone_name=zone_name,
                description=doc.get("description"),
                created_at=doc.get("created_at", datetime.utcnow()),
                lat=doc.get("lat"),
                lng=doc.get("lng")
            ))
        return poles
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error getting poles by area: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting poles by area: {str(e)}")

# Map-specific pole endpoint with coordinates
@app.post("/poles/map", response_model=Pole)
def create_pole_with_coordinates(pole: PoleMapCreate):
    """Create a new pole with map coordinates"""
    try:
        # Verify area and zone exist
        area_doc = areas_collection.find_one({"_id": ObjectId(pole.area_id)})
        if not area_doc:
            raise HTTPException(status_code=404, detail="Area not found")
        
        zone_doc = zones_collection.find_one({"_id": ObjectId(pole.zone_id)})
        if not zone_doc:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        pole_dict = pole.dict()
        pole_dict["created_at"] = datetime.utcnow()
        
        result = poles_collection.insert_one(pole_dict)
        pole_dict["id"] = str(result.inserted_id)
        pole_dict["area_name"] = area_doc["name"]
        pole_dict["zone_name"] = zone_doc["name"]
        return Pole(**pole_dict)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area or zone ID")
    except Exception as e:
        logger.error(f"Error creating pole with coordinates: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating pole with coordinates: {str(e)}")

@app.put("/poles/{pole_id}/coordinates")
def update_pole_coordinates(pole_id: str, lat: float, lng: float):
    """Update pole coordinates for map positioning"""
    try:
        result = poles_collection.update_one(
            {"_id": ObjectId(pole_id)},
            {"$set": {"lat": lat, "lng": lng}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Pole not found")
        
        return {"message": "Pole coordinates updated successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid pole ID")
    except Exception as e:
        logger.error(f"Error updating pole coordinates: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating pole coordinates: {str(e)}")

# Hierarchical structure endpoints
@app.get("/hierarchy")
def get_complete_hierarchy():
    """Get complete hierarchical structure of areas, zones, gates, and poles"""
    try:
        hierarchy = []
        
        for area_doc in areas_collection.find():
            area_data = {
                "id": str(area_doc["_id"]),
                "name": area_doc["name"],
                "description": area_doc.get("description"),
                "created_at": area_doc.get("created_at", datetime.utcnow()),
                "coordinates": area_doc.get("coordinates"),
                "zones": []
            }
            
            # Get zones for this area
            for zone_doc in zones_collection.find({"area_id": str(area_doc["_id"])}):
                zone_data = {
                    "id": str(zone_doc["_id"]),
                    "name": zone_doc["name"],
                    "description": zone_doc.get("description"),
                    "created_at": zone_doc.get("created_at", datetime.utcnow()),
                    "polygon": zone_doc.get("polygon"),
                    "gates": [],
                    "poles": []
                }
                
                # Get gates for this zone
                for gate_doc in gates_collection.find({"zone_id": str(zone_doc["_id"])}):
                    gate_data = {
                        "id": str(gate_doc["_id"]),
                        "name": gate_doc["name"],
                        "description": gate_doc.get("description"),
                        "created_at": gate_doc.get("created_at", datetime.utcnow()),
                        "lat": gate_doc.get("lat"),
                        "lng": gate_doc.get("lng")
                    }
                    zone_data["gates"].append(gate_data)
                
                # Get poles for this zone
                for pole_doc in poles_collection.find({"zone_id": str(zone_doc["_id"])}):
                    pole_data = {
                        "id": str(pole_doc["_id"]),
                        "name": pole_doc["name"],
                        "description": pole_doc.get("description"),
                        "created_at": pole_doc.get("created_at", datetime.utcnow()),
                        "lat": pole_doc.get("lat"),
                        "lng": pole_doc.get("lng")
                    }
                    zone_data["poles"].append(pole_data)
                
                area_data["zones"].append(zone_data)
            
            hierarchy.append(area_data)
        
        return {"hierarchy": hierarchy}
    except Exception as e:
        logger.error(f"Error getting hierarchy: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting hierarchy: {str(e)}")

@app.get("/hierarchy/display")
def display_hierarchy():
    """Display hierarchical structure in a readable format"""
    try:
        display_data = {
            "summary": {
                "total_areas": 0,
                "total_zones": 0,
                "total_gates": 0,
                "total_poles": 0
            },
            "structure": [],
            "detailed_breakdown": []
        }
        
        for area_doc in areas_collection.find():
            area_info = {
                "area": {
                    "id": str(area_doc["_id"]),
                    "name": area_doc["name"],
                    "description": area_doc.get("description"),
                    "has_coordinates": bool(area_doc.get("coordinates")),
                    "zone_count": 0,
                    "gate_count": 0,
                    "pole_count": 0
                },
                "zones": []
            }
            
            display_data["summary"]["total_areas"] += 1
            
            # Get zones for this area
            for zone_doc in zones_collection.find({"area_id": str(area_doc["_id"])}):
                zone_info = {
                    "id": str(zone_doc["_id"]),
                    "name": zone_doc["name"],
                    "description": zone_doc.get("description"),
                    "has_polygon": bool(zone_doc.get("polygon")),
                    "gate_count": 0,
                    "pole_count": 0,
                    "gates": [],
                    "poles": []
                }
                
                display_data["summary"]["total_zones"] += 1
                area_info["area"]["zone_count"] += 1
                
                # Get gates for this zone
                gates = list(gates_collection.find({"zone_id": str(zone_doc["_id"])}))
                for gate_doc in gates:
                    gate_info = {
                        "id": str(gate_doc["_id"]),
                        "name": gate_doc["name"],
                        "description": gate_doc.get("description"),
                        "has_coordinates": bool(gate_doc.get("lat") and gate_doc.get("lng")),
                        "lat": gate_doc.get("lat"),
                        "lng": gate_doc.get("lng")
                    }
                    
                    zone_info["gates"].append(gate_info)
                    zone_info["gate_count"] += 1
                    area_info["area"]["gate_count"] += 1
                    display_data["summary"]["total_gates"] += 1
                
                # Get poles for this zone
                poles = list(poles_collection.find({"zone_id": str(zone_doc["_id"])}))
                for pole_doc in poles:
                    pole_info = {
                        "id": str(pole_doc["_id"]),
                        "name": pole_doc["name"],
                        "description": pole_doc.get("description"),
                        "has_coordinates": bool(pole_doc.get("lat") and pole_doc.get("lng")),
                        "lat": pole_doc.get("lat"),
                        "lng": pole_doc.get("lng")
                    }
                    
                    zone_info["poles"].append(pole_info)
                    zone_info["pole_count"] += 1
                    area_info["area"]["pole_count"] += 1
                    display_data["summary"]["total_poles"] += 1
                
                area_info["zones"].append(zone_info)
            
            display_data["structure"].append(area_info)
            
            # Add to detailed breakdown
            display_data["detailed_breakdown"].append({
                "area_name": area_doc["name"],
                "zones": area_info["area"]["zone_count"],
                "gates": area_info["area"]["gate_count"],
                "poles": area_info["area"]["pole_count"]
            })
        
        return display_data
    except Exception as e:
        logger.error(f"Error displaying hierarchy: {e}")
        raise HTTPException(status_code=500, detail=f"Error displaying hierarchy: {str(e)}")

@app.get("/hierarchy/{area_id}")
def get_area_hierarchy(area_id: str):
    """Get hierarchical structure for a specific area"""
    try:
        area_doc = areas_collection.find_one({"_id": ObjectId(area_id)})
        if not area_doc:
            raise HTTPException(status_code=404, detail="Area not found")
        
        area_data = {
            "id": str(area_doc["_id"]),
            "name": area_doc["name"],
            "description": area_doc.get("description"),
            "created_at": area_doc.get("created_at", datetime.utcnow()),
            "coordinates": area_doc.get("coordinates"),
            "zones": []
        }
        
        # Get zones for this area
        for zone_doc in zones_collection.find({"area_id": area_id}):
            zone_data = {
                "id": str(zone_doc["_id"]),
                "name": zone_doc["name"],
                "description": zone_doc.get("description"),
                "created_at": zone_doc.get("created_at", datetime.utcnow()),
                "polygon": zone_doc.get("polygon"),
                "gates": [],
                "poles": []
            }
            
            # Get gates for this zone
            for gate_doc in gates_collection.find({"zone_id": str(zone_doc["_id"])}):
                gate_data = {
                    "id": str(gate_doc["_id"]),
                    "name": gate_doc["name"],
                    "description": gate_doc.get("description"),
                    "created_at": gate_doc.get("created_at", datetime.utcnow()),
                    "lat": gate_doc.get("lat"),
                    "lng": gate_doc.get("lng")
                }
                zone_data["gates"].append(gate_data)
            
            # Get poles for this zone
            for pole_doc in poles_collection.find({"zone_id": str(zone_doc["_id"])}):
                pole_data = {
                    "id": str(pole_doc["_id"]),
                    "name": pole_doc["name"],
                    "description": pole_doc.get("description"),
                    "created_at": pole_doc.get("created_at", datetime.utcnow()),
                    "lat": pole_doc.get("lat"),
                    "lng": pole_doc.get("lng")
                }
                zone_data["poles"].append(pole_data)
            
            area_data["zones"].append(zone_data)
        
        return area_data
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid area ID")
    except Exception as e:
        logger.error(f"Error getting area hierarchy: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting area hierarchy: {str(e)}")

@app.delete("/poles/{pole_id}")
def delete_pole(pole_id: str):
    """Delete a pole"""
    try:
        result = poles_collection.delete_one({"_id": ObjectId(pole_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Pole not found")
        return {"message": "Pole deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid pole ID")
    except Exception as e:
        logger.error(f"Error deleting pole: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting pole: {str(e)}")

# CCTV Management Endpoints
@app.post("/cctvs", response_model=CCTV)
def create_cctv(cctv: CCTVCreate):
    """Create a new CCTV device"""
    try:
        cctv_doc = cctv.dict()
        cctv_doc["created_at"] = datetime.utcnow()
        result = collection.insert_one(cctv_doc)
        cctv_doc["_id"] = result.inserted_id
        return cctv_doc_to_model(cctv_doc)
    except Exception as e:
        logger.error(f"Error creating CCTV: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating CCTV: {str(e)}")

@app.get("/cctvs", response_model=List[CCTV])
async def get_cctvs():
    """Get all CCTV devices - optimized async version"""
    try:
        loop = asyncio.get_event_loop()
        
        def _get_cctvs():
            cctvs = []
            for doc in collection.find():
                cctvs.append(cctv_doc_to_model(doc))
            return cctvs
        
        # Run database query in executor to prevent blocking
        cctvs = await loop.run_in_executor(None, _get_cctvs)
        return cctvs
    except Exception as e:
        logger.error(f"Error getting CCTVs: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting CCTVs: {str(e)}")

@app.get("/cctvs/summary")
def get_cctv_summary():
    """Get a summary of CCTV devices by various categories"""
    try:
        total_cctvs = collection.count_documents({})
        
        # By status
        status_summary = {}
        for status in ["active", "inactive", "maintenance"]:
            status_summary[status] = collection.count_documents({"status": status})
        
        # By location type
        location_summary = {}
        for location_type in ["gate", "pole"]:
            location_summary[location_type] = collection.count_documents({"location_type": location_type})
        
        # By area
        area_pipeline = [
            {"$group": {"_id": "$area", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        area_summary = list(collection.aggregate(area_pipeline))
        
        # By zone
        zone_pipeline = [
            {"$group": {"_id": "$zone", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        zone_summary = list(collection.aggregate(zone_pipeline))
        
        return {
            "total_cctvs": total_cctvs,
            "by_status": status_summary,
            "by_location_type": location_summary,
            "by_area": area_summary,
            "by_zone": zone_summary
        }
    except Exception as e:
        logger.error(f"Error getting CCTV summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting CCTV summary: {str(e)}")

@app.get("/cctvs/search")
def search_cctvs(
    name: Optional[str] = None,
    area: Optional[str] = None,
    zone: Optional[str] = None,
    location_type: Optional[str] = None,
    location_name: Optional[str] = None,
    status: Optional[str] = None
):
    """Search CCTV devices with multiple criteria"""
    try:
        query = {}
        
        if name:
            query["name"] = {"$regex": name, "$options": "i"}
        if area:
            query["area"] = {"$regex": area, "$options": "i"}
        if zone:
            query["zone"] = {"$regex": zone, "$options": "i"}
        if location_type:
            query["location_type"] = location_type
        if location_name:
            query["location_name"] = {"$regex": location_name, "$options": "i"}
        if status:
            query["status"] = status
        
        cctvs = []
        for doc in collection.find(query):
            cctvs.append(cctv_doc_to_model(doc))
        
        return {
            "query": query,
            "count": len(cctvs),
            "results": cctvs
        }
    except Exception as e:
        logger.error(f"Error searching CCTVs: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching CCTVs: {str(e)}")

# Bulk CCTV operations (must be before {cctv_id} route)
@app.post("/cctvs/bulk", response_model=List[CCTV])
def create_bulk_cctvs(cctvs: List[CCTVCreate]):
    """Create multiple CCTV devices at once"""
    try:
        created_cctvs = []
        for cctv in cctvs:
            cctv_doc = cctv.dict()
            cctv_doc["created_at"] = datetime.utcnow()
            result = collection.insert_one(cctv_doc)
            cctv_doc["_id"] = result.inserted_id
            created_cctvs.append(cctv_doc_to_model(cctv_doc))
        
        return created_cctvs
    except Exception as e:
        logger.error(f"Error creating bulk CCTVs: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating bulk CCTVs: {str(e)}")

@app.put("/cctvs/bulk/status")
def update_bulk_cctv_status(bulk_update: BulkStatusUpdate):
    """Update status for multiple CCTV devices"""
    try:
        if bulk_update.status not in ["active", "inactive", "maintenance"]:
            raise HTTPException(status_code=400, detail="Status must be 'active', 'inactive', or 'maintenance'")
        
        object_ids = [ObjectId(cctv_id) for cctv_id in bulk_update.cctv_ids]
        result = collection.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": {"status": bulk_update.status}}
        )
        
        return {
            "message": f"Updated {result.modified_count} CCTV devices to status {bulk_update.status}",
            "modified_count": result.modified_count
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid CCTV ID(s)")
    except Exception as e:
        logger.error(f"Error updating bulk CCTV status: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating bulk CCTV status: {str(e)}")

@app.delete("/cctvs/bulk")
def delete_bulk_cctvs(bulk_delete: BulkDelete):
    """Delete multiple CCTV devices"""
    try:
        object_ids = [ObjectId(cctv_id) for cctv_id in bulk_delete.cctv_ids]
        result = collection.delete_many({"_id": {"$in": object_ids}})
        
        return {
            "message": f"Deleted {result.deleted_count} CCTV devices",
            "deleted_count": result.deleted_count
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid CCTV ID(s)")
    except Exception as e:
        logger.error(f"Error deleting bulk CCTVs: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting bulk CCTVs: {str(e)}")

@app.get("/cctvs/{cctv_id}", response_model=CCTV)
def get_cctv(cctv_id: str):
    """Get a specific CCTV device"""
    try:
        doc = collection.find_one({"_id": ObjectId(cctv_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="CCTV not found")
        return cctv_doc_to_model(doc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid CCTV ID")
    except Exception as e:
        logger.error(f"Error getting CCTV: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting CCTV: {str(e)}")

@app.get("/cctvs/by-area/{area_name}", response_model=List[CCTV])
def get_cctvs_by_area(area_name: str):
    """Get all CCTV devices in a specific area"""
    try:
        cctvs = []
        for doc in collection.find({"area": area_name}):
            cctvs.append(cctv_doc_to_model(doc))
        return cctvs
    except Exception as e:
        logger.error(f"Error getting CCTVs by area: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting CCTVs by area: {str(e)}")

@app.get("/cctvs/by-zone/{zone_name}", response_model=List[CCTV])
def get_cctvs_by_zone(zone_name: str):
    """Get all CCTV devices in a specific zone"""
    try:
        cctvs = []
        for doc in collection.find({"zone": zone_name}):
            cctvs.append(cctv_doc_to_model(doc))
        return cctvs
    except Exception as e:
        logger.error(f"Error getting CCTVs by zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting CCTVs by zone: {str(e)}")

@app.get("/cctvs/by-area-zone/{area_name}/{zone_name}", response_model=List[CCTV])
def get_cctvs_by_area_and_zone(area_name: str, zone_name: str):
    """Get all CCTV devices in a specific area and zone"""
    try:
        cctvs = []
        for doc in collection.find({"area": area_name, "zone": zone_name}):
            cctvs.append(cctv_doc_to_model(doc))
        return cctvs
    except Exception as e:
        logger.error(f"Error getting CCTVs by area and zone: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting CCTVs by area and zone: {str(e)}")

@app.get("/cctvs/by-location-type/{location_type}", response_model=List[CCTV])
def get_cctvs_by_location_type(location_type: str):
    """Get all CCTV devices by location type (gate/pole)"""
    try:
        if location_type not in ["gate", "pole"]:
            raise HTTPException(status_code=400, detail="Location type must be 'gate' or 'pole'")
        
        cctvs = []
        for doc in collection.find({"location_type": location_type}):
            cctvs.append(cctv_doc_to_model(doc))
        return cctvs
    except Exception as e:
        logger.error(f"Error getting CCTVs by location type: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting CCTVs by location type: {str(e)}")

@app.get("/cctvs/by-status/{status}", response_model=List[CCTV])
def get_cctvs_by_status(status: str):
    """Get all CCTV devices by status"""
    try:
        cctvs = []
        for doc in collection.find({"status": status}):
            cctvs.append(cctv_doc_to_model(doc))
        return cctvs
    except Exception as e:
        logger.error(f"Error getting CCTVs by status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting CCTVs by status: {str(e)}")

@app.put("/cctvs/{cctv_id}", response_model=CCTV)
def update_cctv(cctv_id: str, cctv_update: CCTVUpdate):
    """Update a CCTV device"""
    try:
        update_data = {k: v for k, v in cctv_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = collection.update_one(
            {"_id": ObjectId(cctv_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="CCTV not found")
        
        updated_doc = collection.find_one({"_id": ObjectId(cctv_id)})
        return cctv_doc_to_model(updated_doc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid CCTV ID")
    except Exception as e:
        logger.error(f"Error updating CCTV: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating CCTV: {str(e)}")

@app.patch("/cctvs/{cctv_id}/status")
def update_cctv_status(cctv_id: str, status: str):
    """Update CCTV status"""
    try:
        if status not in ["active", "inactive", "maintenance"]:
            raise HTTPException(status_code=400, detail="Status must be 'active', 'inactive', or 'maintenance'")
        
        result = collection.update_one(
            {"_id": ObjectId(cctv_id)},
            {"$set": {"status": status}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="CCTV not found")
        
        return {"message": f"CCTV status updated to {status}"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid CCTV ID")
    except Exception as e:
        logger.error(f"Error updating CCTV status: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating CCTV status: {str(e)}")

@app.delete("/cctvs/{cctv_id}")
def delete_cctv(cctv_id: str):
    """Delete a CCTV device"""
    try:
        result = collection.delete_one({"_id": ObjectId(cctv_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="CCTV not found")
        return {"message": "CCTV deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid CCTV ID")
    except Exception as e:
        logger.error(f"Error deleting CCTV: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting CCTV: {str(e)}")

@app.get("/api/user-map-data")
def get_user_map_data():
    """Get simplified map data for users - markers only with location info"""
    try:
        # Get all markers for the map
        markers = []
        for marker_doc in markers_collection.find():
            marker_data = {
                "id": str(marker_doc["_id"]),
                "type": marker_doc["type"],
                "name": marker_doc["name"],
                "lat": marker_doc["lat"],
                "lng": marker_doc["lng"],
                "description": marker_doc.get("description", ""),
                "created_at": marker_doc["created_at"].isoformat()
            }
            markers.append(marker_data)
        
        return {
            "markers": markers,
            "total_markers": len(markers),
            "map_center": {
                "lat": 28.6139,  # Default center (Delhi)
                "lng": 77.2090
            }
        }
    except Exception as e:
        logger.error(f"Error getting user map data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting user map data: {str(e)}")

# Real-time Location Tracking for Heatmap
class LocationData(BaseModel):
    user_id: Optional[str] = None  # Optional user identifier
    lat: float
    lng: float
    timestamp: Optional[datetime] = None
    device_info: Optional[str] = None  # Optional device/app info

@app.post("/api/location-update")
def update_user_location(location: LocationData):
    """Receive real-time location updates from mobile app"""
    try:
        # Set timestamp if not provided
        if not location.timestamp:
            location.timestamp = datetime.utcnow()
        
        # Create location document
        location_doc = {
            "user_id": location.user_id or f"user_{int(time.time() * 1000)}",
            "lat": location.lat,
            "lng": location.lng,
            "timestamp": location.timestamp,
            "device_info": location.device_info,
            "created_at": datetime.utcnow()
        }
        
        # Store in locations collection
        locations_collection = db["user_locations"]
        result = locations_collection.insert_one(location_doc)
        
        return {
            "message": "Location updated successfully",
            "id": str(result.inserted_id),
            "timestamp": location.timestamp.isoformat()
        }
    except Exception as e:
        logger.error(f"Error updating user location: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating user location: {str(e)}")

@app.get("/api/heatmap-data")
def get_heatmap_data(hours: int = 24):
    """Get location data for heatmap (last N hours)"""
    try:
        # Calculate time threshold
        time_threshold = datetime.utcnow() - timedelta(hours=hours)
        
        # Get recent locations
        locations_collection = db["user_locations"]
        recent_locations = list(locations_collection.find({
            "timestamp": {"$gte": time_threshold}
        }))
        
        # Format for heatmap
        heatmap_data = []
        for loc in recent_locations:
            heatmap_data.append({
                "lat": loc["lat"],
                "lng": loc["lng"],
                "intensity": 1  # Can be adjusted based on frequency
            })
        
        # Group nearby locations to increase intensity
        grouped_data = group_nearby_locations(heatmap_data)
        
        return {
            "heatmap_points": grouped_data,
            "total_points": len(heatmap_data),
            "time_range_hours": hours,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting heatmap data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting heatmap data: {str(e)}")

def group_nearby_locations(locations, radius=0.001):  # ~100m radius
    """Group nearby locations to create intensity clusters"""
    grouped = []
    processed = set()
    
    for i, loc in enumerate(locations):
        if i in processed:
            continue
            
        # Find nearby locations
        cluster = [loc]
        processed.add(i)
        
        for j, other_loc in enumerate(locations[i+1:], i+1):
            if j in processed:
                continue
                
            # Calculate distance (rough approximation)
            lat_diff = abs(loc['lat'] - other_loc['lat'])
            lng_diff = abs(loc['lng'] - other_loc['lng'])
            
            if lat_diff <= radius and lng_diff <= radius:
                cluster.append(other_loc)
                processed.add(j)
        
        # Create grouped point with intensity
        if cluster:
            avg_lat = sum(p['lat'] for p in cluster) / len(cluster)
            avg_lng = sum(p['lng'] for p in cluster) / len(cluster)
            intensity = len(cluster)
            
            grouped.append({
                "lat": avg_lat,
                "lng": avg_lng,
                "intensity": intensity
            })
    
    return grouped

@app.delete("/api/location-data")
def clear_location_data():
    """Clear old location data (admin function)"""
    try:
        # Remove data older than 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        locations_collection = db["user_locations"]
        result = locations_collection.delete_many({
            "timestamp": {"$lt": week_ago}
        })
        
        return {
            "message": f"Cleared {result.deleted_count} old location records",
            "cleared_before": week_ago.isoformat()
        }
    except Exception as e:
        logger.error(f"Error clearing location data: {e}")
        raise HTTPException(status_code=500, detail=f"Error clearing location data: {str(e)}")

@app.get("/api/user-location-history/{user_id}")
def get_user_location_history(user_id: str, hours: int = 24):
    """Get location history for a specific user"""
    try:
        locations_collection = db["user_locations"]
        
        # Calculate time range
        time_filter = datetime.utcnow() - timedelta(hours=hours)
        
        # Find user's location history
        locations = list(locations_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": time_filter}
        }).sort("timestamp", -1))  # Most recent first
        
        # Convert to response format
        location_history = []
        for loc in locations:
            location_history.append({
                "lat": loc["lat"],
                "lng": loc["lng"],
                "timestamp": loc["timestamp"].isoformat(),
                "device_info": loc.get("device_info", ""),
                "accuracy": extract_accuracy_from_device_info(loc.get("device_info", "")),
                "altitude": extract_altitude_from_device_info(loc.get("device_info", ""))
            })
        
        return {
            "user_id": user_id,
            "total_points": len(location_history),
            "time_range_hours": hours,
            "locations": location_history,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting user location history: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting user location history: {str(e)}")

def extract_accuracy_from_device_info(device_info: str) -> Optional[float]:
    """Extract accuracy value from device_info string"""
    if not device_info:
        return None
    try:
        accuracy_match = re.search(r'Accuracy:\s*\+?([0-9.]+)', device_info)
        if accuracy_match:
            return float(accuracy_match.group(1))
    except:
        pass
    return None

def extract_altitude_from_device_info(device_info: str) -> Optional[float]:
    """Extract altitude value from device_info string"""
    if not device_info:
        return None
    try:
        altitude_match = re.search(r'Altitude:\s*([0-9.]+)', device_info)
        if altitude_match:
            return float(altitude_match.group(1))
    except:
        pass
    return None
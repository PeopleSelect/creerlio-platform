"""
Creerlio Platform - Main Backend Entry Point
FastAPI application with AI resume parsing, business profiles, and mapping features
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from typing import List, Optional
import os
from dotenv import load_dotenv

from app.models import BusinessProfile, TalentProfile, ResumeData
from app.ai_service import AIService
from app.pdf_generator import PDFGenerator
from app.mapping_service import MappingService
from app.database import get_db, init_db

load_dotenv()

# Initialize services
ai_service = AIService()
pdf_generator = PDFGenerator()
mapping_service = MappingService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup on startup/shutdown"""
    # Initialize database
    init_db()
    yield
    # Cleanup if needed
    pass


app = FastAPI(
    title="Creerlio Platform API",
    description="Multi-component platform for business, talent, and mapping solutions",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check
@app.get("/")
async def root():
    return {"message": "Creerlio Platform API", "status": "healthy"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "creerlio-platform"}


# ==================== AI Resume Parsing ====================

@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...), db=Depends(get_db)):
    """Upload and parse resume using AI"""
    try:
        # Save uploaded file temporarily
        file_content = await file.read()
        
        # Parse resume with AI
        parsed_data = await ai_service.parse_resume(file_content, file.filename)
        
        # Store in database
        resume_data = ResumeData(**parsed_data)
        db.add(resume_data)
        db.commit()
        db.refresh(resume_data)
        
        return {
            "success": True,
            "resume_id": resume_data.id,
            "data": parsed_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resume/{resume_id}")
async def get_resume(resume_id: int, db=Depends(get_db)):
    """Get parsed resume data"""
    resume = db.query(ResumeData).filter(ResumeData.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@app.get("/api/resume")
async def list_resumes(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    """List all parsed resumes"""
    resumes = db.query(ResumeData).offset(skip).limit(limit).all()
    return {"resumes": resumes, "count": len(resumes)}


# ==================== Business Profiles ====================

@app.post("/api/business")
async def create_business(business_data: dict, db=Depends(get_db)):
    """Create a new business profile"""
    try:
        business = BusinessProfile(**business_data)
        db.add(business)
        db.commit()
        db.refresh(business)
        return {"success": True, "business": business}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/business/{business_id}")
async def get_business(business_id: int, db=Depends(get_db)):
    """Get business profile by ID"""
    business = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business


@app.put("/api/business/{business_id}")
async def update_business(business_id: int, business_data: dict, db=Depends(get_db)):
    """Update business profile"""
    business = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    for key, value in business_data.items():
        setattr(business, key, value)
    
    db.commit()
    db.refresh(business)
    return {"success": True, "business": business}


@app.delete("/api/business/{business_id}")
async def delete_business(business_id: int, db=Depends(get_db)):
    """Delete business profile"""
    business = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    db.delete(business)
    db.commit()
    return {"success": True, "message": "Business deleted"}


@app.get("/api/business/search")
async def search_businesses(
    query: Optional[str] = None,
    location: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db=Depends(get_db)
):
    """Search businesses by name, description, or location"""
    businesses = db.query(BusinessProfile)
    
    if query:
        businesses = businesses.filter(
            (BusinessProfile.name.ilike(f"%{query}%")) |
            (BusinessProfile.description.ilike(f"%{query}%"))
        )
    
    if location:
        businesses = businesses.filter(BusinessProfile.location.ilike(f"%{location}%"))
    
    results = businesses.offset(skip).limit(limit).all()
    return {"businesses": results, "count": len(results)}


# ==================== Talent Profiles ====================

@app.post("/api/talent")
async def create_talent(talent_data: dict, db=Depends(get_db)):
    """Create a new talent profile"""
    try:
        talent = TalentProfile(**talent_data)
        db.add(talent)
        db.commit()
        db.refresh(talent)
        return {"success": True, "talent": talent}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/talent/{talent_id}")
async def get_talent(talent_id: int, db=Depends(get_db)):
    """Get talent profile by ID"""
    talent = db.query(TalentProfile).filter(TalentProfile.id == talent_id).first()
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    return talent


@app.get("/api/talent/search")
async def search_talent(
    query: Optional[str] = None,
    skills: Optional[str] = None,
    location: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db=Depends(get_db)
):
    """Search talent by skills, location, or keywords"""
    talents = db.query(TalentProfile)
    
    if query:
        talents = talents.filter(
            (TalentProfile.name.ilike(f"%{query}%")) |
            (TalentProfile.bio.ilike(f"%{query}%"))
        )
    
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        for skill in skill_list:
            talents = talents.filter(TalentProfile.skills.contains([skill]))
    
    if location:
        talents = talents.filter(TalentProfile.location.ilike(f"%{location}%"))
    
    results = talents.offset(skip).limit(limit).all()
    return {"talents": results, "count": len(results)}


# ==================== Mapping & Routes ====================

@app.post("/api/mapping/geocode")
async def geocode_address(request: dict):
    """Geocode an address to coordinates"""
    try:
        address = request.get("address", "")
        if not address:
            raise HTTPException(status_code=400, detail="Address is required")
        result = await mapping_service.geocode_address(address)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mapping/route")
async def calculate_route(request: dict):
    """Calculate route between two locations"""
    try:
        origin = request.get("origin", "")
        destination = request.get("destination", "")
        mode = request.get("mode", "driving")
        
        if not origin or not destination:
            raise HTTPException(status_code=400, detail="Origin and destination are required")
        
        result = await mapping_service.calculate_route(origin, destination, mode)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/mapping/businesses")
async def get_businesses_on_map(
    lat: float,
    lng: float,
    radius: float = 5.0,
    db=Depends(get_db)
):
    """Get businesses within radius of coordinates"""
    try:
        businesses = await mapping_service.get_nearby_businesses(lat, lng, radius, db)
        return {"success": True, "businesses": businesses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PDF Generation ====================

@app.post("/api/pdf/resume/{resume_id}")
async def generate_resume_pdf(resume_id: int, db=Depends(get_db)):
    """Generate PDF from resume data"""
    resume = db.query(ResumeData).filter(ResumeData.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    try:
        pdf_bytes = await pdf_generator.generate_resume_pdf(resume)
        return JSONResponse(
            content={"success": True, "pdf_base64": pdf_bytes},
            media_type="application/json"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pdf/business/{business_id}")
async def generate_business_pdf(business_id: int, db=Depends(get_db)):
    """Generate PDF profile for business"""
    business = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    try:
        pdf_bytes = await pdf_generator.generate_business_pdf(business)
        return JSONResponse(
            content={"success": True, "pdf_base64": pdf_bytes},
            media_type="application/json"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )


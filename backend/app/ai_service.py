"""
AI Service for Resume Parsing
Uses OpenAI and LangChain for intelligent resume parsing and data extraction
"""

import os
import base64
from typing import Dict, List, Optional
import json
from openai import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
import PyPDF2
import docx
import io

class AIService:
    """AI-powered resume parsing service"""
    
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=200
        )
    
    async def parse_resume(self, file_content: bytes, filename: str) -> Dict:
        """
        Parse resume file and extract structured data using AI
        
        Args:
            file_content: Binary content of the resume file
            filename: Original filename
            
        Returns:
            Dictionary with parsed resume data
        """
        try:
            # Extract text from file
            text = self._extract_text(file_content, filename)
            
            if not text:
                raise ValueError("Could not extract text from resume file")
            
            # Use AI to parse and structure the resume
            structured_data = await self._parse_with_ai(text, filename)
            
            # Add file metadata
            structured_data["original_filename"] = filename
            structured_data["file_type"] = self._get_file_type(filename)
            structured_data["file_size"] = len(file_content)
            
            return structured_data
            
        except Exception as e:
            raise Exception(f"Error parsing resume: {str(e)}")
    
    def _extract_text(self, file_content: bytes, filename: str) -> str:
        """Extract text from various file formats"""
        file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
        
        if file_ext == 'pdf':
            return self._extract_from_pdf(file_content)
        elif file_ext in ['doc', 'docx']:
            return self._extract_from_docx(file_content)
        elif file_ext == 'txt':
            return file_content.decode('utf-8', errors='ignore')
        else:
            # Try to decode as text
            try:
                return file_content.decode('utf-8', errors='ignore')
            except:
                raise ValueError(f"Unsupported file format: {file_ext}")
    
    def _extract_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            raise Exception(f"Error extracting PDF text: {str(e)}")
    
    def _extract_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file"""
        try:
            doc_file = io.BytesIO(file_content)
            doc = docx.Document(doc_file)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            raise Exception(f"Error extracting DOCX text: {str(e)}")
    
    def _get_file_type(self, filename: str) -> str:
        """Get file type from filename"""
        ext = filename.lower().split('.')[-1] if '.' in filename else 'unknown'
        return ext
    
    async def _parse_with_ai(self, text: str, filename: str) -> Dict:
        """Use OpenAI to parse and structure resume text"""
        
        system_prompt = """You are an expert resume parser. Extract structured data from resume text.
        Return a JSON object with the following structure:
        {
            "name": "Full Name",
            "email": "email@example.com",
            "phone": "phone number",
            "address": "full address",
            "linkedin": "LinkedIn URL if present",
            "github": "GitHub URL if present",
            "website": "Personal website if present",
            "summary": "Professional summary or objective",
            "objective": "Career objective if separate from summary",
            "experience": [
                {
                    "company": "Company Name",
                    "title": "Job Title",
                    "start_date": "Start date",
                    "end_date": "End date or 'Present'",
                    "description": "Job description",
                    "achievements": ["achievement 1", "achievement 2"]
                }
            ],
            "education": [
                {
                    "institution": "School/University Name",
                    "degree": "Degree Type",
                    "field": "Field of Study",
                    "start_date": "Start date",
                    "end_date": "End date",
                    "gpa": "GPA if mentioned"
                }
            ],
            "skills": {
                "technical": ["skill1", "skill2"],
                "soft": ["skill1", "skill2"],
                "languages": ["language1", "language2"],
                "tools": ["tool1", "tool2"]
            },
            "certifications": [
                {
                    "name": "Certification Name",
                    "issuer": "Issuing Organization",
                    "date": "Date obtained",
                    "expiry": "Expiry date if applicable"
                }
            ],
            "projects": [
                {
                    "name": "Project Name",
                    "description": "Project description",
                    "technologies": ["tech1", "tech2"],
                    "url": "Project URL if available"
                }
            ],
            "languages": [
                {
                    "language": "Language Name",
                    "proficiency": "Native/Fluent/Intermediate/Basic"
                }
            ],
            "awards": [
                {
                    "title": "Award Title",
                    "issuer": "Issuing Organization",
                    "date": "Date received",
                    "description": "Award description"
                }
            ]
        }
        
        Extract all available information. If a field is not present, use null or empty array/object as appropriate.
        Be thorough and accurate in extraction."""
        
        user_prompt = f"Parse the following resume text and extract structured data:\n\n{text}"
        
        try:
            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            # Parse JSON response
            parsed_data = json.loads(response.choices[0].message.content)
            
            # Store raw data
            parsed_data["raw_data"] = {
                "original_text": text,
                "filename": filename,
                "parsing_model": self.model
            }
            
            return parsed_data
            
        except Exception as e:
            raise Exception(f"Error in AI parsing: {str(e)}")
    
    async def enhance_resume_data(self, resume_data: Dict) -> Dict:
        """Enhance resume data with AI insights and suggestions"""
        try:
            prompt = f"""Analyze this resume data and provide enhancements:
            - Suggest missing skills based on experience
            - Identify strengths and areas for improvement
            - Suggest keywords for ATS optimization
            - Provide career recommendations
            
            Resume Data: {json.dumps(resume_data, indent=2)}
            
            Return JSON with:
            {{
                "suggested_skills": ["skill1", "skill2"],
                "strengths": ["strength1", "strength2"],
                "improvements": ["improvement1", "improvement2"],
                "ats_keywords": ["keyword1", "keyword2"],
                "career_recommendations": ["recommendation1", "recommendation2"]
            }}"""
            
            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a career advisor and resume expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            enhancements = json.loads(response.choices[0].message.content)
            return enhancements
            
        except Exception as e:
            raise Exception(f"Error enhancing resume: {str(e)}")



"""
PDF Generator Service
Creates PDF documents for resumes, business profiles, and reports
"""

import os
import base64
from io import BytesIO
from typing import Dict, Optional
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

class PDFGenerator:
    """PDF generation service for resumes and business documents"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            alignment=TA_LEFT
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=8,
            spaceBefore=12,
            borderWidth=1,
            borderColor=colors.HexColor('#3498db'),
            borderPadding=5
        ))
        
        # Body text style
        self.styles.add(ParagraphStyle(
            name='BodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            leading=14
        ))
    
    async def generate_resume_pdf(self, resume_data) -> str:
        """
        Generate PDF from resume data
        
        Args:
            resume_data: ResumeData model instance or dict
            
        Returns:
            Base64 encoded PDF string
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        story = []
        
        # Convert to dict if model instance
        if hasattr(resume_data, '__dict__'):
            data = {k: v for k, v in resume_data.__dict__.items() if not k.startswith('_')}
        else:
            data = resume_data
        
        # Header Section
        if data.get('name'):
            story.append(Paragraph(data['name'], self.styles['CustomTitle']))
        
        # Contact Information
        contact_info = []
        if data.get('email'):
            contact_info.append(data['email'])
        if data.get('phone'):
            contact_info.append(data['phone'])
        if data.get('address'):
            contact_info.append(data['address'])
        if data.get('linkedin'):
            contact_info.append(f"LinkedIn: {data['linkedin']}")
        if data.get('github'):
            contact_info.append(f"GitHub: {data['github']}")
        if data.get('website'):
            contact_info.append(f"Website: {data['website']}")
        
        if contact_info:
            story.append(Paragraph(" | ".join(contact_info), self.styles['BodyText']))
            story.append(Spacer(1, 0.2*inch))
        
        # Professional Summary
        if data.get('summary') or data.get('objective'):
            story.append(Paragraph("PROFESSIONAL SUMMARY", self.styles['SectionHeader']))
            summary_text = data.get('summary') or data.get('objective', '')
            story.append(Paragraph(summary_text, self.styles['BodyText']))
            story.append(Spacer(1, 0.15*inch))
        
        # Work Experience
        if data.get('experience'):
            story.append(Paragraph("WORK EXPERIENCE", self.styles['SectionHeader']))
            for exp in data['experience']:
                if isinstance(exp, dict):
                    # Job title and company
                    title_company = f"<b>{exp.get('title', 'N/A')}</b> - {exp.get('company', 'N/A')}"
                    dates = f"{exp.get('start_date', '')} - {exp.get('end_date', 'Present')}"
                    story.append(Paragraph(f"{title_company} | {dates}", self.styles['BodyText']))
                    
                    # Description
                    if exp.get('description'):
                        story.append(Paragraph(exp['description'], self.styles['BodyText']))
                    
                    # Achievements
                    if exp.get('achievements'):
                        for achievement in exp['achievements']:
                            story.append(Paragraph(f"• {achievement}", self.styles['BodyText']))
                    
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.1*inch))
        
        # Education
        if data.get('education'):
            story.append(Paragraph("EDUCATION", self.styles['SectionHeader']))
            for edu in data['education']:
                if isinstance(edu, dict):
                    degree_info = f"<b>{edu.get('degree', 'N/A')}</b> in {edu.get('field', 'N/A')}"
                    institution = edu.get('institution', 'N/A')
                    dates = f"{edu.get('start_date', '')} - {edu.get('end_date', '')}"
                    gpa = f" | GPA: {edu.get('gpa', '')}" if edu.get('gpa') else ""
                    story.append(Paragraph(f"{degree_info}<br/>{institution} | {dates}{gpa}", self.styles['BodyText']))
                    story.append(Spacer(1, 0.1*inch))
            story.append(Spacer(1, 0.1*inch))
        
        # Skills
        if data.get('skills'):
            story.append(Paragraph("SKILLS", self.styles['SectionHeader']))
            skills_text = []
            skills_dict = data['skills'] if isinstance(data['skills'], dict) else {}
            
            if skills_dict.get('technical'):
                skills_text.append(f"<b>Technical:</b> {', '.join(skills_dict['technical'])}")
            if skills_dict.get('soft'):
                skills_text.append(f"<b>Soft Skills:</b> {', '.join(skills_dict['soft'])}")
            if skills_dict.get('tools'):
                skills_text.append(f"<b>Tools:</b> {', '.join(skills_dict['tools'])}")
            if skills_dict.get('languages'):
                skills_text.append(f"<b>Languages:</b> {', '.join(skills_dict['languages'])}")
            
            if skills_text:
                story.append(Paragraph("<br/>".join(skills_text), self.styles['BodyText']))
            story.append(Spacer(1, 0.1*inch))
        
        # Certifications
        if data.get('certifications'):
            story.append(Paragraph("CERTIFICATIONS", self.styles['SectionHeader']))
            for cert in data['certifications']:
                if isinstance(cert, dict):
                    cert_text = f"<b>{cert.get('name', 'N/A')}</b> - {cert.get('issuer', 'N/A')}"
                    if cert.get('date'):
                        cert_text += f" | {cert['date']}"
                    story.append(Paragraph(cert_text, self.styles['BodyText']))
                    story.append(Spacer(1, 0.05*inch))
            story.append(Spacer(1, 0.1*inch))
        
        # Projects
        if data.get('projects'):
            story.append(Paragraph("PROJECTS", self.styles['SectionHeader']))
            for project in data['projects']:
                if isinstance(project, dict):
                    project_text = f"<b>{project.get('name', 'N/A')}</b>"
                    if project.get('url'):
                        project_text += f" - {project['url']}"
                    story.append(Paragraph(project_text, self.styles['BodyText']))
                    if project.get('description'):
                        story.append(Paragraph(project['description'], self.styles['BodyText']))
                    if project.get('technologies'):
                        story.append(Paragraph(f"Technologies: {', '.join(project['technologies'])}", self.styles['BodyText']))
                    story.append(Spacer(1, 0.1*inch))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Encode to base64
        pdf_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        return pdf_base64
    
    async def generate_business_pdf(self, business_data) -> str:
        """
        Generate PDF profile for business
        
        Args:
            business_data: BusinessProfile model instance or dict
            
        Returns:
            Base64 encoded PDF string
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        story = []
        
        # Convert to dict if model instance
        if hasattr(business_data, '__dict__'):
            data = {k: v for k, v in business_data.__dict__.items() if not k.startswith('_')}
        else:
            data = business_data
        
        # Business Name
        if data.get('name'):
            story.append(Paragraph(data['name'], self.styles['CustomTitle']))
        
        # Business Information
        info_items = []
        if data.get('industry'):
            info_items.append(f"<b>Industry:</b> {data['industry']}")
        if data.get('website'):
            info_items.append(f"<b>Website:</b> {data['website']}")
        if data.get('email'):
            info_items.append(f"<b>Email:</b> {data['email']}")
        if data.get('phone'):
            info_items.append(f"<b>Phone:</b> {data['phone']}")
        
        if info_items:
            story.append(Paragraph("<br/>".join(info_items), self.styles['BodyText']))
            story.append(Spacer(1, 0.2*inch))
        
        # Description
        if data.get('description'):
            story.append(Paragraph("ABOUT", self.styles['SectionHeader']))
            story.append(Paragraph(data['description'], self.styles['BodyText']))
            story.append(Spacer(1, 0.15*inch))
        
        # Location
        if data.get('location') or data.get('address'):
            story.append(Paragraph("LOCATION", self.styles['SectionHeader']))
            location_text = data.get('location') or data.get('address', '')
            if data.get('city'):
                location_text += f", {data['city']}"
            if data.get('state'):
                location_text += f", {data['state']}"
            if data.get('country'):
                location_text += f", {data['country']}"
            story.append(Paragraph(location_text, self.styles['BodyText']))
            
            if data.get('latitude') and data.get('longitude'):
                story.append(Paragraph(f"Coordinates: {data['latitude']}, {data['longitude']}", self.styles['BodyText']))
            story.append(Spacer(1, 0.15*inch))
        
        # Tags
        if data.get('tags'):
            story.append(Paragraph("TAGS", self.styles['SectionHeader']))
            tags_text = ", ".join(data['tags']) if isinstance(data['tags'], list) else str(data['tags'])
            story.append(Paragraph(tags_text, self.styles['BodyText']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Encode to base64
        pdf_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        return pdf_base64



# Creerlio Platform - AI-Powered Resume Builder

Welcome to Creerlio, an intelligent resume building platform that leverages Azure OpenAI to help you create professional, ATS-friendly resumes.

## Features

✨ **AI-Powered Enhancements**: Improve your resume descriptions with AI assistance
🎯 **Smart Skills Suggestions**: Get skill recommendations based on your experience
📄 **PDF Export**: Download professional PDF resumes
💼 **Comprehensive Resume Builder**: Add personal info, work experience, education, and skills
🚀 **Fast & Modern**: Built with FastAPI and vanilla JavaScript

## Prerequisites

- Python 3.8 or higher
- Azure OpenAI API credentials (already configured in `.env`)

## Installation

1. **Clone the repository** (if not already done):
```bash
git clone https://github.com/Creerlio/creerlio-platform.git
cd creerlio-platform
```

2. **Create a virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Verify environment variables**:
The `.env` file should already contain your Azure OpenAI credentials:
```
AZURE_ENDPOINT=https://creerlio-project-resource-eastus2.openai.azure.com/
AZURE_API_KEY=your-api-key
AZURE_API_VERSION=2024-06-01
AZURE_REGION=eastus2
```

## Running the Application

Start the FastAPI server:
```bash
python main.py
```

Or use uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The application will be available at:
- **Frontend**: http://localhost:8000/static/index.html
- **API Documentation**: http://localhost:8000/docs
- **API Root**: http://localhost:8000

## Usage

### Using the Web Interface

1. Open http://localhost:8000/static/index.html in your browser
2. Fill in your personal information
3. Add work experiences and education
4. Use AI enhancement features:
   - Click "✨ Enhance with AI" on any text field to improve it
   - Click "🤖 AI Suggest Skills" to get skill recommendations
5. Click "💾 Save Resume" to save your resume
6. Click "📄 Export PDF" to download your resume as a PDF

### Using the API

#### Create a Resume
```bash
curl -X POST "http://localhost:8000/api/resumes" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_info": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "location": "New York, NY",
      "summary": "Experienced software engineer"
    },
    "experiences": [
      {
        "company": "Tech Corp",
        "position": "Software Engineer",
        "start_date": "2020-01",
        "end_date": "2023-12",
        "current": false,
        "description": "Developed web applications",
        "achievements": []
      }
    ],
    "education": [
      {
        "institution": "University",
        "degree": "Bachelor of Science",
        "field": "Computer Science",
        "start_date": "2016-09",
        "end_date": "2020-05"
      }
    ],
    "skills": ["Python", "JavaScript", "React"]
  }'
```

#### Enhance Text
```bash
curl -X POST "http://localhost:8000/api/enhance" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I worked on projects",
    "context": "work experience"
  }'
```

#### Export Resume as PDF
```bash
curl "http://localhost:8000/api/resumes/resume_1/export" \
  --output resume.pdf
```

## API Endpoints

- `GET /` - API information
- `POST /api/resumes` - Create a new resume
- `GET /api/resumes/{resume_id}` - Get a resume by ID
- `GET /api/resumes/{resume_id}/export` - Export resume as PDF
- `POST /api/enhance` - Enhance text with AI
- `POST /api/suggest-skills` - Get AI skill suggestions
- `GET /api/health` - Health check endpoint

## Project Structure

```
creerlio-platform/
├── main.py              # FastAPI application
├── models.py            # Pydantic data models
├── ai_service.py        # Azure OpenAI integration
├── pdf_generator.py     # PDF generation service
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables (Azure OpenAI credentials)
├── .gitignore          # Git ignore file
├── static/             # Frontend files
│   ├── index.html      # Main HTML page
│   ├── styles.css      # Styling
│   └── script.js       # JavaScript functionality
└── README.md           # This file
```

## Technologies Used

- **Backend**: FastAPI, Python 3.8+
- **AI**: Azure OpenAI (GPT-4)
- **PDF Generation**: ReportLab
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Data Validation**: Pydantic

## Features in Detail

### AI Enhancement
The platform uses Azure OpenAI's GPT-4 model to:
- Improve resume descriptions with professional language
- Make content more ATS-friendly
- Suggest action verbs and impactful phrasing

### Skill Suggestions
Based on your work experience and education, the AI analyzes your background and suggests relevant skills you might want to include.

### PDF Generation
Generate professional-looking PDF resumes with:
- Clean, modern design
- Proper formatting and spacing
- ATS-friendly layout

## Development

To contribute or modify the platform:

1. Make changes to the code
2. Test locally by running the server
3. Create a pull request with your changes

## License

Copyright © 2025 Creerlio Platform

## Support

For issues or questions, please open an issue on the GitHub repository.

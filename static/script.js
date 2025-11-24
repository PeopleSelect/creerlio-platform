// Global variables
let currentResumeId = null;
let experienceCount = 0;
let educationCount = 0;

// API base URL
const API_BASE = '';

// Initialize the form
document.addEventListener('DOMContentLoaded', function() {
    addExperience(); // Add one experience field by default
    addEducation(); // Add one education field by default
});

// Add experience section
function addExperience() {
    experienceCount++;
    const container = document.getElementById('experienceContainer');
    const experienceHTML = `
        <div class="experience-item" id="experience-${experienceCount}">
            <button type="button" class="remove-btn" onclick="removeElement('experience-${experienceCount}')">Remove</button>
            <div class="form-group">
                <label>Position *</label>
                <input type="text" name="exp-position-${experienceCount}" required>
            </div>
            <div class="form-group">
                <label>Company *</label>
                <input type="text" name="exp-company-${experienceCount}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date *</label>
                    <input type="month" name="exp-start-${experienceCount}" required>
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="month" name="exp-end-${experienceCount}" id="exp-end-${experienceCount}">
                </div>
            </div>
            <div class="form-group checkbox-group">
                <input type="checkbox" id="exp-current-${experienceCount}" name="exp-current-${experienceCount}" 
                       onchange="toggleEndDate('exp-end-${experienceCount}', this.checked)">
                <label for="exp-current-${experienceCount}">Currently working here</label>
            </div>
            <div class="form-group">
                <label>Description *</label>
                <textarea name="exp-description-${experienceCount}" rows="4" required></textarea>
                <button type="button" class="btn-secondary" onclick="enhanceText('exp-description-${experienceCount}', 'work experience')">
                    ✨ Enhance with AI
                </button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', experienceHTML);
}

// Add education section
function addEducation() {
    educationCount++;
    const container = document.getElementById('educationContainer');
    const educationHTML = `
        <div class="education-item" id="education-${educationCount}">
            <button type="button" class="remove-btn" onclick="removeElement('education-${educationCount}')">Remove</button>
            <div class="form-group">
                <label>Institution *</label>
                <input type="text" name="edu-institution-${educationCount}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Degree *</label>
                    <input type="text" name="edu-degree-${educationCount}" placeholder="Bachelor's, Master's, etc." required>
                </div>
                <div class="form-group">
                    <label>Field of Study *</label>
                    <input type="text" name="edu-field-${educationCount}" placeholder="Computer Science, etc." required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="month" name="edu-start-${educationCount}">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="month" name="edu-end-${educationCount}">
                </div>
            </div>
            <div class="form-group">
                <label>GPA (optional)</label>
                <input type="text" name="edu-gpa-${educationCount}" placeholder="3.8">
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', educationHTML);
}

// Remove element
function removeElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.remove();
    }
}

// Toggle end date field
function toggleEndDate(fieldId, isCurrent) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.disabled = isCurrent;
        if (isCurrent) {
            field.value = '';
        }
    }
}

// Enhance text with AI
async function enhanceText(fieldName, context) {
    const field = document.getElementsByName(fieldName)[0] || document.getElementById(fieldName);
    if (!field || !field.value.trim()) {
        showStatus('Please enter some text first', 'error');
        return;
    }

    const originalText = field.value;
    showStatus('Enhancing with AI...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/api/enhance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: originalText,
                context: context
            })
        });

        if (!response.ok) {
            throw new Error('Failed to enhance text');
        }

        const data = await response.json();
        field.value = data.enhanced;
        showStatus('Text enhanced successfully!', 'success');
    } catch (error) {
        console.error('Error:', error);
        showStatus('Failed to enhance text. Please try again.', 'error');
    }
}

// Suggest skills with AI
async function suggestSkills() {
    showStatus('Generating skill suggestions...', 'info');
    
    const resumeData = collectResumeData();
    if (!resumeData) return;

    try {
        const response = await fetch(`${API_BASE}/api/suggest-skills`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(resumeData)
        });

        if (!response.ok) {
            throw new Error('Failed to suggest skills');
        }

        const data = await response.json();
        const skillsField = document.getElementById('skills');
        const currentSkills = skillsField.value.trim();
        const suggestedSkills = data.suggested_skills.join(', ');
        
        if (currentSkills) {
            skillsField.value = currentSkills + ', ' + suggestedSkills;
        } else {
            skillsField.value = suggestedSkills;
        }
        
        showStatus('Skills suggested successfully!', 'success');
    } catch (error) {
        console.error('Error:', error);
        showStatus('Failed to suggest skills. Please try again.', 'error');
    }
}

// Collect resume data from form
function collectResumeData() {
    // Personal info
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    
    if (!fullName || !email) {
        showStatus('Please fill in required fields (Name and Email)', 'error');
        return null;
    }

    const personalInfo = {
        full_name: fullName,
        email: email,
        phone: document.getElementById('phone').value.trim() || null,
        location: document.getElementById('location').value.trim() || null,
        linkedin: document.getElementById('linkedin').value.trim() || null,
        website: document.getElementById('website').value.trim() || null,
        summary: document.getElementById('summary').value.trim() || null
    };

    // Experiences
    const experiences = [];
    for (let i = 1; i <= experienceCount; i++) {
        const position = document.getElementsByName(`exp-position-${i}`)[0];
        if (!position || !position.value) continue;

        const company = document.getElementsByName(`exp-company-${i}`)[0].value;
        const startDate = document.getElementsByName(`exp-start-${i}`)[0].value;
        const endDate = document.getElementsByName(`exp-end-${i}`)[0].value;
        const current = document.getElementsByName(`exp-current-${i}`)[0].checked;
        const description = document.getElementsByName(`exp-description-${i}`)[0].value;

        experiences.push({
            position: position.value,
            company: company,
            start_date: startDate,
            end_date: endDate || null,
            current: current,
            description: description,
            achievements: []
        });
    }

    // Education
    const education = [];
    for (let i = 1; i <= educationCount; i++) {
        const institution = document.getElementsByName(`edu-institution-${i}`)[0];
        if (!institution || !institution.value) continue;

        const degree = document.getElementsByName(`edu-degree-${i}`)[0].value;
        const field = document.getElementsByName(`edu-field-${i}`)[0].value;
        const startDate = document.getElementsByName(`edu-start-${i}`)[0].value;
        const endDate = document.getElementsByName(`edu-end-${i}`)[0].value;
        const gpa = document.getElementsByName(`edu-gpa-${i}`)[0].value;

        education.push({
            institution: institution.value,
            degree: degree,
            field: field,
            start_date: startDate || null,
            end_date: endDate || null,
            gpa: gpa || null
        });
    }

    // Skills
    const skillsText = document.getElementById('skills').value.trim();
    const skills = skillsText ? skillsText.split(',').map(s => s.trim()).filter(s => s) : [];

    return {
        personal_info: personalInfo,
        experiences: experiences,
        education: education,
        skills: skills
    };
}

// Save resume
async function saveResume() {
    const resumeData = collectResumeData();
    if (!resumeData) return;

    showStatus('Saving resume...', 'info');

    try {
        const response = await fetch(`${API_BASE}/api/resumes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(resumeData)
        });

        if (!response.ok) {
            throw new Error('Failed to save resume');
        }

        const data = await response.json();
        currentResumeId = data.id;
        
        // Enable export button
        document.getElementById('exportBtn').disabled = false;
        
        showStatus(`Resume saved successfully! ID: ${currentResumeId}`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showStatus('Failed to save resume. Please try again.', 'error');
    }
}

// Export PDF
async function exportPDF() {
    if (!currentResumeId) {
        showStatus('Please save the resume first', 'error');
        return;
    }

    showStatus('Generating PDF...', 'info');

    try {
        const response = await fetch(`${API_BASE}/api/resumes/${currentResumeId}/export`);
        
        if (!response.ok) {
            throw new Error('Failed to export PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentResumeId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showStatus('PDF exported successfully!', 'success');
    } catch (error) {
        console.error('Error:', error);
        showStatus('Failed to export PDF. Please try again.', 'error');
    }
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}

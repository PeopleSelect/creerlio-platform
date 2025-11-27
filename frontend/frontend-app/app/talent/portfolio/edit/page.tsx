'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { INDUSTRIES, AUSTRALIAN_CITIES, EMPLOYMENT_TYPES, SKILL_CATEGORIES, EDUCATION_LEVELS } from '@/lib/enums';

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  postalCode: string;
  linkedInUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
}

interface WorkExperience {
  id?: string;
  company: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  isCurrentRole: boolean;
  location: string;
  employmentType: string;
  achievements: string[];
  technologies: string[];
}

interface Education {
  id?: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
  description: string;
  honors: string[];
}

interface Skill {
  id?: string;
  name: string;
  category: string;
  proficiencyLevel: number;
  yearsOfExperience: number;
}

interface Certification {
  id?: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  credentialId: string;
  credentialUrl: string;
}

interface Award {
  id?: string;
  title: string;
  issuer: string;
  dateReceived: string;
  description: string;
}

export default function PortfolioEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile data
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    postalCode: '',
    linkedInUrl: '',
    githubUrl: '',
    websiteUrl: ''
  });

  // Experience, Education, etc.
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);

  // Form states
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [showAwardForm, setShowAwardForm] = useState(false);

  const [editingExperience, setEditingExperience] = useState<WorkExperience | null>(null);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null);
  const [editingAward, setEditingAward] = useState<Award | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    const storedUserId = localStorage.getItem('userId') || 'demo-user-123';

    if (!token || userType !== 'Talent') {
      router.push('/auth/login');
      return;
    }

    setUserId(storedUserId);
    loadProfile(storedUserId);
  }, [router]);

  const loadProfile = async (uid: string) => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/profile/${uid}`);
      
      if (response.ok) {
        const data = await response.json();
        
        setProfilePhoto(data.profileImageUrl || '');
        setHeadline(data.headline || '');
        setSummary(data.summary || '');
        
        if (data.personalInformation) {
          setPersonalInfo({
            firstName: data.personalInformation.firstName || '',
            lastName: data.personalInformation.lastName || '',
            email: data.personalInformation.email || '',
            phone: data.personalInformation.phone || '',
            city: data.personalInformation.city || '',
            state: data.personalInformation.state || '',
            postalCode: data.personalInformation.postalCode || '',
            linkedInUrl: data.personalInformation.linkedInUrl || '',
            githubUrl: data.personalInformation.githubUrl || '',
            websiteUrl: data.personalInformation.websiteUrl || ''
          });
        }
        
        setExperiences(data.workExperiences || []);
        setEducations(data.educations || []);
        setSkills(data.skills || []);
        setCertifications(data.certifications || []);
        setAwards(data.awards || []);
      } else if (response.status === 404) {
        // Profile doesn't exist, create one
        await createProfile(uid);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showMessage('error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (uid: string) => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          firstName: 'New',
          lastName: 'User',
          email: 'user@example.com',
          country: 'Australia'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPersonalInfo({
          firstName: data.personalInformation.firstName,
          lastName: data.personalInformation.lastName,
          email: data.personalInformation.email,
          phone: '',
          city: '',
          state: '',
          postalCode: '',
        });
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/profile/${userId}/photo`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfilePhoto(data.photoUrl);
        showMessage('success', 'Photo uploaded successfully');
      } else {
        showMessage('error', 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      showMessage('error', 'Failed to upload photo');
    }
  };

  const handlePhotoRemove = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/profile/${userId}/photo`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setProfilePhoto('');
        showMessage('success', 'Photo removed successfully');
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      showMessage('error', 'Failed to remove photo');
    }
  };

  // Profile Update
  const saveProfile = async () => {
    setSaving(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          summary,
          personalInfo
        })
      });

      if (response.ok) {
        showMessage('success', 'Profile saved successfully');
      } else {
        showMessage('error', 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showMessage('error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Resume Parser
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setSaving(true);
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/TalentOnboarding/parse-resume`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Auto-populate fields
        if (data.personalInfo) {
          setPersonalInfo(prev => ({
            ...prev,
            firstName: data.personalInfo.fullName?.split(' ')[0] || prev.firstName,
            lastName: data.personalInfo.fullName?.split(' ').slice(1).join(' ') || prev.lastName,
            email: data.personalInfo.email || prev.email,
            phone: data.personalInfo.phone || prev.phone,
            city: data.personalInfo.location || prev.city
          }));
          setHeadline(data.personalInfo.headline || headline);
          setSummary(data.personalInfo.summary || summary);
        }

        if (data.experience) {
          const newExperiences = data.experience.map((exp: any) => ({
            company: exp.company,
            title: exp.title,
            description: exp.description,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrentRole: exp.current,
            location: '',
            employmentType: 'Full-time',
            achievements: [],
            technologies: []
          }));
          setExperiences(prev => [...newExperiences, ...prev]);
        }

        if (data.education) {
          const newEducations = data.education.map((edu: any) => ({
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
            gpa: parseFloat(edu.gpa) || undefined,
            description: '',
            honors: []
          }));
          setEducations(prev => [...newEducations, ...prev]);
        }

        if (data.skills) {
          const newSkills = data.skills.map((skillName: string) => ({
            name: skillName,
            category: 'Technical',
            proficiencyLevel: 3,
            yearsOfExperience: 1
          }));
          setSkills(prev => [...newSkills, ...prev]);
        }

        if (data.certifications) {
          const newCerts = data.certifications.map((cert: any) => ({
            name: cert.name,
            issuingOrganization: cert.issuer,
            issueDate: cert.date,
            expiryDate: undefined,
            credentialId: '',
            credentialUrl: cert.url || ''
          }));
          setCertifications(prev => [...newCerts, ...prev]);
        }

        showMessage('success', 'Resume parsed successfully! Review and save your data.');
      } else {
        showMessage('error', 'Failed to parse resume');
      }
    } catch (error) {
      console.error('Error parsing resume:', error);
      showMessage('error', 'Failed to parse resume');
    } finally {
      setSaving(false);
    }
  };

  // Experience CRUD
  const saveExperience = async (experience: WorkExperience) => {
    try {
      const apiBase = getApiBaseUrl();
      const url = experience.id 
        ? `${apiBase}/api/talent/experience/${experience.id}`
        : `${apiBase}/api/talent/profile/${userId}/experience`;
      
      const response = await fetch(url, {
        method: experience.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(experience)
      });

      if (response.ok) {
        const saved = await response.json();
        if (experience.id) {
          setExperiences(prev => prev.map(e => e.id === experience.id ? saved : e));
        } else {
          setExperiences(prev => [...prev, saved]);
        }
        setShowExperienceForm(false);
        setEditingExperience(null);
        showMessage('success', 'Experience saved successfully');
      }
    } catch (error) {
      console.error('Error saving experience:', error);
      showMessage('error', 'Failed to save experience');
    }
  };

  const deleteExperience = async (id: string) => {
    if (!confirm('Delete this experience?')) return;

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/experience/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setExperiences(prev => prev.filter(e => e.id !== id));
        showMessage('success', 'Experience deleted');
      }
    } catch (error) {
      console.error('Error deleting experience:', error);
      showMessage('error', 'Failed to delete experience');
    }
  };

  // Education CRUD
  const saveEducation = async (education: Education) => {
    try {
      const apiBase = getApiBaseUrl();
      const url = education.id 
        ? `${apiBase}/api/talent/education/${education.id}`
        : `${apiBase}/api/talent/profile/${userId}/education`;
      
      const response = await fetch(url, {
        method: education.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(education)
      });

      if (response.ok) {
        const saved = await response.json();
        if (education.id) {
          setEducations(prev => prev.map(e => e.id === education.id ? saved : e));
        } else {
          setEducations(prev => [...prev, saved]);
        }
        setShowEducationForm(false);
        setEditingEducation(null);
        showMessage('success', 'Education saved successfully');
      }
    } catch (error) {
      console.error('Error saving education:', error);
      showMessage('error', 'Failed to save education');
    }
  };

  const deleteEducation = async (id: string) => {
    if (!confirm('Delete this education?')) return;

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/education/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEducations(prev => prev.filter(e => e.id !== id));
        showMessage('success', 'Education deleted');
      }
    } catch (error) {
      console.error('Error deleting education:', error);
      showMessage('error', 'Failed to delete education');
    }
  };

  // Skill CRUD
  const saveSkill = async (skill: Skill) => {
    try {
      const apiBase = getApiBaseUrl();
      const url = skill.id 
        ? `${apiBase}/api/talent/skills/${skill.id}`
        : `${apiBase}/api/talent/profile/${userId}/skills`;
      
      const response = await fetch(url, {
        method: skill.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skill)
      });

      if (response.ok) {
        const saved = await response.json();
        if (skill.id) {
          setSkills(prev => prev.map(s => s.id === skill.id ? saved : s));
        } else {
          setSkills(prev => [...prev, saved]);
        }
        setShowSkillForm(false);
        setEditingSkill(null);
        showMessage('success', 'Skill saved successfully');
      }
    } catch (error) {
      console.error('Error saving skill:', error);
      showMessage('error', 'Failed to save skill');
    }
  };

  const deleteSkill = async (id: string) => {
    if (!confirm('Delete this skill?')) return;

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/skills/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSkills(prev => prev.filter(s => s.id !== id));
        showMessage('success', 'Skill deleted');
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
      showMessage('error', 'Failed to delete skill');
    }
  };

  // Certification CRUD
  const saveCertification = async (certification: Certification) => {
    try {
      const apiBase = getApiBaseUrl();
      const url = certification.id 
        ? `${apiBase}/api/talent/certifications/${certification.id}`
        : `${apiBase}/api/talent/profile/${userId}/certifications`;
      
      const response = await fetch(url, {
        method: certification.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certification)
      });

      if (response.ok) {
        const saved = await response.json();
        if (certification.id) {
          setCertifications(prev => prev.map(c => c.id === certification.id ? saved : c));
        } else {
          setCertifications(prev => [...prev, saved]);
        }
        setShowCertificationForm(false);
        setEditingCertification(null);
        showMessage('success', 'Certification saved successfully');
      }
    } catch (error) {
      console.error('Error saving certification:', error);
      showMessage('error', 'Failed to save certification');
    }
  };

  const deleteCertification = async (id: string) => {
    if (!confirm('Delete this certification?')) return;

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/certifications/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCertifications(prev => prev.filter(c => c.id !== id));
        showMessage('success', 'Certification deleted');
      }
    } catch (error) {
      console.error('Error deleting certification:', error);
      showMessage('error', 'Failed to delete certification');
    }
  };

  // Award CRUD
  const saveAward = async (award: Award) => {
    try {
      const apiBase = getApiBaseUrl();
      const url = award.id 
        ? `${apiBase}/api/talent/awards/${award.id}`
        : `${apiBase}/api/talent/profile/${userId}/awards`;
      
      const response = await fetch(url, {
        method: award.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(award)
      });

      if (response.ok) {
        const saved = await response.json();
        if (award.id) {
          setAwards(prev => prev.map(a => a.id === award.id ? saved : a));
        } else {
          setAwards(prev => [...prev, saved]);
        }
        setShowAwardForm(false);
        setEditingAward(null);
        showMessage('success', 'Award saved successfully');
      }
    } catch (error) {
      console.error('Error saving award:', error);
      showMessage('error', 'Failed to save award');
    }
  };

  const deleteAward = async (id: string) => {
    if (!confirm('Delete this award?')) return;

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/talent/awards/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAwards(prev => prev.filter(a => a.id !== id));
        showMessage('success', 'Award deleted');
      }
    } catch (error) {
      console.error('Error deleting award:', error);
      showMessage('error', 'Failed to delete award');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/talent/dashboard')} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">C</span>
                </div>
                <span className="text-lg font-serif text-gray-900">Creerlio</span>
              </button>
              <span className="text-gray-400">|</span>
              <span className="text-gray-700 font-medium">Edit Portfolio</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Save All Changes'}
              </button>
              <button 
                onClick={() => router.push('/talent/portfolio')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Success/Error Messages */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'profile', label: '👤 Profile', icon: '👤' },
                { id: 'experience', label: '💼 Experience', icon: '💼' },
                { id: 'education', label: '🎓 Education', icon: '🎓' },
                { id: 'skills', label: '⚡ Skills', icon: '⚡' },
                { id: 'certifications', label: '🏆 Certifications', icon: '🏆' },
                { id: 'awards', label: '🏅 Awards', icon: '🏅' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Quick Import */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Quick Import (AI-Powered)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload Resume</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                      />
                      <p className="mt-1 text-xs text-gray-500">AI will parse and auto-fill your profile</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Import from LinkedIn</label>
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        Connect LinkedIn
                      </button>
                      <p className="mt-1 text-xs text-gray-500">Import your LinkedIn profile data</p>
                    </div>
                  </div>
                </div>

                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                      {profilePhoto ? (
                        <img src={`${getApiBaseUrl()}${profilePhoto}`} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                          👤
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700"
                      />
                      {profilePhoto && (
                        <button
                          onClick={handlePhotoRemove}
                          className="mt-2 text-sm text-red-600 hover:text-red-800"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={personalInfo.firstName}
                      onChange={(e) => setPersonalInfo({...personalInfo, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={personalInfo.lastName}
                      onChange={(e) => setPersonalInfo({...personalInfo, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={personalInfo.city}
                      onChange={(e) => setPersonalInfo({...personalInfo, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={personalInfo.state}
                      onChange={(e) => setPersonalInfo({...personalInfo, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={personalInfo.postalCode}
                      onChange={(e) => setPersonalInfo({...personalInfo, postalCode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Headline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g., Senior Software Engineer | Full-Stack Developer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* About/Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About / Summary</label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={6}
                    placeholder="Tell us about yourself, your experience, and what you're looking for..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={personalInfo.linkedInUrl}
                      onChange={(e) => setPersonalInfo({...personalInfo, linkedInUrl: e.target.value})}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                    <input
                      type="url"
                      value={personalInfo.githubUrl}
                      onChange={(e) => setPersonalInfo({...personalInfo, githubUrl: e.target.value})}
                      placeholder="https://github.com/yourusername"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                    <input
                      type="url"
                      value={personalInfo.websiteUrl}
                      onChange={(e) => setPersonalInfo({...personalInfo, websiteUrl: e.target.value})}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* EXPERIENCE TAB */}
            {activeTab === 'experience' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
                  <button
                    onClick={() => {
                      setEditingExperience({
                        company: '',
                        title: '',
                        description: '',
                        startDate: '',
                        isCurrentRole: false,
                        location: '',
                        employmentType: 'Full-time',
                        achievements: [],
                        technologies: []
                      });
                      setShowExperienceForm(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                  >
                    + Add Experience
                  </button>
                </div>

                {experiences.length === 0 && !showExperienceForm && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">No experience added yet</p>
                    <button
                      onClick={() => {
                        setEditingExperience({
                          company: '',
                          title: '',
                          description: '',
                          startDate: '',
                          isCurrentRole: false,
                          location: '',
                          employmentType: 'Full-time',
                          achievements: [],
                          technologies: []
                        });
                        setShowExperienceForm(true);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    >
                      Add your first position
                    </button>
                  </div>
                )}

                {experiences.map((exp) => (
                  <div key={exp.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                        <p className="text-gray-600">{exp.company}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(exp.startDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })} - 
                          {exp.isCurrentRole ? ' Present' : new Date(exp.endDate!).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-gray-700 mt-2">{exp.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingExperience(exp);
                            setShowExperienceForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteExperience(exp.id!)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {showExperienceForm && editingExperience && (
                  <ExperienceForm
                    experience={editingExperience}
                    onSave={saveExperience}
                    onCancel={() => {
                      setShowExperienceForm(false);
                      setEditingExperience(null);
                    }}
                  />
                )}
              </div>
            )}

            {/* EDUCATION TAB */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                  <button
                    onClick={() => {
                      setEditingEducation({
                        institution: '',
                        degree: '',
                        field: '',
                        startDate: '',
                        description: '',
                        honors: []
                      });
                      setShowEducationForm(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                  >
                    + Add Education
                  </button>
                </div>

                {educations.length === 0 && !showEducationForm && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">No education added yet</p>
                    <button
                      onClick={() => {
                        setEditingEducation({
                          institution: '',
                          degree: '',
                          field: '',
                          startDate: '',
                          description: '',
                          honors: []
                        });
                        setShowEducationForm(true);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    >
                      Add your education
                    </button>
                  </div>
                )}

                {educations.map((edu) => (
                  <div key={edu.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                        <p className="text-gray-600">{edu.institution}</p>
                        <p className="text-sm text-gray-500 mt-1">{edu.field}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(edu.startDate).getFullYear()} - 
                          {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
                        </p>
                        {edu.gpa && <p className="text-sm text-gray-500">GPA: {edu.gpa}</p>}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingEducation(edu);
                            setShowEducationForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteEducation(edu.id!)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {showEducationForm && editingEducation && (
                  <EducationForm
                    education={editingEducation}
                    onSave={saveEducation}
                    onCancel={() => {
                      setShowEducationForm(false);
                      setEditingEducation(null);
                    }}
                  />
                )}
              </div>
            )}

            {/* SKILLS TAB */}
            {activeTab === 'skills' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Skills</h3>
                  <button
                    onClick={() => {
                      setEditingSkill({
                        name: '',
                        category: 'Technical Skills',
                        proficiencyLevel: 3,
                        yearsOfExperience: 1
                      });
                      setShowSkillForm(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                  >
                    + Add Skill
                  </button>
                </div>

                {skills.length === 0 && !showSkillForm && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">No skills added yet</p>
                    <button
                      onClick={() => {
                        setEditingSkill({
                          name: '',
                          category: 'Technical Skills',
                          proficiencyLevel: 3,
                          yearsOfExperience: 1
                        });
                        setShowSkillForm(true);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    >
                      Add your first skill
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills.map((skill) => (
                    <div key={skill.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{skill.name}</h4>
                          <p className="text-sm text-gray-500">{skill.category}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingSkill(skill);
                              setShowSkillForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteSkill(skill.id!)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500">Level:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-amber-600 h-2 rounded-full" 
                            style={{ width: `${(skill.proficiencyLevel / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{skill.proficiencyLevel}/5</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{skill.yearsOfExperience} years experience</p>
                    </div>
                  ))}
                </div>

                {showSkillForm && editingSkill && (
                  <SkillForm
                    skill={editingSkill}
                    onSave={saveSkill}
                    onCancel={() => {
                      setShowSkillForm(false);
                      setEditingSkill(null);
                    }}
                  />
                )}
              </div>
            )}

            {/* CERTIFICATIONS TAB */}
            {activeTab === 'certifications' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
                  <button
                    onClick={() => {
                      setEditingCertification({
                        name: '',
                        issuingOrganization: '',
                        issueDate: '',
                        credentialId: '',
                        credentialUrl: ''
                      });
                      setShowCertificationForm(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                  >
                    + Add Certification
                  </button>
                </div>

                {certifications.length === 0 && !showCertificationForm && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">No certifications added yet</p>
                    <button
                      onClick={() => {
                        setEditingCertification({
                          name: '',
                          issuingOrganization: '',
                          issueDate: '',
                          credentialId: '',
                          credentialUrl: ''
                        });
                        setShowCertificationForm(true);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    >
                      Add your first certification
                    </button>
                  </div>
                )}

                {certifications.map((cert) => (
                  <div key={cert.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                        <p className="text-gray-600">{cert.issuingOrganization}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Issued: {new Date(cert.issueDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                        </p>
                        {cert.expiryDate && (
                          <p className="text-sm text-gray-500">
                            Expires: {new Date(cert.expiryDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {cert.credentialId && (
                          <p className="text-xs text-gray-500 mt-1">ID: {cert.credentialId}</p>
                        )}
                        {cert.credentialUrl && (
                          <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            View Credential
                          </a>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingCertification(cert);
                            setShowCertificationForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteCertification(cert.id!)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {showCertificationForm && editingCertification && (
                  <CertificationForm
                    certification={editingCertification}
                    onSave={saveCertification}
                    onCancel={() => {
                      setShowCertificationForm(false);
                      setEditingCertification(null);
                    }}
                  />
                )}
              </div>
            )}

            {/* AWARDS TAB */}
            {activeTab === 'awards' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Awards & Recognition</h3>
                  <button
                    onClick={() => {
                      setEditingAward({
                        title: '',
                        issuer: '',
                        dateReceived: '',
                        description: ''
                      });
                      setShowAwardForm(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                  >
                    + Add Award
                  </button>
                </div>

                {awards.length === 0 && !showAwardForm && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">No awards added yet</p>
                    <button
                      onClick={() => {
                        setEditingAward({
                          title: '',
                          issuer: '',
                          dateReceived: '',
                          description: ''
                        });
                        setShowAwardForm(true);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    >
                      Add your first award
                    </button>
                  </div>
                )}

                {awards.map((award) => (
                  <div key={award.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{award.title}</h4>
                        <p className="text-gray-600">{award.issuer}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(award.dateReceived).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
                        </p>
                        {award.description && (
                          <p className="text-gray-700 mt-2">{award.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingAward(award);
                            setShowAwardForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteAward(award.id!)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {showAwardForm && editingAward && (
                  <AwardForm
                    award={editingAward}
                    onSave={saveAward}
                    onCancel={() => {
                      setShowAwardForm(false);
                      setEditingAward(null);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== FORM COMPONENTS ====================

// Experience Form Component
function ExperienceForm({ 
  experience, 
  onSave, 
  onCancel 
}: { 
  experience: WorkExperience; 
  onSave: (exp: WorkExperience) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(experience);

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-6">
      <h4 className="font-semibold text-gray-900 mb-4">
        {experience.id ? 'Edit Experience' : 'Add New Experience'}
      </h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
            <select
              value={formData.employmentType}
              onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {EMPLOYMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              disabled={formData.isCurrentRole}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isCurrentRole}
            onChange={(e) => setFormData({...formData, isCurrentRole: e.target.checked, endDate: e.target.checked ? undefined : formData.endDate})}
            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            I currently work here
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Describe your role and responsibilities..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Save Experience
          </button>
        </div>
      </div>
    </div>
  );
}

// Education Form Component
function EducationForm({
  education,
  onSave,
  onCancel
}: {
  education: Education;
  onSave: (edu: Education) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(education);
  const { DEGREE_TYPES, AUSTRALIAN_UNIVERSITIES } = require('@/lib/enums');

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-6">
      <h4 className="font-semibold text-gray-900 mb-4">
        {education.id ? 'Edit Education' : 'Add New Education'}
      </h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution *</label>
            <select
              value={formData.institution}
              onChange={(e) => setFormData({...formData, institution: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select Institution</option>
              {AUSTRALIAN_UNIVERSITIES.map((uni: string) => (
                <option key={uni} value={uni}>{uni}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Degree *</label>
            <select
              value={formData.degree}
              onChange={(e) => setFormData({...formData, degree: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select Degree</option>
              {DEGREE_TYPES.map((deg: string) => (
                <option key={deg} value={deg}>{deg}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study *</label>
            <input
              type="text"
              value={formData.field}
              onChange={(e) => setFormData({...formData, field: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Computer Science"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GPA (Optional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="7"
              value={formData.gpa || ''}
              onChange={(e) => setFormData({...formData, gpa: parseFloat(e.target.value) || undefined})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., 3.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Additional details about your studies..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Save Education
          </button>
        </div>
      </div>
    </div>
  );
}

// Skill Form Component
function SkillForm({
  skill,
  onSave,
  onCancel
}: {
  skill: Skill;
  onSave: (skill: Skill) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(skill);
  const { SKILL_CATEGORIES } = require('@/lib/enums');

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-6">
      <h4 className="font-semibold text-gray-900 mb-4">
        {skill.id ? 'Edit Skill' : 'Add New Skill'}
      </h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., JavaScript, Project Management"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              {SKILL_CATEGORIES.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proficiency Level (1-5) *</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="5"
                value={formData.proficiencyLevel}
                onChange={(e) => setFormData({...formData, proficiencyLevel: parseInt(e.target.value)})}
                className="flex-1"
              />
              <span className="w-12 text-center font-semibold text-amber-600">{formData.proficiencyLevel}/5</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert, 5=Master
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience *</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={formData.yearsOfExperience}
              onChange={(e) => setFormData({...formData, yearsOfExperience: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Save Skill
          </button>
        </div>
      </div>
    </div>
  );
}

// Certification Form Component
function CertificationForm({
  certification,
  onSave,
  onCancel
}: {
  certification: Certification;
  onSave: (cert: Certification) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(certification);

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-6">
      <h4 className="font-semibold text-gray-900 mb-4">
        {certification.id ? 'Edit Certification' : 'Add New Certification'}
      </h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certification Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., AWS Certified Solutions Architect"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Organization *</label>
            <input
              type="text"
              value={formData.issuingOrganization}
              onChange={(e) => setFormData({...formData, issuingOrganization: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Amazon Web Services"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
            <input
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (if applicable)</label>
            <input
              type="date"
              value={formData.expiryDate || ''}
              onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
            <input
              type="text"
              value={formData.credentialId}
              onChange={(e) => setFormData({...formData, credentialId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Verification code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credential URL</label>
            <input
              type="url"
              value={formData.credentialUrl}
              onChange={(e) => setFormData({...formData, credentialUrl: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Save Certification
          </button>
        </div>
      </div>
    </div>
  );
}

// Award Form Component
function AwardForm({
  award,
  onSave,
  onCancel
}: {
  award: Award;
  onSave: (award: Award) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(award);

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-6">
      <h4 className="font-semibold text-gray-900 mb-4">
        {award.id ? 'Edit Award' : 'Add New Award'}
      </h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Award Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Employee of the Year"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issuer *</label>
            <input
              type="text"
              value={formData.issuer}
              onChange={(e) => setFormData({...formData, issuer: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Organization that issued the award"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Received *</label>
            <input
              type="date"
              value={formData.dateReceived}
              onChange={(e) => setFormData({...formData, dateReceived: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Describe what this award was for..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Save Award
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TalentProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  // Mock comprehensive profile data matching all 11 entities
  const profile = {
    headline: 'Senior Software Engineer | Full Stack Developer',
    summary: 'Passionate software engineer with 8+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud technologies. Strong focus on clean code, testing, and mentoring junior developers.',
    profileImageUrl: '',
    
    personalInformation: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+61 412 345 678',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia',
      postalCode: '2000',
      linkedInUrl: 'https://linkedin.com/in/sarahjohnson',
      gitHubUrl: 'https://github.com/sarahjohnson',
      websiteUrl: 'https://sarahjohnson.dev',
      dateOfBirth: '1990-05-15'
    },
    
    workExperiences: [
      {
        company: 'TechCorp Australia',
        title: 'Senior Software Engineer',
        description: 'Led development of cloud-native applications serving 500K+ users. Architected microservices using Node.js and AWS. Mentored team of 5 junior developers.',
        startDate: '2020-01-15',
        endDate: null,
        isCurrentRole: true,
        location: 'Sydney, NSW',
        employmentType: 'Full-time',
        achievements: [
          'Reduced API response time by 40% through optimization',
          'Implemented CI/CD pipeline reducing deployment time by 60%',
          'Led migration to microservices architecture'
        ],
        technologies: ['React', 'Node.js', 'AWS', 'Docker', 'Kubernetes']
      },
      {
        company: 'StartupXYZ',
        title: 'Full Stack Developer',
        description: 'Built customer-facing applications from scratch. Worked across entire stack from database design to frontend implementation.',
        startDate: '2017-03-01',
        endDate: '2019-12-31',
        isCurrentRole: false,
        location: 'Melbourne, VIC',
        employmentType: 'Full-time',
        achievements: [
          'Developed MVP that secured $2M Series A funding',
          'Built real-time notification system handling 10K+ events/day'
        ],
        technologies: ['React', 'Express', 'MongoDB', 'Redis']
      },
      {
        company: 'Digital Agency Co',
        title: 'Junior Developer',
        description: 'Developed client websites and web applications. Collaborated with designers and project managers.',
        startDate: '2015-06-01',
        endDate: '2017-02-28',
        isCurrentRole: false,
        location: 'Brisbane, QLD',
        employmentType: 'Full-time',
        achievements: [
          'Delivered 15+ client projects on time and within budget',
          'Implemented responsive designs for mobile-first approach'
        ],
        technologies: ['HTML', 'CSS', 'JavaScript', 'PHP', 'WordPress']
      }
    ],
    
    educations: [
      {
        institution: 'University of Sydney',
        degree: 'Bachelor of Computer Science',
        field: 'Software Engineering',
        startDate: '2011-02-01',
        endDate: '2014-12-01',
        gpa: 3.8,
        description: 'Focused on software architecture, algorithms, and distributed systems.',
        honors: ['Dean\'s List', 'University Medal', 'Best Software Project Award']
      },
      {
        institution: 'General Assembly',
        degree: 'Certificate',
        field: 'Advanced React Development',
        startDate: '2019-01-01',
        endDate: '2019-03-01',
        gpa: null,
        description: 'Intensive bootcamp covering React hooks, context, performance optimization.',
        honors: []
      }
    ],
    
    skills: [
      { name: 'React', category: 'Technical', proficiencyLevel: 5, yearsOfExperience: 7, endorsementCount: 45, lastUsed: '2025-11-20' },
      { name: 'Node.js', category: 'Technical', proficiencyLevel: 5, yearsOfExperience: 6, endorsementCount: 38, lastUsed: '2025-11-20' },
      { name: 'TypeScript', category: 'Technical', proficiencyLevel: 4, yearsOfExperience: 5, endorsementCount: 32, lastUsed: '2025-11-20' },
      { name: 'AWS', category: 'Technical', proficiencyLevel: 4, yearsOfExperience: 4, endorsementCount: 28, lastUsed: '2025-11-19' },
      { name: 'Docker', category: 'Technical', proficiencyLevel: 4, yearsOfExperience: 3, endorsementCount: 22, lastUsed: '2025-11-18' },
      { name: 'Leadership', category: 'Soft', proficiencyLevel: 4, yearsOfExperience: 3, endorsementCount: 18, lastUsed: '2025-11-20' },
      { name: 'Communication', category: 'Soft', proficiencyLevel: 5, yearsOfExperience: 8, endorsementCount: 25, lastUsed: '2025-11-20' },
      { name: 'Problem Solving', category: 'Soft', proficiencyLevel: 5, yearsOfExperience: 8, endorsementCount: 30, lastUsed: '2025-11-20' }
    ],
    
    certifications: [
      {
        name: 'AWS Certified Solutions Architect',
        issuingOrganization: 'Amazon Web Services',
        issueDate: '2023-06-15',
        expiryDate: '2026-06-15',
        credentialId: 'AWS-SA-2023-12345',
        credentialUrl: 'https://aws.amazon.com/verification',
        isVerified: true
      },
      {
        name: 'Professional Scrum Master I',
        issuingOrganization: 'Scrum.org',
        issueDate: '2022-03-20',
        expiryDate: null,
        credentialId: 'PSM-2022-67890',
        credentialUrl: 'https://scrum.org/verification',
        isVerified: true
      }
    ],
    
    portfolioItems: [
      {
        title: 'E-Commerce Platform',
        description: 'Built scalable e-commerce platform handling 10K+ daily transactions. Features include real-time inventory, payment processing, and order tracking.',
        type: 'Project',
        url: 'https://github.com/sarahjohnson/ecommerce-platform',
        images: ['/portfolio/ecommerce-1.jpg', '/portfolio/ecommerce-2.jpg'],
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'AWS'],
        completionDate: '2024-08-15',
        displayOrder: 1
      },
      {
        title: 'Real-Time Analytics Dashboard',
        description: 'Enterprise analytics dashboard with real-time data visualization. Processes millions of events per day.',
        type: 'Project',
        url: 'https://github.com/sarahjohnson/analytics-dashboard',
        images: ['/portfolio/analytics-1.jpg'],
        technologies: ['React', 'D3.js', 'WebSocket', 'Redis', 'ClickHouse'],
        completionDate: '2024-03-20',
        displayOrder: 2
      },
      {
        title: 'Modern Web Development Best Practices',
        description: 'Conference talk on scalable React architecture and performance optimization.',
        type: 'Presentation',
        url: 'https://slides.com/sarahjohnson/web-best-practices',
        images: [],
        technologies: [],
        completionDate: '2024-11-05',
        displayOrder: 3
      }
    ],
    
    awards: [
      {
        title: 'Developer of the Year',
        issuer: 'TechCorp Australia',
        dateReceived: '2024-12-01',
        description: 'Recognized for outstanding contributions to engineering excellence and team leadership.'
      },
      {
        title: 'Best Software Project Award',
        issuer: 'University of Sydney',
        dateReceived: '2014-11-15',
        description: 'Awarded for final year capstone project on distributed systems.'
      }
    ],
    
    references: [
      {
        name: 'Michael Anderson',
        title: 'Engineering Manager',
        company: 'TechCorp Australia',
        email: 'michael.anderson@techcorp.com',
        phone: '+61 412 987 654',
        relationship: 'Direct Manager',
        testimonial: 'Sarah is an exceptional engineer with strong technical skills and leadership abilities. She consistently delivers high-quality work and mentors junior team members effectively.',
        isVerified: true,
        verifiedAt: '2024-10-15'
      },
      {
        name: 'Jennifer Lee',
        title: 'CTO',
        company: 'StartupXYZ',
        email: 'jennifer.lee@startupxyz.com',
        phone: '+61 413 456 789',
        relationship: 'Former Supervisor',
        testimonial: 'One of the best developers I\'ve worked with. Sarah played a crucial role in building our platform from the ground up.',
        isVerified: true,
        verifiedAt: '2024-09-20'
      }
    ],
    
    careerPreferences: {
      preferredRoles: ['Senior Software Engineer', 'Tech Lead', 'Engineering Manager'],
      preferredIndustries: ['Technology', 'FinTech', 'SaaS'],
      preferredLocations: ['Sydney', 'Melbourne', 'Remote'],
      workModel: 'Hybrid',
      preferredEmploymentTypes: ['Full-time', 'Contract'],
      expectedSalary: 150000,
      currency: 'AUD',
      openToRelocation: false,
      openToRemote: true,
      availableFrom: '2025-12-01',
      noticePeriod: '4 weeks'
    },
    
    privacySettings: {
      showEmail: true,
      showPhone: false,
      showLocation: true,
      showSalaryExpectations: false,
      allowContactFromRecruiters: true,
      showProfileInSearch: true
    },
    
    verificationStatus: {
      emailVerified: true,
      phoneVerified: true,
      identityVerified: true,
      backgroundCheckCompleted: true,
      lastVerificationDate: '2024-11-01',
      verificationScore: 95
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-5xl font-bold text-amber-700">SJ</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  {profile.personalInformation.firstName} {profile.personalInformation.lastName}
                </h1>
                <p className="text-xl text-gray-600 mt-2">{profile.headline}</p>
                <div className="flex gap-4 mt-4 text-sm text-gray-600">
                  <span>📍 {profile.personalInformation.city}, {profile.personalInformation.state}</span>
                  {profile.privacySettings.showEmail && (
                    <span>✉️ {profile.personalInformation.email}</span>
                  )}
                  {profile.privacySettings.showPhone && (
                    <span>📱 {profile.personalInformation.phone}</span>
                  )}
                </div>
                <div className="flex gap-3 mt-4">
                  {profile.personalInformation.linkedInUrl && (
                    <a href={profile.personalInformation.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">LinkedIn</a>
                  )}
                  {profile.personalInformation.gitHubUrl && (
                    <a href={profile.personalInformation.gitHubUrl} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900">GitHub</a>
                  )}
                  {profile.personalInformation.websiteUrl && (
                    <a href={profile.personalInformation.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700">Website</a>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/talent/profile/edit')}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
            >
              Edit Profile
            </button>
          </div>
          
          {/* Verification Badge */}
          {profile.verificationStatus.verificationScore >= 80 && (
            <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg w-fit">
              <span className="text-green-600">✓</span>
              <span className="text-sm font-medium text-green-800">Verified Profile ({profile.verificationStatus.verificationScore}% verified)</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Professional Summary</h2>
          <p className="text-gray-700 leading-relaxed">{profile.summary}</p>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Skills</h2>
          <div className="space-y-6">
            {/* Technical Skills */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Technical Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.skills.filter(s => s.category === 'Technical').map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{skill.name}</span>
                        <span className="text-sm text-gray-500">{skill.yearsOfExperience} years</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-600 rounded-full"
                            style={{ width: `${(skill.proficiencyLevel / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{skill.endorsementCount} endorsements</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Soft Skills */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Soft Skills</h3>
              <div className="flex flex-wrap gap-3">
                {profile.skills.filter(s => s.category === 'Soft').map((skill, idx) => (
                  <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                    {skill.name} ({skill.endorsementCount})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Work Experience */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Work Experience</h2>
          <div className="space-y-8">
            {profile.workExperiences.map((exp, idx) => (
              <div key={idx} className="relative pl-8 border-l-2 border-gray-200">
                <div className="absolute -left-2 top-0 w-4 h-4 bg-amber-600 rounded-full" />
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{exp.title}</h3>
                    <p className="text-lg text-gray-700 mt-1">{exp.company}</p>
                  </div>
                  {exp.isCurrentRole && (
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">Current</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
                  {' '} • {exp.location} • {exp.employmentType}
                </p>
                <p className="text-gray-700 mb-3">{exp.description}</p>
                {exp.achievements.length > 0 && (
                  <div className="mb-3">
                    <p className="font-medium text-gray-800 mb-2">Key Achievements:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {exp.achievements.map((achievement, i) => (
                        <li key={i}>{achievement}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {exp.technologies.map((tech, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Education</h2>
          <div className="space-y-6">
            {profile.educations.map((edu, idx) => (
              <div key={idx} className="border-l-2 border-amber-600 pl-6">
                <h3 className="text-xl font-bold text-gray-900">{edu.degree}</h3>
                <p className="text-lg text-gray-700 mt-1">{edu.institution}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {edu.field} • {new Date(edu.startDate).getFullYear()} - {new Date(edu.endDate).getFullYear()}
                  {edu.gpa && <span> • GPA: {edu.gpa}</span>}
                </p>
                {edu.description && (
                  <p className="text-gray-700 mt-2">{edu.description}</p>
                )}
                {edu.honors.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {edu.honors.map((honor, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                        🏆 {honor}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Certifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.certifications.map((cert, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{cert.name}</h3>
                  {cert.isVerified && (
                    <span className="text-green-600 text-xl">✓</span>
                  )}
                </div>
                <p className="text-gray-700 mb-2">{cert.issuingOrganization}</p>
                <p className="text-sm text-gray-600">
                  Issued {new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  {cert.expiryDate && <span> • Expires {new Date(cert.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                </p>
                {cert.credentialUrl && (
                  <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 text-sm mt-2 inline-block">
                    View Credential →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio</h2>
          <div className="space-y-6">
            {profile.portfolioItems.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                    <span className="text-sm text-gray-500">{item.type}</span>
                  </div>
                  {item.completionDate && (
                    <span className="text-sm text-gray-600">
                      {new Date(item.completionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 mb-4">{item.description}</p>
                {item.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.technologies.map((tech, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 font-medium">
                    View Project →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Awards */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Awards & Recognition</h2>
          <div className="space-y-4">
            {profile.awards.map((award, idx) => (
              <div key={idx} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                <div className="text-3xl">🏆</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{award.title}</h3>
                  <p className="text-gray-700 mt-1">{award.issuer}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(award.dateReceived).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-gray-700 mt-2">{award.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* References */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">References</h2>
          <div className="space-y-6">
            {profile.references.map((ref, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{ref.name}</h3>
                    <p className="text-gray-700 mt-1">{ref.title} at {ref.company}</p>
                    <p className="text-sm text-gray-600 mt-1">{ref.relationship}</p>
                  </div>
                  {ref.isVerified && (
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">Verified</span>
                  )}
                </div>
                <p className="text-gray-700 italic bg-gray-50 p-4 rounded-lg mt-3">
                  "{ref.testimonial}"
                </p>
                {ref.verifiedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Verified on {new Date(ref.verifiedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Career Preferences */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Career Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Preferred Roles</h3>
              <div className="flex flex-wrap gap-2">
                {profile.careerPreferences.preferredRoles.map((role, i) => (
                  <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Industries</h3>
              <div className="flex flex-wrap gap-2">
                {profile.careerPreferences.preferredIndustries.map((industry, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {industry}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Locations</h3>
              <div className="flex flex-wrap gap-2">
                {profile.careerPreferences.preferredLocations.map((location, i) => (
                  <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                    {location}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Work Model</h3>
              <p className="text-gray-700">{profile.careerPreferences.workModel}</p>
              <p className="text-sm text-gray-600 mt-1">
                {profile.careerPreferences.openToRemote && '✓ Open to remote work'}
              </p>
            </div>
            {profile.privacySettings.showSalaryExpectations && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Salary Expectation</h3>
                <p className="text-gray-700">
                  {profile.careerPreferences.currency} ${profile.careerPreferences.expectedSalary?.toLocaleString()}
                </p>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Availability</h3>
              <p className="text-gray-700">
                {profile.careerPreferences.availableFrom ? new Date(profile.careerPreferences.availableFrom).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Immediately'}
              </p>
              <p className="text-sm text-gray-600 mt-1">Notice Period: {profile.careerPreferences.noticePeriod}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

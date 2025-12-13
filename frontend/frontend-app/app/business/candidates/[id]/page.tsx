'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CandidateProfile {
  id: string;
  name: string;
  title: string;
  location: string;
  experience: string;
  matchScore: number;
  avatar: string;
  skills: string[];
  email: string;
  phone: string;
  availability: string;
  summary: string;
  education: Array<{degree: string; school: string; year: string}>;
  workExperience: Array<{title: string; company: string; duration: string; description: string}>;
}

export default function CandidateProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock candidate data - in production, fetch from API based on candidate ID from URL
  const candidate: CandidateProfile = {
    id: '1',
    name: 'Sarah Johnson',
    title: 'Senior Software Engineer',
    location: 'Sydney, NSW',
    experience: '8 years',
    matchScore: 96,
    avatar: 'SJ',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'PostgreSQL', 'GraphQL', 'Next.js'],
    email: 'sarah.johnson@email.com',
    phone: '+61 400 123 456',
    availability: 'Available in 30 days',
    summary: 'Passionate software engineer with 8+ years of experience building scalable web applications. Specialized in full-stack development with expertise in React, Node.js, and cloud infrastructure. Led teams of 5+ developers and mentored junior engineers.',
    education: [
      { degree: 'Bachelor of Computer Science', school: 'University of Sydney', year: '2015' },
      { degree: 'AWS Certified Solutions Architect', school: 'Amazon Web Services', year: '2022' }
    ],
    workExperience: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Innovations Pty Ltd',
        duration: '2020 - Present',
        description: 'Lead development of microservices architecture serving 1M+ users. Improved application performance by 40% through optimization. Mentored 5 junior developers.'
      },
      {
        title: 'Software Engineer',
        company: 'Digital Solutions Co',
        duration: '2017 - 2020',
        description: 'Built responsive web applications using React and Node.js. Implemented CI/CD pipelines reducing deployment time by 60%. Collaborated with cross-functional teams.'
      },
      {
        title: 'Junior Developer',
        company: 'StartupXYZ',
        duration: '2015 - 2017',
        description: 'Developed features for e-commerce platform. Worked with REST APIs and database optimization. Participated in agile development process.'
      }
    ]
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Business') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'business@demo.com', type: 'Business' });
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    router.push('/');
  };

  if (!user || loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <button onClick={() => router.push('/')} className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-xl font-serif text-gray-900">Creerlio</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={() => router.back()} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                ← Back
              </button>
              <button onClick={handleLogout} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-4xl font-bold text-amber-700">{candidate.avatar}</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{candidate.name}</h1>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                    {candidate.matchScore}% Match
                  </span>
                </div>
                <p className="text-xl text-gray-600 mb-3">{candidate.title}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {candidate.location}
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {candidate.experience} experience
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {candidate.availability}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push('/business/messages')}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                Contact Candidate
              </button>
              <button
                onClick={() => router.push('/business/messages')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Schedule Interview
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Professional Summary</h2>
          <p className="text-gray-700 leading-relaxed">{candidate.summary}</p>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Skills & Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {candidate.skills.map((skill) => (
              <span key={skill} className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Work Experience */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Work Experience</h2>
          <div className="space-y-6">
            {candidate.workExperience.map((job, index) => (
              <div key={index} className="border-l-4 border-amber-600 pl-6">
                <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                <p className="text-amber-700 font-medium mt-1">{job.company}</p>
                <p className="text-sm text-gray-600 mt-1">{job.duration}</p>
                <p className="text-gray-700 mt-3 leading-relaxed">{job.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Education & Certifications</h2>
          <div className="space-y-4">
            {candidate.education.map((edu, index) => (
              <div key={index} className="flex items-start">
                <svg className="w-6 h-6 text-amber-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                  <p className="text-gray-600">{edu.school}</p>
                  <p className="text-sm text-gray-500">{edu.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="text-gray-900 font-medium">{candidate.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              <p className="text-gray-900 font-medium">{candidate.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

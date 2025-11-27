'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JobApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  // Mock data - In production, fetch from API based on jobId
  const jobTitle = jobId === '1' ? 'Senior Software Engineer' : 
                   jobId === '2' ? 'Full Stack Developer' : 
                   'DevOps Engineer';

  const applications = [
    {
      id: 1,
      candidateName: 'Sarah Johnson',
      candidateId: 1,
      email: 'sarah.johnson@email.com',
      appliedDate: '2024-01-15T10:30:00Z',
      status: 'under_review',
      matchScore: 96,
      experience: '8 years',
      location: 'Sydney, NSW',
      skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
      resume: 'sarah_johnson_resume.pdf'
    },
    {
      id: 2,
      candidateName: 'Michael Chen',
      candidateId: 2,
      email: 'michael.chen@email.com',
      appliedDate: '2024-01-14T15:20:00Z',
      status: 'interview',
      matchScore: 92,
      experience: '5 years',
      location: 'Melbourne, VIC',
      skills: ['.NET', 'C#', 'Azure', 'SQL'],
      resume: 'michael_chen_resume.pdf'
    },
    {
      id: 3,
      candidateName: 'Emma Wilson',
      candidateId: 3,
      email: 'emma.wilson@email.com',
      appliedDate: '2024-01-13T09:45:00Z',
      status: 'new',
      matchScore: 89,
      experience: '4 years',
      location: 'Brisbane, QLD',
      skills: ['React', 'Next.js', 'Tailwind', 'JavaScript'],
      resume: 'emma_wilson_resume.pdf'
    },
    {
      id: 4,
      candidateName: 'David Lee',
      candidateId: 4,
      email: 'david.lee@email.com',
      appliedDate: '2024-01-12T14:10:00Z',
      status: 'rejected',
      matchScore: 75,
      experience: '2 years',
      location: 'Perth, WA',
      skills: ['JavaScript', 'Python', 'Django', 'PostgreSQL'],
      resume: 'david_lee_resume.pdf'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-50 text-blue-700';
      case 'under_review':
        return 'bg-yellow-50 text-yellow-700';
      case 'interview':
        return 'bg-green-50 text-green-700';
      case 'rejected':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const stats = {
    total: applications.length,
    new: applications.filter(a => a.status === 'new').length,
    underReview: applications.filter(a => a.status === 'under_review').length,
    interview: applications.filter(a => a.status === 'interview').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/business/jobs')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <span className="mr-2">←</span> Back to Jobs
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{jobTitle}</h1>
          <p className="text-gray-600 mt-2">Applications for this position</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Applications</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.new}</div>
            <div className="text-sm text-gray-600 mt-1">New</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-yellow-600">{stats.underReview}</div>
            <div className="text-sm text-gray-600 mt-1">Under Review</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-green-600">{stats.interview}</div>
            <div className="text-sm text-gray-600 mt-1">Interview Stage</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600 mt-1">Rejected</div>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {applications.map((application) => (
            <div key={application.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-amber-700">
                      {application.candidateName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>

                  {/* Candidate Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{application.candidateName}</h3>
                        <p className="text-gray-600 text-sm mt-1">{application.email}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          {application.location} • {application.experience} experience
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                          {getStatusText(application.status)}
                        </span>
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                          {application.matchScore}% Match
                        </span>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {application.skills.map((skill) => (
                        <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>📄 {application.resume}</span>
                        <span>•</span>
                        <span>Applied {getTimeSince(application.appliedDate)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(`/resumes/${application.resume}`, '_blank')}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                        >
                          View Resume
                        </button>
                        <button
                          onClick={() => router.push(`/business/candidates/${application.candidateId}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => router.push('/business/messages')}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                        >
                          Contact
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

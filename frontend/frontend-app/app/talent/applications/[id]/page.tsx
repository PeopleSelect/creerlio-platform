'use client';

import { useParams, useRouter } from 'next/navigation';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id;

  const application = {
    id: appId,
    jobTitle: appId === '1' ? 'Senior Software Engineer' : appId === '2' ? 'Full Stack Developer' : appId === '3' ? 'Frontend Developer' : 'Backend Engineer',
    company: appId === '1' ? 'TechCorp Inc.' : appId === '2' ? 'StartupXYZ' : appId === '3' ? 'Digital Agency Co.' : 'CloudTech Solutions',
    status: appId === '1' ? 'interview' : appId === '2' ? 'under_review' : appId === '3' ? 'under_review' : 'rejected',
    appliedDate: appId === '1' ? '2025-11-20' : appId === '2' ? '2025-11-18' : appId === '3' ? '2025-11-16' : '2025-11-09',
    location: 'Remote',
    salary: '$120k - $180k',
    description: 'We are looking for an experienced software engineer to join our growing team...',
    requirements: [
      '5+ years of professional software development experience',
      'Strong proficiency in React and Node.js',
      'Experience with cloud platforms (AWS, Azure, or GCP)',
      'Excellent problem-solving and communication skills'
    ],
    interviewDate: appId === '1' ? '2025-12-01T14:00:00' : null,
    timeline: [
      { date: '2025-11-20', status: 'Applied', description: 'Your application was submitted successfully' },
      appId === '1' && { date: '2025-11-21', status: 'Under Review', description: 'Recruiter is reviewing your application' },
      appId === '1' && { date: '2025-11-22', status: 'Interview Scheduled', description: 'Interview scheduled for Dec 1, 2025 at 2:00 PM' }
    ].filter(Boolean)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'interview':
        return 'bg-green-50 text-green-700';
      case 'under_review':
        return 'bg-amber-50 text-amber-700';
      case 'rejected':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'interview':
        return 'Interview Scheduled';
      case 'under_review':
        return 'Under Review';
      case 'rejected':
        return 'Not Selected';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/talent/applications')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <span className="mr-2">←</span> Back to Applications
        </button>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{application.jobTitle}</h1>
              <p className="text-xl text-gray-600 mt-2">{application.company}</p>
              <div className="flex gap-4 mt-4 text-sm text-gray-600">
                <span>📍 {application.location}</span>
                <span>💰 {application.salary}</span>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
              {getStatusText(application.status)}
            </span>
          </div>

          {application.interviewDate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">📅 Interview Scheduled</h3>
                  <p className="text-amber-800">
                    {new Date(application.interviewDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {new Date(application.interviewDate).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="text-sm text-amber-700 mt-2">
                    A calendar invite has been sent to your email
                  </p>
                </div>
                <button
                  onClick={() => alert('Adding to calendar...')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
                >
                  Add to Calendar
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/talent/messages')}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
            >
              Message Employer
            </button>
            <button
              onClick={() => alert('Application withdrawn')}
              className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium"
            >
              Withdraw Application
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
          <p className="text-gray-700 mb-6">{application.description}</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">Requirements</h3>
          <ul className="space-y-2">
            {application.requirements.map((req, idx) => (
              <li key={idx} className="flex items-start text-gray-700">
                <span className="text-amber-600 mr-2">•</span>
                {req}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Timeline</h2>
          <div className="space-y-6">
            {application.timeline.map((event, idx) => event && typeof event === 'object' && 'date' in event ? (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-amber-600 rounded-full"></div>
                  {idx < application.timeline.length - 1 && (
                    <div className="w-0.5 h-16 bg-gray-200 my-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <p className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="font-semibold text-gray-900 mt-1">{event.status}</p>
                  <p className="text-gray-700 mt-1">{event.description}</p>
                </div>
              </div>
            ) : null)}
          </div>
        </div>
      </div>
    </div>
  );
}

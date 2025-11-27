'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AIAssistantPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeFeature, setActiveFeature] = useState<'resume' | 'match' | 'skills' | 'interview'>('resume');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Talent') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'talent@demo.com', type: 'Talent' });
  }, [router]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAnalyzing(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50">
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

              <div className="hidden md:flex space-x-1">
                <button onClick={() => router.push('/talent/dashboard')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Dashboard
                </button>
                <button onClick={() => router.push('/talent/ai-assistant')} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
                  AI Assistant
                </button>
              </div>
            </div>

            <button onClick={() => { localStorage.clear(); router.push('/'); }} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🤖</span> AI Career Assistant
          </h1>
          <p className="mt-2 text-gray-600">Powered by advanced AI to boost your career</p>
        </div>

        {/* AI Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => setActiveFeature('resume')}
            className={`p-6 rounded-xl text-left transition-all ${
              activeFeature === 'resume'
                ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg scale-105'
                : 'bg-white hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">📄</div>
            <h3 className="font-semibold mb-2">Resume Analysis</h3>
            <p className={`text-sm ${activeFeature === 'resume' ? 'text-amber-50' : 'text-gray-600'}`}>
              AI-powered resume optimization and suggestions
            </p>
          </button>

          <button
            onClick={() => setActiveFeature('match')}
            className={`p-6 rounded-xl text-left transition-all ${
              activeFeature === 'match'
                ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg scale-105'
                : 'bg-white hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">Job Matching</h3>
            <p className={`text-sm ${activeFeature === 'match' ? 'text-amber-50' : 'text-gray-600'}`}>
              Find perfect job matches based on your skills
            </p>
          </button>

          <button
            onClick={() => setActiveFeature('skills')}
            className={`p-6 rounded-xl text-left transition-all ${
              activeFeature === 'skills'
                ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg scale-105'
                : 'bg-white hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-semibold mb-2">Skills Gap Analysis</h3>
            <p className={`text-sm ${activeFeature === 'skills' ? 'text-amber-50' : 'text-gray-600'}`}>
              Identify skills to learn for your dream role
            </p>
          </button>

          <button
            onClick={() => setActiveFeature('interview')}
            className={`p-6 rounded-xl text-left transition-all ${
              activeFeature === 'interview'
                ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg scale-105'
                : 'bg-white hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-semibold mb-2">Interview Prep</h3>
            <p className={`text-sm ${activeFeature === 'interview' ? 'text-amber-50' : 'text-gray-600'}`}>
              Practice with AI-generated interview questions
            </p>
          </button>
        </div>

        {/* Active Feature Content */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          {activeFeature === 'resume' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Resume Analysis & Optimization</h2>
              <p className="text-gray-600 mb-6">
                Upload your resume and get AI-powered suggestions to improve it for specific job applications.
              </p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 mb-2">Drag and drop your resume here or</p>
                <button className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                  Browse Files
                </button>
                <p className="text-sm text-gray-500 mt-2">Supports PDF, DOC, DOCX up to 10MB</p>
              </div>

              {!analyzing ? (
                <button onClick={runAnalysis} className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 font-medium">
                  Analyze Resume with AI
                </button>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Analyzing your resume...</p>
                </div>
              )}

              {!analyzing && (
                <div className="mt-8 p-6 bg-amber-50 rounded-lg">
                  <h3 className="font-semibold text-amber-900 mb-3">💡 Recent Analysis</h3>
                  <ul className="space-y-2 text-sm text-amber-800">
                    <li>✓ Strong technical skills section</li>
                    <li>⚠️ Add more quantifiable achievements</li>
                    <li>⚠️ Consider adding industry keywords for ATS optimization</li>
                    <li>✓ Clear and concise summary</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeFeature === 'match' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Job Matching</h2>
              <p className="text-gray-600 mb-6">
                Our AI analyzes your skills, experience, and preferences to find the best job matches.
              </p>

              <div className="space-y-4 mb-6">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Senior Software Engineer at TechCorp</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">96% Match</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">San Francisco, CA • $140k-$180k • Remote</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">React</span>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">Node.js</span>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">AWS</span>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Full Stack Developer at StartupXYZ</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">92% Match</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">New York, NY • $120k-$160k • Hybrid</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">TypeScript</span>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">Next.js</span>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">PostgreSQL</span>
                  </div>
                </div>
              </div>

              <button className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 font-medium">
                Find More Matches
              </button>
            </div>
          )}

          {activeFeature === 'skills' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Skills Gap Analysis</h2>
              <p className="text-gray-600 mb-6">
                Identify the skills you need to reach your career goals.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Role</label>
                <input
                  type="text"
                  placeholder="e.g., Senior Full Stack Engineer"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-6 bg-gray-50 rounded-lg mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Current Skills</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git'].map(skill => (
                    <span key={skill} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      ✓ {skill}
                    </span>
                  ))}
                </div>

                <h3 className="font-semibold text-gray-900 mb-4 mt-6">Skills to Learn</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">TypeScript</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">High Priority</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Docker & Kubernetes</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">High Priority</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">GraphQL</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Medium Priority</span>
                  </div>
                </div>
              </div>

              <button className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 font-medium">
                Get Learning Resources
              </button>
            </div>
          )}

          {activeFeature === 'interview' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Interview Preparation</h2>
              <p className="text-gray-600 mb-6">
                Practice with AI-generated interview questions tailored to your target role.
              </p>

              <div className="space-y-4">
                <div className="p-6 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Q: Tell me about a challenging project you worked on.</h3>
                  <textarea
                    placeholder="Type your answer here..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <button className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
                    Get AI Feedback
                  </button>
                </div>

                <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">💡 AI Tip</h3>
                  <p className="text-sm text-green-800">
                    When answering behavioral questions, use the STAR method: Situation, Task, Action, Result. This helps structure your response effectively.
                  </p>
                </div>

                <button className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 font-medium">
                  Generate More Questions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

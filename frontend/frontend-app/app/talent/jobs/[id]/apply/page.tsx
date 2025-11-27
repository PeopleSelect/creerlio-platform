'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ApplyToJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id;
  const [submitting, setSubmitting] = useState(false);

  // Mock job data - In production, fetch from API
  const jobTitle = 'Senior Software Engineer';
  const companyName = 'TechCorp Australia';

  const [formData, setFormData] = useState({
    coverLetter: '',
    resumeFile: null as File | null,
    portfolioUrl: '',
    availability: '',
    salaryExpectation: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    alert('Application submitted successfully! The employer will review your application and contact you soon.');
    router.push('/talent/applications');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/talent/jobs')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <span className="mr-2">←</span> Back to Jobs
          </button>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{jobTitle}</h1>
                <p className="text-xl text-gray-600 mt-2">{companyName}</p>
                <div className="flex gap-4 mt-4 text-sm text-gray-600">
                  <span>📍 Remote</span>
                  <span>💰 $120k - $180k</span>
                  <span>⏰ Full-time</span>
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-amber-700">TC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Your Application</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cover Letter */}
            <div>
              <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
                Cover Letter *
              </label>
              <textarea
                id="coverLetter"
                required
                rows={8}
                value={formData.coverLetter}
                onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                placeholder="Tell us why you're a great fit for this role..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">Min. 100 characters</p>
            </div>

            {/* Resume Upload */}
            <div>
              <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-2">
                Resume/CV *
              </label>
              <input
                type="file"
                id="resume"
                required
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData({ ...formData, resumeFile: file });
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">PDF, DOC, or DOCX format (max 5MB)</p>
              {formData.resumeFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {formData.resumeFile.name} ({(formData.resumeFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Portfolio URL */}
            <div>
              <label htmlFor="portfolioUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio/LinkedIn URL
              </label>
              <input
                type="url"
                id="portfolioUrl"
                value={formData.portfolioUrl}
                onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Availability */}
            <div>
              <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
                Availability *
              </label>
              <select
                id="availability"
                required
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Select your availability</option>
                <option value="immediate">Immediate</option>
                <option value="2-weeks">2 weeks notice</option>
                <option value="1-month">1 month notice</option>
                <option value="2-months">2+ months notice</option>
              </select>
            </div>

            {/* Salary Expectation */}
            <div>
              <label htmlFor="salaryExpectation" className="block text-sm font-medium text-gray-700 mb-2">
                Salary Expectation (AUD) *
              </label>
              <input
                type="text"
                id="salaryExpectation"
                required
                value={formData.salaryExpectation}
                onChange={(e) => setFormData({ ...formData, salaryExpectation: e.target.value })}
                placeholder="e.g., $120,000 - $150,000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Additional Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Application Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Tailor your cover letter to this specific role</li>
                <li>• Highlight relevant experience and achievements</li>
                <li>• Ensure your resume is up-to-date</li>
                <li>• Include links to your work or projects</li>
              </ul>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/talent/jobs')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium ${
                  submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-700'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-medium text-gray-900 mb-2">Privacy & Data Protection</h3>
          <p className="text-sm text-gray-600">
            Your application data will be shared with {companyName} for recruitment purposes only. 
            By submitting this application, you consent to the processing of your personal data 
            in accordance with our Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

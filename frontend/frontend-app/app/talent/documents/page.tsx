'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DocumentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'media'>('documents');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Talent') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'talent@demo.com', type: 'Talent' });
  }, [router]);

  const documents = [
    { id: '1', name: 'Resume_2025.pdf', size: '245 KB', type: 'PDF', date: 'Nov 20, 2025', category: 'Resume' },
    { id: '2', name: 'Cover_Letter.docx', size: '128 KB', type: 'DOCX', date: 'Nov 18, 2025', category: 'Cover Letter' },
    { id: '3', name: 'Certifications.pdf', size: '1.2 MB', type: 'PDF', date: 'Nov 15, 2025', category: 'Certificates' },
    { id: '4', name: 'References.pdf', size: '98 KB', type: 'PDF', date: 'Nov 10, 2025', category: 'References' },
  ];

  const media = [
    { id: '1', name: 'profile_photo.jpg', size: '892 KB', type: 'JPG', date: 'Nov 22, 2025', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
    { id: '2', name: 'project_demo.mp4', size: '15.3 MB', type: 'MP4', date: 'Nov 18, 2025', thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200' },
    { id: '3', name: 'portfolio_banner.png', size: '2.1 MB', type: 'PNG', date: 'Nov 15, 2025', thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200' },
  ];

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
                <button onClick={() => router.push('/talent/portfolio')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Portfolio
                </button>
                <button onClick={() => router.push('/talent/documents')} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
                  Files
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Files</h1>
            <p className="mt-2 text-gray-600">Manage your documents, media, and files</p>
          </div>
          <button className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Files
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📄 Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`pb-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'media'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🖼️ Media ({media.length})
            </button>
          </div>
        </div>

        {/* Storage Info */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Storage Used</span>
            <span className="text-sm text-gray-600">18.9 MB of 100 MB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-amber-600 h-2 rounded-full" style={{ width: '18.9%' }}></div>
          </div>
        </div>

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.name}</h3>
                    <p className="text-sm text-gray-500">
                      {doc.category} • {doc.size} • {doc.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-lg text-sm font-medium">
                    Download
                  </button>
                  <button className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium">
                    Share
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {media.map((item) => (
              <div key={item.id} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="h-48 bg-gray-200 relative">
                  <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                  {item.type === 'MP4' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.size} • {item.date}</p>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 px-3 py-2 text-amber-600 bg-amber-50 rounded-lg text-sm font-medium hover:bg-amber-100">
                      View
                    </button>
                    <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

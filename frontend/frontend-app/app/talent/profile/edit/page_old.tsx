'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TalentEditProfilePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'awards', label: 'Awards' },
    { id: 'references', label: 'References' },
    { id: 'preferences', label: 'Career Preferences' },
    { id: 'privacy', label: 'Privacy' }
  ];

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    alert('Profile updated successfully!');
    setSaving(false);
    router.push('/talent/profile');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
            <p className="text-gray-600 mt-2">Manage your complete professional profile</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/talent/profile')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-3 bg-amber-600 text-white rounded-lg font-medium ${
                saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-700'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-8">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex-1">
            {activeTab === 'basic' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
                
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Profile Photo</label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center overflow-hidden">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-amber-700">SJ</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProfilePhoto(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        id="profile-photo"
                        className="hidden"
                      />
                      <label htmlFor="profile-photo" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer inline-block font-medium">
                        Upload Photo
                      </label>
                      <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF (max 5MB)</p>
                      {profilePhoto && (
                        <button
                          onClick={() => setProfilePhoto(null)}
                          className="text-sm text-red-600 hover:text-red-700 mt-2 block"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label><input type="text" defaultValue="Sarah" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label><input type="text" defaultValue="Johnson" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Email *</label><input type="email" defaultValue="sarah.johnson@email.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Phone</label><input type="tel" defaultValue="+61 412 345 678" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">City *</label><input type="text" defaultValue="Sydney" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">State *</label><input type="text" defaultValue="NSW" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                </div>

                <div className="mt-6"><label className="block text-sm font-medium text-gray-700 mb-2">Professional Headline *</label><input type="text" defaultValue="Senior Software Engineer | Full Stack Developer" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                <div className="mt-6"><label className="block text-sm font-medium text-gray-700 mb-2">Summary *</label><textarea rows={6} defaultValue="Passionate software engineer with 8+ years..." className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
              </div>
            )}

            {activeTab === 'experience' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Work Experience</h2>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">+ Add Experience</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label><input type="text" defaultValue="Senior Software Engineer" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Company *</label><input type="text" defaultValue="TechCorp Australia" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Description</label><textarea rows={4} defaultValue="Led development..." className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Technologies</label><input type="text" defaultValue="React, Node.js, AWS" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Skills</h2>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">+ Add Skill</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Skill *</label><input type="text" defaultValue="React" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Category *</label><select className="w-full px-4 py-2 border border-gray-300 rounded-lg"><option>Technical</option><option>Soft</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Years *</label><input type="number" defaultValue="7" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">+ Add Project</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Project Title *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Description *</label><textarea rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Project Images</label>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            const newImages: string[] = [];
                            files.forEach((file) => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                newImages.push(reader.result as string);
                                if (newImages.length === files.length) {
                                  setPortfolioImages([...portfolioImages, ...newImages]);
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }} 
                        id="project-imgs" 
                        className="hidden" 
                      />
                      <label htmlFor="project-imgs" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer inline-block font-medium">Upload Images</label>
                      <p className="text-sm text-gray-500 mt-2">JPG or PNG (max 5MB each)</p>
                      
                      {portfolioImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          {portfolioImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img src={img} alt={`Portfolio ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                              <button
                                onClick={() => setPortfolioImages(portfolioImages.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Career Preferences</h2>
                <div className="space-y-6">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Preferred Roles</label><input type="text" defaultValue="Senior Engineer, Tech Lead" placeholder="Separate with commas" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Expected Salary (AUD)</label><input type="number" defaultValue="150000" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Work Model</label><select defaultValue="Hybrid" className="w-full px-4 py-2 border border-gray-300 rounded-lg"><option>Remote</option><option>Hybrid</option><option>Office</option></select></div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b"><div><p className="font-medium text-gray-900">Show email</p></div><input type="checkbox" defaultChecked className="h-5 w-5" /></div>
                  <div className="flex items-center justify-between py-3 border-b"><div><p className="font-medium text-gray-900">Show phone</p></div><input type="checkbox" className="h-5 w-5" /></div>
                  <div className="flex items-center justify-between py-3"><div><p className="font-medium text-gray-900">Allow recruiter contact</p></div><input type="checkbox" defaultChecked className="h-5 w-5" /></div>
                </div>
              </div>
            )}

            {activeTab === 'certifications' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Certifications</h2>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">+ Add Certification</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Certification Name *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Issuing Organization *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'education' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Education</h2>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">+ Add Education</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Institution *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Degree *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'awards' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Awards</h2>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">+ Add Award</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Award Title *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Issuer *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'references' && (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">References</h2>
                  <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">+ Add Reference</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Name *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Title *</label><input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

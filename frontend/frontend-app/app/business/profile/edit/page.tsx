'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditBusinessProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: 'TechCorp Innovation',
    industry: 'Technology & Software Development',
    location: 'San Francisco, CA',
    email: 'business@demo.com',
    phone: '+1 (555) 987-6543',
    website: 'https://techcorp.com',
    linkedin: 'https://linkedin.com/company/techcorp',
    founded: '2015',
    companySize: '250+',
    description: "We're a leading technology company specializing in innovative software solutions for businesses worldwide. Our mission is to empower organizations through cutting-edge technology and exceptional talent.",
    mission: 'To revolutionize how businesses leverage technology by providing innovative solutions and connecting exceptional talent with meaningful opportunities.',
    culture: 'Innovation-driven, collaborative, and inclusive workplace where everyone can thrive.',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Business') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'business@demo.com', type: 'Business' });
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Company profile updated successfully!');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    router.push('/');
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
            </div>
            <button onClick={handleLogout} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.push('/business/portfolio')} className="flex items-center text-gray-600 hover:text-amber-700 mb-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Company Profile
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Company Profile</h1>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-amber-700">TC</span>
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
                        setLogoPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm cursor-pointer">
                  Upload Logo
                </label>
                {logoPreview && (
                  <button
                    onClick={() => setLogoPreview(null)}
                    className="ml-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Recommended: Square image, at least 400x400px (PNG, JPG)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-amber-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setCoverPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                id="cover-upload"
              />
              {coverPreview ? (
                <div className="relative group">
                  <img src={coverPreview} alt="Cover" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => setCoverPreview(null)}
                    className="absolute top-2 right-2 bg-red-500 text-white px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Remove Cover
                  </button>
                </div>
              ) : (
                <label htmlFor="cover-upload" className="cursor-pointer block p-6 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">Click to upload cover image</p>
                  <p className="text-xs text-gray-500 mt-1">Recommended: 1200x400px or larger (PNG, JPG up to 10MB)</p>
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry *</label>
              <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
              <select name="companySize" value={formData.companySize} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500">
                <option>1-10</option>
                <option>11-50</option>
                <option>51-200</option>
                <option>201-500</option>
                <option>250+</option>
                <option>500-1000</option>
                <option>1000+</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Founded Year</label>
              <input type="text" name="founded" value={formData.founded} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mission Statement</label>
            <textarea name="mission" value={formData.mission} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Culture</label>
            <textarea name="culture" value={formData.culture} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Links & Social Media</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button onClick={handleSave} disabled={saving} className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => router.push('/business/portfolio')} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

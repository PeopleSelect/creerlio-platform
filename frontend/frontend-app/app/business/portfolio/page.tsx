'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BusinessPortfolio() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Business') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'business@demo.com', type: 'Business' });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    router.push('/');
  };

  if (!user) return null;

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

              <div className="hidden md:flex space-x-1">
                <button onClick={() => router.push('/business/dashboard')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Dashboard
                </button>
                <button onClick={() => router.push('/business/candidates')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Candidates
                </button>
                <button onClick={() => router.push('/business/jobs')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Job Postings
                </button>
                <button onClick={() => router.push('/business/portfolio')} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
                  Company Profile
                </button>
                <button onClick={() => router.push('/business/messages')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Messages
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-amber-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button onClick={handleLogout} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Portfolio Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif text-gray-900 mb-2">Company Profile</h1>
          <p className="text-gray-600">Showcase your company culture, values, and what makes you unique</p>
        </div>

        {/* Company Overview Card */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl overflow-hidden mb-8">
          <div className="h-48 bg-gradient-to-br from-amber-500 to-orange-600 relative">
            <img 
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200" 
              alt="Office"
              className="w-full h-full object-cover mix-blend-overlay"
            />
          </div>
          <div className="p-8 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center -mt-16 shadow-lg">
                  <span className="text-4xl font-bold text-amber-700">TC</span>
                </div>
                <div>
                  <h2 className="text-3xl font-serif mb-2">TechCorp Innovation</h2>
                  <p className="text-amber-50 text-lg">Technology & Software Development</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      San Francisco, CA
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      250+ employees
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Founded 2015
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => router.push('/business/profile/edit')}
                className="px-6 py-3 bg-white text-amber-700 rounded-lg font-medium hover:bg-amber-50 transition-colors"
              >
                Edit Profile
              </button>
            </div>
            <p className="text-amber-50 leading-relaxed text-lg">
              We're a leading technology company specializing in innovative software solutions for businesses worldwide. 
              Our mission is to empower organizations through cutting-edge technology and exceptional talent.
            </p>
          </div>
        </div>

        {/* Company Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Employees</span>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">250+</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Global Offices</span>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">5</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Countries</span>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">12</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Client Satisfaction</span>
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">98%</div>
          </div>
        </div>

        {/* Mission & Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-2xl font-serif text-gray-900 mb-4">Our Mission</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              To revolutionize how businesses leverage technology by providing innovative solutions 
              and connecting exceptional talent with meaningful opportunities.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We believe in creating technology that makes a difference, fostering innovation, 
              and building a diverse, inclusive workplace where everyone can thrive.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-2xl font-serif text-gray-900 mb-4">Core Values</h3>
            <div className="space-y-3">
              {[
                { icon: '🚀', title: 'Innovation First', desc: 'Pushing boundaries and embracing new ideas' },
                { icon: '🤝', title: 'Collaboration', desc: 'Working together to achieve greatness' },
                { icon: '💡', title: 'Continuous Learning', desc: 'Growing and evolving every day' },
                { icon: '🎯', title: 'Results Driven', desc: 'Delivering excellence in everything we do' },
              ].map((value) => (
                <div key={value.title} className="flex items-start space-x-3">
                  <span className="text-2xl">{value.icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{value.title}</h4>
                    <p className="text-sm text-gray-600">{value.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meet the Team */}
        <div className="bg-white rounded-xl p-8 border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-serif text-gray-900">Leadership Team</h3>
            <button className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors">
              + Add Member
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah Johnson', role: 'CEO & Founder', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' },
              { name: 'Michael Chen', role: 'CTO', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400' },
              { name: 'Emily Rodriguez', role: 'VP of Engineering', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400' },
            ].map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-amber-100">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <h4 className="font-semibold text-gray-900 text-lg">{member.name}</h4>
                <p className="text-amber-700 text-sm">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Office Life & Culture */}
        <div className="bg-white rounded-xl p-8 border border-gray-100 mb-8">
          <h3 className="text-2xl font-serif text-gray-900 mb-6">Office Life & Culture</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600', title: 'Modern Workspace' },
              { image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600', title: 'Team Collaboration' },
              { image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600', title: 'Innovation Hub' },
            ].map((photo) => (
              <div key={photo.title} className="relative h-64 rounded-xl overflow-hidden group">
                <img src={photo.image} alt={photo.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <span className="text-white font-semibold">{photo.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits & Perks */}
        <div className="bg-white rounded-xl p-8 border border-gray-100">
          <h3 className="text-2xl font-serif text-gray-900 mb-6">Benefits & Perks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🏥', title: 'Health Insurance', desc: 'Comprehensive medical, dental, and vision coverage' },
              { icon: '💰', title: 'Competitive Salary', desc: 'Market-leading compensation packages' },
              { icon: '🏖️', title: 'Unlimited PTO', desc: 'Take the time you need to recharge' },
              { icon: '📚', title: 'Learning Budget', desc: '$2,000 annual learning and development budget' },
              { icon: '🏠', title: 'Remote Flexible', desc: 'Work from anywhere with flexible hours' },
              { icon: '🎮', title: 'Game Room', desc: 'Relax with ping pong, video games, and more' },
            ].map((benefit) => (
              <div key={benefit.title} className="flex items-start space-x-3">
                <span className="text-3xl flex-shrink-0">{benefit.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

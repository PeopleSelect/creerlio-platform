'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CanvaDesignButton from '@/components/CanvaDesignButton';

interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  technologies: string[];
  link?: string;
  github?: string;
}

export default function TalentPortfolio() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      title: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with React, Node.js, and MongoDB. Features include user authentication, product catalog, shopping cart, and payment integration.',
      image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800',
      technologies: ['React', 'Node.js', 'MongoDB', 'Stripe', 'AWS'],
      link: 'https://demo-ecommerce.com',
      github: 'https://github.com/demo/ecommerce',
    },
    {
      id: '2',
      title: 'Task Management App',
      description: 'Real-time collaborative task management application with drag-and-drop functionality, team workspaces, and activity tracking.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
      technologies: ['Next.js', 'TypeScript', 'PostgreSQL', 'Socket.io'],
      link: 'https://demo-taskapp.com',
      github: 'https://github.com/demo/taskapp',
    },
    {
      id: '3',
      title: 'Weather Dashboard',
      description: 'Beautiful weather dashboard with real-time data, forecasts, and interactive maps. Integrates with multiple weather APIs for accurate predictions.',
      image: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=800',
      technologies: ['React', 'TypeScript', 'Tailwind CSS', 'OpenWeather API'],
      github: 'https://github.com/demo/weather-dashboard',
    },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Talent') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'talent@demo.com', type: 'Talent' });
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
                <button onClick={() => router.push('/talent/dashboard')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Dashboard
                </button>
                <button onClick={() => router.push('/talent/jobs')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Job Search
                </button>
                <button onClick={() => router.push('/talent/applications')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
                  Applications
                </button>
                <button onClick={() => router.push('/talent/portfolio')} className="px-4 py-2 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium">
                  Portfolio
                </button>
                <button onClick={() => router.push('/talent/messages')} className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
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
          <h1 className="text-4xl font-serif text-gray-900 mb-2">My Portfolio</h1>
          <p className="text-gray-600">Showcase your best work and achievements</p>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold text-amber-700">JD</span>
              </div>
              <div>
                <h2 className="text-3xl font-serif mb-2">John Doe</h2>
                <p className="text-amber-50 text-lg mb-3">Senior Full-Stack Developer</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    San Francisco, CA
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    5+ years experience
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <CanvaDesignButton
                designType="Portfolio"
                onDesignPublish={(opts) => {
                  console.log('Portfolio design published:', opts);
                  // Handle the published design
                }}
              >
                🎨 Design Portfolio
              </CanvaDesignButton>
              <button 
                onClick={() => router.push('/talent/profile/edit')}
                className="px-6 py-3 bg-white text-amber-700 rounded-lg font-medium hover:bg-amber-50 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-amber-500">
            <p className="text-amber-50 leading-relaxed">
              Experienced software engineer with 5+ years building scalable web applications. Passionate about clean code, 
              user experience, and modern technologies. Strong expertise in React, Node.js, and cloud infrastructure.
            </p>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
          <h3 className="text-xl font-serif text-gray-900 mb-4">Skills & Technologies</h3>
          <div className="flex flex-wrap gap-2">
            {['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', '.NET', 'C#', 'Python', 
              'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'CI/CD'].map((skill) => (
              <span key={skill} className="px-4 py-2 bg-amber-50 text-amber-800 rounded-full text-sm font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-serif text-gray-900">Featured Projects</h3>
            <button className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors">
              + Add Project
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                  <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <h4 className="absolute bottom-4 left-4 right-4 text-white font-semibold text-lg">
                    {project.title}
                  </h4>
                </div>
                
                <div className="p-5">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    {project.link && (
                      <button className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Demo
                      </button>
                    )}
                    {project.github && (
                      <button className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        Code
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications & Awards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-xl font-serif text-gray-900 mb-4">Certifications</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">AWS Certified Solutions Architect</h4>
                  <p className="text-sm text-gray-600">Amazon Web Services • 2024</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Microsoft Azure Developer Associate</h4>
                  <p className="text-sm text-gray-600">Microsoft • 2023</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-xl font-serif text-gray-900 mb-4">Awards & Recognition</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Best Developer Award</h4>
                  <p className="text-sm text-gray-600">TechCorp Annual Awards • 2024</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Hackathon Winner</h4>
                  <p className="text-sm text-gray-600">Bay Area Tech Challenge • 2023</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download, Share2, Mail, Globe, Github, Linkedin } from 'lucide-react';

interface PortfolioData {
  name: string;
  title: string;
  location: string;
  email: string;
  experience: string;
  bio: string;
  skills: string[];
  projects: Array<{
    id: string;
    title: string;
    description: string;
    image: string;
    technologies: string[];
    link?: string;
    github?: string;
  }>;
  experience_items: Array<{
    id: string;
    title: string;
    company: string;
    period: string;
    description: string;
  }>;
  certifications: Array<{
    id: string;
    title: string;
    issuer: string;
    year: string;
  }>;
}

export default function PublicPortfolio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    name: 'John Doe',
    title: 'Senior Full-Stack Developer',
    location: 'San Francisco, CA',
    email: 'john.doe@example.com',
    experience: '5+ years',
    bio: 'Experienced software engineer with 5+ years building scalable web applications. Passionate about clean code, user experience, and modern technologies. Strong expertise in React, Node.js, and cloud infrastructure.',
    skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', '.NET', 'C#', 'Python', 'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'CI/CD'],
    projects: [
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
        description: 'Beautiful weather dashboard with real-time data, forecasts, and interactive maps.',
        image: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=800',
        technologies: ['React', 'TypeScript', 'Tailwind CSS', 'OpenWeather API'],
        github: 'https://github.com/demo/weather-dashboard',
      },
    ],
    experience_items: [
      {
        id: '1',
        title: 'Senior Software Engineer',
        company: 'TechCorp Inc.',
        period: '2020 - Present',
        description: 'Leading development of cloud-based solutions, mentoring junior developers, and architecting scalable applications.',
      },
      {
        id: '2',
        title: 'Full-Stack Developer',
        company: 'StartupXYZ',
        period: '2018 - 2020',
        description: 'Built and maintained multiple web applications using React and Node.js. Implemented CI/CD pipelines and improved deployment processes.',
      },
    ],
    certifications: [
      {
        id: '1',
        title: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        year: '2024',
      },
      {
        id: '2',
        title: 'Microsoft Azure Developer Associate',
        issuer: 'Microsoft',
        year: '2023',
      },
    ],
  });

  const handleDownloadPDF = () => {
    alert('PDF download feature coming soon!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${portfolio.name}'s Portfolio`,
        text: `Check out ${portfolio.name}'s professional portfolio`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Portfolio link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <div className="text-sm text-gray-600">Portfolio powered by</div>
                <div className="text-lg font-serif text-gray-900">Creerlio</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-12 mb-8 text-white">
          <div className="flex items-start gap-8">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-5xl font-bold text-amber-700">
                {portfolio.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-serif mb-3">{portfolio.name}</h1>
              <p className="text-2xl text-amber-50 mb-4">{portfolio.title}</p>
              <div className="flex flex-wrap items-center gap-4 text-amber-50 mb-6">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {portfolio.location}
                </span>
                <span className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {portfolio.email}
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {portfolio.experience} experience
                </span>
              </div>
              <p className="text-amber-50 leading-relaxed text-lg">
                {portfolio.bio}
              </p>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl p-8 border border-gray-100 mb-8">
          <h2 className="text-2xl font-serif text-gray-900 mb-6">Skills & Technologies</h2>
          <div className="flex flex-wrap gap-3">
            {portfolio.skills.map((skill) => (
              <span key={skill} className="px-4 py-2 bg-amber-50 text-amber-800 rounded-full font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Featured Projects */}
        <div className="mb-8">
          <h2 className="text-2xl font-serif text-gray-900 mb-6">Featured Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portfolio.projects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                  <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <h3 className="absolute bottom-4 left-4 right-4 text-white font-semibold text-xl">
                    {project.title}
                  </h3>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {project.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    {project.link && (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Globe className="w-4 h-4" />
                        Live Demo
                      </a>
                    )}
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Github className="w-4 h-4" />
                        Code
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div className="bg-white rounded-xl p-8 border border-gray-100 mb-8">
          <h2 className="text-2xl font-serif text-gray-900 mb-6">Professional Experience</h2>
          <div className="space-y-6">
            {portfolio.experience_items.map((exp) => (
              <div key={exp.id} className="border-l-4 border-amber-600 pl-6">
                <h3 className="text-xl font-semibold text-gray-900">{exp.title}</h3>
                <p className="text-amber-700 font-medium mb-2">{exp.company} • {exp.period}</p>
                <p className="text-gray-600 leading-relaxed">{exp.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-xl p-8 border border-gray-100 mb-8">
          <h2 className="text-2xl font-serif text-gray-900 mb-6">Certifications & Awards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolio.certifications.map((cert) => (
              <div key={cert.id} className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{cert.title}</h3>
                  <p className="text-sm text-gray-600">{cert.issuer} • {cert.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-serif mb-4">Interested in working together?</h2>
          <p className="text-purple-100 mb-6 text-lg">
            Let's connect and discuss how I can contribute to your team
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href={`mailto:${portfolio.email}`}
              className="px-8 py-3 bg-white text-purple-700 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Send Email
            </a>
            <button
              onClick={() => router.push('/auth/login?type=business')}
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Connect on Creerlio
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            This portfolio is powered by{' '}
            <a href="/" className="text-amber-500 hover:text-amber-400 font-semibold">
              Creerlio
            </a>{' '}
            - The Proactive Recruiting Platform
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CanvaEditor from '@/components/CanvaEditor';
import CanvaDesignButton from '@/components/CanvaDesignButton';

type TemplateType = 'creative' | 'professional' | 'minimal' | 'modern' | 'tech' | 'executive';
type SectionType = 'header' | 'about' | 'experience' | 'skills' | 'projects' | 'education' | 'certifications' | 'contact';

interface PortfolioTemplate {
  id: string;
  name: string;
  type: TemplateType;
  thumbnail: string;
  colorScheme: string;
  sections: PortfolioSection[];
}

interface PortfolioSection {
  id: string;
  type: SectionType;
  title: string;
  isVisible: boolean;
  order: number;
  config: Record<string, any>;
}

export default function PortfolioEditor() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PortfolioTemplate | null>(null);
  const [sections, setSections] = useState<PortfolioSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState('amber');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showCanvaEditor, setShowCanvaEditor] = useState(false);
  const [canvaDesignUrl, setCanvaDesignUrl] = useState<string | null>(null);

  const templates: PortfolioTemplate[] = [
    {
      id: 'creative-1',
      name: 'Creative Bold',
      type: 'creative',
      thumbnail: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=400',
      colorScheme: 'purple',
      sections: [],
    },
    {
      id: 'professional-1',
      name: 'Professional Classic',
      type: 'professional',
      thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400',
      colorScheme: 'blue',
      sections: [],
    },
    {
      id: 'minimal-1',
      name: 'Minimal Clean',
      type: 'minimal',
      thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400',
      colorScheme: 'gray',
      sections: [],
    },
    {
      id: 'modern-1',
      name: 'Modern Vibrant',
      type: 'modern',
      thumbnail: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400',
      colorScheme: 'amber',
      sections: [],
    },
    {
      id: 'tech-1',
      name: 'Tech Focused',
      type: 'tech',
      thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400',
      colorScheme: 'green',
      sections: [],
    },
    {
      id: 'executive-1',
      name: 'Executive Elite',
      type: 'executive',
      thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
      colorScheme: 'slate',
      sections: [],
    },
  ];

  const colorSchemes = {
    amber: { primary: '#d97706', secondary: '#fbbf24', accent: '#f59e0b' },
    blue: { primary: '#2563eb', secondary: '#60a5fa', accent: '#3b82f6' },
    purple: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#8b5cf6' },
    green: { primary: '#059669', secondary: '#34d399', accent: '#10b981' },
    gray: { primary: '#4b5563', secondary: '#9ca3af', accent: '#6b7280' },
    slate: { primary: '#334155', secondary: '#64748b', accent: '#475569' },
  };

  const availableSections: { type: SectionType; title: string; icon: string }[] = [
    { type: 'header', title: 'Header', icon: '👤' },
    { type: 'about', title: 'About Me', icon: '📝' },
    { type: 'experience', title: 'Experience', icon: '💼' },
    { type: 'skills', title: 'Skills', icon: '⚡' },
    { type: 'projects', title: 'Projects', icon: '🚀' },
    { type: 'education', title: 'Education', icon: '🎓' },
    { type: 'certifications', title: 'Certifications', icon: '🏆' },
    { type: 'contact', title: 'Contact', icon: '📧' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');

    if (!token || userType !== 'Talent') {
      router.push('/auth/login');
      return;
    }

    setUser({ email: 'talent@demo.com', type: 'Talent' });

    // Initialize with default sections
    const defaultSections: PortfolioSection[] = [
      { id: '1', type: 'header', title: 'Header', isVisible: true, order: 1, config: {} },
      { id: '2', type: 'about', title: 'About Me', isVisible: true, order: 2, config: {} },
      { id: '3', type: 'experience', title: 'Experience', isVisible: true, order: 3, config: {} },
      { id: '4', type: 'skills', title: 'Skills', isVisible: true, order: 4, config: {} },
      { id: '5', type: 'projects', title: 'Projects', isVisible: true, order: 5, config: {} },
    ];
    setSections(defaultSections);
  }, [router]);

  const handleSelectTemplate = (template: PortfolioTemplate) => {
    setSelectedTemplate(template);
    setColorScheme(template.colorScheme);
  };

  const handleAddSection = (type: SectionType, title: string) => {
    const newSection: PortfolioSection = {
      id: Date.now().toString(),
      type,
      title,
      isVisible: true,
      order: sections.length + 1,
      config: {},
    };
    setSections([...sections, newSection]);
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const handleToggleSection = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, isVisible: !s.isVisible } : s
    ));
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === sectionId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update order numbers
    newSections.forEach((section, idx) => {
      section.order = idx + 1;
    });

    setSections(newSections);
  };

  const handleSavePortfolio = () => {
    alert('Portfolio saved successfully! Your changes will be reflected when you share your portfolio.');
    router.push('/talent/portfolio');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/talent/dashboard')} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">C</span>
                </div>
                <span className="text-lg font-serif text-gray-900">Creerlio</span>
              </button>
              <span className="text-gray-400">|</span>
              <span className="text-gray-700 font-medium">Portfolio Editor</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCanvaEditor(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 200 200" fill="currentColor">
                  <path d="M42.7,96.3c0-11.8,9.6-21.4,21.4-21.4h42.7v42.7H64.1c-11.8,0-21.4-9.6-21.4-21.4L42.7,96.3z"/>
                  <path d="M106.9,74.9h42.7c11.8,0,21.4,9.6,21.4,21.4c0,11.8-9.6,21.4-21.4,21.4h-42.7V74.9z"/>
                </svg>
                Design with Canva
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                {viewMode === 'edit' ? '👁️ Preview' : '✏️ Edit'}
              </button>
              <button
                onClick={handleSavePortfolio}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
              >
                💾 Save Portfolio
              </button>
              <button onClick={handleLogout} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Editor Tools */}
        {viewMode === 'edit' && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Template Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-xl mr-2">🎨</span>
                  Choose Template
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-amber-500 shadow-lg'
                          : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <img src={template.thumbnail} alt={template.name} className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                        <span className="text-white text-xs font-medium">{template.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Scheme */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-xl mr-2">🎨</span>
                  Color Scheme
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(colorSchemes).map((scheme) => (
                    <button
                      key={scheme}
                      onClick={() => setColorScheme(scheme)}
                      className={`w-10 h-10 rounded-full border-2 ${
                        colorScheme === scheme ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: colorSchemes[scheme as keyof typeof colorSchemes].primary }}
                    />
                  ))}
                </div>
              </div>

              {/* Sections Management */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="text-xl mr-2">📐</span>
                  Sections
                </h3>
                
                {/* Current Sections */}
                <div className="space-y-2 mb-4">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      className={`border border-gray-200 rounded-lg p-3 ${
                        activeSection === section.id ? 'bg-amber-50 border-amber-500' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleSection(section.id)}
                            className={`w-5 h-5 rounded ${
                              section.isVisible ? 'bg-amber-600' : 'bg-gray-300'
                            } flex items-center justify-center text-white text-xs`}
                          >
                            {section.isVisible ? '👁️' : '🚫'}
                          </button>
                          <span className="text-sm font-medium text-gray-900">{section.title}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleMoveSection(section.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveSection(section.id, 'down')}
                            disabled={index === sections.length - 1}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveSection(section.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-2">Add Section:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSections
                      .filter(as => !sections.some(s => s.type === as.type))
                      .map((section) => (
                        <button
                          key={section.type}
                          onClick={() => handleAddSection(section.type, section.title)}
                          className="px-3 py-2 bg-gray-50 hover:bg-amber-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:text-amber-700 transition-colors"
                        >
                          <span className="mr-1">{section.icon}</span>
                          {section.title}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-amber-900 mb-2">💡 Pro Tips</h4>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>• Drag sections to reorder them</li>
                  <li>• Hide sections without deleting</li>
                  <li>• Create multiple portfolio versions</li>
                  <li>• Preview before saving</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Canvas - Portfolio Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
          <div className="max-w-4xl mx-auto">
            <div 
              className="bg-white rounded-xl shadow-lg overflow-hidden"
              style={{ 
                borderTop: `4px solid ${colorSchemes[colorScheme as keyof typeof colorSchemes].primary}`
              }}
            >
              {sections.filter(s => s.isVisible).sort((a, b) => a.order - b.order).map((section) => (
                <div
                  key={section.id}
                  className={`p-8 border-b border-gray-200 last:border-b-0 ${
                    activeSection === section.id ? 'ring-2 ring-amber-500' : ''
                  }`}
                  onClick={() => viewMode === 'edit' && setActiveSection(section.id)}
                >
                  {section.type === 'header' && (
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-2">John Doe</h1>
                      <p className="text-xl text-gray-600 mb-4">Senior Software Engineer</p>
                      <div className="flex justify-center space-x-4 text-gray-600">
                        <span>📍 San Francisco, CA</span>
                        <span>📧 john@example.com</span>
                      </div>
                    </div>
                  )}

                  {section.type === 'about' && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ color: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}>
                        About Me
                      </h2>
                      <p className="text-gray-700 leading-relaxed">
                        Experienced software engineer with 8+ years building scalable web applications. 
                        Passionate about clean code, user experience, and modern technologies.
                      </p>
                    </div>
                  )}

                  {section.type === 'experience' && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ color: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}>
                        Experience
                      </h2>
                      <div className="space-y-4">
                        <div className="border-l-2 pl-4" style={{ borderColor: colorSchemes[colorScheme as keyof typeof colorSchemes].accent }}>
                          <h3 className="font-semibold text-gray-900">Senior Software Engineer</h3>
                          <p className="text-gray-600">TechCorp • 2020 - Present</p>
                          <p className="text-sm text-gray-700 mt-2">Leading development of cloud-based solutions.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === 'skills' && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ color: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}>
                        Skills
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {['JavaScript', 'React', 'Node.js', 'Python', 'AWS'].map((skill) => (
                          <span 
                            key={skill} 
                            className="px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {section.type === 'projects' && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ color: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}>
                        Projects
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">E-Commerce Platform</h3>
                          <p className="text-sm text-gray-600">Full-stack solution with React and Node.js</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === 'education' && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ color: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}>
                        Education
                      </h2>
                      <div>
                        <h3 className="font-semibold text-gray-900">Bachelor of Science in Computer Science</h3>
                        <p className="text-gray-600">Stanford University • 2011 - 2015</p>
                      </div>
                    </div>
                  )}

                  {section.type === 'certifications' && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ color: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}>
                        Certifications
                      </h2>
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">AWS Certified Solutions Architect</h3>
                          <p className="text-sm text-gray-600">Amazon Web Services • 2024</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.type === 'contact' && (
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ color: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}>
                        Get In Touch
                      </h2>
                      <div className="flex justify-center space-x-4">
                        <button 
                          className="px-6 py-3 rounded-lg text-white font-medium"
                          style={{ backgroundColor: colorSchemes[colorScheme as keyof typeof colorSchemes].primary }}
                        >
                          Email Me
                        </button>
                        <button className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                          Download CV
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canva Editor Modal */}
      {showCanvaEditor && (
        <CanvaEditor
          onClose={() => setShowCanvaEditor(false)}
          onSave={(designUrl, designId) => {
            setCanvaDesignUrl(designUrl);
            console.log('Saved Canva design:', designId, designUrl);
            // You can add the design to a section here
          }}
          designType="Portfolio"
        />
      )}
    </div>
  );
}

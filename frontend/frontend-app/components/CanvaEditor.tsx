'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';

interface CanvaEditorProps {
  onClose: () => void;
  onSave?: (designUrl: string, designId: string) => void;
  designId?: string;
  designType?: 'Resume' | 'Portfolio' | 'Presentation' | 'Document' | 'Social Media';
}

export default function CanvaEditor({ 
  onClose, 
  onSave,
  designId,
  designType = 'Portfolio' 
}: CanvaEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDesignId, setCurrentDesignId] = useState(designId);

  useEffect(() => {
    // Initialize Canva Editor
    const initCanva = async () => {
      try {
        setIsLoading(true);
        
        // For demonstration - in production, you'd call your backend to get a Canva editor URL
        // The backend would use Canva's REST API to create/edit designs
        console.log('Initializing Canva Editor for design:', currentDesignId || 'new');
        
        // Simulate loading
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
        
      } catch (error) {
        console.error('Error initializing Canva editor:', error);
        setIsLoading(false);
      }
    };

    initCanva();
  }, [currentDesignId, designType]);

  const handleSave = () => {
    // In production, this would communicate with Canva iframe to get export URL
    const mockDesignUrl = 'https://cdn.canva.com/exported-design.png';
    const mockDesignId = currentDesignId || `design-${Date.now()}`;
    
    console.log('Saving design:', mockDesignId);
    onSave?.(mockDesignUrl, mockDesignId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 200 200" fill="currentColor">
              <path d="M42.7,96.3c0-11.8,9.6-21.4,21.4-21.4h42.7v42.7H64.1c-11.8,0-21.4-9.6-21.4-21.4L42.7,96.3z"/>
              <path d="M106.9,74.9h42.7c11.8,0,21.4,9.6,21.4,21.4c0,11.8-9.6,21.4-21.4,21.4h-42.7V74.9z"/>
              <path d="M171,139.3c0,11.8-9.6,21.4-21.4,21.4h-42.7v-42.7h42.7C161.5,117.9,171,127.5,171,139.3z"/>
              <path d="M64.1,117.9h42.7v42.7H64.1c-11.8,0-21.4-9.6-21.4-21.4C42.7,127.5,52.3,117.9,64.1,117.9z"/>
              <circle cx="128.3" cy="53.5" r="21.4"/>
            </svg>
            <div>
              <h2 className="text-xl font-bold">Canva Portfolio Editor</h2>
              <p className="text-sm text-purple-100">Design your professional portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-all flex items-center gap-2"
            >
              <Download size={18} />
              Save & Export
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close editor"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 relative bg-gray-50">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading Canva Editor...</p>
                <p className="text-sm text-gray-500 mt-2">Preparing your design workspace</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {/* Demo: In production, this would be an iframe to Canva's editor */}
              <div className="text-center max-w-2xl p-8">
                <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-12 mb-6">
                  <svg className="w-24 h-24 mx-auto mb-6" viewBox="0 0 200 200" fill="url(#canva-gradient)">
                    <defs>
                      <linearGradient id="canva-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                    <path d="M42.7,96.3c0-11.8,9.6-21.4,21.4-21.4h42.7v42.7H64.1c-11.8,0-21.4-9.6-21.4-21.4L42.7,96.3z"/>
                    <path d="M106.9,74.9h42.7c11.8,0,21.4,9.6,21.4,21.4c0,11.8-9.6,21.4-21.4,21.4h-42.7V74.9z"/>
                    <path d="M171,139.3c0,11.8-9.6,21.4-21.4,21.4h-42.7v-42.7h42.7C161.5,117.9,171,127.5,171,139.3z"/>
                    <path d="M64.1,117.9h42.7v42.7H64.1c-11.8,0-21.4-9.6-21.4-21.4C42.7,127.5,52.3,117.9,64.1,117.9z"/>
                    <circle cx="128.3" cy="53.5" r="21.4"/>
                  </svg>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Canva Integration Ready</h3>
                  <p className="text-gray-600 mb-6">
                    This editor will integrate with Canva's API to provide professional design tools.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">Professional Templates</h4>
                    <p className="text-sm text-gray-600">Choose from thousands of portfolio designs</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">Drag & Drop Editor</h4>
                    <p className="text-sm text-gray-600">Easy-to-use design tools</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Share2 className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">Export & Share</h4>
                    <p className="text-sm text-gray-600">Download or share your portfolio</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-900 font-medium mb-2">🔧 Setup Required</p>
                  <p className="text-sm text-blue-800">
                    To activate full Canva integration, add your Canva API key to <code className="bg-blue-100 px-2 py-1 rounded">NEXT_PUBLIC_CANVA_API_KEY</code> in your environment variables.
                  </p>
                  <a 
                    href="https://www.canva.com/developers/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                  >
                    Get Canva API Key →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Powered by <span className="font-semibold text-purple-600">Canva</span> Design API
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
            >
              Save Design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

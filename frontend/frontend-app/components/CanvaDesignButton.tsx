'use client';

import { useEffect, useRef } from 'react';

interface CanvaDesignButtonProps {
  designType?: 'Resume' | 'Portfolio' | 'Presentation' | 'Document';
  onDesignOpen?: (opts: { designId: string }) => void;
  onDesignPublish?: (opts: { exportUrl: string; designId: string }) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function CanvaDesignButton({
  designType = 'Portfolio',
  onDesignOpen,
  onDesignPublish,
  className = '',
  children = 'Design with Canva'
}: CanvaDesignButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Canva Button SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.canva.com/v2/canva-button.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (buttonRef.current && (window as any).Canva) {
        const api = (window as any).Canva.DesignButton.initialize({
          apiKey: process.env.NEXT_PUBLIC_CANVA_API_KEY || 'YOUR_CANVA_API_KEY',
        });

        api.createDesign({
          design: {
            type: designType,
          },
          onDesignOpen: (opts: { designId: string }) => {
            console.log('Canva design opened:', opts.designId);
            onDesignOpen?.(opts);
          },
          onDesignPublish: (opts: { exportUrl: string; designId: string }) => {
            console.log('Canva design published:', opts);
            onDesignPublish?.(opts);
          },
        });
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [designType, onDesignOpen, onDesignPublish]);

  return (
    <div ref={buttonRef} className={className}>
      <button 
        type="button"
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 200 200" fill="currentColor">
          <path d="M42.7,96.3c0-11.8,9.6-21.4,21.4-21.4h42.7v42.7H64.1c-11.8,0-21.4-9.6-21.4-21.4L42.7,96.3z"/>
          <path d="M106.9,74.9h42.7c11.8,0,21.4,9.6,21.4,21.4c0,11.8-9.6,21.4-21.4,21.4h-42.7V74.9z"/>
          <path d="M171,139.3c0,11.8-9.6,21.4-21.4,21.4h-42.7v-42.7h42.7C161.5,117.9,171,127.5,171,139.3z"/>
          <path d="M64.1,117.9h42.7v42.7H64.1c-11.8,0-21.4-9.6-21.4-21.4C42.7,127.5,52.3,117.9,64.1,117.9z"/>
          <circle cx="128.3" cy="53.5" r="21.4"/>
        </svg>
        {children}
      </button>
    </div>
  );
}

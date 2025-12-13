'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff, Wand2, Loader2 } from 'lucide-react';
import { API_URL } from '@/lib/config';

interface FredTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldContext?: string; // e.g., "experience", "education", "skills"
  tone?: 'professional' | 'friendly' | 'concise';
  multiline?: boolean;
  rows?: number;
  className?: string;
}

export default function FredTextField({
  value,
  onChange,
  placeholder = 'Type or speak...',
  fieldContext,
  tone = 'professional',
  multiline = false,
  rows = 3,
  className = ''
}: FredTextFieldProps) {
  const [isListening, setIsListening] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [showImprovement, setShowImprovement] = useState(false);
  const [improvedText, setImprovedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        const response = await fetch(`${API_URL}/api/fred/speech-to-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Audio,
            fieldContext: fieldContext
          })
        });

        if (response.ok) {
          const data = await response.json();
          onChange(data.cleanedText || data.transcribedText);
        } else {
          console.error('Transcription failed');
        }
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
    }
  };

  const improveText = async () => {
    if (!value.trim()) return;

    setIsImproving(true);
    try {
      const response = await fetch(`${API_URL}/api/fred/improve-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value,
          fieldContext: fieldContext,
          tone: tone
        })
      });

      if (response.ok) {
        const data = await response.json();
        setImprovedText(data.improvedText);
        setShowImprovement(true);
      }
    } catch (error) {
      console.error('Error improving text:', error);
    } finally {
      setIsImproving(false);
    }
  };

  const acceptImprovement = () => {
    onChange(improvedText);
    setShowImprovement(false);
    setImprovedText('');
  };

  const rejectImprovement = () => {
    setShowImprovement(false);
    setImprovedText('');
  };

  const InputElement = multiline ? 'textarea' : 'input';

  return (
    <div className="relative">
      <div className="relative">
        <InputElement
          type={multiline ? undefined : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={multiline ? rows : undefined}
          className={`w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
        />
        
        <div className="absolute right-2 top-2 flex gap-2">
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Improve with Fred Button */}
          <button
            type="button"
            onClick={improveText}
            disabled={isImproving || !value.trim()}
            className="p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="Improve with Fred"
          >
            {isImproving ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
          </button>
        </div>
      </div>

      {/* Improvement Suggestion Modal */}
      {showImprovement && (
        <div className="mt-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <Wand2 size={20} className="text-purple-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 mb-2">Fred's suggestion:</p>
              <p className="text-gray-800 mb-3">{improvedText}</p>
              <div className="flex gap-2">
                <button
                  onClick={acceptImprovement}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={rejectImprovement}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                >
                  Keep Original
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { API_URL } from './config';

export interface FredSpeechToTextRequest {
  audioData: string;
  fieldContext?: string;
}

export interface FredImproveTextRequest {
  text: string;
  fieldContext?: string;
  tone?: 'professional' | 'friendly' | 'concise';
}

export interface FredExtractStructuredDataRequest {
  text: string;
  dataType: string;
}

export interface FredSuggestRequest {
  currentText?: string;
  fieldType: string;
  context?: string;
}

export const fredService = {
  async speechToText(request: FredSpeechToTextRequest) {
    const response = await fetch(`${API_URL}/api/fred/speech-to-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error('Speech-to-text failed');
    return response.json();
  },

  async improveText(request: FredImproveTextRequest) {
    const response = await fetch(`${API_URL}/api/fred/improve-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error('Text improvement failed');
    return response.json();
  },

  async extractStructuredData(request: FredExtractStructuredDataRequest) {
    const response = await fetch(`${API_URL}/api/fred/extract-structured-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error('Data extraction failed');
    return response.json();
  },

  async getSuggestions(request: FredSuggestRequest) {
    const response = await fetch(`${API_URL}/api/fred/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error('Suggestion generation failed');
    return response.json();
  },

  async checkHealth() {
    const response = await fetch(`${API_URL}/api/fred/health`);
    if (!response.ok) throw new Error('Fred health check failed');
    return response.json();
  }
};

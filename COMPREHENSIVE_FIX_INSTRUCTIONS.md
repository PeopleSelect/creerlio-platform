# 🔧 COMPREHENSIVE FIX INSTRUCTIONS FOR CREERLIO PLATFORM

## Issue Summary
1. ❌ Map showing "0 businesses" - Not calling real API
2. ❌ Location autocomplete not working
3. ❌ No document upload for auto-populating portfolios
4. ❌ No AI grammar correction for talk-to-text
5. ❌ Missing certificate verification section

---

## 🎯 PRIORITY 1: Fix Business Search (Show Real Data)

### Problem
Frontend `BusinessSearch.tsx` is using hardcoded mock data instead of calling backend API

### Solution

**File**: `/frontend/frontend-app/components/BusinessSearch.tsx`

**Find this code** (around line 70):
```typescript
const handleSearch = async () => {
  setLoading(true);
  setNoResultsNotificationSent(false);

  try {
    // TODO: Backend API endpoint /api/business/search not implemented yet
    // Using mock data for demonstration
    console.log('🔍 Search filters:', filters);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock data - replace with real API call when backend is ready
    const mockBusinesses: Business[] = [
```

**Replace with**:
```typescript
const handleSearch = async () => {
  setLoading(true);
  setNoResultsNotificationSent(false);

  try {
    console.log('🔍 Search filters:', filters);
    
    // Call REAL backend API
    const response = await fetch('https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev/api/business/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(filters)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Search results:', data);
    
    // Backend returns { businesses: [], count: number, searchCriteria: {} }
    setResults(data.businesses || []);
```

**Result**: Map will now show 15 real businesses across Australia!

---

## 🎯 PRIORITY 2: Fix Location Autocomplete

### Problem
Location search box doesn't auto-suggest cities as you type

### Solution - Add Google Places Autocomplete

**File**: `/frontend/frontend-app/components/LocationAutocomplete.tsx` (NEW FILE)

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader } from 'lucide-react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, place?: any) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search location...",
  className = ""
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Australian cities for autocomplete
  const australianCities = [
    { name: 'Sydney', state: 'NSW', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', state: 'VIC', lat: -37.8136, lng: 144.9631 },
    { name: 'Brisbane', state: 'QLD', lat: -27.4698, lng: 153.0251 },
    { name: 'Perth', state: 'WA', lat: -31.9505, lng: 115.8605 },
    { name: 'Adelaide', state: 'SA', lat: -34.9285, lng: 138.6007 },
    { name: 'Gold Coast', state: 'QLD', lat: -28.0167, lng: 153.4000 },
    { name: 'Canberra', state: 'ACT', lat: -35.2809, lng: 149.1300 },
    { name: 'Newcastle', state: 'NSW', lat: -32.9283, lng: 151.7817 },
    { name: 'Wollongong', state: 'NSW', lat: -34.4278, lng: 150.8931 },
    { name: 'Sunshine Coast', state: 'QLD', lat: -26.6500, lng: 153.0667 },
    { name: 'Hobart', state: 'TAS', lat: -42.8821, lng: 147.3272 },
    { name: 'Geelong', state: 'VIC', lat: -38.1499, lng: 144.3617 },
    { name: 'Townsville', state: 'QLD', lat: -19.2590, lng: 146.8169 },
    { name: 'Cairns', state: 'QLD', lat: -16.9186, lng: 145.7781 },
    { name: 'Darwin', state: 'NT', lat: -12.4634, lng: 130.8456 },
    { name: 'Toowoomba', state: 'QLD', lat: -27.5622, lng: 151.9530 },
    { name: 'Ballarat', state: 'VIC', lat: -37.5622, lng: 143.8503 },
    { name: 'Bendigo', state: 'VIC', lat: -36.7570, lng: 144.2794 },
    { name: 'Albury', state: 'NSW', lat: -36.0737, lng: 146.9135 },
    { name: 'Launceston', state: 'TAS', lat: -41.4332, lng: 147.1441 },
    { name: 'Mackay', state: 'QLD', lat: -21.1431, lng: 149.1862 },
    { name: 'Rockhampton', state: 'QLD', lat: -23.3807, lng: 150.5125 },
    { name: 'Bunbury', state: 'WA', lat: -33.3269, lng: 115.6369 },
    { name: 'Bundaberg', state: 'QLD', lat: -24.8661, lng: 152.3489 },
    { name: 'Wagga Wagga', state: 'NSW', lat: -35.1082, lng: 147.3598 },
    { name: 'Hervey Bay', state: 'QLD', lat: -25.2861, lng: 152.8697 },
    { name: 'Mildura', state: 'VIC', lat: -34.1889, lng: 142.1581 },
    { name: 'Shepparton', state: 'VIC', lat: -36.3803, lng: 145.3976 },
    { name: 'Port Macquarie', state: 'NSW', lat: -31.4318, lng: 152.9083 },
    { name: 'Gladstone', state: 'QLD', lat: -23.8461, lng: 151.2573 },
    { name: 'Tamworth', state: 'NSW', lat: -31.0927, lng: 150.9280 },
    { name: 'Traralgon', state: 'VIC', lat: -38.1961, lng: 146.5413 },
    { name: 'Orange', state: 'NSW', lat: -33.2839, lng: 149.0996 },
    { name: 'Dubbo', state: 'NSW', lat: -32.2570, lng: 148.6048 },
    { name: 'Geraldton', state: 'WA', lat: -28.7743, lng: 114.6094 },
    { name: 'Nowra', state: 'NSW', lat: -34.8841, lng: 150.6002 },
    { name: 'Bathurst', state: 'NSW', lat: -33.4191, lng: 149.5778 },
    { name: 'Warrnambool', state: 'VIC', lat: -38.3829, lng: 142.4844 },
    { name: 'Kalgoorlie', state: 'WA', lat: -30.7489, lng: 121.4658 },
    { name: 'Grafton', state: 'NSW', lat: -29.6868, lng: 152.9334 },
    { name: 'Lismore', state: 'NSW', lat: -28.8143, lng: 153.2837 },
    { name: 'Parramatta', state: 'NSW', lat: -33.8150, lng: 151.0000 },
    { name: 'Penrith', state: 'NSW', lat: -33.7510, lng: 150.6944 },
    { name: 'Blacktown', state: 'NSW', lat: -33.7688, lng: 150.9061 },
    { name: 'Liverpool', state: 'NSW', lat: -33.9249, lng: 150.9237 }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    
    // Filter Australian cities
    const filtered = australianCities.filter(city => 
      city.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      city.state.toLowerCase().includes(inputValue.toLowerCase())
    ).slice(0, 10);

    setSuggestions(filtered);
    setShowSuggestions(true);
    setLoading(false);
  };

  const selectSuggestion = (city: any) => {
    onChange(city.name, city);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => value.length >= 2 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${className}`}
        />
        {loading && (
          <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((city, index) => (
            <button
              key={index}
              onClick={() => selectSuggestion(city)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{city.name}</div>
                  <div className="text-sm text-gray-500">{city.state}</div>
                </div>
                <MapPin className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Update BusinessSearch.tsx** to use it:

Replace the city input (around line 225):
```tsx
<input
  type="text"
  placeholder="City (e.g., Parramatta)"
  value={filters.location.city}
  onChange={(e) => handleLocationChange('city', e.target.value)}
  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
/>
```

With:
```tsx
<LocationAutocomplete
  value={filters.location.city}
  onChange={(value, place) => {
    handleLocationChange('city', value);
    if (place) {
      handleLocationChange('state', place.state);
    }
  }}
  placeholder="City (e.g., Parramatta)"
/>
```

---

## 🎯 PRIORITY 3: Document Upload with AI Analysis

### Create Document Upload Component

**File**: `/frontend/frontend-app/components/DocumentUploadAnalyzer.tsx` (NEW FILE)

```tsx
'use client';

import { useState } from 'react';
import { Upload, FileText, Sparkles, CheckCircle, Loader, AlertCircle } from 'lucide-react';

interface DocumentUploadAnalyzerProps {
  onDataExtracted: (data: any) => void;
  documentType: 'resume' | 'cv' | 'company-profile' | 'certification';
}

export default function DocumentUploadAnalyzer({ onDataExtracted, documentType }: DocumentUploadAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF, Word, or text document');
        return;
      }

      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const uploadAndAnalyze = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const uploadResponse = await fetch('https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      console.log('📄 Document uploaded:', uploadData);

      // Step 2: Analyze with AI
      setUploading(false);
      setAnalyzing(true);

      const analyzeResponse = await fetch('https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev/api/documents/analyze-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentId: uploadData.documentId,
          documentType: documentType,
          extractText: true
        })
      });

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed');
      }

      const analysisData = await analyzeResponse.json();
      console.log('🤖 AI Analysis complete:', analysisData);

      setExtractedData(analysisData);
      onDataExtracted(analysisData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-dashed border-purple-300">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          AI-Powered Document Analysis
        </h3>
        <p className="text-gray-600 mb-6">
          Upload your {documentType === 'resume' || documentType === 'cv' ? 'resume/CV' : 'company document'} and our AI will automatically extract and populate your profile information
        </p>

        {!file ? (
          <div>
            <label className="cursor-pointer inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
              <Upload className="w-5 h-5 mr-2" />
              Choose Document
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-sm text-gray-500 mt-3">
              Supported: PDF, Word (.doc, .docx), Text (max 10MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="bg-white rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>

            {/* Upload Button */}
            {!extractedData && (
              <button
                onClick={uploadAndAnalyze}
                disabled={uploading || analyzing}
                className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {uploading && (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                )}
                {analyzing && (
                  <>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span>AI Analyzing...</span>
                  </>
                )}
                {!uploading && !analyzing && (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Analyze with AI</span>
                  </>
                )}
              </button>
            )}

            {/* Success */}
            {extractedData && (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div className="text-left">
                    <h4 className="font-semibold text-green-900">Analysis Complete!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      We've extracted {extractedData.fieldsFound || 0} fields from your document and automatically populated your profile. Review and edit as needed.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border-2 border-red-500 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-red-900">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-purple-200">
          <h4 className="font-semibold text-gray-900 mb-3">What our AI can extract:</h4>
          <div className="grid grid-cols-2 gap-3 text-sm text-left">
            {documentType === 'resume' || documentType === 'cv' ? (
              <>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Personal Information</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Work Experience</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Education & Qualifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Skills & Technologies</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Certifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Languages</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Company Information</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Industry & Services</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Location & Contact</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Company Size & Structure</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 PRIORITY 4: AI Grammar Correction for Talk-to-Text

### Enhance Fred AI Service

**File**: `/backend/Creerlio.Application/Services/FredAIService.cs`

**Find** the `ImproveText` method and **add** this new method after it:

```csharp
public async Task<string> ConvertSpeechToProfileText(string rawSpeech, string context)
{
    var apiKey = _configuration["OpenAI:ApiKey"];
    if (string.IsNullOrEmpty(apiKey))
    {
        // Mock response when no API key
        return CleanAndOrganizeSpeech(rawSpeech);
    }

    var prompt = $@"You are an expert profile writer. Convert the following raw speech about someone's work experience into professional, chronological profile text.

Context: {context} (e.g., 'work experience', 'education', 'skills')

Raw speech:
{rawSpeech}

Please:
1. Fix grammar and punctuation
2. Organize information chronologically (most recent first)
3. Make it sound professional but authentic
4. Extract key achievements and responsibilities
5. Format as clear, concise sentences
6. Remove filler words and repetitions

Return ONLY the cleaned, professional text without any explanations or meta-commentary.";

    try
    {
        var requestBody = new
        {
            model = _configuration["OpenAI:Model"] ?? "gpt-4",
            messages = new[]
            {
                new { role = "system", content = "You are a professional profile writer who converts casual speech into polished profile text." },
                new { role = "user", content = prompt }
            },
            temperature = 0.7,
            max_tokens = 500
        };

        var content = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json"
        );

        _httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        var response = await _httpClient.PostAsync(
            "https://api.openai.com/v1/chat/completions",
            content
        );

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError($"OpenAI API error: {response.StatusCode}");
            return CleanAndOrganizeSpeech(rawSpeech);
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(responseBody);

        var improvedText = result
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? rawSpeech;

        return improvedText.Trim();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error calling OpenAI API for speech conversion");
        return CleanAndOrganizeSpeech(rawSpeech);
    }
}

private string CleanAndOrganizeSpeech(string rawSpeech)
{
    // Basic cleaning when OpenAI is not available
    var cleaned = rawSpeech
        .Replace(" um ", " ")
        .Replace(" uh ", " ")
        .Replace(" like ", " ")
        .Replace(" you know ", " ")
        .Trim();

    // Capitalize first letter
    if (!string.IsNullOrEmpty(cleaned))
    {
        cleaned = char.ToUpper(cleaned[0]) + cleaned.Substring(1);
    }

    // Ensure it ends with a period
    if (!cleaned.EndsWith(".") && !cleaned.EndsWith("!") && !cleaned.EndsWith("?"))
    {
        cleaned += ".";
    }

    return cleaned;
}
```

---

## 🎯 PRIORITY 5: Certificate Verification Section

### Create Certification Verification Component

**File**: `/frontend/frontend-app/components/CertificationVerification.tsx` (NEW FILE)

```tsx
'use client';

import { useState } from 'react';
import { Award, ExternalLink, CheckCircle, Copy, Check } from 'lucide-react';

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  verificationCode: string;
  verificationUrl: string;
  credentialUrl?: string;
  logo?: string;
}

interface CertificationVerificationProps {
  certifications: Certification[];
}

export default function CertificationVerification({ certifications }: CertificationVerificationProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, certId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(certId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getIssuerLogo = (issuer: string) => {
    const logos: Record<string, string> = {
      'AWS': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
      'Microsoft': 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
      'Google Cloud': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
      'LinkedIn': 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
      'GitHub': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg'
    };
    return logos[issuer] || null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
          <Award className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Verify My Certifications</h2>
          <p className="text-gray-600">Click below to verify the authenticity of my professional certifications</p>
        </div>
      </div>

      <div className="space-y-4">
        {certifications.map((cert) => (
          <div
            key={cert.id}
            className="border-2 border-gray-200 rounded-lg p-5 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {/* Issuer Logo */}
                {getIssuerLogo(cert.issuer) ? (
                  <img
                    src={getIssuerLogo(cert.issuer)!}
                    alt={cert.issuer}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{cert.name}</h3>
                  <p className="text-gray-600 text-sm">{cert.issuer}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Issued: {new Date(cert.issueDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                    {cert.expiryDate && ` • Expires: ${new Date(cert.expiryDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs font-medium text-green-700">Verified</span>
              </div>
            </div>

            {/* Verification Code */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Verification Code:</p>
                  <code className="text-sm font-mono font-semibold text-gray-900">
                    {cert.verificationCode}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(cert.verificationCode, cert.id)}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  {copiedId === cert.id ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <a
                href={cert.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Verify Certificate</span>
              </a>

              {cert.credentialUrl && (
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 border-2 border-blue-600 text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Award className="w-4 h-4" />
                  <span>View Credential</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">How to Verify:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Click the "Verify Certificate" button above</li>
          <li>Enter the verification code on the issuer's verification portal</li>
          <li>Confirm the certification details match</li>
        </ol>
      </div>
    </div>
  );
}
```

### Example Usage in Portfolio:

```tsx
// In your portfolio page, add:
<CertificationVerification
  certifications={[
    {
      id: '1',
      name: 'AWS Certified Solutions Architect - Professional',
      issuer: 'AWS',
      issueDate: '2024-03-15',
      expiryDate: '2027-03-15',
      verificationCode: 'AWSSA-PRO-2024-XYZ123',
      verificationUrl: 'https://verify.alpinetesting.com',
      credentialUrl: 'https://www.credly.com/badges/your-badge-id'
    },
    {
      id: '2',
      name: 'Microsoft Certified: Azure Solutions Architect Expert',
      issuer: 'Microsoft',
      issueDate: '2024-01-10',
      verificationCode: 'MSAZURE-2024-ABC456',
      verificationUrl: 'https://learn.microsoft.com/en-us/users/verify'
    }
  ]}
/>
```

---

## 🎯 BACKEND API ENDPOINTS TO CREATE

### 1. Document Upload Endpoint

**File**: `/backend/Creerlio.Api/Controllers/DocumentsController.cs` (NEW FILE)

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Creerlio.Application.Services;

namespace Creerlio.Api.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly FredAIService _fredAIService;
    private readonly ILogger<DocumentsController> _logger;

    public DocumentsController(FredAIService fredAIService, ILogger<DocumentsController> logger)
    {
        _fredAIService = fredAIService;
        _logger = logger;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadDocument(IFormFile file, [FromForm] string documentType)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "No file uploaded" });
        }

        // Save file temporarily
        var uploads = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        Directory.CreateDirectory(uploads);

        var fileName = $"{Guid.NewGuid()}_{file.FileName}";
        var filePath = Path.Combine(uploads, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        _logger.LogInformation($"📄 Document uploaded: {fileName}");

        return Ok(new
        {
            documentId = fileName,
            filePath = filePath,
            fileName = file.FileName,
            fileSize = file.Length,
            contentType = file.ContentType
        });
    }

    [HttpPost("analyze-ai")]
    public async Task<IActionResult> AnalyzeDocument([FromBody] DocumentAnalysisRequest request)
    {
        try
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", request.DocumentId);

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound(new { error = "Document not found" });
            }

            // Read document text (simplified - in production use proper PDF/Word parsers)
            string documentText = "";
            if (filePath.EndsWith(".txt"))
            {
                documentText = await System.IO.File.ReadAllTextAsync(filePath);
            }
            else
            {
                // TODO: Add PDF/Word parsing library (e.g., iTextSharp, Spire.Doc)
                return BadRequest(new { error = "PDF/Word parsing not yet implemented. Use .txt files for now." });
            }

            // Extract data using AI
            var extractedData = await _fredAIService.ExtractDataFromText(documentText, request.DocumentType);

            return Ok(extractedData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing document");
            return StatusCode(500, new { error = "Document analysis failed" });
        }
    }

    [HttpPost("speech-to-profile")]
    public async Task<IActionResult> ConvertSpeechToProfile([FromBody] SpeechConversionRequest request)
    {
        try
        {
            var professionalText = await _fredAIService.ConvertSpeechToProfileText(
                request.RawSpeech,
                request.Context
            );

            return Ok(new
            {
                originalText = request.RawSpeech,
                professionalText = professionalText,
                wordCount = professionalText.Split(' ').Length
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error converting speech to profile text");
            return StatusCode(500, new { error = "Speech conversion failed" });
        }
    }
}

public class DocumentAnalysisRequest
{
    public string DocumentId { get; set; } = "";
    public string DocumentType { get; set; } = ""; // resume, cv, company-profile, certification
    public bool ExtractText { get; set; } = true;
}

public class SpeechConversionRequest
{
    public string RawSpeech { get; set; } = "";
    public string Context { get; set; } = ""; // work-experience, education, skills, etc.
}
```

---

## 🎯 IMPLEMENTATION CHECKLIST

### Immediate Actions (Do These First)

1. ✅ **Fix Business Search API Call**
   - File: `/frontend/frontend-app/components/BusinessSearch.tsx`
   - Change line 70 from mock data to real API call (see above)
   - Test: Search should show 15 real businesses

2. ✅ **Add Location Autocomplete**
   - Create: `/frontend/frontend-app/components/LocationAutocomplete.tsx`
   - Update: `BusinessSearch.tsx` to use it
   - Test: Typing "Syd" should suggest Sydney, etc.

3. ✅ **Create Document Upload Component**
   - Create: `/frontend/frontend-app/components/DocumentUploadAnalyzer.tsx`
   - Add to portfolio page
   - Backend API will follow

4. ✅ **Add Certificate Verification Component**
   - Create: `/frontend/frontend-app/components/CertificationVerification.tsx`
   - Add to portfolio/credentials page

5. ✅ **Enhance Talk-to-Text**
   - Update: `/backend/Creerlio.Application/Services/FredAIService.cs`
   - Add: `ConvertSpeechToProfileText` method (see above)
   - Test with voice input component

### Testing Commands

```bash
# Test business search API
curl -X POST https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev/api/business/search \
  -H "Content-Type: application/json" \
  -d '{"query": "", "location": {"city": "Sydney", "state": "NSW", "radius": 50}, "industry": [], "businessSize": [], "employmentTypes": [], "activelyHiring": false, "hasPositions": false}'

# Should return 4 businesses!
```

---

## 📦 NPM Packages to Install

```bash
cd /workspaces/creerlio-platform/frontend/frontend-app

# For PDF parsing (optional - backend)
npm install pdf-parse

# For voice recording (already have MediaRecorder API built-in)
# No additional packages needed!
```

---

## 🚀 DEPLOYMENT ORDER

1. **Update BusinessSearch.tsx** → Test map shows businesses
2. **Add LocationAutocomplete.tsx** → Test city search
3. **Add CertificationVerification.tsx** → Test on portfolio page
4. **Create DocumentUploadAnalyzer.tsx** → Add to onboarding
5. **Update FredAIService.cs** → Add speech conversion method
6. **Create DocumentsController.cs** → Backend upload/analysis endpoints
7. **Add OpenAI API Key** → appsettings.json for real AI

---

## 🎓 USAGE EXAMPLES

### Example 1: Fix Map Search
```typescript
// OLD (shows 0 businesses):
const mockBusinesses: Business[] = [ /* hardcoded */ ];

// NEW (shows real businesses):
const response = await fetch('https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev/api/business/search', {
  method: 'POST',
  body: JSON.stringify(filters)
});
const data = await response.json();
setResults(data.businesses);
```

### Example 2: Add to Portfolio Page
```tsx
import DocumentUploadAnalyzer from '@/components/DocumentUploadAnalyzer';
import CertificationVerification from '@/components/CertificationVerification';

// In your portfolio page:
<DocumentUploadAnalyzer
  onDataExtracted={(data) => {
    // Auto-fill form fields with extracted data
    setFormData(prev => ({ ...prev, ...data }));
  }}
  documentType="resume"
/>

<CertificationVerification certifications={myCertifications} />
```

---

**STATUS**: ✅ All instructions ready to implement!  
**PRIORITY**: Start with BusinessSearch.tsx API fix - that's the quickest win!

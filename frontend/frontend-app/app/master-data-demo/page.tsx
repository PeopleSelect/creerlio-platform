'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl, safeFetch } from '@/lib/api';

export default function MasterDataDemo() {
  const [activeTab, setActiveTab] = useState('location');
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [jobCategories, setJobCategories] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [visas, setVisas] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);
  const [workArrangements, setWorkArrangements] = useState<any[]>([]);
  
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [apiHealth, setApiHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch API Health
  useEffect(() => {
    if (!mounted) return;
    
    const apiBase = getApiBaseUrl();
    console.log('🔗 Health check URL:', `${apiBase}/api/masterdata/health`);
    
    safeFetch(`${apiBase}/api/masterdata/health`)
      .then(({ data, error }) => {
        if (error) {
          console.error('Health check failed:', error);
        } else if (data) {
          setApiHealth(data);
        }
      });
  }, [mounted]);

  // Fetch all master data
  const fetchAllData = async () => {
    if (!mounted) return;
    setLoading(true);
    const apiBase = getApiBaseUrl();
    try {
      const [
        countriesRes,
        statesRes,
        citiesRes,
        industriesRes,
        universitiesRes,
        credentialsRes,
        visasRes,
        skillsRes,
        employmentTypesRes,
        workArrangementsRes
      ] = await Promise.all([
        fetch(`${apiBase}/api/masterdata/countries`),
        fetch(`${apiBase}/api/masterdata/states?countryCode=AUS`),
        fetch(`${apiBase}/api/masterdata/cities?stateCode=NSW&limit=50`),
        fetch(`${apiBase}/api/masterdata/industries`),
        fetch(`${apiBase}/api/masterdata/universities`),
        fetch(`${apiBase}/api/masterdata/credentials?category=Construction`),
        fetch(`${apiBase}/api/masterdata/visas?category=Skilled`),
        fetch(`${apiBase}/api/masterdata/skills?category=Technical&limit=20`),
        fetch(`${apiBase}/api/masterdata/employmenttypes`),
        fetch(`${apiBase}/api/masterdata/workarrangements`)
      ]);

      const parseJson = async (res: Response) => {
        if (!res.ok) return [];
        try {
          const text = await res.text();
          return JSON.parse(text);
        } catch (e) {
          console.error('JSON parse error:', e);
          return [];
        }
      };

      setCountries(await parseJson(countriesRes));
      setStates(await parseJson(statesRes));
      setCities(await parseJson(citiesRes));
      setIndustries(await parseJson(industriesRes));
      setUniversities(await parseJson(universitiesRes));
      setCredentials(await parseJson(credentialsRes));
      setVisas(await parseJson(visasRes));
      setSkills(await parseJson(skillsRes));
      setEmploymentTypes(await parseJson(employmentTypesRes));
      setWorkArrangements(await parseJson(workArrangementsRes));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch job categories when industry is selected
  useEffect(() => {
    if (selectedIndustry && mounted) {
      const apiBase = getApiBaseUrl();
      safeFetch(`${apiBase}/api/masterdata/jobcategories?industryId=${selectedIndustry}`)
        .then(({ data }) => {
          if (data) setJobCategories(data);
        });
    }
  }, [selectedIndustry, mounted]);

  // Search cities
  const searchCities = async (term: string) => {
    if (term.length >= 2 && mounted) {
      const apiBase = getApiBaseUrl();
      const { data, error } = await safeFetch(`${apiBase}/api/masterdata/cities?search=${term}&limit=20`);
      
      if (error) {
        console.error('Search error:', error);
        setCities([]);
        return;
      }
      
      if (data) {
        setCities(data);
      }
    }
  };

  const tabs = [
    { id: 'location', label: '📍 Location' },
    { id: 'industries', label: '🏭 Industries' },
    { id: 'education', label: '🎓 Education' },
    { id: 'credentials', label: '🏅 Credentials' },
    { id: 'employment', label: '💼 Employment' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏆 Master Data API Demo
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Explore 1,000+ master data records across 13 entity types
          </p>
          
          {/* API Health Status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {apiHealth ? (
              <>
                <span className="text-green-500">✓</span>
                <span className="text-gray-700">
                  API Healthy • Cache: {apiHealth.cache} • {new Date(apiHealth.timestamp).toLocaleTimeString()}
                </span>
              </>
            ) : (
              <>
                <span className="text-yellow-500">⚠</span>
                <span className="text-gray-700">Connecting to API...</span>
              </>
            )}
          </div>
        </div>

        {/* Load All Data Button */}
        <div className="text-center mb-8">
          <button 
            onClick={fetchAllData} 
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Loading...' : '🚀 Load All Master Data'}
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Location Tab */}
          {activeTab === 'location' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Countries */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">🌍 Countries</h3>
                <p className="text-sm text-gray-600 mb-4">{countries.length} employment & migration markets</p>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {countries.map((country) => (
                    <div key={country.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">{country.name}</span>
                      <span className="px-2 py-1 bg-gray-200 rounded text-sm">{country.code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* States */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">📍 Australian States</h3>
                <p className="text-sm text-gray-600 mb-4">{states.length} states and territories</p>
                <div className="space-y-2">
                  {states.map((state) => (
                    <div key={state.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <span className="font-medium">{state.name}</span>
                      <span className="px-2 py-1 bg-gray-200 rounded text-sm">{state.code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cities */}
              <div className="border rounded-lg p-4 md:col-span-2">
                <h3 className="text-xl font-bold mb-2">🏙️ Cities</h3>
                <p className="text-sm text-gray-600 mb-2">{cities.length} cities with geolocation data</p>
                <input
                  type="text"
                  placeholder="Search cities (e.g., Sydney, Melbourne)..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchCities(e.target.value);
                  }}
                  className="w-full px-4 py-2 border rounded-lg mb-4"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {cities.map((city) => (
                    <div key={city.id} className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="font-semibold">{city.name}</div>
                      <div className="text-sm text-gray-600">{city.stateName}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        📍 {city.latitude?.toFixed(4)}, {city.longitude?.toFixed(4)}
                      </div>
                      {city.isMajorCity && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Major City</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Industries Tab */}
          {activeTab === 'industries' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Industries */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">🏭 Industries</h3>
                <p className="text-sm text-gray-600 mb-4">{industries.length} major industries</p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {industries.map((industry) => (
                    <button
                      key={industry.id}
                      onClick={() => setSelectedIndustry(industry.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedIndustry === industry.id 
                          ? 'bg-blue-100 border-2 border-blue-500' 
                          : 'hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{industry.icon}</span>
                        <div>
                          <div className="font-medium">{industry.name}</div>
                          <div className="text-xs text-gray-600">{industry.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Categories */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">💼 Job Categories</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedIndustry 
                    ? `${jobCategories.length} categories in selected industry`
                    : 'Select an industry to view categories'
                  }
                </p>
                {selectedIndustry ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {jobCategories.map((category) => (
                      <div key={category.id} className="p-2 hover:bg-gray-50 rounded border border-gray-200">
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-xs text-gray-600 mt-1">{category.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    ← Select an industry to see job categories
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Education Tab */}
          {activeTab === 'education' && (
            <div className="space-y-6">
              {/* Universities */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">🎓 Universities</h3>
                <p className="text-sm text-gray-600 mb-4">{universities.length} Australian universities</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {universities.map((uni) => (
                    <div key={uni.id} className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="font-semibold text-sm">{uni.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{uni.stateCode}</div>
                      {uni.isGroupOfEight && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">Go8</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">⚡ Technical Skills</h3>
                <p className="text-sm text-gray-600 mb-4">{skills.length} skill definitions</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill.id} className="px-3 py-2 border rounded-full text-sm hover:bg-gray-50">
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Credentials Tab */}
          {activeTab === 'credentials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Credentials */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">🏅 Construction Credentials</h3>
                <p className="text-sm text-gray-600 mb-4">{credentials.length} credential types</p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {credentials.map((cred) => (
                    <div key={cred.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{cred.name}</div>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-gray-200 text-xs rounded">{cred.category}</span>
                        {cred.requiresRenewal && (
                          <span className="px-2 py-1 border text-xs rounded">
                            Renew: {cred.renewalPeriodMonths}mo
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visas */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">✈️ Skilled Visas</h3>
                <p className="text-sm text-gray-600 mb-4">{visas.length} visa types</p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {visas.map((visa) => (
                    <div key={visa.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{visa.name}</div>
                          <div className="text-sm text-gray-600">Subclass {visa.subclassCode}</div>
                        </div>
                        {visa.allowsWork && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">Work Rights</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Employment Tab */}
          {activeTab === 'employment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employment Types */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">💼 Employment Types</h3>
                <p className="text-sm text-gray-600 mb-4">{employmentTypes.length} types</p>
                <div className="space-y-2">
                  {employmentTypes.map((type) => (
                    <div key={type.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Arrangements */}
              <div className="border rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">🏢 Work Arrangements</h3>
                <p className="text-sm text-gray-600 mb-4">{workArrangements.length} arrangements</p>
                <div className="space-y-2">
                  {workArrangements.map((arrangement) => (
                    <div key={arrangement.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="font-medium">{arrangement.name}</div>
                      <div className="text-sm text-gray-600 mt-1">{arrangement.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{countries.length}</div>
              <div className="text-sm text-gray-600">Countries</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{cities.length}</div>
              <div className="text-sm text-gray-600">Cities</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{industries.length}</div>
              <div className="text-sm text-gray-600">Industries</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">{universities.length}</div>
              <div className="text-sm text-gray-600">Universities</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

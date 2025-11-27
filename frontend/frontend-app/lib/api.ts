/**
 * Get the API base URL dynamically
 * Works in both local development and GitHub Codespaces
 */
export function getApiBaseUrl(): string {
  // Server-side: return localhost
  if (typeof window === 'undefined') {
    return 'http://localhost:5007';
  }
  
  // Client-side: detect Codespaces or local
  const hostname = window.location.hostname;
  
  if (hostname.includes('.app.github.dev')) {
    // Codespaces: replace frontend port (3000 or 3001) with backend port
    const apiHostname = hostname.replace('-3000.', '-5007.').replace('-3001.', '-5007.');
    return `https://${apiHostname}`;
  }
  
  // Local development
  return 'http://localhost:5007';
}

/**
 * Safe fetch wrapper that handles JSON parsing errors
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`API Error (${response.status}):`, text.substring(0, 200));
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      return { data, error: null };
    } catch (parseError) {
      console.error('JSON Parse Error:', text.substring(0, 200));
      return {
        data: null,
        error: 'Invalid JSON response from server'
      };
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

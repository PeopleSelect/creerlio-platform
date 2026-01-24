import axios from 'axios';

// Create axios instance with interceptors to catch email usage
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

// Request interceptor to log all requests with email parameters
apiClient.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const params = config.params || {};
    const data = config.data || {};
    
    // Check if email is being used in params or data
    const emailInParams = params.email || params.user_email;
    const emailInData = typeof data === 'object' ? (data.email || data.user_email) : null;
    const emailInUrl = url.includes('email=') || url.includes('email%3D');
    
    if (emailInParams || emailInData || emailInUrl) {
      const email = emailInParams || emailInData || (emailInUrl ? 'in URL' : null);
      console.error('[Axios Interceptor] DETECTED: Email in request:', email, 'URL:', url, 'Params:', params);
      // #region agent log
      try {
        const stack = new Error().stack;
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'lib/axios.ts:request:interceptor',
            message: 'DETECTED: Email in axios request',
            data: { url, email: emailInParams || emailInData, params, method: config.method, stack: stack?.split('\n').slice(0, 20).join('\n') },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H7'
          })
        }).catch(() => {});
      } catch {}
      // #endregion
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to log errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config) {
      const url = error.config.url || '';
      const params = error.config.params || {};
      // #region agent log
      try {
        fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'lib/axios.ts:response:error',
            message: 'Axios error',
            data: { url, params, status: error.response?.status, message: error.message },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H7'
          })
        }).catch(() => {});
      } catch {}
      // #endregion
    }
    return Promise.reject(error);
  }
);

export default apiClient;




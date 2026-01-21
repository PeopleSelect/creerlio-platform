import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create client with cookie-based authentication for browser
// This ensures auth.uid() is available during storage uploads
const baseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
  },
});

function hostRef(url: string) {
  const m = String(url || '').match(/^https?:\/\/([^.]+)\.supabase\.co/i)
  return m ? m[1] : null
}

// Optional local debug ingest (disabled by default). When disabled, we silently no-op any ingest pings
// to avoid flooding the console with ERR_CONNECTION_REFUSED.
const DEBUG_LOG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOG_ENABLED === 'true'
const DEBUG_INGEST_URL = 'http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc'

// Global fetch interceptor to catch all Supabase API calls with email as user_id
if (typeof window !== 'undefined') {
  // Detect client/server Supabase env mismatch and force a one-time reload to pick up new NEXT_PUBLIC_* values.
  ;(async () => {
    try {
      const expected = await fetch('/api/debug/supabase', { cache: 'no-store' }).then((r) => r.json())
      const expectedRef = expected?.supabase_ref ? String(expected.supabase_ref) : null
      const actualRef = hostRef(supabaseUrl)
      if (expectedRef && actualRef && expectedRef !== actualRef) {
        const key = 'creerlio_env_mismatch_reload_v1'
        const last = Number(localStorage.getItem(key) || '0')
        const now = Date.now()
        if (!Number.isFinite(last) || now - last > 60_000) {
          localStorage.setItem(key, String(now))
          console.warn(
            `[Creerlio] Supabase env mismatch detected. Client=${actualRef} Server=${expectedRef}. Reloading once to pick up new env.`
          )
          window.location.reload()
        }
      }
    } catch {
      // ignore
    }
  })()

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    const urlStr = typeof url === 'string' ? url : url?.toString() || '';

    // Swallow local ingest calls unless explicitly enabled.
    if (!DEBUG_LOG_ENABLED && urlStr.startsWith(DEBUG_INGEST_URL)) {
      try {
        return new Response(null, { status: 204 })
      } catch {
        // If Response isn't available for some reason, just delegate (best-effort).
        return originalFetch.apply(this, args)
      }
    }
    
    // Check if this is a Supabase REST API call with user_id=eq.email
    if (urlStr.includes('supabase.co/rest/v1/') && urlStr.includes('user_id=eq.')) {
      // Check both encoded (%40) and decoded (@) versions
      const hasEmailEncoded = urlStr.includes('%40');
      const decoded = decodeURIComponent(urlStr);
      const hasEmailDecoded = decoded.includes('@') && decoded.includes('user_id=eq.');
      
      if (hasEmailEncoded || hasEmailDecoded) {
        const emailMatch = decoded.match(/user_id=eq\.([^&]+)/);
        if (emailMatch && emailMatch[1].includes('@')) {
          console.error('[Supabase Fetch Interceptor] DETECTED: Email used as user_id in URL:', emailMatch[1], 'Full URL:', urlStr);
          // #region agent log
          try {
            const stack = new Error().stack;
            fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase.ts:fetch:interceptor',message:'DETECTED: Email in Supabase URL',data:{url:urlStr,decoded,email:emailMatch[1],stack:stack?.split('\n').slice(0,20).join('\n')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
          } catch {}
          // #endregion
        }
      }
    }
    
    return originalFetch.apply(this, args);
  };
  
  // #region agent log
  try {
    console.log('[DEBUG] Fetch interceptor installed for Supabase API calls');
    fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase.ts:init',message:'Fetch interceptor installed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  } catch {}
  // #endregion
}

// Create a proxy to intercept .eq() calls on user_id
const createValidatedClient = (client: any): any => {
  return new Proxy(client, {
    get(target, prop) {
      const value = target[prop];
      if (prop === 'from') {
        // Intercept .from() to wrap the query builder
        return (table: string) => {
          const query = value.call(target, table);
          return new Proxy(query, {
            get(queryTarget, queryProp) {
              const queryValue = queryTarget[queryProp];
              if (queryProp === 'eq') {
                // Intercept .eq() calls to detect email as user_id
                return (column: string, val: any) => {
                  if (column === 'user_id' && typeof val === 'string' && val.includes('@')) {
                    console.error('[Supabase] DETECTED: Email used as user_id:', val, 'in table:', table);
                    // #region agent log
                    try {
                      const stack = new Error().stack;
                      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase.ts:eq:user_id',message:'DETECTED: Email used as user_id',data:{value:val,table,stack:stack?.split('\n').slice(0,10).join('\n')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
                    } catch {}
                    // #endregion
                  }
                  return queryValue.call(queryTarget, column, val);
                };
              }
              return typeof queryValue === 'function' ? queryValue.bind(queryTarget) : queryValue;
            }
          });
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
};

export const supabase = createValidatedClient(baseClient);

/**
 * Debug logging utility
 * Only logs when NEXT_PUBLIC_DEBUG_LOG_ENABLED is set to 'true'
 * This prevents connection refused errors when the debug server isn't running
 */

const DEBUG_LOG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOG_ENABLED === 'true'
const DEBUG_LOG_URL = 'http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc'

export function debugLog(data: {
  location: string
  message: string
  data?: any
  timestamp?: number
  sessionId?: string
  runId?: string
  hypothesisId?: string
}) {
  if (!DEBUG_LOG_ENABLED) {
    return // Silently skip if debug logging is disabled
  }

  try {
    fetch(DEBUG_LOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        timestamp: data.timestamp || Date.now(),
        sessionId: data.sessionId || 'debug-session',
        runId: data.runId || 'run1',
      }),
    }).catch(() => {
      // Silently ignore fetch errors
    })
  } catch {
    // Silently ignore any errors
  }
}


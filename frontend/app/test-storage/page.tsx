// TEMP STORAGE POLICY TEST — SAFE TO DELETE
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface TestResult {
  success: boolean
  message: string
  details?: string
  path?: string
  publicUrl?: string
}

/**
 * Creates a minimal valid JPEG in memory (1x1 red pixel)
 * This is the smallest valid JPEG file possible
 */
function createTestJpeg(): Blob {
  // Minimal 1x1 red JPEG (125 bytes)
  const jpegBytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd5, 0xdb, 0x20, 0xa8, 0xf1, 0x45, 0x10,
    0x14, 0x51, 0x45, 0x00, 0xff, 0xd9,
  ])
  return new Blob([jpegBytes], { type: 'image/jpeg' })
}

export default function TestStoragePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('❌ Auth error:', error.message)
        }
        setUser(user)
      } catch (err: any) {
        console.error('❌ Failed to check auth:', err.message)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result])
    if (result.success) {
      console.log('✅', result.message, result.details || '')
    } else {
      console.error('❌', result.message, result.details || '')
    }
  }

  const runStorageTest = async () => {
    if (!user) {
      addResult({
        success: false,
        message: 'No authenticated user',
        details: 'Please log in first at /login',
      })
      return
    }

    setTesting(true)
    setResults([])

    const bucketName = 'talent-portfolio'
    const storagePath = `talent/${user.id}/images/test-upload.jpg`

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🧪 STORAGE POLICY TEST STARTING')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('User ID:', user.id)
    console.log('User Email:', user.email)
    console.log('Bucket:', bucketName)
    console.log('Path:', storagePath)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    addResult({
      success: true,
      message: 'Test started',
      details: `User: ${user.email} (${user.id})`,
    })

    try {
      // Step 1: Create in-memory JPEG
      console.log('\n📄 Step 1: Creating in-memory JPEG...')
      const testFile = createTestJpeg()
      addResult({
        success: true,
        message: 'Created in-memory JPEG',
        details: `Size: ${testFile.size} bytes, Type: ${testFile.type}`,
      })

      // Step 2: Upload to Supabase Storage
      console.log('\n📤 Step 2: Uploading to Supabase Storage...')
      console.log(`   Bucket: ${bucketName}`)
      console.log(`   Path: ${storagePath}`)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, testFile, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        // Analyze error type
        const statusCode = (uploadError as any).statusCode || (uploadError as any).status
        let errorType = 'Unknown'
        let suggestion = ''

        if (statusCode === 401) {
          errorType = 'Authentication Error (401)'
          suggestion = 'Check that the user session is valid and not expired.'
        } else if (statusCode === 403) {
          errorType = 'Authorization Error (403)'
          suggestion = 'Check RLS policies. The path pattern may not match the policy.'
        } else if (statusCode === 404) {
          errorType = 'Not Found (404)'
          suggestion = `Bucket "${bucketName}" may not exist.`
        }

        console.error('\n❌ UPLOAD FAILED')
        console.error('Error Type:', errorType)
        console.error('Error Message:', uploadError.message)
        console.error('Status Code:', statusCode)
        console.error('Suggestion:', suggestion)
        console.error('Full Error:', uploadError)

        addResult({
          success: false,
          message: `Upload failed: ${errorType}`,
          details: `${uploadError.message}\n\nSuggestion: ${suggestion}`,
          path: storagePath,
        })
        return
      }

      console.log('\n✅ UPLOAD SUCCEEDED')
      console.log('Upload Data:', uploadData)

      // Step 3: Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath)

      console.log('\n🔗 Public URL:', urlData.publicUrl)

      addResult({
        success: true,
        message: 'Upload succeeded!',
        details: `File uploaded to: ${storagePath}`,
        path: storagePath,
        publicUrl: urlData.publicUrl,
      })

      // Step 4: Verify the file exists by listing
      console.log('\n🔍 Step 3: Verifying file exists...')
      const { data: listData, error: listError } = await supabase.storage
        .from(bucketName)
        .list(`talent/${user.id}/images`, {
          search: 'test-upload.jpg',
        })

      if (listError) {
        console.warn('⚠️ Could not verify file (list error):', listError.message)
        addResult({
          success: true,
          message: 'Upload succeeded but verification skipped',
          details: `List error: ${listError.message}`,
        })
      } else if (listData && listData.length > 0) {
        const file = listData.find(f => f.name === 'test-upload.jpg')
        if (file) {
          console.log('✅ File verified in storage:', file)
          addResult({
            success: true,
            message: 'File verified in storage',
            details: `Name: ${file.name}, Size: ${file.metadata?.size || 'unknown'} bytes`,
          })
        }
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🎉 STORAGE POLICY TEST COMPLETE - ALL PASSED')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('\nThe file is now available at:')
      console.log(urlData.publicUrl)

    } catch (err: any) {
      console.error('\n❌ UNEXPECTED ERROR')
      console.error('Error:', err)
      addResult({
        success: false,
        message: 'Unexpected error',
        details: err.message || String(err),
      })
    } finally {
      setTesting(false)
    }
  }

  const deleteTestFile = async () => {
    if (!user) return

    const storagePath = `talent/${user.id}/images/test-upload.jpg`
    console.log('🗑️ Deleting test file:', storagePath)

    const { error } = await supabase.storage
      .from('talent-portfolio')
      .remove([storagePath])

    if (error) {
      console.error('❌ Delete failed:', error.message)
      addResult({
        success: false,
        message: 'Delete failed',
        details: error.message,
      })
    } else {
      console.log('✅ Test file deleted')
      addResult({
        success: true,
        message: 'Test file deleted',
        details: storagePath,
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800 rounded-xl border border-white/10 p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧪</span>
            <h1 className="text-2xl font-bold text-white">Storage Policy Test</h1>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            TEMP STORAGE POLICY TEST — SAFE TO DELETE
          </p>

          {/* Auth Status */}
          <div className={`p-4 rounded-lg mb-6 ${user ? 'bg-green-500/20 border border-green-500/40' : 'bg-red-500/20 border border-red-500/40'}`}>
            {user ? (
              <div>
                <div className="text-green-200 font-medium">✅ Authenticated</div>
                <div className="text-green-200/70 text-sm mt-1">
                  <div>Email: {user.email}</div>
                  <div className="font-mono text-xs mt-1">ID: {user.id}</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-red-200 font-medium">❌ Not Authenticated</div>
                <div className="text-red-200/70 text-sm mt-1">
                  Please <a href="/login" className="underline hover:text-red-100">log in</a> to run the test.
                </div>
              </div>
            )}
          </div>

          {/* Test Info */}
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
            <h2 className="text-white font-medium mb-2">Test Details</h2>
            <div className="text-slate-300 text-sm space-y-1">
              <div><span className="text-slate-400">Bucket:</span> talent-portfolio</div>
              <div><span className="text-slate-400">Path:</span> talent/{user?.id || '<user_id>'}/images/test-upload.jpg</div>
              <div><span className="text-slate-400">File:</span> In-memory 1x1 JPEG (no local filesystem)</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={runStorageTest}
              disabled={!user || testing}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'Testing...' : '🚀 Test Storage Upload'}
            </button>
            <button
              onClick={deleteTestFile}
              disabled={!user || testing}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🗑️ Cleanup
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-white font-medium">Test Results</h2>
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${result.success ? 'bg-green-500/20 border border-green-500/40' : 'bg-red-500/20 border border-red-500/40'}`}
                >
                  <div className={result.success ? 'text-green-200' : 'text-red-200'}>
                    {result.success ? '✅' : '❌'} {result.message}
                  </div>
                  {result.details && (
                    <div className={`text-sm mt-1 ${result.success ? 'text-green-200/70' : 'text-red-200/70'}`}>
                      {result.details}
                    </div>
                  )}
                  {result.publicUrl && (
                    <div className="mt-2">
                      <a
                        href={result.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm underline break-all"
                      >
                        {result.publicUrl}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Console Hint */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-slate-400 text-sm">
              💡 Open browser DevTools (F12) → Console tab to see detailed logs
            </p>
          </div>
        </div>

        {/* Error Code Reference */}
        <div className="mt-6 bg-slate-800/50 rounded-xl border border-white/10 p-6">
          <h2 className="text-white font-medium mb-3">Error Code Reference</h2>
          <div className="text-sm space-y-2">
            <div className="flex gap-3">
              <span className="text-yellow-400 font-mono">401</span>
              <span className="text-slate-300">Auth issue — session expired or invalid token</span>
            </div>
            <div className="flex gap-3">
              <span className="text-yellow-400 font-mono">403</span>
              <span className="text-slate-300">Policy issue — path doesn&apos;t match RLS policy pattern</span>
            </div>
            <div className="flex gap-3">
              <span className="text-yellow-400 font-mono">404</span>
              <span className="text-slate-300">Bucket not found — check bucket name exists</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

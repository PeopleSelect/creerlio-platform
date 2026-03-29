'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ConversationSummary from './ConversationSummary'

interface VideoChatProps {
  sessionId: string
  roomId: string
  roomToken: string
  onEnd: () => void
  recordingEnabled?: boolean
  talentName?: string
  businessName?: string
  isInitiator?: boolean
}

export default function VideoChat({
  sessionId,
  roomId,
  roomToken,
  onEnd,
  recordingEnabled = false,
  talentName = 'Talent',
  businessName = 'Business',
  isInitiator = true,
}: VideoChatProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingRecording, setIsProcessingRecording] = useState(false)
  const [recordingSummary, setRecordingSummary] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<any>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  // Store pending ICE candidates received before remote description is set
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const remoteDescSetRef = useRef(false)
  // Store local offer so we can re-send it if the joiner requests it
  const localOfferSdpRef = useRef<string | null>(null)
  // Recording refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const mixedOutputRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    initializeVideoChat()
    return () => {
      cleanup()
    }
  }, [])

  const initializeVideoChat = async () => {
    try {
      // Get user media (camera and microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Set up audio context for mixing local + remote audio
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const mixedOutput = audioContext.createMediaStreamDestination()
      mixedOutputRef.current = mixedOutput

      // Connect local audio to the mix
      if (stream.getAudioTracks().length > 0) {
        const localSource = audioContext.createMediaStreamSource(stream)
        localSource.connect(mixedOutput)
      }

      // Initialize WebRTC peer connection with public STUN servers
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ]
      })

      peerConnectionRef.current = pc

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
        setIsConnected(true)
        // Connect remote audio to mixed output
        if (audioContextRef.current && mixedOutputRef.current && event.streams[0].getAudioTracks().length > 0) {
          const remoteSource = audioContextRef.current.createMediaStreamSource(event.streams[0])
          remoteSource.connect(mixedOutputRef.current)
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log('[VideoChat] ICE state:', pc.iceConnectionState)
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsConnected(true)
        }
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setError('Connection lost. Please try again.')
        }
      }

      // Send ICE candidates to the other peer via Supabase Realtime
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'ice',
            payload: { candidate: event.candidate.toJSON() }
          })
        }
      }

      // Set up Supabase Realtime signaling channel
      // self: false means we don't receive our own broadcasts
      const channel = supabase.channel(`video-room-${roomId}`, {
        config: { broadcast: { self: false } }
      })
      channelRef.current = channel

      channel
        // Receive SDP offer (joiner side)
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (!isInitiator) {
            try {
              await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp })
              remoteDescSetRef.current = true
              // Apply any ICE candidates that arrived before the offer
              for (const c of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(c))
              }
              pendingCandidatesRef.current = []
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              channel.send({
                type: 'broadcast',
                event: 'answer',
                payload: { sdp: answer.sdp }
              })
            } catch (err: any) {
              console.error('[VideoChat] Error handling offer:', err)
              setError('Failed to connect. Please try again.')
            }
          }
        })
        // Receive SDP answer (initiator side)
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (isInitiator) {
            try {
              await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp })
              remoteDescSetRef.current = true
              // Apply any ICE candidates that arrived before the answer
              for (const c of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(c))
              }
              pendingCandidatesRef.current = []
            } catch (err: any) {
              console.error('[VideoChat] Error handling answer:', err)
              setError('Failed to connect. Please try again.')
            }
          }
        })
        // Receive ICE candidates from either side
        .on('broadcast', { event: 'ice' }, async ({ payload }) => {
          if (payload.candidate) {
            if (remoteDescSetRef.current && peerConnectionRef.current) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
              } catch (err) {
                console.error('[VideoChat] Error adding ICE candidate:', err)
              }
            } else {
              // Queue until remote description is set
              pendingCandidatesRef.current.push(payload.candidate)
            }
          }
        })
        // Joiner requests the offer (in case initiator already sent it before joiner subscribed)
        .on('broadcast', { event: 'request_offer' }, async () => {
          if (isInitiator && localOfferSdpRef.current) {
            channel.send({
              type: 'broadcast',
              event: 'offer',
              payload: { sdp: localOfferSdpRef.current }
            })
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            if (isInitiator) {
              // Create and broadcast the offer
              try {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                localOfferSdpRef.current = offer.sdp || null
                channel.send({
                  type: 'broadcast',
                  event: 'offer',
                  payload: { sdp: offer.sdp }
                })
              } catch (err: any) {
                console.error('[VideoChat] Error creating offer:', err)
                setError('Failed to create call. Please try again.')
              }
            } else {
              // Request the offer from the initiator (handles case where initiator already sent it)
              channel.send({
                type: 'broadcast',
                event: 'request_offer',
                payload: {}
              })
            }
          }
        })

      // Start session on backend
      const { data: sessionRes } = await supabase.auth.getSession()
      if (!sessionRes?.session?.user) {
        throw new Error('Not authenticated')
      }

      const accessToken = sessionRes.session.access_token

      // Call backend to mark session as started
      const response = await fetch(`/api/video-chat/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to start video chat session'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        // Don't throw — session start failure shouldn't block the call
        console.warn('[VideoChat] Session start warning:', errorMessage)
      }

      startTimeRef.current = Date.now()
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)

    } catch (err: any) {
      console.error('[VideoChat] Error initializing:', err)
      setError(err.message || 'Failed to initialize video chat')
    }
  }

  const cleanup = async () => {
    // Leave the signaling channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clear interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // End session on backend
    if (sessionId && startTimeRef.current) {
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        if (sessionRes?.session?.user) {
          const duration_seconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
          const accessToken = sessionRes.session.access_token

          await fetch(`/api/video-chat/${sessionId}/end`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              duration_seconds: duration_seconds
            })
          })
        }
      } catch (err) {
        console.error('[VideoChat] Error ending session:', err)
      }
    }
  }

  const handleEndCall = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    await cleanup()
    onEnd()
  }

  const handleCloseSummary = () => {
    setShowSummary(false)
    onEnd()
  }

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        const track = audioTracks[0]
        track.enabled = !track.enabled
        setIsMuted(!track.enabled)
      }
    }
  }

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      if (videoTracks.length > 0) {
        const track = videoTracks[0]
        track.enabled = !track.enabled
        setIsVideoOff(!track.enabled)
      }
    }
  }

  const handleStartRecording = async () => {
    if (!recordingEnabled || !sessionId || !mixedOutputRef.current) return

    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      if (!sessionRes?.session?.user) throw new Error('Not authenticated')

      const accessToken = sessionRes.session.access_token

      // Get a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const recorder = new MediaRecorder(mixedOutputRef.current.stream, { mimeType })
      recordingChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data)
      }

      recorder.start(1000) // collect chunks every second
      mediaRecorderRef.current = recorder
      setIsRecording(true)

      // Also notify backend
      await fetch(`/api/video-chat/${sessionId}/recording/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      })
    } catch (err: any) {
      console.error('[VideoChat] Error starting recording:', err)
      setError(err.message || 'Failed to start recording')
    }
  }

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || !sessionId) return

    setIsRecording(false)
    setIsProcessingRecording(true)

    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const accessToken = sessionRes?.session?.access_token
      if (!accessToken) throw new Error('Not authenticated')

      // Stop the recorder and collect remaining chunks
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) { resolve(); return }
        mediaRecorderRef.current.onstop = () => resolve()
        mediaRecorderRef.current.stop()
      })

      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
      const blob = new Blob(recordingChunksRef.current, { type: mimeType })
      recordingChunksRef.current = []

      // Upload and process
      const formData = new FormData()
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
      formData.append('recording', blob, `recording-${sessionId}.${ext}`)

      const response = await fetch(`/api/video-chat/${sessionId}/process-recording`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.summary) {
        setRecordingSummary(data.summary)
        setShowSummary(true)
      } else {
        setError(data.error || 'Recording saved but summary generation failed')
      }
    } catch (err: any) {
      console.error('[VideoChat] Recording processing error:', err)
      setError(err.message || 'Failed to process recording')
    } finally {
      setIsProcessingRecording(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Video Chat</h2>
          <p className="text-sm text-gray-400">
            {businessName} ↔ {talentName}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-white font-mono">
            {formatDuration(duration)}
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm font-medium">Recording</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {isProcessingRecording && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white font-semibold">Processing recording...</p>
              <p className="text-slate-400 text-sm mt-1">Transcribing and generating AI summary</p>
            </div>
          </div>
        )}

        {/* Remote Video (Main) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover${isConnected ? '' : ' hidden'}`}
          />
          {!isConnected && (
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">Waiting for the other person to join...</p>
              <p className="text-sm opacity-60">They will see a &quot;Join Video Call&quot; notification in their dashboard</p>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-4 right-4 w-64 h-48 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-700">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-3 rounded-full transition-colors ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Video Toggle */}
          <button
            type="button"
            onClick={handleToggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoOff
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
          >
            {isVideoOff ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Recording Controls */}
          {recordingEnabled && (
            <>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                  title="Start Recording"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                  title="Stop Recording"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              )}
            </>
          )}

          {/* End Call */}
          <button
            type="button"
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
            title="End Call"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M7 13l-2 2m0 0l-2-2m2 2l2-2m12 0l-2 2m0 0l-2-2m2 2l2 2M3 3l18 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conversation Summary Modal */}
      {showSummary && (
        <ConversationSummary
          sessionId={sessionId}
          preloadedSummary={recordingSummary}
          onClose={handleCloseSummary}
        />
      )}
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId

    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '') || null

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient(accessToken)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session
    const { data: videoSession } = await supabase
      .from('video_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!videoSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const recordingFile = formData.get('recording') as File | null

    if (!recordingFile || recordingFile.size === 0) {
      return NextResponse.json({ error: 'No recording provided' }, { status: 400 })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    // Upload to Supabase Storage
    const fileName = `${sessionId}/${Date.now()}.webm`
    const fileBuffer = await recordingFile.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('video-recordings')
      .upload(fileName, fileBuffer, {
        contentType: recordingFile.type || 'audio/webm',
        upsert: true
      })

    if (uploadError) {
      console.error('[process-recording] Storage upload error:', uploadError)
      // Continue anyway - transcription can still work
    }

    // Save recording record
    const { data: recordingRow } = await supabase
      .from('video_recordings')
      .insert({
        session_id: sessionId,
        recording_type: 'audio_only',
        storage_path: uploadError ? null : fileName,
        storage_bucket: 'video-recordings',
        file_size_bytes: recordingFile.size,
        file_format: recordingFile.type?.includes('mp4') ? 'mp4' : 'webm',
        processing_status: 'processing',
      })
      .select()
      .single()

    // Transcribe with OpenAI Whisper
    const whisperFormData = new FormData()
    whisperFormData.append('file', recordingFile, `recording.${recordingFile.type?.includes('mp4') ? 'mp4' : 'webm'}`)
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('response_format', 'text')

    let transcriptionText = ''

    try {
      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}` },
        body: whisperFormData,
      })

      if (whisperRes.ok) {
        transcriptionText = await whisperRes.text()
      } else {
        const errText = await whisperRes.text()
        console.error('[process-recording] Whisper error:', errText)
        transcriptionText = '[Transcription failed - audio may be too short or silent]'
      }
    } catch (err) {
      console.error('[process-recording] Whisper fetch error:', err)
      transcriptionText = '[Transcription unavailable]'
    }

    // Update recording with transcription
    if (recordingRow?.id) {
      await supabase
        .from('video_recordings')
        .update({
          transcription_text: transcriptionText,
          processing_status: transcriptionText.startsWith('[') ? 'failed' : 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', recordingRow.id)
    }

    // Generate AI summary with GPT-4
    const summaryPrompt = transcriptionText.startsWith('[')
      ? null
      : transcriptionText.trim()

    let summaryData: any = {
      summary_text: transcriptionText.startsWith('[')
        ? 'The recording was too short or silent to transcribe. Try recording a longer section of the conversation.'
        : transcriptionText.trim().length <= 20
        ? 'The transcription was too brief to generate a meaningful summary. Try recording more of the conversation.'
        : 'AI summary unavailable.',
      key_points: [],
      action_items: [],
      sentiment: 'neutral',
      ai_model_used: null,
    }

    if (summaryPrompt && summaryPrompt.length > 20) {
      try {
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are analyzing a transcription of a video call between a business and a job candidate.
Extract key information and return a JSON object with these fields:
- summary_text: A 2-3 sentence summary of the conversation
- key_points: Array of 3-5 key discussion points (strings)
- action_items: Array of action items or next steps mentioned (strings)
- sentiment: Overall sentiment of the meeting ("positive", "neutral", or "negative")

Return ONLY valid JSON, no markdown.`
              },
              {
                role: 'user',
                content: `Transcription:\n\n${summaryPrompt}`
              }
            ],
            temperature: 0.3,
            max_tokens: 600,
          }),
        })

        if (gptRes.ok) {
          const gptData = await gptRes.json()
          const content = gptData.choices?.[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            summaryData = {
              summary_text: parsed.summary_text || 'No summary generated.',
              key_points: parsed.key_points || [],
              action_items: parsed.action_items || [],
              sentiment: parsed.sentiment || 'neutral',
              ai_model_used: 'gpt-4o-mini',
            }
          }
        }
      } catch (err) {
        console.error('[process-recording] GPT error:', err)
      }
    }

    // Save summary to DB
    const { data: summaryRow, error: summaryError } = await supabase
      .from('conversation_summaries')
      .insert({
        session_id: sessionId,
        recording_id: recordingRow?.id || null,
        summary_type: 'ai_generated',
        summary_text: summaryData.summary_text,
        key_points: summaryData.key_points,
        action_items: summaryData.action_items,
        sentiment: summaryData.sentiment,
        ai_model_used: summaryData.ai_model_used,
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        created_by_user_id: user.id,
      })
      .select()
      .single()

    if (summaryError) {
      console.error('[process-recording] Summary insert error:', summaryError)
    }

    return NextResponse.json({
      success: true,
      transcription: transcriptionText,
      summary: summaryRow || { ...summaryData, session_id: sessionId },
    })

  } catch (error: any) {
    console.error('[process-recording] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to process recording' }, { status: 500 })
  }
}

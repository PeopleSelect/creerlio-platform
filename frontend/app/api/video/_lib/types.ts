// ─── Shared types for AI Video Generation Module ─────────────────────────────

export type VideoStyle = 'corporate' | 'cinematic' | 'social' | 'product'
export type AspectRatio = '16:9' | '9:16' | '1:1'
export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'failed'
export type SceneStatus = 'pending' | 'generating' | 'completed' | 'failed'

export interface VideoProject {
  id: string
  user_id: string
  business_id?: string | null
  title: string
  description?: string | null
  style: VideoStyle
  aspect_ratio: AspectRatio
  duration_secs: number
  script?: string | null
  status: ProjectStatus
  error_message?: string | null
  final_video_url?: string | null
  thumbnail_url?: string | null
  runway_task_ids: string[]
  elevenlabs_job_id?: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  scenes?: VideoScene[]
}

export interface VideoScene {
  id: string
  project_id: string
  scene_order: number
  title?: string | null
  prompt: string
  narration?: string | null
  duration_secs: number
  status: SceneStatus
  runway_task_id?: string | null
  video_url?: string | null
  stored_url?: string | null
  error_message?: string | null
  attempts: number
  created_at: string
  updated_at: string
}

export interface VideoAsset {
  id: string
  project_id: string
  asset_type: 'scene_video' | 'voice_track' | 'final_video' | 'thumbnail'
  file_path: string
  public_url?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  duration_secs?: number | null
  metadata: Record<string, any>
  created_at: string
}

// ─── API request/response shapes ─────────────────────────────────────────────

export interface CreateProjectRequest {
  title: string
  description?: string
  style?: VideoStyle
  aspect_ratio?: AspectRatio
  duration_secs?: number
  business_id?: string
  /** Pre-built brief from business profile auto-generation */
  brief?: string
}

export interface CreateProjectResponse {
  project_id: string
  status: ProjectStatus
  scene_count: number
}

export interface SceneScript {
  title: string
  prompt: string      // Runway video generation prompt
  narration: string   // ElevenLabs TTS text
  duration_secs: number
}

export interface GeneratedScript {
  scenes: SceneScript[]
  full_narration: string
}

export interface RunwayPollResult {
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  output?: string[]
  progress?: number
  error?: string
}

export interface ProcessProgressEvent {
  type: 'progress' | 'scene_complete' | 'voice_complete' | 'stitch_complete' | 'complete' | 'error'
  message: string
  scene_index?: number
  scene_count?: number
  progress_pct?: number
  video_url?: string
  error?: string
}

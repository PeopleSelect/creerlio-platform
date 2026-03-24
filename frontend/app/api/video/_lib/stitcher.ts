// ─── FFmpeg video stitcher ────────────────────────────────────────────────────
// Combines scene clips + optional voice track into a single MP4

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

/** Resolve the ffmpeg binary — prefers system PATH, falls back to ffmpeg-static */
function getFfmpegBin(): string {
  const envPath = process.env.FFMPEG_PATH
  if (envPath && fs.existsSync(envPath)) return envPath

  const systemPaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/bin/ffmpeg',
  ]
  for (const p of systemPaths) {
    if (fs.existsSync(p)) return p
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegStatic = require('ffmpeg-static')
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic
  } catch {}

  throw new Error('ffmpeg binary not found. Set FFMPEG_PATH or install ffmpeg.')
}

export interface StitchOptions {
  /** Ordered list of MP4 file paths (one per scene) */
  scenePaths: string[]
  /** Optional MP3/AAC voice-over path */
  audioPath?: string
  /** Output MP4 path */
  outputPath: string
  /** 16:9 | 9:16 | 1:1 */
  aspectRatio?: '16:9' | '9:16' | '1:1'
}

/** Stitch scene clips (+ optional audio) into a single MP4 */
export function stitchVideo(opts: StitchOptions): void {
  const ffmpeg = getFfmpegBin()
  const { scenePaths, audioPath, outputPath, aspectRatio = '16:9' } = opts

  if (scenePaths.length === 0) throw new Error('No scene clips to stitch')

  // --- Write concat list file ---
  const listPath = outputPath.replace(/\.mp4$/, '_concat.txt')
  const listContent = scenePaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(listPath, listContent, 'utf8')

  const resolution = aspectRatioToRes(aspectRatio)

  try {
    if (audioPath && fs.existsSync(audioPath)) {
      // Concat + mix audio, trim to shortest
      execFileSync(ffmpeg, [
        '-y',
        '-f', 'concat', '-safe', '0', '-i', listPath,
        '-i', audioPath,
        '-vf', `scale=${resolution},setsar=1`,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-map', '0:v:0', '-map', '1:a:0',
        '-shortest',
        outputPath,
      ], { stdio: 'pipe' })
    } else {
      // Concat only (no audio)
      execFileSync(ffmpeg, [
        '-y',
        '-f', 'concat', '-safe', '0', '-i', listPath,
        '-vf', `scale=${resolution},setsar=1`,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-an',
        outputPath,
      ], { stdio: 'pipe' })
    }
  } finally {
    try { fs.unlinkSync(listPath) } catch {}
  }
}

/** Extract the first frame of a video as a JPEG thumbnail */
export function extractThumbnail(videoPath: string, thumbPath: string): void {
  const ffmpeg = getFfmpegBin()
  execFileSync(ffmpeg, [
    '-y',
    '-i', videoPath,
    '-ss', '00:00:01',
    '-vframes', '1',
    '-q:v', '2',
    thumbPath,
  ], { stdio: 'pipe' })
}

function aspectRatioToRes(ratio: '16:9' | '9:16' | '1:1'): string {
  if (ratio === '9:16') return '720:1280'
  if (ratio === '1:1') return '1080:1080'
  return '1280:720'
}

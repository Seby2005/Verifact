/**
 * Turns an uploaded video clip into a single claim string, entirely in the
 * browser: spoken words (Whisper transcription) plus on-screen text from a few
 * sampled frames (OCR). The rest of the verify pipeline already operates on one
 * `claimText` string, so this is the only piece video input needs — nothing
 * downstream changes.
 *
 * Client-only (see browser-whisper.ts and video-frames.ts).
 */

import { transcribeClip, type TranscriptionLanguage } from './browser-whisper';
import { extractFrames, probeDuration } from './video-frames';

// Three interior frames catch caption changes across a short clip without
// spending an OCR call per second. Each call is metered server-side (10/min),
// so this stays comfortably within one clip's budget.
const FRAME_COUNT = 3;

// The feature targets short clips. Browser Whisper runs slower than real time on
// modest devices, so a long file means a multi-minute, memory-heavy wait — cap
// it and tell the visitor rather than letting the tab grind. Generous enough
// that a normal social clip (the ~30s the UI suggests) never trips it.
const MAX_CLIP_SECONDS = 120;

export type VideoClaimStage = 'transcribing' | 'reading';

export interface VideoClaimProgress {
  stage: VideoClaimStage;
  /** 0..1 model-download progress; only set during the first, slow load. */
  modelFraction?: number;
}

/**
 * Runs OCR on one sampled frame. Returns the frame's text, or null if it had
 * none. Injected so this module stays free of the app's fetch/i18n wiring and
 * reuses the caller's existing /api/ocr client.
 */
export type FrameOcr = (base64: string, mimeType: string) => Promise<string | null>;

export interface VideoClaimResult {
  /** Combined transcript + on-screen text, ready for /api/verify. */
  text: string;
  transcript: string;
  onScreen: string;
}

/**
 * @param language - the clip's spoken language, to guide transcription.
 * @param ocr - OCR client for sampled frames.
 * @param onProgress - reports which stage is running (and model-download
 *   progress) so the UI can show a moving status during the wait.
 */
export async function buildVideoClaim(
  file: File,
  language: TranscriptionLanguage,
  ocr: FrameOcr,
  onProgress?: (progress: VideoClaimProgress) => void,
): Promise<VideoClaimResult> {
  // Reject an over-long clip before the expensive work (model download, audio
  // decode). A file whose duration can't be read (audio-only) is let through.
  const duration = await probeDuration(file);
  if (duration !== null && duration > MAX_CLIP_SECONDS) throw new Error('VIDEO_TOO_LONG');

  // Transcribe first: the one-time model download dominates the wait, so
  // reporting it early gives the visitor a moving bar rather than a dead spinner.
  let transcript = '';
  try {
    onProgress?.({ stage: 'transcribing' });
    transcript = await transcribeClip(file, {
      language,
      onModelProgress: (fraction) => onProgress?.({ stage: 'transcribing', modelFraction: fraction }),
    });
  } catch (error) {
    // A clip with no decodable audio (a silent screen capture) is normal — fall
    // through to frame OCR instead of failing the whole run. Anything else is a
    // real fault and propagates.
    if (!(error instanceof Error) || error.message !== 'AUDIO_DECODE_FAILED') throw error;
  }

  onProgress?.({ stage: 'reading' });
  const frames = await safeExtractFrames(file);

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const frame of frames) {
    const text = await ocr(frame.base64, frame.mimeType);
    if (!text) continue;
    // Burned-in captions repeat across frames; keep each distinct line once.
    for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(line);
    }
  }
  const onScreen = lines.join('\n');

  const text = [transcript, onScreen]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();

  return { text, transcript, onScreen };
}

/**
 * Frame sampling is a best-effort enrichment: an audio clip with the transcript
 * already in hand shouldn't fail just because it has no video track. A decode
 * failure yields no frames rather than aborting.
 */
async function safeExtractFrames(file: File) {
  try {
    return await extractFrames(file, FRAME_COUNT);
  } catch (error) {
    if (error instanceof Error && error.message === 'VIDEO_DECODE_FAILED') return [];
    throw error;
  }
}

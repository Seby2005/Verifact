/**
 * Samples still frames from an uploaded video, entirely in the browser, so the
 * on-screen text they carry (burned-in captions, overlays) can be read by the
 * same OCR that handles screenshots. Short-form misinformation often lives in
 * the caption rather than the audio, so a transcript alone would miss it.
 *
 * Client-only: uses <video>, <canvas> and URL.createObjectURL, none of which
 * exist on the server. The blob: URL the <video> loads from requires
 * `media-src blob:` in the CSP (see next.config.mjs).
 */

// Downscale large frames before OCR: a legible ~720p still is enough to read
// caption text, and it keeps the base64 payload well under the /api/ocr size cap
// (10 MB) even for a 4K source.
const MAX_FRAME_EDGE = 1280;

export interface VideoFrame {
  /** Bare base64 PNG (no `data:` prefix), matching the /api/ocr contract. */
  base64: string;
  mimeType: 'image/png';
}

/**
 * Grabs `count` evenly spaced frames from the clip's interior.
 *
 * @throws Error('VIDEO_DECODE_FAILED') when the browser can't load the file as
 *   video (unsupported container/codec, or an audio-only file).
 */
export async function extractFrames(file: File, count: number): Promise<VideoFrame[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  try {
    await waitForEvent(video, 'loadedmetadata');
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    // Sample interior points, skipping the exact start and end which are often a
    // black frame or a hard cut carrying no text.
    const times = Array.from({ length: count }, (_, i) => (duration * (i + 1)) / (count + 1));

    const { width, height } = fitWithin(video.videoWidth, video.videoHeight, MAX_FRAME_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('VIDEO_DECODE_FAILED');

    const frames: VideoFrame[] = [];
    for (const time of times) {
      await seekTo(video, time);
      ctx.drawImage(video, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/png').split(',')[1] ?? '';
      if (base64) frames.push({ base64, mimeType: 'image/png' });
    }
    return frames;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

/**
 * Reads a clip's duration (seconds) from its metadata alone — no full decode.
 * Returns null when it can't be determined (an audio-only file the <video>
 * element won't decode, or a missing duration), so the caller can choose to
 * proceed rather than block.
 */
export async function probeDuration(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.src = url;
  try {
    await waitForEvent(video, 'loadedmetadata');
    return Number.isFinite(video.duration) ? video.duration : null;
  } catch {
    return null;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

/** Scales (w, h) down so its longest edge is at most `maxEdge`; never scales up. */
function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  if (!w || !h) return { width: maxEdge, height: maxEdge };
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function waitForEvent(el: HTMLVideoElement, event: 'loadedmetadata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error('VIDEO_DECODE_FAILED'));
    };
    const cleanup = () => {
      el.removeEventListener(event, onOk);
      el.removeEventListener('error', onErr);
    };
    el.addEventListener(event, onOk, { once: true });
    el.addEventListener('error', onErr, { once: true });
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  const target = Math.max(0, Math.min(time, Math.max(0, video.duration - 0.01)));
  const done = waitForEvent(video, 'seeked');
  video.currentTime = target;
  return done;
}

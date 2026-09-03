/**
 * Browser-side speech-to-text for short video clips.
 *
 * The whole point of running here rather than on the server: the app is on
 * Vercel serverless, which can't host ffmpeg + a Whisper model (size and time
 * limits). Doing it in the viewer's browser keeps the feature free (no paid
 * transcription API, no extra server) and private (the audio never leaves the
 * device). The cost is a one-time model download (~40-80MB, then cached by the
 * browser) and slower runs on old phones.
 *
 * This module is client-only. It must never be imported from a Server Component
 * or a route handler — `@huggingface/transformers` and the Web Audio API only
 * exist in the browser.
 */

// Whisper expects mono PCM at 16 kHz. Decoding to anything else and handing it
// to the model produces garbled text, so this sample rate is not negotiable.
const WHISPER_SAMPLE_RATE = 16000;

export type TranscriptionLanguage = 'ro' | 'en' | 'fr';

// transformers.js maps its language option by full English name, not ISO code.
const WHISPER_LANGUAGE_NAME: Record<TranscriptionLanguage, string> = {
  ro: 'romanian',
  en: 'english',
  fr: 'french',
};

/**
 * Decodes an uploaded media file's audio track into the single mono 16 kHz
 * Float32 channel Whisper needs.
 *
 * `decodeAudioData` reads the audio stream out of common containers (mp4/m4a,
 * webm, wav, ogg) directly, so a phone-recorded clip works without ffmpeg. An
 * OfflineAudioContext then resamples to 16 kHz and mixes down to mono in one
 * render pass — the browser does the DSP, we just read the result.
 *
 * @throws Error('AUDIO_DECODE_FAILED') when the file has no decodable audio
 *   track (e.g. a silent screen recording or an unsupported codec).
 */
export async function decodeAudioForWhisper(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();

  // A plain AudioContext decodes using the device's own codecs; we only use it
  // to decode, never to play, so its output sample rate is irrelevant here.
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } catch {
    throw new Error('AUDIO_DECODE_FAILED');
  } finally {
    void decodeCtx.close();
  }

  const frameCount = Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frameCount, WHISPER_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const resampled = await offline.startRendering();

  return resampled.getChannelData(0);
}

// The pipeline (model weights + tokenizer) is loaded once and reused. Loading
// is the expensive part — tens of MB fetched and compiled — so a second clip in
// the same session transcribes without re-downloading anything.
type Transcriber = (
  audio: Float32Array,
  options: Record<string, unknown>
) => Promise<{ text: string }>;

let transcriberPromise: Promise<Transcriber> | null = null;

/**
 * @param onProgress - reports model-download progress (0..1) so the UI can show
 *   a bar during the first, slow load. Only fires while files are being
 *   fetched; a warm cache skips straight through.
 */
function getTranscriber(onProgress?: (fraction: number) => void): Promise<Transcriber> {
  if (transcriberPromise) return transcriberPromise;

  transcriberPromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // The model weights are self-hosted under /public/models (same origin), so
    // the browser never contacts a third-party CDN: nothing to whitelist in the
    // CSP, no leak of "this user is transcribing" to Hugging Face, and one fewer
    // outside dependency that can move or rate-limit us. `localModelPath` maps
    // the model id 'Xenova/whisper-base' to /models/Xenova/whisper-base/*.
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = '/models/';
    // onnxruntime-web fetches its own WASM runtime; point it at our copy under
    // /public so that request is same-origin too. The `wasm` backend is typed
    // optional but is always present once the ONNX backend loads.
    if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = '/ort/';

    const transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', {
      // int8 dynamic quantization: ~77MB total (encoder 23MB + decoder 54MB),
      // roughly a third of the fp32 download, with accuracy loss that doesn't
      // matter for extracting a claim's wording from a 30-second clip. This is
      // plain DequantizeLinear quant — it avoids the MatMulNBits op path in the
      // older Xenova 'quantized' export that onnxruntime-web can't load.
      dtype: 'int8',
      // onnxruntime-web's graph optimizer crashes on this quantized decoder's
      // QDQ nodes (TransposeDQWeightsForMatMulNBits: missing scale). The weights
      // are already quantized, so there's nothing for the optimizer to gain
      // here — disabling it sidesteps the bug with no runtime cost.
      session_options: { graphOptimizationLevel: 'disabled' },
      progress_callback: (p: { status: string; progress?: number }) => {
        if (onProgress && p.status === 'progress' && typeof p.progress === 'number') {
          onProgress(p.progress / 100);
        }
      },
    });

    return transcriber as unknown as Transcriber;
  })();

  // A failed load must not be cached as a permanent rejection, or every later
  // attempt in the session reuses the same failure. Clear it so a retry can
  // start the download again.
  transcriberPromise.catch(() => {
    transcriberPromise = null;
  });

  return transcriberPromise;
}

export interface TranscribeOptions {
  language?: TranscriptionLanguage;
  onModelProgress?: (fraction: number) => void;
}

/**
 * Transcribes an uploaded clip to text, running entirely in the browser.
 *
 * Returns the spoken words as a single trimmed string (empty if the clip has no
 * intelligible speech). Pass `language` when the clip's language is known to
 * improve accuracy; omit it to let Whisper auto-detect.
 *
 * @throws Error('AUDIO_DECODE_FAILED') if the file has no decodable audio.
 */
export async function transcribeClip(file: File, options: TranscribeOptions = {}): Promise<string> {
  const audio = await decodeAudioForWhisper(file);
  const transcriber = await getTranscriber(options.onModelProgress);

  const output = await transcriber(audio, {
    task: 'transcribe',
    chunk_length_s: 30,
    ...(options.language ? { language: WHISPER_LANGUAGE_NAME[options.language] } : {}),
  });

  return output.text.trim();
}

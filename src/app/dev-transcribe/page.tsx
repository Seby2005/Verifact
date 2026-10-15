'use client';

/**
 * Dev-only harness for the browser Whisper pipeline. Not linked anywhere and
 * returns 404 in production. Lets us confirm the model loads under CSP, the
 * Web Audio decode path works, and timing is acceptable — before wiring any of
 * this into the real verify UI.
 */

import { useState } from 'react';
import { transcribeClip } from '@/lib/transcription/browser-whisper';

export default function DevTranscribePage() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  if (process.env.NODE_ENV === 'production') return null;

  async function run(file: File) {
    setStatus('working');
    setTranscript('');
    setElapsedMs(null);
    setProgress(0);
    const start = performance.now();
    try {
      const text = await transcribeClip(file, {
        language: 'ro',
        onModelProgress: (f) => setProgress(Math.round(f * 100)),
      });
      setTranscript(text || '(no speech detected)');
      setStatus('done');
    } catch (e) {
      setTranscript(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
      setStatus('error');
    } finally {
      setElapsedMs(Math.round(performance.now() - start));
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 640 }}>
      <h1>Dev: browser Whisper</h1>
      <p>Upload a short clip (mp4/webm/m4a/wav) with speech.</p>
      <input
        type="file"
        accept="video/*,audio/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void run(f);
        }}
      />
      <button
        style={{ marginLeft: 12 }}
        onClick={() => {
          // A 1-second sine tone, WAV-encoded in-page. Transcribes to nothing,
          // but exercises decode + model-load + inference end to end so we can
          // validate the infra without sourcing a speech file.
          void run(makeToneWav());
        }}
      >
        Test with synthetic tone
      </button>

      <div style={{ marginTop: 24 }}>
        <div>status: <strong>{status}</strong></div>
        {status === 'working' && progress > 0 && <div>model download: {progress}%</div>}
        {elapsedMs !== null && <div>elapsed: {elapsedMs} ms</div>}
        {transcript && (
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, background: '#f4f4f4', padding: 12 }}>
            {transcript}
          </pre>
        )}
      </div>
    </main>
  );
}

/** Builds a 1s 16kHz mono sine-tone WAV wrapped as a File. */
function makeToneWav(): File {
  const sampleRate = 16000;
  const samples = sampleRate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const v = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.3;
    view.setInt16(44 + i * 2, v * 0x7fff, true);
  }
  return new File([buffer], 'tone.wav', { type: 'audio/wav' });
}

import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export const alt = 'Verdict Verificare - Fact-Checker AI';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

const VERDICT_LABELS: Record<string, string> = {
  true: 'Adevărat',
  false: 'Fals',
  partial: 'Parțial Adevărat',
  unclear: 'Neclar',
};

const VERDICT_COLORS: Record<string, string> = {
  true: '#16a34a',
  false: '#dc2626',
  partial: '#d97706',
  unclear: '#6c757d',
};

export default async function Image({ params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  let verdict = 'unclear';
  let score = 50;
  let inputText = 'Verificare dezinformare și fact-checking cu inteligență artificială.';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('verifications')
        .select('verdict, score, input_text, is_public')
        .eq('id', params.id)
        .single();

      if (data) {
        verdict = data.verdict || 'unclear';
        score = typeof data.score === 'number' ? data.score : 50;
        inputText = data.input_text || inputText;
      }
    } catch {
      // Fallback defaults
    }
  }

  const color = VERDICT_COLORS[verdict] || '#2563eb';
  const verdictLabel = VERDICT_LABELS[verdict] || 'Verificare';
  const truncatedText =
    inputText.length > 180 ? `${inputText.slice(0, 180)}...` : inputText;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          padding: '60px',
          fontFamily: 'sans-serif',
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: '#2563eb',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            ✓
          </div>
          <span
            style={{
              marginLeft: '16px',
              fontSize: '28px',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            Fact-Checker AI
          </span>
        </div>

        {/* Body Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderRadius: '10px',
              backgroundColor: `${color}15`,
              border: `2px solid ${color}`,
              color,
              fontSize: '32px',
              fontWeight: 700,
              alignSelf: 'flex-start',
            }}
          >
            Verdict: {verdictLabel} ({score}%)
          </div>

          <div
            style={{
              fontSize: '34px',
              fontWeight: 500,
              color: '#1f2937',
              lineHeight: 1.4,
              maxHeight: '220px',
              overflow: 'hidden',
            }}
          >
            &ldquo;{truncatedText}&rdquo;
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid #f3f4f6',
            paddingTop: '24px',
            color: '#6c757d',
            fontSize: '20px',
          }}
        >
          <span>Verificat cu inteligență artificială • 4 Straturi Surse</span>
          <span>fact-checker-ai</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

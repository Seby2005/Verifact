import { NextResponse } from 'next/server';
import type { VerificationInputKind, VerifyResponse } from '@/types/verification';

/**
 * Verification endpoint.
 *
 * TODO(backend): the 5-layer verification pipeline described in docs/PRD.md
 * §3.2 does not exist yet — there is no code under src/lib/verification, no
 * Gemini client, and no fact-check/news/official-source search integration.
 * Until those land, this route validates and shapes the request but returns
 * `not_implemented` rather than a report.
 *
 * It deliberately does NOT return a placeholder verdict. Inventing a score for
 * a claim would be indistinguishable from a real answer to the user, which is
 * precisely the failure mode this product exists to fight.
 *
 * When implementing: parse input by kind, run the pipeline, and return
 * `{ status: 'ok', report }` matching the VerificationReport contract the UI
 * already renders.
 */

const MIN_TEXT_LENGTH = 10;
const VALID_KINDS: VerificationInputKind[] = ['text', 'screenshot', 'url'];

export async function POST(request: Request): Promise<NextResponse<VerifyResponse>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Corpul cererii nu este JSON valid.' },
      { status: 400 }
    );
  }

  const { kind, value } = (body ?? {}) as { kind?: string; value?: string };

  if (!kind || !VALID_KINDS.includes(kind as VerificationInputKind)) {
    return NextResponse.json(
      { status: 'error', message: 'Tip de conținut necunoscut.' },
      { status: 400 }
    );
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return NextResponse.json(
      { status: 'error', message: 'Nu ai introdus niciun conținut de verificat.' },
      { status: 400 }
    );
  }

  if (kind === 'text' && value.trim().length < MIN_TEXT_LENGTH) {
    return NextResponse.json(
      {
        status: 'error',
        message: `Afirmația trebuie să aibă cel puțin ${MIN_TEXT_LENGTH} caractere.`,
      },
      { status: 400 }
    );
  }

  if (kind === 'url') {
    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('unsupported protocol');
      }
    } catch {
      return NextResponse.json(
        { status: 'error', message: 'Link-ul introdus nu este valid.' },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(
    {
      status: 'not_implemented',
      message:
        'Motorul de verificare nu este încă disponibil public. Interfața este completă, dar pipeline-ul de analiză (surse de fact-checking, presă, surse oficiale și analiză AI) este încă în dezvoltare.',
    },
    { status: 501 }
  );
}

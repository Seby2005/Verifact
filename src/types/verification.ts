/**
 * Shared shapes for the verification request/response cycle.
 *
 * NOTE: these describe the contract the UI is built against. The pipeline that
 * actually produces a VerificationReport (docs/PRD.md §3.2, layers 1-5) is not
 * implemented yet — see src/app/api/verify/route.ts.
 */

import type { VerdictKind } from '@/components/ui';

export type VerificationInputKind = 'text' | 'screenshot' | 'url';

export interface VerificationSource {
  title: string;
  publisher: string;
  /** ISO date string, or undefined when the source is undated. */
  date?: string;
  url: string;
}

export interface VerificationReport {
  id: string;
  claim: string;
  verdict: VerdictKind;
  /** Veracity score, 0-100. */
  score: number;
  summary: string;
  sources: VerificationSource[];
  /** Seconds spent processing. */
  processingTime?: number;
  createdAt: string;
}

export type VerifyResponse =
  | { status: 'ok'; report: VerificationReport }
  | { status: 'not_implemented'; message: string }
  | { status: 'error'; message: string };

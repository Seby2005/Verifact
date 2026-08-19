import { randomUUID } from 'crypto';
import { requireAdmin, AuthorizationError, logAdminAction } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import type { Verdict, VerificationReport, CombinedSource } from '@/types/verification';

export const dynamic = 'force-dynamic';

const BUCKET = 'report-images';
const MAX_IMAGES = 6;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, mirrors the bucket limit in migration 017
const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
const VALID_VERDICTS: Verdict[] = ['true', 'false', 'partial', 'unclear'];
const VALID_LANGUAGES = ['ro', 'en', 'fr'] as const;

interface SourceInput {
  url?: string;
  publisher?: string;
  title?: string;
}

/**
 * Admin-only endpoint that composes and publishes a public verification report
 * from a manually written verdict plus optional attached images. Because images
 * on public reports are restricted to admins, this is the ONLY path that can set
 * image_urls on a public verification. Runs entirely with the service-role client
 * after requireAdmin(), so RLS and the UPDATE-time public-rules trigger are not
 * involved — the admin's editorial judgement is authoritative.
 */
export async function POST(request: Request) {
  let adminUserId: string;
  try {
    const { user } = await requireAdmin();
    adminUserId = user.id;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'Eroare de autorizare.' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Formular invalid.' }, { status: 400 });
  }

  // --- Parse & validate text fields ---------------------------------------
  const inputText = String(form.get('inputText') || '').trim();
  if (inputText.length < 10) {
    return Response.json({ error: 'Afirmația trebuie să aibă cel puțin 10 caractere.' }, { status: 400 });
  }

  const verdict = String(form.get('verdict') || '') as Verdict;
  if (!VALID_VERDICTS.includes(verdict)) {
    return Response.json({ error: 'Verdict invalid.' }, { status: 400 });
  }

  const scoreRaw = Number(form.get('score'));
  if (!Number.isInteger(scoreRaw) || scoreRaw < 0 || scoreRaw > 100) {
    return Response.json({ error: 'Scorul trebuie să fie un întreg între 0 și 100.' }, { status: 400 });
  }

  const analysis = String(form.get('analysis') || '').trim();
  if (analysis.length < 10) {
    return Response.json({ error: 'Analiza trebuie să aibă cel puțin 10 caractere.' }, { status: 400 });
  }

  const languageRaw = String(form.get('language') || 'ro');
  const language = (VALID_LANGUAGES as readonly string[]).includes(languageRaw) ? languageRaw : 'ro';

  const showAuthor = String(form.get('showAuthor') || '') === 'true';

  let sourcesInput: SourceInput[] = [];
  const sourcesRaw = String(form.get('sources') || '').trim();
  if (sourcesRaw) {
    try {
      const parsed = JSON.parse(sourcesRaw);
      if (Array.isArray(parsed)) sourcesInput = parsed as SourceInput[];
    } catch {
      return Response.json({ error: 'Lista de surse are format JSON invalid.' }, { status: 400 });
    }
  }

  // --- Collect & validate image files -------------------------------------
  const files = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) {
    return Response.json({ error: `Maxim ${MAX_IMAGES} imagini per raport.` }, { status: 400 });
  }
  for (const file of files) {
    if (!MIME_EXT[file.type]) {
      return Response.json({ error: `Tip de imagine neacceptat: ${file.type || 'necunoscut'}. Acceptate: PNG, JPEG, WEBP.` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: `Imaginea "${file.name}" depășește 5 MB.` }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const verificationId = randomUUID();

  // --- Upload images ------------------------------------------------------
  const imageUrls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = MIME_EXT[file.type];
    const path = `${verificationId}/${i}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      logger.error('Failed to upload report image', { service: 'AdminReports', error: uploadError.message });
      return Response.json({ error: 'Încărcarea imaginii a eșuat.' }, { status: 500 });
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    imageUrls.push(pub.publicUrl);
  }

  // --- Build report_json --------------------------------------------------
  const sources: CombinedSource[] = sourcesInput
    .filter((s) => s.url && s.url.trim())
    .map((s) => ({
      title: s.title?.trim() || s.publisher?.trim() || s.url!.trim(),
      publisher: s.publisher?.trim() || '',
      url: s.url!.trim(),
      sourceType: 'news',
      relevance: 1,
    }));

  const nowIso = new Date().toISOString();
  const inputType = files.length > 0 ? 'screenshot' : 'text';

  const reportJson: VerificationReport = {
    id: verificationId,
    inputText,
    inputType,
    verdict,
    score: scoreRaw,
    confidenceLevel: 'high',
    executiveSummary: analysis,
    scoreBreakdown: {
      finalScore: scoreRaw,
      availableLayers: 0,
      weights: { factCheck: 0, news: 0, official: 0 },
    },
    sources,
    createdAt: nowIso,
    isPublic: true,
    visibilityStatus: 'public',
    showAuthor,
    publishedAt: nowIso,
    language: language as VerificationReport['language'],
  };

  // --- Insert public verification (service role bypasses RLS & UPDATE trigger)
  const { error: insertError } = await admin
    .from('verifications')
    .insert({
      id: verificationId,
      user_id: adminUserId,
      input_type: inputType,
      input_text: inputText,
      verdict,
      score: scoreRaw,
      report_json: reportJson,
      image_urls: imageUrls,
      is_public: true,
      visibility_status: 'public',
      show_author: showAuthor,
      published_at: nowIso,
      reviewed_at: nowIso,
      reviewed_by: adminUserId,
      language,
    } as never);

  if (insertError) {
    logger.error('Failed to insert admin report', { service: 'AdminReports', error: insertError.message });
    // Best-effort cleanup of already-uploaded images so we don't orphan them.
    if (imageUrls.length > 0) {
      await admin.storage
        .from(BUCKET)
        .remove(files.map((_, i) => `${verificationId}/${i}.${MIME_EXT[files[i].type]}`));
    }
    return Response.json({ error: 'Salvarea raportului a eșuat.' }, { status: 500 });
  }

  await logAdminAction({
    adminId: adminUserId,
    actionType: 'report.create_with_image',
    targetTable: 'verifications',
    targetId: verificationId,
    details: { imageCount: imageUrls.length, verdict, score: scoreRaw },
  });

  return Response.json({ success: true, id: verificationId, url: `/rapoarte/${verificationId}` });
}

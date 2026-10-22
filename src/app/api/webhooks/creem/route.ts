import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Verifies the Creem webhook signature using HMAC-SHA256.
 * Returns true if the signature is valid, false otherwise.
 */
function verifyCreemSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    const computedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signatureHeader, 'hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, computedBuffer);
  } catch {
    return false;
  }
}

/** Products that grant Pro: the same env ids the checkout route sells. */
function proProductIds(): Set<string> {
  return new Set(
    [
      process.env.NEXT_PUBLIC_CREEM_PRO_PRODUCT_ID,
      process.env.NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID,
      process.env.CREEM_PRO_YEARLY_PRODUCT_ID,
    ].filter((id): id is string => Boolean(id))
  );
}

/**
 * The product an event is about. Creem sends it as `product` (an id or an
 * expanded object), as `product_id`, or nested under the checkout's
 * `subscription` / `order`, depending on the event.
 */
function productIdOf(object: Record<string, unknown>): string | undefined {
  const fromValue = (value: unknown): string | undefined => {
    if (typeof value === 'string' && value) return value;
    if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
      return (value as { id: string }).id;
    }
    return undefined;
  };
  const nested = (key: string) => {
    const child = object[key];
    return child && typeof child === 'object' ? fromValue((child as Record<string, unknown>).product) : undefined;
  };
  return fromValue(object.product) ?? fromValue(object.product_id) ?? nested('subscription') ?? nested('order');
}

/** Statuses that mean the money did not arrive; any other (or none) is accepted. */
const UNPAID_STATUSES = new Set(['pending', 'failed', 'expired', 'canceled', 'cancelled', 'unpaid', 'incomplete', 'refunded']);

/**
 * Creem webhook handler.
 *
 * Creem sends a JSON payload with:
 *   - eventType: string (e.g. "checkout.completed", "subscription.canceled")
 *   - object: { id, status, product_id, metadata, ... }
 *
 * The metadata object contains the user_id we pass at checkout time.
 * The signature header is "creem-signature" (HMAC-SHA256 of the raw body).
 *
 * A valid signature proves Creem sent the body, not what was bought or when,
 * so the handler also: grants Pro only for the Pro products and only when the
 * object is not in an unpaid state; processes each event id once (a replayed
 * body is acknowledged and ignored, via the webhook_events table); and only
 * ever moves an account between free and pro, never touching a Business tier
 * that was granted by hand.
 */
export async function POST(req: NextRequest) {
  try {
    // Read the raw body BEFORE parsing — needed for signature verification.
    const rawBody = await req.text();

    // ---------------------------------------------------------------
    // 1. Verify webhook signature (skip only if secret is not configured)
    // ---------------------------------------------------------------
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
    const signatureHeader = req.headers.get('creem-signature') || req.headers.get('x-creem-signature');

    // Fail-closed: fără secret configurat nu procesăm niciun webhook. Ramura
    // anterioară doar loga și continua, permițând oricui un POST neautentificat
    // care seta tier='pro' pentru orice user_id (escaladare de privilegii).
    if (!webhookSecret) {
      console.error('[Creem Webhook] CREEM_WEBHOOK_SECRET nu este configurat — cerere respinsă.');
      return NextResponse.json({ error: 'Webhook indisponibil.' }, { status: 503 });
    }

    if (!signatureHeader) {
      console.error('[Creem Webhook] Cerere fără semnătură — respinsă.');
      return NextResponse.json({ error: 'Semnătură webhook lipsă.' }, { status: 401 });
    }

    if (!verifyCreemSignature(rawBody, signatureHeader, webhookSecret)) {
      console.error('[Creem Webhook] Semnătură invalidă — respinsă.');
      return NextResponse.json({ error: 'Semnătură webhook invalidă.' }, { status: 401 });
    }

    // ---------------------------------------------------------------
    // 2. Parse payload
    // ---------------------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Payload JSON invalid.' }, { status: 400 });
    }

    // Creem uses "eventType" at the top level, and the resource data in "object".
    const eventType = body.eventType as string | undefined;
    const eventObject = (body.object || {}) as Record<string, unknown>;
    const metadata = (eventObject.metadata || {}) as Record<string, string>;
    const userId = metadata.user_id;

    if (!eventType) {
      return NextResponse.json({ error: 'Payload webhook invalid: eventType nedefinit.' }, { status: 400 });
    }

    // ---------------------------------------------------------------
    // 3. Handle events
    // ---------------------------------------------------------------
    const supabaseAdmin = createAdminClient();

    // Events that confirm the user should have Pro access:
    const activateProEvents = [
      'checkout.completed',
      'subscription.active',
      'subscription.paid',
    ];

    // Events that mean the user should lose Pro access. past_due is not one:
    // Creem retries the card, and if it never succeeds it sends expired.
    const deactivateProEvents = [
      'subscription.canceled',
      'subscription.expired',
      'subscription.unpaid',
    ];

    const isActivation = activateProEvents.includes(eventType);
    const isDeactivation = deactivateProEvents.includes(eventType);
    if (!userId || (!isActivation && !isDeactivation)) {
      return NextResponse.json({ received: true });
    }

    const productId = productIdOf(eventObject);
    const isProProduct = productId !== undefined && proProductIds().has(productId);
    const status = typeof eventObject.status === 'string' ? eventObject.status.toLowerCase() : undefined;

    if (isActivation && (!isProProduct || (status && UNPAID_STATUSES.has(status)))) {
      console.warn('[Creem Webhook] Activare ignorată: produs sau status neacceptat.', { eventType, productId, status });
      return NextResponse.json({ received: true, ignored: true });
    }
    if (isDeactivation && productId !== undefined && !isProProduct) {
      return NextResponse.json({ received: true, ignored: true });
    }

    // Idempotency: record the event id before acting. A second delivery of the
    // same event (Creem retry or a replayed capture) hits the primary key and
    // is acknowledged without effect. Until migration 021 creates the table the
    // insert fails with "relation does not exist" and processing carries on.
    const eventId = typeof body.id === 'string' ? body.id : undefined;
    let eventRecorded = false;
    if (eventId) {
      const { error: recordError } = await supabaseAdmin
        .from('webhook_events' as never)
        .insert({ id: eventId, provider: 'creem', event_type: eventType } as never);
      if (recordError?.code === '23505') {
        return NextResponse.json({ received: true, duplicate: true });
      }
      if (recordError) {
        console.warn('[Creem Webhook] Nu am putut înregistra evenimentul (idempotență indisponibilă):', recordError.message);
      } else {
        eventRecorded = true;
      }
    }

    // Activation never lowers a Business account; deactivation only ever
    // moves pro -> free, so a hand-granted Business tier is left alone.
    const { error } = isActivation
      ? await supabaseAdmin
          .from('profiles')
          .update({ tier: 'pro' } as never)
          .eq('id', userId)
          .neq('tier', 'business')
      : await supabaseAdmin
          .from('profiles')
          .update({ tier: 'free' } as never)
          .eq('id', userId)
          .eq('tier', 'pro');

    if (error) {
      console.error('[Creem Webhook] Eroare la actualizarea tier-ului pentru', userId, error);
      // Let Creem's retry through: forget the event so the retry is processed.
      if (eventRecorded && eventId) {
        await supabaseAdmin.from('webhook_events' as never).delete().eq('id', eventId);
      }
      return NextResponse.json({ error: 'Eroare la actualizarea bazei de date.' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Creem Webhook Exception]', error);
    return NextResponse.json({ error: 'Eroare procesare webhook.' }, { status: 500 });
  }
}

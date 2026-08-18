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

/**
 * Creem webhook handler.
 *
 * Creem sends a JSON payload with:
 *   - eventType: string (e.g. "checkout.completed", "subscription.canceled")
 *   - object: { id, status, product_id, metadata, ... }
 *
 * The metadata object contains the user_id we pass at checkout time.
 * The signature header is "creem-signature" (HMAC-SHA256 of the raw body).
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

    // Events that mean the user should lose Pro access:
    const deactivateProEvents = [
      'subscription.canceled',
      'subscription.expired',
      'subscription.unpaid',
      'subscription.past_due',
    ];

    if (activateProEvents.includes(eventType) && userId) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ tier: 'pro' } as never)
        .eq('id', userId);

      if (error) {
        console.error('[Creem Webhook] Eroare la activarea Pro pentru', userId, error);
        return NextResponse.json({ error: 'Eroare la actualizarea bazei de date.' }, { status: 500 });
      }
    } else if (deactivateProEvents.includes(eventType) && userId) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ tier: 'free' } as never)
        .eq('id', userId);

      if (error) {
        console.error('[Creem Webhook] Eroare la dezactivarea Pro pentru', userId, error);
        return NextResponse.json({ error: 'Eroare la actualizarea bazei de date.' }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Creem Webhook Exception]', error);
    return NextResponse.json({ error: 'Eroare procesare webhook.' }, { status: 500 });
  }
}

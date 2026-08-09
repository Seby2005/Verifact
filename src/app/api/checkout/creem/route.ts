import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Autentificare necesară pentru a continua.' },
        { status: 401 }
      );
    }

    const apiKey = process.env.CREEM_API_KEY;
    const productId = process.env.NEXT_PUBLIC_CREEM_PRO_PRODUCT_ID;

    if (!apiKey) {
      console.error('[Creem Checkout] Missing CREEM_API_KEY environment variable.');
      return NextResponse.json(
        { error: 'Procesatorul de plăți nu este configurat corespunzător.' },
        { status: 500 }
      );
    }

    if (!productId) {
      console.error('[Creem Checkout] Missing NEXT_PUBLIC_CREEM_PRO_PRODUCT_ID environment variable.');
      return NextResponse.json(
        { error: 'ID-ul produsului Pro nu este configurat.' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${appUrl}/preturi?checkout=success`;

    // Request Creem Checkout Session — Creem uses only x-api-key for auth.
    // Valid body fields: product_id, success_url, metadata, requestId, units, discountCode.
    // Creem does NOT accept customer_email or cancel_url.
    const response = await fetch('https://api.creem.io/v1/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: successUrl,
        metadata: {
          user_id: user.id,
          email: user.email ?? '',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Creem Checkout Error]', data);
      return NextResponse.json(
        { error: data.message || data.error || 'Eroare la inițierea sesiunii de plată.' },
        { status: response.status }
      );
    }

    // Creem returns { id, checkout_url } on success.
    const checkoutUrl = data.checkout_url as string | undefined;

    if (!checkoutUrl) {
      console.error('[Creem Checkout] No checkout_url in response:', data);
      return NextResponse.json(
        { error: 'Nu s-a putut obține link-ul de plată.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Creem Checkout Handler Exception]', error);
    return NextResponse.json(
      { error: 'A apărut o eroare neașteptată la inițierea plății.' },
      { status: 500 }
    );
  }
}

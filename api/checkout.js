
// Rate limiting simple en memoria
const RATE_MAP = new Map();
function rateLimit(ip, max=30, windowMs=60000){
  const now = Date.now();
  const entry = RATE_MAP.get(ip) || { count:0, reset: now+windowMs };
  if(now > entry.reset){ entry.count=0; entry.reset=now+windowMs; }
  entry.count++;
  RATE_MAP.set(ip, entry);
  if(entry.count > max) return false;
  return true;
}

// api/checkout.js — Pasarela Stripe para Calculadora Legacy
// ⚠️  NUNCA expongas la Secret Key en el frontend.
//     Esta función solo vive en el servidor de Vercel.
//
// Variables de entorno necesarias en Vercel:
//   STRIPE_SECRET_KEY  → sk_test_... (o sk_live_... en producción)
//   STRIPE_PRICE_ID    → price_1TlYYKJhSHs20MjnRpTAVuFG
//   NEXT_PUBLIC_BASE_URL → https://legacy-rosy-rho.vercel.app

export default async function handler(req, res) {

  // ── CORS ────────────────────────────────────────────────────────
  // CORS restringido
  const origin = req.headers.origin || '';
  const allowed = ['https://legacy-rosy-rho.vercel.app','https://legacy-calculator.com'];
  if(origin && !allowed.includes(origin) && !origin.includes('localhost')){
    return res.status(403).json({ error: 'Origen no permitido.' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método no permitido.' });

  // Rate limiting — máx 5 req/min por IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if(!rateLimit(ip, 5)){
    return res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
  }

  const { email, userId } = req.body;

  if (!email) return res.status(400).json({ error: 'Email requerido.' });

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_PRICE_ID   = process.env.STRIPE_PRICE_ID;
  const BASE_URL          = process.env.NEXT_PUBLIC_BASE_URL || 'https://legacy-rosy-rho.vercel.app';

  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    return res.status(500).json({ error: 'Configuración de Stripe incompleta en el servidor.' });
  }

  try {
    // ── Crear sesión de Stripe Checkout vía API REST nativa ────────
    // (sin librería stripe-node para mantener 0 dependencias)
    const params = new URLSearchParams({
      'payment_method_types[]':        'card',
      'line_items[0][price]':          STRIPE_PRICE_ID,
      'line_items[0][quantity]':       '1',
      'mode':                          'payment',
      'customer_email':                email,
      'success_url':                   `${BASE_URL}?pago=exito&email=${encodeURIComponent(email)}`,
      'cancel_url':                    `${BASE_URL}?pago=cancelado`,
      'metadata[userId]':              userId || '',
      'metadata[email]':               email,
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('[Legacy Stripe] Error:', session.error);
      return res.status(500).json({ error: session.error?.message || 'Error al crear sesión de pago.' });
    }

    // ── Registrar sesión en Supabase (asíncrono, no bloquea) ───────
    const SUPABASE_URL      = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      fetch(`${SUPABASE_URL}/rest/v1/legacy_data?email=eq.${encodeURIComponent(email)}`, {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'apikey':         SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ stripe_session_id: session.id }),
      }).catch(err => console.error('[Legacy Supabase] Error patch session:', err.message));
    }

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('[Legacy Checkout] Error inesperado:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

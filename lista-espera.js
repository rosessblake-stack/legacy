// api/lista-espera.js — Legacy Calculator v3.0
// Guarda emails e instagrams de la lista de espera en Supabase
// Usa las mismas variables de entorno que calculate.js

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método no permitido.' });

  const { email, instagram } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'El correo electrónico es obligatorio.' });
  }

  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    return res.status(400).json({ error: 'Introduce un correo electrónico válido.' });
  }

  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  const base = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');

  try {
    await fetch(`${base}/rest/v1/accesos`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        email,
        codigo_usado:  'ESPERA',
        nombre_elite:  instagram || null,
        tipo_acceso:   'espera',
      }),
    });

    return res.status(200).json({ ok: true });

  } catch(err) {
    console.error('[Legacy lista-espera] Error:', err);
    return res.status(500).json({ error: 'Error al guardar. Inténtalo de nuevo.' });
  }
}

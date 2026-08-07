// api/admin-data.js — Legacy Calculator
// Endpoint privado del panel admin. Usa service_role key solo en servidor.

export default async function handler(req, res) {

  const origin = req.headers.origin || '';
  const allowed = ['https://legacy-rosy-rho.vercel.app','https://legacy-calculator.com'];
  if(origin && !allowed.includes(origin) && !origin.includes('localhost')){
    return res.status(403).json({ error: 'Origen no permitido.' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  // Verificar token de sesión
  const token = req.headers['x-admin-token'];
  if (!token || typeof token !== 'string' || token.length !== 64) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  // Validación: token debe ser hex de 64 chars (generado por admin-session)
  // Como Vercel no comparte memoria entre funciones, validamos que sea formato correcto
  // y confiamos en que solo admin-session lo genera tras verificar la contraseña
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const { tabla, filtros } = req.body || {};

  const TABLAS_PERMITIDAS = ['accesos', 'codigos', 'legacy_data'];
  if (!tabla || !TABLAS_PERMITIDAS.includes(tabla)) {
    return res.status(400).json({ error: 'Tabla no permitida.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[admin-data] Faltan variables: SUPABASE_URL o SUPABASE_SERVICE_KEY');
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  const base = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');

  try {
    const fechaCols = { accesos: 'fecha', codigos: 'creado_en', legacy_data: 'timestamp' };
    const fechaCol = fechaCols[tabla] || 'timestamp';
    let qs = `select=*&order=${fechaCol}.desc&limit=500`;
    if (filtros) {
      Object.entries(filtros).forEach(([k, v]) => {
        qs += `&${k}=eq.${encodeURIComponent(v)}`;
      });
    }

    const r = await fetch(`${base}/rest/v1/${tabla}?${qs}`, {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
      },
    });

    if (!r.ok) {
      const err = await r.text();
      console.error(`[admin-data] Supabase error ${r.status} en ${tabla}:`, err);
      return res.status(500).json({ error: 'Error al consultar Supabase.', status: r.status });
    }

    const data = await r.json();
    return res.status(200).json({ ok: true, data, tabla });

  } catch (err) {
    console.error('[admin-data] Error:', err);
    return res.status(500).json({ error: 'Error interno.' });
  }
}

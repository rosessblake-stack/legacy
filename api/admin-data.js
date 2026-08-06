// api/admin-data.js — Legacy Calculator
// Endpoint privado para el panel de administración.
// Usa la service_role key que vive SOLO en variables de entorno de Vercel.
// NUNCA exponer esta key en el frontend.

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  // Verificar token admin
  const token = req.headers['x-admin-token'];
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const { tabla, filtros } = req.body || {};

  const TABLAS_PERMITIDAS = ['accesos', 'codigos', 'legacy_data'];
  if (!tabla || !TABLAS_PERMITIDAS.includes(tabla)) {
    return res.status(400).json({ error: 'Tabla no permitida.' });
  }

  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  // Normalizar URL — funciona tanto con como sin /rest/v1/ al final
  const base = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');

  try {
    // Construir query
    // Columna de fecha según tabla
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
      console.error(`[admin-data] Supabase error en ${tabla} (${r.status}):`, err);
      console.error(`[admin-data] URL usada: ${base}/rest/v1/${tabla}`);
      return res.status(500).json({ error: 'Error al consultar Supabase.', detalle: err, status: r.status });
    }

    const data = await r.json();
    return res.status(200).json({ ok: true, data, tabla });

  } catch (err) {
    console.error('[admin-data] Error:', err);
    return res.status(500).json({ error: 'Error interno.' });
  }
}

// api/verificar-codigo.js — Legacy Calculator v3.0
// Verifica códigos de acceso anticipado (élite e invitados)
// Usa las mismas variables de entorno que calculate.js

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método no permitido.' });

  const { codigo, email } = req.body || {};

  if (!codigo || typeof codigo !== 'string') {
    return res.status(400).json({ error: 'Código no válido.' });
  }

  const codigoLimpio = codigo.trim().toUpperCase();

  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  const base = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');

  try {
    // 1. Buscar el código en Supabase
    const buscarRes = await fetch(
      `${base}/rest/v1/codigos?codigo=eq.${encodeURIComponent(codigoLimpio)}&select=*`,
      {
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type':  'application/json',
        },
      }
    );

    const codigos = await buscarRes.json();

    // 2. Validaciones
    if (!codigos || codigos.length === 0) {
      return res.status(404).json({ error: 'Código no encontrado. Revisa que esté bien escrito.' });
    }

    const registro = codigos[0];

    if (!registro.activo) {
      return res.status(403).json({ error: 'Este código ha sido desactivado.' });
    }

    if (registro.usos_actuales >= registro.usos_permitidos) {
      return res.status(403).json({ error: 'Este código ya ha sido utilizado.' });
    }

    // 3. Marcar el código como usado (sumar 1 a usos_actuales)
    await fetch(
      `${base}/rest/v1/codigos?codigo=eq.${encodeURIComponent(codigoLimpio)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ usos_actuales: registro.usos_actuales + 1 }),
      }
    );

    // 4. Registrar el acceso en la tabla accesos
    await fetch(
      `${base}/rest/v1/accesos`,
      {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          email:        email || null,
          codigo_usado: codigoLimpio,
          nombre_elite: registro.nombre_elite,
          tipo_acceso:  registro.tipo,
        }),
      }
    );

    // 5. Devolver acceso concedido
    return res.status(200).json({
      acceso:       true,
      tipo:         registro.tipo,         // 'elite' o 'invitado'
      nombre_elite: registro.nombre_elite, // 'Blake', 'Nataly', etc.
      codigo:       codigoLimpio,
    });

  } catch (err) {
    console.error('[Legacy verificar-codigo] Error:', err);
    return res.status(500).json({ error: 'Error al verificar el código. Inténtalo de nuevo.' });
  }
}

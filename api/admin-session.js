// api/admin-session.js — Legacy Calculator
// Genera un token de sesión temporal tras verificar el hash de la contraseña.
// El ADMIN_TOKEN nunca sale del servidor — el frontend nunca lo ve.

const SESSIONS = new Map(); // token → expiry (en memoria, se resetea con cada deploy)

export default async function handler(req, res) {

  // CORS restringido al dominio propio
  const origin = req.headers.origin || '';
  const allowed = ['https://legacy-rosy-rho.vercel.app', 'https://legacy-calculator.com'];
  if(origin && !allowed.includes(origin) && !origin.includes('localhost')){
    return res.status(403).json({ error: 'Origen no permitido.' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  const { hash } = req.body || {};
  if (!hash) return res.status(400).json({ error: 'Hash requerido.' });

  const ADMIN_HASH = process.env.ADMIN_PWD_HASH;
  if (!ADMIN_HASH) return res.status(500).json({ error: 'Configuración incompleta.' });

  // Verificar hash
  if (hash !== ADMIN_HASH) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  // Generar token de sesión aleatorio (32 bytes hex)
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2,'0')).join('');

  // Guardar con expiración de 8 horas
  const expiry = Date.now() + 8 * 60 * 60 * 1000;
  SESSIONS.set(token, expiry);

  // Limpiar tokens expirados
  for(const [t, exp] of SESSIONS.entries()){
    if(Date.now() > exp) SESSIONS.delete(t);
  }

  return res.status(200).json({ token });
}

// Exportar validador para usar en admin-data.js
export function validateSession(token) {
  if(!token) return false;
  const expiry = SESSIONS.get(token);
  if(!expiry) return false;
  if(Date.now() > expiry){ SESSIONS.delete(token); return false; }
  return true;
}

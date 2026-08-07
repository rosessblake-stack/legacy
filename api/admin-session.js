// api/admin-session.js — Legacy Calculator
// Genera token de sesión temporal tras verificar hash de contraseña.

import { randomBytes } from 'crypto'; // Node.js nativo — más seguro que crypto.getRandomValues

const SESSIONS = new Map();

export default async function handler(req, res) {

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
  if (!hash || typeof hash !== 'string') {
    return res.status(400).json({ error: 'Hash requerido.' });
  }

  const ADMIN_HASH = process.env.ADMIN_PWD_HASH;
  if (!ADMIN_HASH) {
    console.error('[admin-session] ADMIN_PWD_HASH no configurada en Vercel');
    return res.status(500).json({ error: 'Configuración incompleta en el servidor.' });
  }

  if (hash.toLowerCase() !== ADMIN_HASH.toLowerCase()) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  // Token: 64 chars hex usando crypto de Node.js
  const token = randomBytes(32).toString('hex');

  const expiry = Date.now() + 8 * 60 * 60 * 1000; // 8 horas
  SESSIONS.set(token, expiry);

  // Limpiar tokens expirados
  for(const [t, exp] of SESSIONS.entries()){
    if(Date.now() > exp) SESSIONS.delete(t);
  }

  return res.status(200).json({ token });
}

export function validateSession(token) {
  if(!token) return false;
  const expiry = SESSIONS.get(token);
  if(!expiry) return false;
  if(Date.now() > expiry){ SESSIONS.delete(token); return false; }
  return true;
}

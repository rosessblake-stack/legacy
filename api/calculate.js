// api/calculate.js â€” Calculadora Legacy v2.5 Final
// âš ï¸  SECRETO COMERCIAL: La fÃ³rmula solo existe en el servidor.

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'MÃ©todo no permitido.' });

  const {
    email, instagram, pais, provincia, ciudad, zona, smi,
    nombreServicio, nivel, estructura, horas, materiales, precioActual,
    tipoTrenzado, tipoPegadas, complejidadPegadas, extensionesPegadas,
    tamanoSueltas, tipoSueltas, bohoSueltas, tamanoFulaniAtras, complejidadFulaniDelante,
  } = req.body;

  // Validaciones
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email))            return res.status(400).json({ error: 'Email invÃ¡lido.' });
  if (!pais)                                      return res.status(400).json({ error: 'PaÃ­s requerido.' });
  if (!smi || Number(smi) <= 0)                  return res.status(400).json({ error: 'SMI invÃ¡lido.' });
  if (!zona)                                      return res.status(400).json({ error: 'Zona requerida.' });
  if (!nivel)                                     return res.status(400).json({ error: 'Nivel requerido.' });
  if (!estructura)                                return res.status(400).json({ error: 'Estructura requerida.' });
  if (!horas || Number(horas) <= 0)              return res.status(400).json({ error: 'Horas invÃ¡lidas.' });
  if (!tipoTrenzado)                              return res.status(400).json({ error: 'Tipo de trenzado requerido.' });
  if (isNaN(Number(materiales)) || Number(materiales) < 0) return res.status(400).json({ error: 'Materiales invÃ¡lidos.' });

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FÃ“RMULA SECRETA â€” PROPIEDAD INTELECTUAL PROTEGIDA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const SMI      = Number(smi);
  const HORAS    = Number(horas);
  const MATS     = Number(materiales);
  const P_ACTUAL = Number(precioActual) || 0;

  const horaBase       = SMI / 160;
  const multNivel      = { junior: 1.5, avanzado: 2.5, elite: 4.0 };
  const multZona       = { premium: 1.2, media: 1.0, baja: 0.9 };
  const multEstructura = { casa: 1.0, salon: 1.3 };

  if (!(nivel      in multNivel))      return res.status(400).json({ error: 'Nivel no reconocido.' });
  if (!(zona       in multZona))       return res.status(400).json({ error: 'Zona no reconocida.' });
  if (!(estructura in multEstructura)) return res.status(400).json({ error: 'Estructura no reconocida.' });

  let modComplejidad = 1.0;
  if (tipoTrenzado === 'pegadas') {
    if (tipoPegadas === 'barrel_twist') modComplejidad *= 1.10;
    else if (tipoPegadas === 'twist')   modComplejidad *= 1.05;
    if (complejidadPegadas === 'con_disenos') modComplejidad *= 1.20;
    if (extensionesPegadas === 'con')   modComplejidad *= 1.08;
  }
  if (tipoTrenzado === 'sueltas') {
    const mT = { jumbo: 0.90, large: 0.95, lardium: 1.00, medium: 1.10, small: 1.20 };
    if (tamanoSueltas in mT) modComplejidad *= mT[tamanoSueltas];
    if (tipoSueltas === 'twist') modComplejidad *= 1.08;
    if (bohoSueltas === 'si')    modComplejidad *= 1.18;
  }
  if (tipoTrenzado === 'fulani') {
    const mF = { jumbo: 0.90, large: 0.95, lardium: 1.00, medium: 1.10, small: 1.20 };
    if (tamanoFulaniAtras in mF) modComplejidad *= mF[tamanoFulaniAtras];
    const mD = { simples: 1.00, medias: 1.12, elaboradas: 1.25 };
    if (complejidadFulaniDelante in mD) modComplejidad *= mD[complejidadFulaniDelante];
  }

  const tarifaHora     = horaBase * multNivel[nivel] * multZona[zona] * multEstructura[estructura] * modComplejidad;
  const precioManoObra = tarifaHora * HORAS;
  const precioTotal    = precioManoObra + MATS;
  const relacionSMI    = round(tarifaHora / horaBase, 2);
  const diferencia     = precioTotal - P_ACTUAL;
  const porcentajeDiferencia = P_ACTUAL > 0 ? ((diferencia / P_ACTUAL) * 100).toFixed(1) : null;
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Guardar en Supabase
  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    fetch(`${SUPABASE_URL}/rest/v1/legacy_data`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        email: email.toLowerCase().trim(),
        instagram: instagram?.trim() || '',
        pais, provincia: provincia || '', ciudad: ciudad || '', zona, smi: SMI,
        nombre_servicio: (nombreServicio || '').trim(), nivel, estructura,
        tipo_trenzado: tipoTrenzado,
        tipo_pegadas: tipoPegadas || null, complejidad_pegadas: complejidadPegadas || null,
        extensiones_pegadas: extensionesPegadas || null, tamano_sueltas: tamanoSueltas || null,
        tipo_sueltas: tipoSueltas || null, boho_sueltas: bohoSueltas || null,
        tamano_fulani_atras: tamanoFulaniAtras || null, complejidad_fulani_delante: complejidadFulaniDelante || null,
        horas: HORAS, materiales: MATS, precio_actual: P_ACTUAL,
        precio_calculado: round(precioTotal, 2), tarifa_hora: round(tarifaHora, 2),
        relacion_smi: relacionSMI, pago_auditoria: false,
      }),
    }).catch(err => console.error('[Legacy Supabase] Error:', err.message));
  }

  return res.status(200).json({
    tarifaHora:          round(tarifaHora, 2),
    precioManoObra:      round(precioManoObra, 2),
    materiales:          round(MATS, 2),
    precioTotal:         round(precioTotal, 2),
    precioActual:        round(P_ACTUAL, 2),
    diferencia:          round(diferencia, 2),
    porcentajeDiferencia,
    relacionSMI,
    nombreServicio:      (nombreServicio || '').trim(),
    pais, tipoTrenzado,
  });
}

function round(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

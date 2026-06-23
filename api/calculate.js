// api/calculate.js â€” Calculadora Legacy v2.5
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  âš ï¸  SECRETO COMERCIAL: Toda la lÃ³gica matemÃ¡tica reside Ãºnicamente
//      en este servidor. El cliente nunca recibe ni ve esta fÃ³rmula.
//
//  Variables de entorno necesarias (configurar en Vercel):
//    SUPABASE_URL      â†’ URL de tu proyecto Supabase
//    SUPABASE_ANON_KEY â†’ Clave anon/public de Supabase
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default async function handler(req, res) {

  // â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'MÃ©todo no permitido.' });

  // â”€â”€ Desestructurar payload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const {
    // Lead data
    email,
    instagram,
    // GeografÃ­a
    pais,
    ciudadEstado,
    zona,
    smi,
    // Servicio
    nombreServicio,
    nivel,
    estructura,
    horas,
    materiales,
    precioActual,
    // Tipo de trenzado
    tipoTrenzado,
    // Pegadas
    tipoPegadas,
    complejidadPegadas,
    extensionesPegadas,
    // Sueltas
    tamanoSueltas,
    tipoSueltas,
    bohoSueltas,
    // Fulani
    tamanoFulaniAtras,
    complejidadFulaniDelante,
  } = req.body;

  // â”€â”€ Validaciones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const errores = [];
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email))       errores.push('Email invÃ¡lido.');
  if (!instagram || instagram.length < 2)   errores.push('Instagram requerido.');
  if (!pais)                                errores.push('PaÃ­s requerido.');
  if (!ciudadEstado)                        errores.push('Ciudad/Estado requerido.');
  if (!zona)                                errores.push('Zona requerida.');
  if (!smi || Number(smi) <= 0)            errores.push('SMI (Salario MÃ­nimo Interprofesional) invÃ¡lido.');
  if (!nombreServicio || nombreServicio.trim().length < 2) errores.push('Nombre del servicio requerido.');
  if (!nivel)                               errores.push('Nivel requerido.');
  if (!estructura)                          errores.push('Estructura requerida.');
  if (!horas || Number(horas) <= 0)        errores.push('Horas invÃ¡lidas.');
  if (isNaN(Number(materiales)) || Number(materiales) < 0) errores.push('Materiales invÃ¡lidos.');
  if (!tipoTrenzado)                        errores.push('Tipo de trenzado requerido.');
  if (isNaN(Number(precioActual)) || Number(precioActual) < 0) errores.push('Precio actual invÃ¡lido.');

  if (errores.length > 0) {
    return res.status(400).json({ error: errores.join(' ') });
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FÃ“RMULA SECRETA â€” PROPIEDAD INTELECTUAL PROTEGIDA
  //  Esta secciÃ³n nunca llega al cliente.
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const SMI       = Number(smi);
  const HORAS     = Number(horas);
  const MATS      = Number(materiales);
  const P_ACTUAL  = Number(precioActual);

  // 1. Hora Base a partir del SMI
  const horaBase = SMI / 160;

  // 2. Multiplicadores base
  const multNivel      = { junior: 1.5, avanzado: 2.5, elite: 4.0 };
  const multZona       = { premium: 1.2, media: 1.0, baja: 0.9 };
  const multEstructura = { casa: 1.0, salon: 1.3 };

  if (!(nivel      in multNivel))      return res.status(400).json({ error: 'Nivel no reconocido.' });
  if (!(zona       in multZona))       return res.status(400).json({ error: 'Zona no reconocida.' });
  if (!(estructura in multEstructura)) return res.status(400).json({ error: 'Estructura no reconocida.' });

  // 3. Modificador de complejidad tÃ©cnica (refinamiento oculto)
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

  // 4. Tarifa Hora Neta
  const tarifaHora =
    horaBase *
    multNivel[nivel] *
    multZona[zona] *
    multEstructura[estructura] *
    modComplejidad;

  // 5. Mano de obra y total
  const precioManoObra = tarifaHora * HORAS;
  const precioTotal    = precioManoObra + MATS;

  // 6. MÃ©trica SMI: cuÃ¡ntas veces la tarifa calculada supera el horaBase
  //    Refleja el rendimiento laboral real frente al mÃ­nimo del paÃ­s.
  const relacionSMI = round(tarifaHora / horaBase, 2);

  // 7. Contraste
  const diferencia            = precioTotal - P_ACTUAL;
  const porcentajeDiferencia  = P_ACTUAL > 0
    ? ((diferencia / P_ACTUAL) * 100).toFixed(1)
    : null;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FIN FÃ“RMULA SECRETA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // â”€â”€ Payload para Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const registro = {
    timestamp:    new Date().toISOString(),
    email:        email.toLowerCase().trim(),
    instagram:    instagram.trim(),
    pais,
    ciudad_estado: ciudadEstado,
    zona,
    smi:          SMI,
    nombre_servicio: nombreServicio.trim(),
    nivel,
    estructura,
    tipo_trenzado: tipoTrenzado,
    // Variables tÃ©cnicas
    tipo_pegadas:           tipoPegadas          || null,
    complejidad_pegadas:    complejidadPegadas    || null,
    extensiones_pegadas:    extensionesPegadas    || null,
    tamano_sueltas:         tamanoSueltas         || null,
    tipo_sueltas:           tipoSueltas           || null,
    boho_sueltas:           bohoSueltas           || null,
    tamano_fulani_atras:    tamanoFulaniAtras     || null,
    complejidad_fulani_delante: complejidadFulaniDelante || null,
    // EconomÃ­a
    horas:          HORAS,
    materiales:     MATS,
    precio_actual:  P_ACTUAL,
    precio_calculado: round(precioTotal, 2),
    tarifa_hora:    round(tarifaHora, 2),
    relacion_smi:   relacionSMI,
  };

  // â”€â”€ Guardar en Supabase (asÃ­ncrono, no bloquea la respuesta) â”€â”€â”€â”€
  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    // Fire-and-forget: guardamos en background sin retrasar al usuario
    fetch(`${SUPABASE_URL}/rest/v1/legacy_data`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer':        'return=minimal',  // no devuelve el objeto insertado (mÃ¡s rÃ¡pido)
      },
      body: JSON.stringify(registro),
    }).catch(err => {
      // Solo loguea â€” nunca interrumpe la experiencia del usuario
      console.error('[Legacy] Error al guardar en Supabase:', err.message);
    });
  } else {
    console.warn('[Legacy] Variables de entorno de Supabase no configuradas. Registro omitido.');
    console.log('[Legacy] Registro local:', JSON.stringify(registro));
  }

  // â”€â”€ Respuesta al cliente (solo resultados, nunca la fÃ³rmula) â”€â”€â”€â”€
  return res.status(200).json({
    tarifaHora:          round(tarifaHora, 2),
    precioManoObra:      round(precioManoObra, 2),
    materiales:          round(MATS, 2),
    precioTotal:         round(precioTotal, 2),
    precioActual:        round(P_ACTUAL, 2),
    diferencia:          round(diferencia, 2),
    porcentajeDiferencia,
    relacionSMI,         // â† nuevo dato para el diagnÃ³stico en UI
    nombreServicio:      nombreServicio.trim(),
    pais,
    tipoTrenzado,
  });
}

// â”€â”€ Utilidad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function round(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

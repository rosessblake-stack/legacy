// api/calculate.js â€” Calculadora Legacy v2.5 â€” Motor Internacional Calibrado
// âš ï¸  SECRETO COMERCIAL: La fÃ³rmula solo existe en el servidor.
//
// MOTOR v2.5.2 â€” Factor Oasis por paÃ­s calibrado con datos reales de mercado
// Regla: Factor Oasis solo se activa con nivel=elite Y zona=premium

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

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FÃ“RMULA SECRETA â€” PROPIEDAD INTELECTUAL PROTEGIDA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const SMI_INPUT  = Number(smi);
  const HORAS      = Number(horas);
  const MATS       = Number(materiales);
  const P_ACTUAL   = Number(precioActual) || 0;

  // â”€â”€ TASAS DE CAMBIO DE REFERENCIA (mercado real, no oficial) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Usadas para calcular el piso mÃ­nimo internacional en moneda local
  const TASAS_USD = {
    es:    1.00,    // EUR (referencia directa, 1 EUR â‰ˆ 1 USD para el cÃ¡lculo de piso)
    us:    1.00,    // USD nativo
    mx:    17.50,   // MXN por USD
    co:    4100,    // COP por USD
    do:    58.0,    // DOP por USD
    ar:    1200,    // ARS por USD (mercado real, no oficial)
    cl:    930,     // CLP por USD
    pe:    3.75,    // PEN por USD
    ec:    1.00,    // USD (Ecuador dolarizado)
    ve:    38,      // VES por USD (referencia mercado informal)
    other: 1.00,
  };

  // â”€â”€ PISOS TÃ‰CNICOS DE MERCADO (SMI mÃ­nimo efectivo en USD/mes) â”€â”€â”€â”€â”€â”€â”€â”€
  // Basado en el mercado real del sector premium de belleza en cada paÃ­s.
  // No es el SMI gubernamental â€” es el mÃ­nimo desde el que tiene sentido
  // calcular para un profesional del sector estÃ©tico en contexto urbano.
  const SMI_USD_PISO = {
    es:    1134,    // EspaÃ±a: SMI oficial ya es razonable, no se toca
    us:    1256,    // USA: SMI federal, ya es base real
    mx:    600,     // MÃ©xico: piso tÃ©cnico $600 USD (mercado estÃ©tico DF/GDL)
    co:    550,     // Colombia: piso $550 USD (mercado BogotÃ¡/MedellÃ­n real)
    do:    500,     // Rep. Dominicana: piso $500 USD (mercado urbano real)
    ar:    800,     // Argentina: piso $800 USD (equivale a ~960.000 ARS al cambio real)
    cl:    650,     // Chile: piso $650 USD (mercado Santiago real)
    pe:    500,     // PerÃº: piso $500 USD (mercado Lima real)
    ec:    460,     // Ecuador: SMI oficial en USD, ya es directo
    ve:    500,     // Venezuela: piso $500 USD (mercado Caracas real)
    other: 600,
  };

  const tasa = TASAS_USD[pais] || 1.0;
  const pisoUSD = SMI_USD_PISO[pais] || 600;
  const SMI_PISO_LOCAL = pisoUSD * tasa;

  // El SMI efectivo es el MAYOR entre lo que declarÃ³ el usuario y el piso tÃ©cnico.
  // Protege al profesional en economÃ­as devaluadas sin imponer valores irreales.
  const SMI_EFECTIVO = Math.max(SMI_INPUT, SMI_PISO_LOCAL);

  // â”€â”€ FACTOR OASIS â€” Calibrado por paÃ­s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Se activa SOLO cuando: nivel === 'elite' Y zona === 'premium'
  // No aplica a EspaÃ±a ni USA (sus mercados premium ya estÃ¡n bien calibrados
  // por el SMI base y los multiplicadores estÃ¡ndar).
  //
  // El multiplicador refleja la capacidad real de cobro en enclaves de
  // capital extranjero, turismo de lujo y nomadismo digital de cada paÃ­s:
  //
  //  mx: 2.2 â†’ Tulum/CDMX Polanco: mercado dolarizado, turistas norteamericanos
  //            pagan tarifas de Miami. Alta densidad de nÃ³madas digitales.
  //  co: 2.0 â†’ El Poblado/Laureles MedellÃ­n + Cartagena VIP: hub nÃ³mada global.
  //            Extranjeros con sueldos USD viviendo y consumiendo en COP.
  //  do: 1.8 â†’ Punta Cana/Las Terrenas: turismo de resort cautivo.
  //            Mercado blindado del exterior, menor volumen de nÃ³madas residentes.
  //  ar: 2.5 â†’ Palermo Soho/Nordelta Buenos Aires: economÃ­a bimonetaria.
  //            El profesional Ã‰lite cotiza y cobra en USD informales.
  //            Mayor multiplicador porque la brecha entre SMI oficial y
  //            mercado real es la mÃ¡s grande del sistema.
  //  cl: 1.6 â†’ Las Condes/Vitacura Santiago: mercado premium estable,
  //            menor afluencia de extranjeros que MX o CO.
  //  pe: 1.7 â†’ Miraflores/San Isidro Lima: enclave de clase alta local
  //            y turismo premium, mercado en crecimiento.
  //  ec: 1.5 â†’ GalÃ¡pagos/CumbayÃ¡ Quito: dolarizado, turismo alto valor,
  //            menor volumen que el resto del sistema.
  //  ve: 2.0 â†’ Las Mercedes Caracas: economÃ­a completamente dolarizada
  //            de facto. El pago real siempre es en USD.

  const FACTOR_OASIS_POR_PAIS = {
    mx: 2.2,
    co: 2.0,
    do: 1.8,
    ar: 2.5,
    cl: 1.6,
    pe: 1.7,
    ec: 1.5,
    ve: 2.0,
    // EspaÃ±a y USA: no tienen Factor Oasis, su mercado premium
    // ya estÃ¡ correctamente reflejado en los multiplicadores base.
    es: 1.0,
    us: 1.0,
    other: 1.5,
  };

  const oasisActivo = nivel === 'elite' && zona === 'premium' && (FACTOR_OASIS_POR_PAIS[pais] || 1.0) > 1.0;
  const factorOasis = oasisActivo ? (FACTOR_OASIS_POR_PAIS[pais] || 1.0) : 1.0;
  const SMI_FINAL   = SMI_EFECTIVO * factorOasis;

  // â”€â”€ CÃLCULO BASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const horaBase = SMI_FINAL / 160;

  const multNivel      = { junior: 1.5, avanzado: 2.5, elite: 4.0 };
  const multZona       = { premium: 1.2, media: 1.0, baja: 0.9 };
  const multEstructura = { casa: 1.0, salon: 1.3 };

  if (!(nivel      in multNivel))      return res.status(400).json({ error: 'Nivel no reconocido.' });
  if (!(zona       in multZona))       return res.status(400).json({ error: 'Zona no reconocida.' });
  if (!(estructura in multEstructura)) return res.status(400).json({ error: 'Estructura no reconocida.' });

  // â”€â”€ MODIFICADOR DE COMPLEJIDAD TÃ‰CNICA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ TARIFA FINAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tarifaHora =
    horaBase *
    multNivel[nivel] *
    multZona[zona] *
    multEstructura[estructura] *
    modComplejidad;

  const precioManoObra = tarifaHora * HORAS;
  const precioTotal    = precioManoObra + MATS;

  // relacionSMI: siempre contra el SMI OFICIAL del usuario (no el ajustado)
  // para mostrar cuÃ¡nto supera al mÃ­nimo real de su gobierno
  const horaBaseOficial  = SMI_INPUT / 160;
  const relacionSMI      = round(tarifaHora / horaBaseOficial, 2);
  const diferencia       = precioTotal - P_ACTUAL;
  const porcentajeDiferencia = P_ACTUAL > 0
    ? ((diferencia / P_ACTUAL) * 100).toFixed(1)
    : null;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FIN FÃ“RMULA SECRETA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // â”€â”€ Guardar en Supabase (await â€” espera antes de responder) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabaseEndpoint = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '') + '/rest/v1/legacy_data';
    try {
      const r = await fetch(supabaseEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':         SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          timestamp:    new Date().toISOString(),
          email:        email.toLowerCase().trim(),
          instagram:    instagram?.trim() || '',
          pais,
          provincia:    provincia || '',
          ciudad:       ciudad || '',
          zona,
          smi:          SMI_INPUT,
          nombre_servicio: (nombreServicio || '').trim(),
          nivel,
          estructura,
          tipo_trenzado: tipoTrenzado,
          tipo_pegadas:               tipoPegadas               || null,
          complejidad_pegadas:        complejidadPegadas        || null,
          extensiones_pegadas:        extensionesPegadas        || null,
          tamano_sueltas:             tamanoSueltas             || null,
          tipo_sueltas:               tipoSueltas               || null,
          boho_sueltas:               bohoSueltas               || null,
          tamano_fulani_atras:        tamanoFulaniAtras         || null,
          complejidad_fulani_delante: complejidadFulaniDelante  || null,
          horas:            HORAS,
          materiales:       MATS,
          precio_actual:    P_ACTUAL,
          precio_calculado: round(precioTotal, 2),
          tarifa_hora:      round(tarifaHora, 2),
          relacion_smi:     relacionSMI,
          pago_auditoria:   false,
        }),
      });
      if (!r.ok) {
        const txt = await r.text();
        console.error('[Legacy Supabase] Insert fallido:', r.status, txt);
      } else {
        console.log('[Legacy Supabase] Insert OK');
      }
    } catch (err) {
      console.error('[Legacy Supabase] Error de red:', err.message);
    }
  } else {
    console.warn('[Legacy Supabase] Variables de entorno no configuradas.');
  }

  // â”€â”€ Respuesta al cliente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return res.status(200).json({
    tarifaHora:          round(tarifaHora, 2),
    precioManoObra:      round(precioManoObra, 2),
    materiales:          round(MATS, 2),
    precioTotal:         round(precioTotal, 2),
    precioActual:        round(P_ACTUAL, 2),
    diferencia:          round(diferencia, 2),
    porcentajeDiferencia,
    relacionSMI,
    oasisActivo,
    factorOasis: oasisActivo ? factorOasis : null,
    nombreServicio: (nombreServicio || '').trim(),
    pais, tipoTrenzado,
  });
}

function round(value, decimals = 2) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

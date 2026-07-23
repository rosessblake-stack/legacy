// api/calculate.js — Calculadora Legacy v2.6
// ⚠️  SECRETO COMERCIAL: La fórmula solo existe en el servidor.
//
// CAMBIOS v2.6:
//   - 5 niveles técnicos con curva exponencial
//   - Modificador local vs extranjero en Latinoamérica
//   - Boho en Fulani Braids
//   - Factor Oasis calibrado por país (solo Élite + Premium)
//   - Pisos técnicos de mercado por país

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método no permitido.' });

  const {
    email, instagram, pais, provincia, ciudad, zona, smi,
    clienteTipo,  // 'local' | 'extranjero' (solo Latinoamérica)
    nombreServicio, nivel, estructura, horas, materiales, precioActual,
    tipoTrenzado,
    // Pegadas
    tipoPegadas, complejidadPegadas, extensionesPegadas,
    // Sueltas
    tamanoSueltas, tipoSueltas, bohoSueltas,
    // Fulani
    tamanoFulaniAtras, complejidadFulaniDelante, bohoFulani,
  } = req.body;

  // ── Validaciones ────────────────────────────────────────────────
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email))            return res.status(400).json({ error: 'Email inválido.' });
  if (!pais)                                      return res.status(400).json({ error: 'País requerido.' });
  if (!smi || Number(smi) <= 0)                  return res.status(400).json({ error: 'SMI inválido.' });
  if (!zona)                                      return res.status(400).json({ error: 'Zona requerida.' });
  if (!nivel)                                     return res.status(400).json({ error: 'Nivel requerido.' });
  if (!estructura)                                return res.status(400).json({ error: 'Estructura requerida.' });
  if (!horas || Number(horas) <= 0)              return res.status(400).json({ error: 'Horas inválidas.' });
  if (!tipoTrenzado)                              return res.status(400).json({ error: 'Tipo de trenzado requerido.' });
  if (isNaN(Number(materiales)) || Number(materiales) < 0) return res.status(400).json({ error: 'Materiales inválidos.' });

  // ══════════════════════════════════════════════════════════════════════
  //  FÓRMULA SECRETA — PROPIEDAD INTELECTUAL PROTEGIDA
  // ══════════════════════════════════════════════════════════════════════

  const SMI_INPUT  = Number(smi);
  const HORAS      = Number(horas);
  const MATS       = Number(materiales);
  const P_ACTUAL   = Number(precioActual) || 0;

  // ── TASAS DE CAMBIO REAL (mercado, no oficial) ─────────────────
  const TASAS_USD = {
    es:1.00, us:1.00, gb:0.80, fr:1.00, de:1.00, it:1.00, pt:1.00,
    nl:1.00, be:1.00, ch:0.90, at:1.00, se:10.5, no:10.8, dk:7.0,
    mx:17.50, co:4100, do:58.0, ar:1200, cl:930, pe:3.75, ec:1.00,
    ve:38, gt:7.8, hn:24.5, sv:1.00, ni:36.5, cr:520, pa:1.00,
    py:7300, uy:39, bo:6.9, br:5.0,
    ca:1.36, au:1.53, nz:1.65,
    ng:1600, gh:15.5, ke:130, za:18.5, ma:10.0, eg:48,
    other:1.00,
  };

  // ── PISOS TÉCNICOS DE MERCADO (USD/mes) ───────────────────────
  const SMI_USD_PISO = {
    es:1134, us:1256, gb:1800, fr:1380, de:1800, it:1000, pt:900,
    nl:2000, be:1900, ch:3000, at:1700, se:1200, no:1500, dk:1400,
    mx:600,  co:550,  do:500,  ar:800,  cl:650,  pe:500,  ec:460,
    ve:500,  gt:400,  hn:380,  sv:400,  ni:350,  cr:500,  pa:500,
    py:400,  uy:550,  bo:380,  br:500,
    ca:1600, au:1400, nz:1200,
    ng:300,  gh:350,  ke:350,  za:450,  ma:350,  eg:300,
    other:500,
  };

  const tasa         = TASAS_USD[pais] || 1.0;
  const pisoUSD      = SMI_USD_PISO[pais] || 500;
  const SMI_PISO     = pisoUSD * tasa;
  const SMI_EFECTIVO = Math.max(SMI_INPUT, SMI_PISO);

  // ── FACTOR OASIS (solo Élite + Premium en LATAM) ──────────────
  const FACTOR_OASIS = {
    mx:2.2, co:2.0, do:1.8, ar:2.5, cl:1.6, pe:1.7,
    ec:1.5, ve:2.0, gt:1.4, hn:1.3, cr:1.5, pa:1.6,
    py:1.3, uy:1.5, bo:1.3, br:1.6,
    ng:1.5, gh:1.4, ke:1.4, za:1.5, ma:1.3, eg:1.3,
    es:1.0, us:1.0, gb:1.0, fr:1.0, de:1.0, it:1.0,
    pt:1.0, nl:1.0, be:1.0, ch:1.0, ca:1.0, au:1.0,
    other:1.4,
  };

  const oasisActivo = nivel === 'elite' && zona === 'premium' && (FACTOR_OASIS[pais] || 1.0) > 1.0;
  const factorOasis = oasisActivo ? (FACTOR_OASIS[pais] || 1.0) : 1.0;
  const SMI_FINAL   = SMI_EFECTIVO * factorOasis;

  // ── MODIFICADOR LOCAL VS EXTRANJERO ───────────────────────────
  // Solo aplica en países latinoamericanos y africanos donde la
  // brecha de poder adquisitivo entre turista y local es significativa.
  const PAISES_CLIENTE_TIPO = [
    'mx','co','do','ar','cl','pe','ec','ve','gt','hn','sv','ni',
    'cr','pa','py','uy','bo','br','ng','gh','ke','za','ma','eg'
  ];
  let modClienteTipo = 1.0;
  if (clienteTipo === 'extranjero' && PAISES_CLIENTE_TIPO.includes(pais)) {
    modClienteTipo = 1.35; // +35% sobre la tarifa calculada
  }

  // ── HORA BASE ─────────────────────────────────────────────────
  const horaBase = SMI_FINAL / 160;

  // ── 5 NIVELES — CURVA EXPONENCIAL ─────────────────────────────
  // junior:1.5 → intermedio:2.0 → avanzado:2.8 → profesional:3.5 → elite:4.5
  const multNivel = {
    junior:       1.5,
    intermedio:   2.0,
    avanzado:     2.8,
    profesional:  3.5,
    elite:        4.5,
  };

  const multZona       = { premium:1.2, media:1.0, baja:0.9 };
  const multEstructura = { casa:1.0, salon:1.3 };

  if (!(nivel      in multNivel))      return res.status(400).json({ error: 'Nivel no reconocido.' });
  if (!(zona       in multZona))       return res.status(400).json({ error: 'Zona no reconocida.' });
  if (!(estructura in multEstructura)) return res.status(400).json({ error: 'Estructura no reconocida.' });

  // ── MODIFICADOR DE COMPLEJIDAD TÉCNICA ────────────────────────
  let modComplejidad = 1.0;

  if (tipoTrenzado === 'pegadas') {
    if (tipoPegadas === 'barrel_twist')      modComplejidad *= 1.10;
    else if (tipoPegadas === 'twist')        modComplejidad *= 1.05;
    if (complejidadPegadas === 'con_disenos') modComplejidad *= 1.20;
    if (extensionesPegadas === 'con')        modComplejidad *= 1.08;
  }

  if (tipoTrenzado === 'sueltas') {
    const mT = { jumbo:0.90, large:0.95, lardium:1.00, medium:1.10, small:1.20 };
    if (tamanoSueltas in mT) modComplejidad *= mT[tamanoSueltas];
    if (tipoSueltas === 'twist') modComplejidad *= 1.08;
    if (bohoSueltas  === 'si')   modComplejidad *= 1.18;
  }

  if (tipoTrenzado === 'fulani') {
    const mF = { jumbo:0.90, large:0.95, lardium:1.00, medium:1.10, small:1.20 };
    if (tamanoFulaniAtras in mF) modComplejidad *= mF[tamanoFulaniAtras];
    const mD = { simples:1.00, medias:1.12, elaboradas:1.25 };
    if (complejidadFulaniDelante in mD) modComplejidad *= mD[complejidadFulaniDelante];
    // Boho en Fulani: mismo impacto que en sueltas
    if (bohoFulani === 'si') modComplejidad *= 1.18;
  }

  // ── TARIFA FINAL ──────────────────────────────────────────────
  const tarifaHora =
    horaBase *
    multNivel[nivel] *
    multZona[zona] *
    multEstructura[estructura] *
    modComplejidad *
    modClienteTipo;

  const precioManoObra = tarifaHora * HORAS;
  const precioTotal    = precioManoObra + MATS;

  // relacionSMI siempre contra SMI oficial del usuario
  const horaBaseOficial  = SMI_INPUT / 160;
  const relacionSMI      = round(tarifaHora / horaBaseOficial, 2);
  const diferencia       = precioTotal - P_ACTUAL;
  const porcentajeDiferencia = P_ACTUAL > 0
    ? ((diferencia / P_ACTUAL) * 100).toFixed(1)
    : null;

  // ══════════════════════════════════════════════════════════════════════
  //  FIN FÓRMULA SECRETA
  // ══════════════════════════════════════════════════════════════════════

  // ── Guardar en Supabase ───────────────────────────────────────
  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const endpoint = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '') + '/rest/v1/legacy_data';
    try {
      const r = await fetch(endpoint, {
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
          pais, provincia: provincia||'', ciudad: ciudad||'', zona,
          smi: SMI_INPUT,
          nombre_servicio: (nombreServicio||'').trim(),
          nivel, estructura,
          tipo_trenzado: tipoTrenzado,
          tipo_pegadas:               tipoPegadas              ||null,
          complejidad_pegadas:        complejidadPegadas       ||null,
          extensiones_pegadas:        extensionesPegadas       ||null,
          tamano_sueltas:             tamanoSueltas            ||null,
          tipo_sueltas:               tipoSueltas              ||null,
          boho_sueltas:               bohoSueltas              ||null,
          tamano_fulani_atras:        tamanoFulaniAtras        ||null,
          complejidad_fulani_delante: complejidadFulaniDelante ||null,
          horas: HORAS, materiales: MATS,
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
    oasisActivo,
    clienteTipo: clienteTipo || 'local',
    nombreServicio: (nombreServicio||'').trim(),
    pais, tipoTrenzado,
  });
}

function round(v, d=2) {
  return Math.round(v * Math.pow(10,d)) / Math.pow(10,d);
}

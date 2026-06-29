// api/calculate.js â€” Calculadora Legacy v3.0
// âš ï¸  SECRETO COMERCIAL: La fÃ³rmula solo existe en el servidor.
//
// MOTOR v3.0 â€” Tabla de precios base por tamaÃ±o para Sueltas y Fulani
//
// SUELTAS y FULANI (parte trasera):
//   Precio = PrecioBase[tamaÃ±o] Ã— multNivel Ã— multZona Ã— multEstructura Ã— modBoho Ã— modLargo Ã— modClienteTipo + CosteTiempo + Materiales
//
// PrecioBase estÃ¡ calibrado con precios reales de mercado Ã‰lite EspaÃ±a zona media casa.
// Los multiplicadores de nivel escalan hacia abajo desde Ã‰lite.
//
// PEGADAS: mantienen la fÃ³rmula OpciÃ³n C original (SMI-based).
//
// BOHO: multiplicadores reales por tamaÃ±o (calculados desde precios de mercado):
//   Jumbo Ã—1.56 | Large Ã—1.29 | Lardium Ã—1.22 | Medium Ã—1.38 | Small Ã—1.33 | XS Small Ã—1.25
//
// FACTOR TIEMPO por nivel (OpciÃ³n C):
//   Junior 0.20 | Intermedio 0.35 | Avanzado 0.55 | Profesional 0.75 | Ã‰lite 1.00

module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'MÃ©todo no permitido.' });

  const {
    email, instagram, pais, provincia, ciudad, zona, smi, clienteTipo,
    nombreServicio, nivel, estructura, horas, materiales, precioActual,
    tipoTrenzado,
    // Pegadas
    tipoPegadas, complejidadPegadas, extensionesPegadas, bohoPegadas,
    // Sueltas
    tamanoSueltas, tipoSueltas, extensionesSueltas, bohoSueltas,
    // Fulani
    tamanoFulaniAtras, complejidadFulaniDelante, extensionesFulani, bohoFulani,
    // Largo
    largoCabello, largoExtensiones,
  } = req.body;

  // â”€â”€ Validaciones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ TASAS DE CAMBIO REAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const TASAS_USD = {
    es:1.00, us:1.00, gb:0.80, fr:1.00, de:1.00, it:1.00, pt:1.00,
    nl:1.00, be:1.00, ch:0.90, at:1.00, se:10.5, no:10.8, dk:7.0,
    mx:17.50, co:4100, do:58.0, ar:1200, cl:930, pe:3.75, ec:1.00,
    ve:38, gt:7.8, cr:520, pa:1.00, py:7300, uy:39, bo:6.9, br:5.0,
    ca:1.36, au:1.53, nz:1.65,
    ng:1600, gh:15.5, ke:130, za:18.5, ma:10.0, eg:48, other:1.00,
  };

  // â”€â”€ PISOS TÃ‰CNICOS DE MERCADO (USD/mes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const SMI_USD_PISO = {
    es:1134, us:1256, gb:1800, fr:1380, de:1800, it:1000, pt:900,
    nl:2000, be:1900, ch:3000, at:1700, se:1200, no:1500, dk:1400,
    mx:600, co:550, do:500, ar:800, cl:650, pe:500, ec:460,
    ve:500, gt:400, cr:500, pa:500, py:400, uy:550, bo:380, br:500,
    ca:1600, au:1400, nz:1200,
    ng:300, gh:350, ke:350, za:450, ma:350, eg:300, other:500,
  };

  const tasa         = TASAS_USD[pais] || 1.0;
  const pisoUSD      = SMI_USD_PISO[pais] || 500;
  const SMI_EFECTIVO = Math.max(SMI_INPUT, pisoUSD * tasa);

  // â”€â”€ FACTOR OASIS (solo Ã‰lite + Premium en LATAM/Ãfrica) â”€â”€â”€â”€â”€â”€â”€
  const FACTOR_OASIS = {
    mx:2.2, co:2.0, do:1.8, ar:2.5, cl:1.6, pe:1.7, ec:1.5, ve:2.0,
    gt:1.4, cr:1.5, pa:1.6, py:1.3, uy:1.5, bo:1.3, br:1.6,
    ng:1.5, gh:1.4, ke:1.4, za:1.5, ma:1.3, eg:1.3,
    es:1.0, us:1.0, gb:1.0, fr:1.0, de:1.0, it:1.0, pt:1.0,
    nl:1.0, be:1.0, ch:1.0, ca:1.0, au:1.0, other:1.4,
  };

  const oasisActivo = nivel === 'elite' && zona === 'premium' && (FACTOR_OASIS[pais]||1.0) > 1.0;
  const factorOasis = oasisActivo ? (FACTOR_OASIS[pais]||1.0) : 1.0;
  const SMI_FINAL   = SMI_EFECTIVO * factorOasis;
  const horaBase    = SMI_FINAL / 160;

  // â”€â”€ MODIFICADOR LOCAL VS EXTRANJERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const PAISES_CLIENTE_TIPO = ['mx','co','do','ar','cl','pe','ec','ve','gt','cr','pa','uy','py','bo','br','ng','gh','ke','za','ma','eg'];
  const modClienteTipo = (clienteTipo === 'extranjero' && PAISES_CLIENTE_TIPO.includes(pais)) ? 1.35 : 1.0;

  // â”€â”€ MULTIPLICADORES BASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const multZona       = { premium:1.2, media:1.0, baja:0.9 };
  const multEstructura = { casa:1.0, salon:1.3 };

  if (!(zona       in multZona))       return res.status(400).json({ error: 'Zona no reconocida.' });
  if (!(estructura in multEstructura)) return res.status(400).json({ error: 'Estructura no reconocida.' });

  // â”€â”€ FACTOR TIEMPO POR NIVEL (OpciÃ³n C) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const FACTOR_TIEMPO = {
    junior:0.20, intermedio:0.35, avanzado:0.55, profesional:0.75, elite:1.00,
  };
  const factorTiempo = FACTOR_TIEMPO[nivel] || 1.0;

  // â”€â”€ ESCALA DE NIVELES para precio base (% del precio Ã‰lite) â”€â”€â”€
  const ESCALA_NIVEL = {
    junior:0.35, intermedio:0.47, avanzado:0.62, profesional:0.78, elite:1.00,
  };
  const escalaNivel = ESCALA_NIVEL[nivel] || 1.0;

  // â”€â”€ MODIFICADORES DE LARGO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MOD_LARGO_CABELLO = {
    muy_corto:1.15, corto:1.00, nuca_hombros:1.00,
    media_espalda:1.08, caderas:1.18, mas_largo:1.25,
  };
  const MOD_LARGO_EXTENSIONES = {
    nuca:1.00, hombros:1.05, media_espalda:1.12, caderas:1.20, mas_largo:1.28,
  };

  const modLargoCabello = MOD_LARGO_CABELLO[largoCabello] || 1.0;

  // â”€â”€ DETERMINAR SI LLEVA EXTENSIONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const llevaExtensiones =
    (tipoTrenzado === 'pegadas' && extensionesPegadas === 'con') ||
    (tipoTrenzado === 'sueltas' && extensionesSueltas === 'con') ||
    (tipoTrenzado === 'fulani'  && extensionesFulani  === 'con');

  const modLargoExtensiones = llevaExtensiones
    ? (MOD_LARGO_EXTENSIONES[largoExtensiones] || 1.0)
    : 1.0;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  TABLA DE PRECIOS BASE â€” SUELTAS Y FULANI (calibrada con mercado real)
  //
  //  Precios Ã‰lite, zona media, casa, EspaÃ±a, con extensiones, SIN boho.
  //  El sistema escala desde aquÃ­ segÃºn nivel, zona, estructura y extras.
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Precios base Ã‰lite EspaÃ±a zona media casa CON extensiones SIN boho
  const PRECIO_BASE_ELITE_ES = {
    jumbo:   90,
    large:   140,
    lardium: 180,
    medium:  210,
    smedium: 250,
    small:   300,
    xs_small:400,
  };

  // Multiplicador Boho por tamaÃ±o (calculado desde precios reales de mercado)
  const MOD_BOHO_TAMAÃ‘O = {
    jumbo:    1.56,
    large:    1.29,
    lardium:  1.22,
    medium:   1.38,
    smedium:  1.40,
    small:    1.33,
    xs_small: 1.25,
  };

  // Multiplicador por complejidad de delantera Fulani
  const MOD_FULANI_DELANTE = { simples:1.00, medias:1.12, elaboradas:1.25 };

  // Factor de adaptaciÃ³n geogrÃ¡fica:
  // Los precios base estÃ¡n calibrados para EspaÃ±a zona media.
  // Para otros paÃ­ses/zonas aplicamos el ratio SMI_FINAL vs SMI EspaÃ±a base.
  const SMI_ES_BASE = 1134;
  const factorGeo = SMI_FINAL / SMI_ES_BASE;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  CÃLCULO PRINCIPAL
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  let valorConocimiento = 0;
  let costeTiempo       = 0;

  if (tipoTrenzado === 'pegadas') {
    // â”€â”€ PEGADAS: OpciÃ³n C original (SMI-based) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const multNivelPegadas = { junior:1.5, intermedio:2.0, avanzado:2.8, profesional:3.5, elite:4.5 };
    if (!(nivel in multNivelPegadas)) return res.status(400).json({ error: 'Nivel no reconocido.' });

    let modComp = 1.0;
    if (tipoPegadas === 'barrel_twist')       modComp *= 1.10;
    else if (tipoPegadas === 'twist')         modComp *= 1.05;
    if (complejidadPegadas === 'con_disenos') modComp *= 1.20;
    if (extensionesPegadas === 'con')         modComp *= 1.08;
    if (extensionesPegadas === 'con' && bohoPegadas === 'si') modComp *= 1.18;

    valorConocimiento =
      horaBase *
      multNivelPegadas[nivel] *
      multZona[zona] *
      multEstructura[estructura] *
      modComp *
      modClienteTipo *
      modLargoCabello *
      modLargoExtensiones;

    costeTiempo = HORAS * horaBase * factorTiempo;

  } else if (tipoTrenzado === 'sueltas') {
    // â”€â”€ SUELTAS: Tabla de precios base â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const tamaÃ±o = tamanoSueltas;
    if (!tamaÃ±o || !(tamaÃ±o in PRECIO_BASE_ELITE_ES)) {
      return res.status(400).json({ error: 'TamaÃ±o de sueltas no reconocido.' });
    }

    const precioBaseElite = PRECIO_BASE_ELITE_ES[tamaÃ±o];
    const modBoho = (extensionesSueltas === 'con' && bohoSueltas === 'si')
      ? MOD_BOHO_TAMAÃ‘O[tamaÃ±o]
      : 1.0;
    const modTwist = tipoSueltas === 'twist' ? 1.08 : 1.0;
    const modExtSueltas = extensionesSueltas === 'con' ? 1.0 : 0.85; // sin extensiones descuenta

    valorConocimiento =
      precioBaseElite *
      escalaNivel *
      (multZona[zona] / 1.0) *      // ajuste zona (base=media=1.0)
      (multEstructura[estructura] / 1.0) *  // ajuste estructura (base=casa=1.0)
      modBoho *
      modTwist *
      modExtSueltas *
      modClienteTipo *
      modLargoCabello *
      modLargoExtensiones *
      factorGeo;

    costeTiempo = HORAS * horaBase * factorTiempo;

  } else if (tipoTrenzado === 'fulani') {
    // â”€â”€ FULANI: Precio base de sueltas Ã— complejidad delantera â”€â”€
    const tamaÃ±o = tamanoFulaniAtras;
    if (!tamaÃ±o || !(tamaÃ±o in PRECIO_BASE_ELITE_ES)) {
      return res.status(400).json({ error: 'TamaÃ±o Fulani no reconocido.' });
    }

    const precioBaseElite = PRECIO_BASE_ELITE_ES[tamaÃ±o];
    const modBoho = (extensionesFulani === 'con' && bohoFulani === 'si')
      ? MOD_BOHO_TAMAÃ‘O[tamaÃ±o]
      : 1.0;
    const modDelante = MOD_FULANI_DELANTE[complejidadFulaniDelante] || 1.0;
    const modExtFulani = extensionesFulani === 'con' ? 1.0 : 0.85;

    valorConocimiento =
      precioBaseElite *
      escalaNivel *
      (multZona[zona] / 1.0) *
      (multEstructura[estructura] / 1.0) *
      modBoho *
      modDelante *
      modExtFulani *
      modClienteTipo *
      modLargoCabello *
      modLargoExtensiones *
      factorGeo;

    costeTiempo = HORAS * horaBase * factorTiempo;

  } else {
    return res.status(400).json({ error: 'Tipo de trenzado no reconocido.' });
  }

  const precioManoObra = valorConocimiento + costeTiempo;
  const precioTotal    = precioManoObra + MATS;
  const tarifaHora     = precioManoObra / HORAS;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FIN FÃ“RMULA SECRETA
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const horaBaseOficial      = SMI_INPUT / 160;
  const relacionSMI          = round(tarifaHora / horaBaseOficial, 2);
  const diferencia           = precioTotal - P_ACTUAL;
  const porcentajeDiferencia = P_ACTUAL > 0 ? ((diferencia / P_ACTUAL) * 100).toFixed(1) : null;

  // â”€â”€ Guardar en Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          smi: SMI_INPUT, cliente_tipo: clienteTipo||'local',
          nombre_servicio: (nombreServicio||'').trim(),
          nivel, estructura, tipo_trenzado: tipoTrenzado,
          tipo_pegadas:               tipoPegadas              ||null,
          complejidad_pegadas:        complejidadPegadas       ||null,
          extensiones_pegadas:        extensionesPegadas       ||null,
          boho_pegadas:               bohoPegadas              ||null,
          tamano_sueltas:             tamanoSueltas            ||null,
          tipo_sueltas:               tipoSueltas              ||null,
          extensiones_sueltas:        extensionesSueltas       ||null,
          boho_sueltas:               bohoSueltas              ||null,
          tamano_fulani_atras:        tamanoFulaniAtras        ||null,
          complejidad_fulani_delante: complejidadFulaniDelante ||null,
          extensiones_fulani:         extensionesFulani        ||null,
          boho_fulani:                bohoFulani               ||null,
          largo_cabello:              largoCabello             ||null,
          largo_extensiones:          llevaExtensiones ? (largoExtensiones||null) : null,
          horas: HORAS, materiales: MATS,
          precio_actual:      P_ACTUAL,
          precio_calculado:   round(precioTotal, 2),
          tarifa_hora:        round(tarifaHora, 2),
          valor_conocimiento: round(valorConocimiento, 2),
          coste_tiempo:       round(costeTiempo, 2),
          relacion_smi:       relacionSMI,
          pago_auditoria:     false,
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
    valorConocimiento:   round(valorConocimiento, 2),
    costeTiempo:         round(costeTiempo, 2),
    precioManoObra:      round(precioManoObra, 2),
    materiales:          round(MATS, 2),
    precioTotal:         round(precioTotal, 2),
    precioActual:        round(P_ACTUAL, 2),
    diferencia:          round(diferencia, 2),
    porcentajeDiferencia,
    relacionSMI, oasisActivo, llevaExtensiones,
    clienteTipo: clienteTipo||'local',
    nombreServicio: (nombreServicio||'').trim(),
    pais, tipoTrenzado,
  });
}

function round(v, d=2) {
  return Math.round(v * Math.pow(10,d)) / Math.pow(10,d);
}

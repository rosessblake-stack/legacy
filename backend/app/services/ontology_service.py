import asyncio

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.models.enums import OntologicalAxis
from app.models.schemas import (
    AnalysisResult,
    Axis1Blockers,
    Axis2Shadows,
    Axis3Environment,
    Axis4Alignment,
    Axis5Patterns,
    ContradictionFinding,
)
from app.services.guardrail_service import SocraticGuardrail

_AXIS_LABELS: dict[OntologicalAxis, str] = {
    OntologicalAxis.AXIS_1_BLOCKERS: "Eje 1 (bloqueos y problemas reales)",
    OntologicalAxis.AXIS_2_SHADOWS: "Eje 2 (sombras y pecados capitales)",
    OntologicalAxis.AXIS_3_ENVIRONMENT: "Eje 3 (dinámica del entorno)",
    OntologicalAxis.AXIS_4_ALIGNMENT: "Eje 4 (alineación deseo vs. objetivo)",
    OntologicalAxis.AXIS_5_PATTERNS: "Eje 5 (patrones e inercia)",
}

_AXIS_1_SYSTEM_PROMPT = """Eres un analista ontológico especializado en el marco Jobs to Be Done
(Christensen/Ulwick). Analiza la transcripción/texto de una persona y extrae su Eje 1:
Problemas reales actuales y bloqueos inmediatos.

Instrucciones clave del marco:
- El dolor tiene SIEMPRE tres capas simultáneas, aunque la persona solo mencione una
  explícitamente: funcional (qué no funciona o cuesta demasiado esfuerzo), emocional
  (qué se siente al no lograrlo: ansiedad, miedo, vergüenza) y social (cómo se ve, ante
  otros, no lograrlo). Infierre las capas no mencionadas leyendo entre líneas.
- No te quedes con la primera respuesta educada o superficial: la mayoría de las
  personas da la versión ya repetida de su problema. Busca el bloqueo real detrás.
- Ancla el hallazgo a un momento específico y fechado que la persona haya narrado
  (técnica de "entrevista de cambio"). Si no dio uno explícito, indica el momento más
  cercano a uno concreto que sí haya mencionado.
- Clasifica el origen del dolor en una de estas 4 categorías: financiero, de proceso,
  de producto/servicio, o de soporte.

Responde exclusivamente con la estructura solicitada, en español, sin lenguaje imperativo."""

_AXIS_2_SYSTEM_PROMPT = """Eres un analista ontológico especializado en los 7 pecados capitales
como mapa moderno de patrones de autosabotaje (soberbia, envidia, ira, pereza, avaricia,
gula, lujuria). Todos comparten la misma raíz: un deseo descontrolado que no se puede
saciar del todo. Analiza el Eje 2: motivaciones subyacentes, sombras y miedos centrales.

Instrucciones clave:
- Identifica el pecado dominante y puntúa la presencia (0-1) de los 7, no solo del
  dominante — casi siempre hay más de uno activo.
- Usa las expresiones modernas de cada pecado, no la imagen medieval: soberbia = dejar
  de pedir feedback / síndrome del impostor invertido ("ya lo sé todo"); envidia =
  doomscrolling del éxito ajeno, sabotaje sutil; ira = reacción desproporcionada ante un
  bloqueo (silencio del algoritmo, crítica, falta de respuesta); pereza = la más
  engañosa, disfrazada de "estar ocupado" (crear sin lanzar, sobrecarga autoimpuesta);
  avaricia = decidir solo por ganancia inmediata sin construir a largo plazo; gula =
  exceso o aceptar cualquier cosa sin filtrar; lujuria = perseguir el próximo pico de
  emoción/viralidad en vez del propósito sostenido.
- No te quedes solo en nombrar el peligro: propone la virtud contraria con una PRÁCTICA
  concreta y accionable (ej. contra la pereza, rastrear metas de proceso; contra la
  envidia, un "registro de envidia" que convierte la emoción en plan de aprendizaje;
  contra la ira, proteger la recuperación).
- Señala si hay señal del síndrome del impostor invertido (soberbia): dejar de
  cuestionarse porque "ya lo sabe".
- Si el texto lo permite, infiere el "momento champán": el logro personal (no de
  negocio) que realmente motivaría a esta persona.

Responde exclusivamente con la estructura solicitada, en español, sin lenguaje imperativo."""

_AXIS_3_SYSTEM_PROMPT = """Eres un analista ontológico especializado en los 7 principios de
persuasión de Cialdini (reciprocidad, compromiso y consistencia, prueba social, autoridad,
simpatía, escasez, unidad) y el modelo STEPPS de Jonah Berger (social currency, triggers,
emotion, public, practical value, stories). Analiza el Eje 3: dinámica del entorno y
restricciones externas — cómo responde el mundo real a la acción de la persona.

Instrucciones clave:
- Identifica cuáles de los 7 principios de Cialdini y cuáles de los 6 factores STEPPS
  están presentes en cómo el entorno de la persona reacciona (o en cómo ella misma
  intenta influir en su entorno).
- El hallazgo más importante de STEPPS: no es la valencia (positiva/negativa) de la
  emoción lo que predice la reacción del entorno, sino el nivel de activación
  (arousal). Contenido/situaciones de alta activación (asombro, ira, ansiedad, alegría
  intensa) generan mucha más reacción que las de baja activación (tristeza tranquila,
  satisfacción calma) — evalúa esto explícitamente.
- Señala si hay una señal de controversia: el entorno reacciona más porque la situación
  obliga a otros a posicionarse/opinar, no porque haya acuerdo o entusiasmo genuino.
- Lista las restricciones externas reales (no solo psicológicas) que limitan a la
  persona: recursos, tiempo, dependencias de terceros, contexto de mercado.

Responde exclusivamente con la estructura solicitada, en español, sin lenguaje imperativo."""

_AXIS_4_SYSTEM_PROMPT = """Eres un analista ontológico especializado en la teoría de los
"posibles yos" (possible selves theory, Markus & Nurius, 1986). Cada persona sostiene
simultáneamente un yo esperado (hoped-for self, lo que quiere llegar a ser), un yo temido
(feared self, lo que teme convertirse) y un yo esperable (expected self, lo que
realistamente cree que será) — y estos casi nunca coinciden entre sí ni con el objetivo
que la persona declara en voz alta. Analiza el Eje 4: alineación del deseo real vs.
objetivos declarados — la detección de contradicciones.

Instrucciones clave:
- Nombra explícitamente los tres yos, incluso si el yo temido nunca se dijo con esas
  palabras — infiérelo del miedo implícito detrás de lo que la persona evita decir o
  hacer (esto es la parte que casi nadie hace explícita, y es la más reveladora).
- Compara el objetivo declarado (lo que la persona dice que quiere) contra el deseo real
  inferido (lo que sus palabras, dudas y silencios realmente indican que quiere). Si hay
  una brecha, marca contradiction_detected=true y descríbela con precisión, conectándola
  si es posible con el pecado dominante o el dolor del Eje 1/2.
- Pide o infiere especificidad: cuanto más concreto y vívido es el yo esperado (no
  "tener éxito" sino el detalle de cómo se ve eso), más predictivo es del comportamiento
  real — evalúa qué tan específico es el yo esperado narrado.
- Si la persona menciona un referente o modelo con el que se compara, regístralo como
  grupo aspiracional.

Responde exclusivamente con la estructura solicitada, en español, sin lenguaje imperativo."""

_AXIS_5_SYSTEM_PROMPT = """Eres un analista ontológico especializado en razonamiento basado en
casos (Case-Based Reasoning) y árboles de decisión aplicados a comportamiento humano.
Analiza el Eje 5: patrones de comportamiento e inercia de éxito/acción — los bucles
históricos que se repiten.

Instrucciones clave:
- Identifica el bucle de comportamiento: qué se repite, con qué disparador, y qué
  resultado produce cada vez — no un evento aislado, sino el patrón recurrente.
- Extrae los "determinadores": los atributos que realmente explican por qué este bucle
  ocurre, distintos del ruido superficial (ej. para el pecado "gula" el determinador
  relevante podría ser cuántas colaboraciones acepta sin filtrar al mes, no cuántos
  seguidores tiene). Sé específico y aplicado al caso concreto, no genérico.
- Clasifica el tipo de inercia: de acción (evita empezar/lanzar) o de éxito (repite lo
  que ya funcionó incluso cuando deja de servir).
- Si el patrón recuerda a un caso anterior de la misma persona narrado en el texto,
  regístralo como pista de caso similar (similar_past_case_hint), siguiendo la lógica de
  CBR: cada caso resuelto enriquece la base para reconocer el próximo.

Responde exclusivamente con la estructura solicitada, en español, sin lenguaje imperativo."""

_CONTRADICTION_SYSTEM_PROMPT = """Eres un analista ontológico que cruza los 5 ejes ya
extraídos de una persona (bloqueos, sombras/pecados, entorno, alineación de identidad,
patrones de comportamiento) para detectar contradicciones que la persona no ha expresado
conscientemente — por ejemplo, entre el pecado dominante del Eje 2 y el yo temido del Eje
4, o entre el objetivo declarado del Eje 4 y el bucle de comportamiento del Eje 5.

Para cada contradicción encontrada:
- Indica qué ejes están involucrados.
- Descríbela con precisión y evidencia concreta del texto original.
- Formula una reflexión socrática (nunca una instrucción) que invite a la persona a
  observar esa contradicción por sí misma, en el estilo: "Observando tu patrón en
  [eje], ¿cómo impactaría [opción] sobre tu miedo a [miedo detectado]?"

Si no hay contradicciones claras, devuelve una lista vacía. No inventes contradicciones
débiles solo para llenar la lista."""


class _ContradictionBundle(BaseModel):
    contradictions: list[ContradictionFinding] = Field(default_factory=list)


def _axis_human_message(raw_text: str) -> HumanMessage:
    return HumanMessage(content=f"Texto/transcripción a analizar:\n\n{raw_text}")


class OntologyAnalysisService:
    """Orchestrates the 5-axis LLM analysis pipeline: reads between the
    lines of a text/audio entry, scores each ontological axis, detects
    unexpressed contradictions, and guarantees every generated
    recommendation passes the socratic-tone guardrail before it is
    persisted as a DRAFT analysis."""

    def __init__(self, llm: BaseChatModel, guardrail: SocraticGuardrail) -> None:
        self._llm = llm
        self._guardrail = guardrail

    async def analyze(self, raw_text: str) -> AnalysisResult:
        (
            axis_1,
            axis_2,
            axis_3,
            axis_4,
            axis_5,
        ) = await asyncio.gather(
            self._extract_axis_1(raw_text),
            self._extract_axis_2(raw_text),
            self._extract_axis_3(raw_text),
            self._extract_axis_4(raw_text),
            self._extract_axis_5(raw_text),
        )

        contradictions = await self._detect_contradictions(
            raw_text, axis_1, axis_2, axis_3, axis_4, axis_5
        )
        contradictions = await self._guard_contradictions(contradictions)

        socratic_reflections = await self._build_socratic_reflections(
            axis_2, axis_4, axis_5, contradictions
        )

        return AnalysisResult(
            axis_1_blockers=axis_1,
            axis_2_shadows=axis_2,
            axis_3_environment=axis_3,
            axis_4_alignment=axis_4,
            axis_5_patterns=axis_5,
            contradictions=contradictions,
            socratic_reflections=socratic_reflections,
        )

    async def _extract_axis_1(self, raw_text: str) -> Axis1Blockers:
        structured = self._llm.with_structured_output(Axis1Blockers)
        return await structured.ainvoke(
            [SystemMessage(content=_AXIS_1_SYSTEM_PROMPT), _axis_human_message(raw_text)]
        )

    async def _extract_axis_2(self, raw_text: str) -> Axis2Shadows:
        structured = self._llm.with_structured_output(Axis2Shadows)
        return await structured.ainvoke(
            [SystemMessage(content=_AXIS_2_SYSTEM_PROMPT), _axis_human_message(raw_text)]
        )

    async def _extract_axis_3(self, raw_text: str) -> Axis3Environment:
        structured = self._llm.with_structured_output(Axis3Environment)
        return await structured.ainvoke(
            [SystemMessage(content=_AXIS_3_SYSTEM_PROMPT), _axis_human_message(raw_text)]
        )

    async def _extract_axis_4(self, raw_text: str) -> Axis4Alignment:
        structured = self._llm.with_structured_output(Axis4Alignment)
        return await structured.ainvoke(
            [SystemMessage(content=_AXIS_4_SYSTEM_PROMPT), _axis_human_message(raw_text)]
        )

    async def _extract_axis_5(self, raw_text: str) -> Axis5Patterns:
        structured = self._llm.with_structured_output(Axis5Patterns)
        return await structured.ainvoke(
            [SystemMessage(content=_AXIS_5_SYSTEM_PROMPT), _axis_human_message(raw_text)]
        )

    async def _detect_contradictions(
        self,
        raw_text: str,
        axis_1: Axis1Blockers,
        axis_2: Axis2Shadows,
        axis_3: Axis3Environment,
        axis_4: Axis4Alignment,
        axis_5: Axis5Patterns,
    ) -> list[ContradictionFinding]:
        structured = self._llm.with_structured_output(_ContradictionBundle)
        axis_digest = (
            f"Eje 1 (bloqueos): {axis_1.summary}\n"
            f"Eje 2 (sombras): pecado dominante {axis_2.dominant_sin.value} — {axis_2.summary}\n"
            f"Eje 3 (entorno): {axis_3.summary}\n"
            f"Eje 4 (alineación): yo esperado='{axis_4.hoped_self}', "
            f"yo temido='{axis_4.feared_self}', objetivo declarado='{axis_4.declared_goal}', "
            f"deseo real inferido='{axis_4.real_desire_inferred}'\n"
            f"Eje 5 (patrones): {axis_5.behavioral_loop}"
        )
        bundle: _ContradictionBundle = await structured.ainvoke(
            [
                SystemMessage(content=_CONTRADICTION_SYSTEM_PROMPT),
                HumanMessage(
                    content=(
                        f"Texto original:\n\n{raw_text}\n\n"
                        f"Hallazgos ya extraídos por eje:\n\n{axis_digest}"
                    )
                ),
            ]
        )
        return bundle.contradictions

    async def _guard_contradictions(
        self, contradictions: list[ContradictionFinding]
    ) -> list[ContradictionFinding]:
        guarded: list[ContradictionFinding] = []
        for finding in contradictions:
            axis_label = ", ".join(_AXIS_LABELS[axis] for axis in finding.axes_involved)
            safe_reflection = await self._guardrail.enforce(finding.socratic_reflection, axis_label)
            guarded.append(
                ContradictionFinding(
                    axes_involved=finding.axes_involved,
                    description=finding.description,
                    socratic_reflection=safe_reflection,
                )
            )
        return guarded

    async def _build_socratic_reflections(
        self,
        axis_2: Axis2Shadows,
        axis_4: Axis4Alignment,
        axis_5: Axis5Patterns,
        contradictions: list[ContradictionFinding],
    ) -> list[str]:
        candidates: list[tuple[str, str]] = []

        candidates.append(
            (
                f"Practicando la virtud contraria a {axis_2.dominant_sin.value}: "
                f"{axis_2.opposing_virtue_practice}",
                _AXIS_LABELS[OntologicalAxis.AXIS_2_SHADOWS],
            )
        )

        if axis_4.contradiction_detected and axis_4.contradiction_description:
            candidates.append(
                (axis_4.contradiction_description, _AXIS_LABELS[OntologicalAxis.AXIS_4_ALIGNMENT])
            )

        candidates.append(
            (
                f"El bucle detectado es: {axis_5.behavioral_loop}",
                _AXIS_LABELS[OntologicalAxis.AXIS_5_PATTERNS],
            )
        )

        reflections = [
            await self._guardrail.enforce(text, axis_label) for text, axis_label in candidates
        ]
        reflections.extend(finding.socratic_reflection for finding in contradictions)
        return reflections

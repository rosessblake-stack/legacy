import re
from dataclasses import dataclass

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

# Spanish imperative / directive markers. Matched case-insensitively against
# word boundaries so we catch "debes", "debe", "deberías" etc without
# false-positiving on unrelated words that merely contain the substring.
_IMPERATIVE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"\bdebes\b", re.IGNORECASE),
    re.compile(r"\bdebe(s|ría[s]?)?\b", re.IGNORECASE),
    re.compile(r"\btienes que\b", re.IGNORECASE),
    re.compile(r"\btiene que\b", re.IGNORECASE),
    re.compile(r"\btendrías que\b", re.IGNORECASE),
    re.compile(r"\bnecesitas\b", re.IGNORECASE),
    re.compile(r"\bnecesitás\b", re.IGNORECASE),
    re.compile(r"\btenés que\b", re.IGNORECASE),
    re.compile(r"\bhaz\b", re.IGNORECASE),
    re.compile(r"\bhacé\b", re.IGNORECASE),
    re.compile(r"\bdeja de\b", re.IGNORECASE),
    re.compile(r"\bdejá de\b", re.IGNORECASE),
    re.compile(r"\bempieza a\b", re.IGNORECASE),
    re.compile(r"\bempezá a\b", re.IGNORECASE),
    re.compile(r"\bdebes de\b", re.IGNORECASE),
    re.compile(r"\bes obligatorio\b", re.IGNORECASE),
    re.compile(r"\btienes la obligación\b", re.IGNORECASE),
    re.compile(r"\bno puedes seguir\b", re.IGNORECASE),
]

_REWRITE_SYSTEM_PROMPT = """Eres un guardrail de tono para un sistema de coaching socrático/mayéutico.
Tu única función es reescribir una recomendación con lenguaje imperativo en una
pregunta socrática que invite a la reflexión, sin perder el contenido ni el
diagnóstico original.

Reglas estrictas:
1. Nunca uses imperativos ("debes", "tienes que", "haz", "deja de", "necesitas").
2. La salida SIEMPRE debe ser una o dos preguntas abiertas, nunca una afirmación
   ni una instrucción.
3. Conserva las referencias concretas al eje ontológico, al patrón o al miedo
   detectado — no generalices ni la vacíes de contenido.
4. No agregues disculpas, preámbulos ni explicaciones. Devuelve solo la(s)
   pregunta(s) final(es).

Ejemplo:
Entrada: "Debes dejar de aceptar cualquier colaboración solo por sumar número."
Salida: "Observando tu patrón de aceptar colaboraciones sin filtrar, ¿qué estarías
protegiendo al decir que sí incluso cuando no construye tu narrativa?"
"""


class GuardrailViolation(RuntimeError):
    """Raised when text cannot be brought into compliance with the
    socratic-tone guardrail, even after an LLM-assisted rewrite."""


@dataclass(frozen=True)
class GuardrailCheck:
    is_compliant: bool
    violations: list[str]


def find_imperative_violations(text: str) -> list[str]:
    matches: list[str] = []
    for pattern in _IMPERATIVE_PATTERNS:
        matches.extend(match.group(0) for match in pattern.finditer(text))
    return matches


def contains_imperative_language(text: str) -> bool:
    return any(pattern.search(text) for pattern in _IMPERATIVE_PATTERNS)


def check_socratic_tone(text: str) -> GuardrailCheck:
    violations = find_imperative_violations(text)
    return GuardrailCheck(is_compliant=len(violations) == 0, violations=violations)


def _fallback_question(raw_text: str, axis_label: str | None) -> str:
    """Deterministic, non-LLM fallback used only if the model-assisted
    rewrite still fails validation. Never returns imperative language."""
    cleaned = re.sub(r"[.!]+$", "", raw_text.strip())
    prefix = f"Observando tu patrón en {axis_label}, " if axis_label else "Observando lo que describes, "
    return f"{prefix}¿qué cambiaría para ti si exploraras esto: «{cleaned}»?"


class SocraticGuardrail:
    """Middleware that evaluates every generated recommendation and
    guarantees it reaches the user as a socratic/mayeutic question,
    never as a direct instruction."""

    def __init__(self, llm: BaseChatModel, max_rewrite_attempts: int = 2) -> None:
        self._llm = llm
        self._max_rewrite_attempts = max_rewrite_attempts

    async def enforce(self, raw_text: str, axis_label: str | None = None) -> str:
        check = check_socratic_tone(raw_text)
        if check.is_compliant:
            return raw_text

        candidate = raw_text
        for _ in range(self._max_rewrite_attempts):
            candidate = await self._rewrite(candidate, axis_label)
            if check_socratic_tone(candidate).is_compliant:
                return candidate

        fallback = _fallback_question(raw_text, axis_label)
        if not check_socratic_tone(fallback).is_compliant:
            raise GuardrailViolation(
                f"Unable to produce a socratic-compliant rewrite for: {raw_text!r}"
            )
        return fallback

    async def enforce_many(self, texts: list[str], axis_label: str | None = None) -> list[str]:
        results: list[str] = []
        for text in texts:
            results.append(await self.enforce(text, axis_label))
        return results

    async def _rewrite(self, text: str, axis_label: str | None) -> str:
        axis_context = f"\nEje ontológico relevante: {axis_label}" if axis_label else ""
        messages = [
            SystemMessage(content=_REWRITE_SYSTEM_PROMPT),
            HumanMessage(content=f"Recomendación a reescribir:{axis_context}\n\n{text}"),
        ]
        response = await self._llm.ainvoke(messages)
        content = response.content if isinstance(response.content, str) else str(response.content)
        return content.strip()

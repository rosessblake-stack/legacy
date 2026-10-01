from dataclasses import dataclass

from openai import AsyncOpenAI
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import Settings


class TranscriptionError(RuntimeError):
    """Raised when the Whisper API cannot produce a usable transcript."""


@dataclass(frozen=True)
class TranscriptSegment:
    start_seconds: float
    end_seconds: float
    text: str


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    language: str
    duration_seconds: float
    segments: list[TranscriptSegment]


class SpeechTranscriptionService:
    """Wraps the OpenAI Whisper API to turn recorded audio into text
    the ontology pipeline can analyze."""

    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise TranscriptionError(
                "OPENAI_API_KEY is required to run speech transcription via Whisper."
            )
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.whisper_model
        self._language = settings.whisper_language

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(TranscriptionError),
        reraise=True,
    )
    async def transcribe(self, audio_bytes: bytes, filename: str) -> TranscriptionResult:
        if not audio_bytes:
            raise TranscriptionError("Received an empty audio payload.")

        try:
            response = await self._client.audio.transcriptions.create(
                model=self._model,
                file=(filename, audio_bytes),
                language=self._language,
                response_format="verbose_json",
                temperature=0.0,
            )
        except Exception as exc:  # network/API failures are retried by tenacity
            raise TranscriptionError(f"Whisper transcription failed: {exc}") from exc

        text = (response.text or "").strip()
        if not text:
            raise TranscriptionError("Whisper returned an empty transcript.")

        segments = [
            TranscriptSegment(
                start_seconds=segment.start,
                end_seconds=segment.end,
                text=segment.text.strip(),
            )
            for segment in (response.segments or [])
        ]

        return TranscriptionResult(
            text=text,
            language=getattr(response, "language", self._language),
            duration_seconds=getattr(response, "duration", 0.0) or 0.0,
            segments=segments,
        )

    async def transcribe_chunks(self, chunks: list[bytes], filename: str) -> TranscriptionResult:
        """Concatenates chunked audio uploads (from the browser MediaRecorder)
        into a single payload before sending it to Whisper, since the API
        expects one complete audio file per request."""
        combined = b"".join(chunks)
        return await self.transcribe(combined, filename)

# OntoNav — Plataforma de Mapeo Ontológico de Decisiones y Diagnóstico Humano

OntoNav analiza entradas de usuario (texto o audio) a través de 5 ejes ontológicos,
detecta contradicciones y miedos no expresados, y renderiza un árbol/grafo de
decisiones interactivo y sensible al tiempo (pasado, presente, futuro). Todo
grafo generado pasa primero por un flujo Human-in-the-Loop: se guarda en
`DRAFT`, un administrador lo revisa, y solo tras "Aprobar y liberar" el mapa
actualizado llega al usuario final.

Este directorio (`backend/`, `frontend/`) es un módulo nuevo y autocontenido
dentro de este repositorio; no modifica el producto existente (`index.html`,
`admin.html`, `api/`).

## Los 5 ejes ontológicos

| Eje | Qué evalúa | Marco teórico aplicado |
|---|---|---|
| 1 · Bloqueos | Problemas reales y bloqueos inmediatos | Jobs to Be Done (dolor funcional/emocional/social, anclado a un momento) |
| 2 · Sombras | Motivaciones subyacentes, miedos, "pecados capitales" | Los 7 pecados capitales, expresión moderna + virtud contraria |
| 3 · Entorno | Cómo reacciona el entorno externo | Cialdini (7 principios) + STEPPS de Jonah Berger |
| 4 · Alineación | Deseo real vs. objetivo declarado (contradicciones) | Possible Selves Theory (yo esperado / temido / esperable) |
| 5 · Patrones | Bucles de comportamiento e inercia | Case-Based Reasoning + árboles de decisión |

## Arquitectura

### Backend — `backend/` (FastAPI, Python 3.11+)

```
app/
  core/            configuración (pydantic-settings) y sesión async de DB
  models/
    enums.py       enums de dominio (ejes, pecados, tipos de nodo, ...)
    orm.py         modelos SQLAlchemy async (pgvector para embeddings)
    schemas.py     DTOs Pydantic tipados por eje (Axis1Blockers...Axis5Patterns)
  services/
    speech_service.py     transcripción vía OpenAI Whisper
    guardrail_service.py  valida y reescribe tono socrático/mayéutico
    ontology_service.py   pipeline LLM de los 5 ejes + detección de contradicciones
    graph_service.py      construye nodos/aristas del grafo (CBR: cada caso se retiene)
    llm_factory.py        selector de proveedor LLM (Anthropic / OpenAI) vía LangChain
  api/v1/
    analyze.py     POST /api/v1/analyze
    admin.py       GET /api/v1/admin/drafts, GET .../drafts/{id}, PUT .../drafts/{id}/approve
    graph.py       GET /api/v1/graph/{user_id}
    users.py       POST/GET /api/v1/users (soporte mínimo para crear perfiles)
alembic/           migraciones (extensión pgvector incluida)
```

**Guardrail socrático**: todo texto generado por el LLM que llegue al usuario
(recomendaciones de camino, reflexiones sobre contradicciones) pasa por
`SocraticGuardrail.enforce()`, que detecta lenguaje imperativo en español y lo
reescribe como pregunta socrática, con un *fallback* determinista si el
reescritor del LLM no logra cumplir la regla.

### Frontend — `frontend/` (Next.js 14, App Router, TypeScript)

```
src/
  components/canvas/
    OntologyCanvas.tsx      lienzo React Flow principal
    nodes/                  ProfileNode, PastNode, PresentNode, PathNode
    NodeDetailModal.tsx     modal con explicación y reflexión socrática
  components/voice/
    AudioRecorder.tsx       grabación con MediaRecorder, envío del audio completo
  store/                    Zustand: graphStore (canvas del usuario), draftStore (admin)
  lib/                      cliente API tipado + tipos TS espejo del backend
  app/
    page.tsx                       alta de perfil
    dashboard/[userId]/page.tsx    canvas + composer de nueva entrada (texto/audio)
    admin/page.tsx                 lista de borradores pendientes
    admin/[entryId]/page.tsx       revisión de los 5 ejes + aprobar y liberar
```

## Cómo correrlo localmente

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # completa ANTHROPIC_API_KEY / OPENAI_API_KEY, DATABASE_URL, ADMIN_API_KEY
alembic upgrade head
uvicorn app.main:app --reload
```

Requiere PostgreSQL con la extensión `pgvector` disponible (la migración
inicial la crea automáticamente).

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # debe apuntar a la URL del backend y compartir ADMIN_API_KEY
npm run dev
```

- `http://localhost:3000` — alta de perfil y mapa del usuario.
- `http://localhost:3000/admin` — dashboard de revisión Human-in-the-Loop.

## Flujo end-to-end

1. El usuario escribe o graba una entrada → `POST /api/v1/analyze`.
2. `ontology_service` extrae los 5 ejes en paralelo, detecta contradicciones
   cruzadas y pasa toda recomendación por el guardrail socrático.
3. `graph_service` construye el grafo `DRAFT`: tarjeta de perfil, nodos
   pasados heredados, bloque presente, camino recomendado y puertas
   alternativas — reteniendo el caso, como en Case-Based Reasoning.
4. Un administrador revisa en `/admin`, edita nodos si hace falta, y aprueba.
5. Al aprobar, esa versión del grafo se activa (`is_active = true`) y queda
   visible para el usuario en su canvas.

from enum import Enum


class AnalysisStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"


class EntrySourceType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"


class OntologicalAxis(str, Enum):
    AXIS_1_BLOCKERS = "axis_1_blockers"
    AXIS_2_SHADOWS = "axis_2_shadows"
    AXIS_3_ENVIRONMENT = "axis_3_environment"
    AXIS_4_ALIGNMENT = "axis_4_alignment"
    AXIS_5_PATTERNS = "axis_5_patterns"


class CapitalSin(str, Enum):
    PRIDE = "soberbia"
    ENVY = "envidia"
    WRATH = "ira"
    SLOTH = "pereza"
    GREED = "avaricia"
    GLUTTONY = "gula"
    LUST = "lujuria"


class PainOrigin(str, Enum):
    FINANCIAL = "financiero"
    PROCESS = "proceso"
    PRODUCT_SERVICE = "producto_servicio"
    SUPPORT = "soporte"


class InertiaType(str, Enum):
    ACTION = "accion"
    SUCCESS = "exito"


class NodeType(str, Enum):
    PROFILE_CARD = "PROFILE_CARD"
    PAST_ENTRY = "PAST_ENTRY"
    PRESENT_BLOCK = "PRESENT_BLOCK"
    FUTURE_PATH = "FUTURE_PATH"


class PathType(str, Enum):
    RECOMMENDED = "recommended"
    ALTERNATIVE_GATE = "alternative_gate"


class EdgeRelation(str, Enum):
    LEADS_TO = "leads_to"
    REVEALS = "reveals"
    CONTRADICTS = "contradicts"
    OPENS_GATE = "opens_gate"


class TimeHorizon(str, Enum):
    PAST = "past"
    PRESENT = "present"
    FUTURE = "future"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

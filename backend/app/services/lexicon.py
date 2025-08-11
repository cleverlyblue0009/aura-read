from typing import Dict, List
import re

# Lazy imports for heavy libs
try:
    import nltk  # type: ignore
    from nltk.corpus import wordnet as wn  # type: ignore
    _nltk_ready = True
except Exception:
    nltk = None
    wn = None
    _nltk_ready = False

try:
    from wordfreq import zipf_frequency  # type: ignore
except Exception:
    def zipf_frequency(word: str, lang: str = "en") -> float:  # fallback constant
        return 1.0

_SIMPLE_THRESHOLD = 4.0  # higher is simpler. < 4 considered complex


def _ensure_nltk():
    global _nltk_ready, nltk
    if _nltk_ready:
        return
    try:
        import nltk
        nltk.download('wordnet', quiet=True)
        nltk.download('omw-1.4', quiet=True)
        from nltk.corpus import wordnet as wn  # noqa: F401
        _nltk_ready = True
    except Exception:
        _nltk_ready = False


def _is_complex(word: str) -> bool:
    return zipf_frequency(word, 'en') < _SIMPLE_THRESHOLD


def _best_definition(word: str) -> str:
    _ensure_nltk()
    if wn is None:
        return "Definition unavailable"
    syns = wn.synsets(word)
    if not syns:
        return "No definition found"
    # pick most common sense
    gloss = syns[0].definition()
    return gloss[0].upper() + gloss[1:] if gloss else "No definition found"


def define_terms(text: str) -> Dict[str, str]:
    words = set(w.lower() for w in re.findall(r"[A-Za-z][A-Za-z\-']+", text))
    complex_words = [w for w in words if _is_complex(w)]
    out: Dict[str, str] = {}
    for w in complex_words[:50]:  # limit work
        try:
            out[w] = _best_definition(w)
        except Exception:
            out[w] = "No definition found"
    return out


def simplify_text(text: str, level: str = "medium") -> str:
    # Heuristic: replace complex words with their first lemma name from WordNet if available
    _ensure_nltk()
    if wn is None:
        return text
    def replacement(word: str) -> str:
        lw = word.lower()
        if not _is_complex(lw):
            return word
        syns = wn.synsets(lw)
        if not syns:
            return word
        lemma = syns[0].lemmas()[0].name().replace('_', ' ')
        # simple guard: keep capitalization if original capitalized
        if word[0].isupper():
            return lemma.capitalize()
        return lemma
    return re.sub(r"[A-Za-z][A-Za-z\-']+", lambda m: replacement(m.group(0)), text)
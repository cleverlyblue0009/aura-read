# scoring.py (ported, no sklearn)
import re
import math
import numpy as np
from typing import List, Dict

STOPWORDS = {
    "a","an","the","of","to","and","in","on","for","with","by","is","are","be",
    "was","were","as","at","from","or","that","this","it","its","into","about",
    "your","their","his","her","our","we","you","i"
}

WORD_RE = re.compile(r"[A-Za-z0-9_]+", re.UNICODE)

def tokenize(text:str)->List[str]:
    return [w.lower() for w in WORD_RE.findall(text)]

def keyword_set(text:str)->set:
    return {w for w in tokenize(text) if w not in STOPWORDS and len(w)>2}

def build_query(persona:str, job:str)->str:
    return f"{persona} {job}"

def build_keywords(persona:str, job:str)->set:
    ks=keyword_set(persona) | keyword_set(job)
    return ks

def _build_vocab(docs: List[str]) -> Dict[str, int]:
    vocab: Dict[str, int] = {}
    for text in docs:
        for t in tokenize(text):
            if t in STOPWORDS or len(t) <= 2:
                continue
            if t not in vocab:
                vocab[t] = len(vocab)
    return vocab

def _tfidf_matrix(docs: List[str]) -> np.ndarray:
    # simple tf-idf: l2-normalized
    n = len(docs)
    vocab = _build_vocab(docs)
    vsize = len(vocab)
    if vsize == 0:
        return np.zeros((n, 1), dtype=float)
    tf = np.zeros((n, vsize), dtype=float)
    df = np.zeros(vsize, dtype=float)
    for i, text in enumerate(docs):
        toks = [t for t in tokenize(text) if t not in STOPWORDS and len(t) > 2]
        if not toks:
            continue
        counts: Dict[str, int] = {}
        for t in toks:
            counts[t] = counts.get(t, 0) + 1
        for t, c in counts.items():
            j = vocab[t]
            tf[i, j] = c
        for t in set(toks):
            df[vocab[t]] += 1
    # idf
    idf = np.log((1 + n) / (1 + df)) + 1.0
    mat = tf * idf
    # l2 normalize
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    mat = mat / norms
    return mat

def tfidf_scores(query: str, sections: List[str]) -> np.ndarray:
    docs = [query] + sections
    mat = _tfidf_matrix(docs)
    if mat.shape[1] == 0:
        return np.zeros(len(sections), dtype=float)
    q = mat[0:1]
    S = mat[1:]
    sims = (S @ q.T).flatten()
    return sims

def heading_overlap_score(heading:str, kw:set)->float:
    hkw=keyword_set(heading)
    if not hkw: return 0.0
    overlap=len(hkw & kw)/len(hkw)
    return overlap

def domain_boost_score(text:str, kw:set)->float:
    toks=keyword_set(text)
    if not toks: return 0.0
    overlap=len(toks & kw)
    return math.log1p(overlap)/5.0

def combined_scores(query:str, headings:List[str], texts:List[str], kw:set,
                    w_tfidf=0.6, w_head=0.25, w_domain=0.15)->np.ndarray:
    tfidf=tfidf_scores(query,texts)
    head=np.array([heading_overlap_score(h,kw) for h in headings])
    domain=np.array([domain_boost_score(t,kw) for t in texts])
    score = w_tfidf*tfidf + w_head*head + w_domain*domain
    return score
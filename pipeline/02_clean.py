"""
02_clean — turn raw auto-captions into text that can actually be chunked and searched.

Reads  data/01_raw/<BodyPart>/<video_id>.json
Writes data/02_clean/<BodyPart>/<video_id>.json

01_raw is never modified. It stays the provenance record: the tier evidence
strings in the web app point into it, and every cleaned file records what was
changed so a claim can be traced back.

What this does, in order:
  1. Drop non-speech tags — [Music], [Applause], [laughter] and friends.
  2. Normalise domain terms. Auto-captions spell the same word several ways
     ("easy bar" outnumbers "ez bar" 5:1), which quietly breaks retrieval.
  3. Undo spurious mid-sentence capitals ("Smith", "Target", "Downs"), keeping
     genuine proper nouns.
  4. Restore sentence boundaries and punctuation with a transformer, then
     re-case each sentence.
  5. Emit `sentences` with timestamps — the point of the whole exercise. Every
     sentence keeps the start/end time of its own words, so a retrieved chunk
     can still deep-link to the exact second in the video.

Word-level timings are preserved untouched; only word spelling changes.

    python pipeline/02_clean.py            # whole corpus
    python pipeline/02_clean.py --limit 2  # smoke test
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path

# This file lives at <project>/web/pipeline/, so the project root — the
# directory holding data/ and web/ — is three levels up.
ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "01_raw"
CLEAN = ROOT / "data" / "02_clean"

MODEL = "oliverguhr/fullstop-punctuation-multilang-large"
# The model is trained on ~short sequences; keep windows well inside its limit
# and overlap them so a sentence split never lands on a window edge.
WINDOW = 150
OVERLAP = 20

NON_SPEECH = re.compile(r"\[[^\]]{0,30}\]")

# Correct spelling -> patterns seen in these captions. Order matters: longer
# phrases first so "romanian dead lift" is not half-matched by "dead lift".
CORRECTIONS: list[tuple[str, str]] = [
    (r"\bromanian dead lift\b", "romanian deadlift"),
    (r"\bdead lift(s?)\b", r"deadlift\1"),
    (r"\bpre[- ]ra curl\b", "preacher curl"),
    (r"\bpreach curl\b", "preacher curl"),
    (r"\beasy bar\b", "ez bar"),
    (r"\be[- ]z[- ]bar\b", "ez bar"),
    (r"\bsolus\b", "soleus"),
    (r"\bsole us\b", "soleus"),
    (r"\bgastro c\b", "gastroc"),
    (r"\becentric\b", "eccentric"),
    (r"\ba centric\b", "eccentric"),
    (r"\bhyper trophy\b", "hypertrophy"),
    (r"\bpeck(s?)\b", r"pec\1"),
    (r"\bpek(s?)\b", r"pec\1"),
    (r"\blat isimus\b", "latissimus"),
    (r"\bglute us\b", "gluteus"),
    (r"\bbicep femoris\b", "biceps femoris"),
    (r"\bisrel\b", "israetel"),
    (r"\bis real\b", "israetel"),
    (r"\blap pull\b", "lat pull"),
    (r"\bthaton\b", "that on"),
    (r"\bquad prefects\b", "quad prefix"),
    (r"\bva?ber\b", "V-taper"),
    (r"\bv taper\b", "V-taper"),
    (r"\bsmith machine\b", "Smith machine"),
    (r"\bbosu\b", "BOSU"),
    (r"\brdl(s?)\b", r"RDL\1"),
    (r"\bemg\b", "EMG"),
    (r"\brom\b", "ROM"),
]

# Always keep these capitalised regardless of corpus counts.
ALWAYS_PROPER = {"i", "i'm", "i've", "i'd", "i'll"}

SENTENCE_END = {".", "?", "!"}


def strip_non_speech(text: str) -> str:
    return NON_SPEECH.sub(" ", text)


def apply_corrections(tokens: list[dict]) -> tuple[list[dict], int]:
    """
    Normalise domain vocabulary while keeping every word tied to its timestamp.

    Running these as a regex over joined text is simpler but loses alignment the
    moment a rule changes the token count ("dead lift" -> "deadlift"), which in
    turn forces the whole file back to uncorrected text. So corrections are
    applied over the token list: a phrase of n tokens becomes m tokens, and the
    replacement inherits the timestamp of the first token it replaced.
    """
    edits = 0
    for pattern, replacement in CORRECTIONS:
        rx = re.compile(pattern, re.IGNORECASE)
        span = len(pattern.replace(r"\b", "").split())  # tokens the rule can span
        out: list[dict] = []
        i = 0
        while i < len(tokens):
            matched = False
            for width in range(min(span, len(tokens) - i), 0, -1):
                phrase = " ".join(t["w"] for t in tokens[i : i + width])
                new = rx.sub(replacement, phrase)
                if new != phrase:
                    for piece in new.split():
                        out.append({"t_ms": tokens[i]["t_ms"], "w": piece})
                    edits += 1
                    i += width
                    matched = True
                    break
            if not matched:
                out.append(tokens[i])
                i += 1
        tokens = out
    return tokens, edits


def build_case_profile(files: list[Path]) -> set[str]:
    """
    Decide which capitalised words are real proper nouns, from the corpus itself.

    The ASR capitalises words essentially at random mid-sentence, but it does so
    inconsistently: "target" appears capitalised 59 times and lowercase 84, while
    "achilles" is capitalised 34 times and lowercase 5. A word whose lowercase
    form is the more common one is therefore ASR noise; a word that is nearly
    always capitalised is a genuine proper noun. That beats any hand-written
    allowlist, which is what first lowercased "Greek" and "Filipino".
    """
    cap: Counter[str] = Counter()
    low: Counter[str] = Counter()
    for path in files:
        text = json.loads(path.read_text()).get("text", "")
        for w in re.findall(r"\b[A-Za-z][a-z]{2,}\b", text):
            (cap if w[0].isupper() else low)[w.lower()] += 1
    return {w for w, c in cap.items() if c > low[w]}


def decapitalise(word: str, proper: set[str]) -> str:
    """Lower a mid-sentence capital unless the corpus says it is a proper noun."""
    bare = word.strip(".,!?;:'\"").lower()
    if not word[:1].isupper() or len(bare) <= 1:
        return word
    if bare in ALWAYS_PROPER or bare in proper:
        return word
    if word.isupper() and len(word) > 1:  # acronyms: EMG, ROM, RDL
        return word
    return word[0].lower() + word[1:]


def load_model():
    import warnings

    warnings.filterwarnings("ignore")
    from transformers import pipeline as hf_pipeline

    return hf_pipeline("token-classification", model=MODEL, aggregation_strategy="none")


def predict_punctuation(tagger, words: list[str]) -> list[str]:
    """
    Return one punctuation mark (possibly empty) per input word.

    The model labels sub-word tokens; a word takes the label of its final token.
    Windows overlap so predictions near a boundary are made with real context,
    and only the middle of each window is kept.
    """
    marks = [""] * len(words)
    step = WINDOW - OVERLAP
    for start in range(0, len(words), step):
        chunk = words[start : start + WINDOW]
        if not chunk:
            break
        try:
            tagged = tagger(" ".join(chunk))
        except Exception:
            continue

        # Walk tokens, attributing each to a word by counting word-starts.
        word_index = -1
        for token in tagged:
            piece = token["word"]
            if piece.startswith("▁"):
                word_index += 1
            if 0 <= word_index < len(chunk):
                label = token["entity"]
                if label and label != "0":
                    marks_idx = start + word_index
                    # Keep only the interior of a window unless it is the first/last.
                    interior = start == 0 or word_index >= OVERLAP // 2
                    if interior and marks_idx < len(marks):
                        marks[marks_idx] = label
        if start + WINDOW >= len(words):
            break
    return marks


def rebuild(words: list[str], marks: list[str]) -> list[dict]:
    """Stitch words + predicted marks into sentences, capitalising each opener."""
    sentences: list[dict] = []
    current: list[int] = []
    for i, word in enumerate(words):
        current.append(i)
        if marks[i] in SENTENCE_END:
            sentences.append({"word_indices": current})
            current = []
    if current:
        sentences.append({"word_indices": current})

    out = []
    for sentence in sentences:
        idx = sentence["word_indices"]
        pieces = []
        for n, i in enumerate(idx):
            w = words[i]
            w = w if n else (w[0].upper() + w[1:] if w else w)
            mark = marks[i]
            pieces.append(w + (mark if mark else ""))
        text = " ".join(pieces).strip()
        if text and text[-1] not in SENTENCE_END:
            text += "."
        out.append({"text": text, "first": idx[0], "last": idx[-1]})
    return out


def explode_tokens(doc: dict) -> list[dict]:
    """
    Flatten events into one entry per word.

    Auto-captions already store one word per token. Human-written captions store a
    whole caption LINE per token ("One of the more popular gym goals folks have\nis
    to increase their arm size."), so without splitting them the punctuation model
    sees 615 "words" for a 6,750-word video and emits 1,400-word sentences.
    Timestamps for a split line are interpolated across the event's duration.
    """
    flat: list[tuple[int, int, str]] = []  # (t_ms, dur_ms, word)
    for event in doc.get("events", []):
        dur = event.get("dur_ms") or 0
        for token in event.get("words", []):
            flat.append((token["t_ms"], dur, token["w"]))

    out: list[dict] = []
    for i, (t_ms, dur, word) in enumerate(flat):
        pieces = word.split()
        if len(pieces) <= 1:
            out.append({"t_ms": t_ms, "w": word})
            continue
        # These captions roll: an event's dur_ms routinely overruns the next
        # event's start (237 of 241 events in one file). Interpolating across
        # dur_ms therefore pushes split words past their neighbours and corrupts
        # ordering, so the span is clamped to wherever the next token begins.
        next_t = flat[i + 1][0] if i + 1 < len(flat) else t_ms + (dur or len(pieces) * 300)
        span = max(0, min(dur or next_t - t_ms, next_t - t_ms))
        step = span / len(pieces) if span else 0
        for n, piece in enumerate(pieces):
            out.append({"t_ms": int(t_ms + n * step), "w": piece})
    return out


def clean_document(doc: dict, tagger, proper: set[str]) -> dict:
    flat = explode_tokens(doc)
    kept = []
    for w in flat:
        token = NON_SPEECH.sub("", w["w"]).strip()
        if token:
            kept.append({"t_ms": w["t_ms"], "w": token})

    kept, edits = apply_corrections(kept)
    probe_text = " ".join(w["w"] for w in kept[:1200])
    keeps_own_case = sum(probe_text.count(c) for c in ".!?") >= len(probe_text.split()) / 40
    if keeps_own_case:
        words_for_model = [w["w"] for w in kept]
    else:
        words_for_model = [decapitalise(w["w"], proper) for w in kept]

    # Trust punctuation that is actually there, not the caption_kind flag: one of
    # the two "manual" files in this corpus is an unpunctuated transcript.
    probe = " ".join(w["w"] for w in kept[:1200])
    marks_present = sum(probe.count(c) for c in ".!?")
    already_punctuated = marks_present >= len(probe.split()) / 40
    if already_punctuated:
        marks = [w[-1] if w and w[-1] in ".,!?;:" else "" for w in words_for_model]
        words_for_model = [w.rstrip(".,!?;:") if m else w for w, m in zip(words_for_model, marks)]
    else:
        marks = predict_punctuation(tagger, words_for_model)
    sentences = rebuild(words_for_model, marks)

    timed = []
    for s in sentences:
        timed.append(
            {
                "text": s["text"],
                "t_start_ms": kept[s["first"]]["t_ms"],
                "t_end_ms": kept[s["last"]]["t_ms"],
            }
        )

    out = {k: v for k, v in doc.items() if k not in {"text", "events"}}
    out["text"] = " ".join(s["text"] for s in sentences)
    out["sentences"] = timed
    out["words"] = [
        {"t_ms": kept[i]["t_ms"], "w": words_for_model[i]} for i in range(len(kept))
    ]
    out["clean"] = {
        "stage": "02_clean",
        "model": None if already_punctuated else MODEL,
        "punctuation_source": "original captions" if already_punctuated else "model",
        "n_sentences": len(timed),
        "n_words": len(words_for_model),
        "term_corrections": edits,
        "tokens_dropped_as_non_speech": len(flat) - sum(1 for _ in kept),
    }
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="process only N files")
    ap.add_argument("--part", help="only this body part")
    args = ap.parse_args()

    files = sorted(RAW.glob("*/*.json"))
    if args.part:
        files = [f for f in files if f.parent.name == args.part]
    if args.limit:
        files = files[: args.limit]
    if not files:
        print("no input files found", file=sys.stderr)
        return 1

    print(f"[clean] {len(files)} transcripts -> {CLEAN.relative_to(ROOT)}")
    print("[clean] profiling capitalisation across the corpus ...")
    proper = build_case_profile(sorted(RAW.glob("*/*.json")))
    print(f"[clean] {len(proper)} words treated as proper nouns")
    print(f"[clean] loading {MODEL} ...")
    tagger = load_model()

    started = time.time()
    totals = {"sentences": 0, "corrections": 0, "dropped": 0}

    for n, path in enumerate(files, 1):
        doc = json.loads(path.read_text())
        cleaned = clean_document(doc, tagger, proper)

        dest = CLEAN / path.parent.name / path.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(cleaned, indent=1))

        info = cleaned["clean"]
        totals["sentences"] += info["n_sentences"]
        totals["corrections"] += info["term_corrections"]
        totals["dropped"] += info["tokens_dropped_as_non_speech"]


        elapsed = time.time() - started
        rate = n / elapsed if elapsed else 0
        eta = (len(files) - n) / rate if rate else 0
        print(
            f"  [{n:>3}/{len(files)}] {path.parent.name:<11} {path.stem:<12} "
            f"{info['n_sentences']:>4} sentences, {info['term_corrections']:>3} fixes"
            f"   eta {eta/60:>4.1f}m",
            flush=True,
        )

    print(
        f"\n[clean] done in {(time.time()-started)/60:.1f}m — "
        f"{totals['sentences']:,} sentences, {totals['corrections']:,} term corrections, "
        f"{totals['dropped']:,} non-speech tokens dropped"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

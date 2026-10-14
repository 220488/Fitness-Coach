"""
03_exercises — build an exercise lexicon, count how often each is discussed, and
work out what equipment it needs.

Reads  data/02_clean/<BodyPart>/<video_id>.json
Writes data/03_exercises/exercises.json   (machine-readable, consumed by the web app)
       data/03_exercises/report.txt       (human-readable review)

Method — gazetteer phrase matching, not NER and not an LLM:

  * The entity class is closed and already enumerated. Creators type exercise
    names into YouTube chapter markers, which yt-dlp captured in 01_raw, so a
    domain expert has already named and time-boxed each exercise for free. That
    is a high-precision seed no annotation budget could beat.
  * Counting must be deterministic and repeatable, which rules out an LLM pass.

Three things make the counts trustworthy:

  1. COMPOUND NORMALISATION FIRST. "pull down" / "pull-down" / "pulldown" are
     three different strings to a matcher. Counting "lat pulldown" naively finds
     0 of the 132 mentions actually present. Canonicalise, then count.
  2. LONGEST MATCH WINS. "barbell back squat" must not also score as "squat",
     so matched spans are masked before shorter patterns are tried.
  3. RANK BY DOCUMENT FREQUENCY. Raw mention counts are dominated by a single
     video repeating a term. How many distinct videos discuss an exercise is the
     more honest signal, and it is what `top3` uses.

Equipment resolves in three tiers, and the tier used is recorded per exercise so
a reviewer can see how much was inferred:

    name     -- the name says it ("Smith Machine Squat")
    context  -- equipment named in the chapter's own transcript window
    default  -- fallback by movement type (a squat implies a barbell and a rack)

    python pipeline/03_exercises.py
    python pipeline/03_exercises.py --part Quadriceps
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

# This file lives at <project>/web/pipeline/, so the project root — the
# directory holding data/ and web/ — is three levels up.
ROOT = Path(__file__).resolve().parents[2]
CLEAN = ROOT / "data" / "02_clean"
OUT_DIR = ROOT / "data" / "03_exercises"

# Body parts the web app actually renders. Core is carried in the data but has
# no region on the 3D model.
DISPLAY_PARTS = [
    "Chest", "Shoulders", "Triceps", "Back", "Biceps",
    "Forearms", "Quadriceps", "Hamstrings", "Glutes", "Calves",
]

# ---------------------------------------------------------------- normalisation

# Multi-word exercise names that the captions spell inconsistently. Applied
# before anything is matched or de-duplicated.
COMPOUND = [
    (r"\bpull[\s-]?down(s?)\b", r"pulldown\1"),
    (r"\bpull[\s-]?up(s?)\b", r"pullup\1"),
    (r"\bchin[\s-]?up(s?)\b", r"chinup\1"),
    (r"\bpush[\s-]?up(s?)\b", r"pushup\1"),
    (r"\bpush[\s-]?down(s?)\b", r"pushdown\1"),
    (r"\bskull[\s-]?crusher(s?)\b", r"skullcrusher\1"),
    (r"\bstep[\s-]?up(s?)\b", r"stepup\1"),
    (r"\bhip[\s-]?thrust(s?)\b", r"hip thrust\1"),
    (r"\bleg[\s-]?press(es)?\b", r"leg press\1"),
    (r"\bgood[\s-]?morning(s?)\b", r"good morning\1"),
    (r"\bface[\s-]?pull(s?)\b", r"face pull\1"),
    (r"\bdead[\s-]?lift(s?)\b", r"deadlift\1"),
    (r"\bcross[\s-]?over(s?)\b", r"crossover\1"),
    (r"\bkick[\s-]?back(s?)\b", r"kickback\1"),
    (r"\bchest[\s-]?supported\b", "chest-supported"),
    (r"\bclose[\s-]?grip\b", "close-grip"),
    (r"\bwide[\s-]?grip\b", "wide-grip"),
    (r"\bneutral[\s-]?grip\b", "neutral-grip"),
    (r"\breverse[\s-]?grip\b", "reverse-grip"),
    (r"\bsingle[\s-]?leg\b", "single-leg"),
    (r"\bsingle[\s-]?arm\b", "single-arm"),
    (r"\b1[\s-]?arm\b", "single-arm"),
    (r"\bone[\s-]?arm\b", "single-arm"),
    (r"\bdb\b", "dumbbell"),
    (r"\bbb\b", "barbell"),
    (r"\brdl(s?)\b", r"romanian deadlift\1"),
    (r"\bsldl(s?)\b", r"stiff leg deadlift\1"),
]


def canonicalise(text: str) -> str:
    """Lowercase and fold the spelling variants together."""
    out = text.lower()
    for pattern, replacement in COMPOUND:
        out = re.sub(pattern, replacement, out)
    return re.sub(r"\s+", " ", out).strip()


# ------------------------------------------------------------------- gazetteer

# A title must name a movement to be an exercise at all.
MOVEMENT = re.compile(
    r"\b(press|bench|row|curl|squat|deadlift|raise|extension|fly|flye|pulldown|"
    r"pullup|chinup|pushup|pushdown|dip|lunge|thrust|bridge|shrug|kickback|"
    r"crunch|plank|hinge|hyperextension|good morning|leg press|calf|carry|hang|"
    r"skullcrusher|stepup|face pull|pullover|crossover|pull-in)\b"
)

# Chapter titles that name a topic rather than an exercise.
NOT_AN_EXERCISE = re.compile(
    r"^(intro|outro|conclusion|sponsor|recap|summary|untitled|<)|"
    r"\b(mistakes?|wrong|why|how to|vs\.?|versus|anatomy|science|myth|takeaway|"
    r"benefits?|common|programming|volume|frequency|exercises?|injur\w+|training|"
    r"tips?|best|worst|ranked|routine|workout|warm[- ]?up|stretch\w*|better|fix|"
    r"guide|explained|study|research|conclusion)\b"
)


def tidy_title(title: str) -> tuple[str, str | None]:
    """
    Strip chapter-list decoration from a title.

    Returns the cleaned name and any parenthetical, which usually names the
    equipment ("Foot Elevated Lunge (smith machine)") and is worth keeping
    separately rather than discarding.
    """
    name = title.strip()
    name = re.sub(r"^\d+[.)]\s*", "", name)            # "2. Hanging Leg Raise"
    name = re.sub(r"^[-–—•]\s*", "", name)
    aside = None
    match = re.search(r"\(([^)]{2,40})\)", name)
    if match:
        aside = match.group(1).strip()
        name = re.sub(r"\s*\([^)]*\)", "", name)
    name = re.split(r"\s*/\s*", name)[0]  # "Front Raise/Upright Raise" -> first
    name = name.strip(" \"'“”-–—:")
    return re.sub(r"\s+", " ", name), aside


def title_case(name: str) -> str:
    """Display form. Keeps acronyms and hyphenated qualifiers readable."""
    small = {"a", "an", "the", "of", "to", "on", "in", "for", "with", "and"}
    parts = []
    for i, word in enumerate(name.split()):
        if word.upper() in {"EZ", "JM", "RP", "ROM", "EMG"}:
            parts.append(word.upper())
        elif i and word in small:
            parts.append(word)
        else:
            parts.append("-".join(p[:1].upper() + p[1:] for p in word.split("-")))
    return " ".join(parts)


def build_gazetteer(docs: list[dict]) -> tuple[dict[str, dict], dict[str, int]]:
    """
    Seed the lexicon from chapter titles.

    Every surviving name records which videos it came from, so any entry can be
    traced back to a creator's own wording.
    """
    entries: dict[str, dict] = {}
    rejected = Counter()

    for doc in docs:
        for chapter in doc["meta"].get("chapters") or []:
            name, aside = tidy_title(chapter["title"])
            if not (3 < len(name) <= 38):
                rejected["length"] += 1
                continue
            if ":" in name or "?" in name:
                rejected["header or question"] += 1
                continue
            if NOT_AN_EXERCISE.search(name.lower()):
                rejected["topic, not exercise"] += 1
                continue
            canon = canonicalise(name)
            if not MOVEMENT.search(canon):
                rejected["no movement word"] += 1
                continue

            entry = entries.setdefault(
                canon,
                {
                    "canonical": canon,
                    "name": title_case(canon),
                    "slug": re.sub(r"[^a-z0-9]+", "-", canon).strip("-"),
                    "asides": [],
                    "chapters": [],
                    "parts": set(),
                },
            )
            entry["parts"].add(doc["body_part"])
            entry["chapters"].append(
                {
                    "video_id": doc["video_id"],
                    "body_part": doc["body_part"],
                    "channel": doc["meta"]["channel"],
                    "start": chapter["start_time"],
                    "end": chapter.get("end_time", chapter["start_time"]),
                }
            )
            if aside and aside not in entry["asides"]:
                entry["asides"].append(aside)

    return entries, rejected


# -------------------------------------------------------------------- counting


def count_mentions(docs: list[dict], names: list[str]) -> tuple[Counter, dict[str, set], dict]:
    """
    Count mentions across every sentence, longest name first.

    Masking a matched span stops "barbell back squat" from also scoring as
    "squat". Returns total mentions, the set of videos per name, and one
    quotable sentence per name.
    """
    ordered = sorted(names, key=len, reverse=True)
    patterns = {
        n: re.compile(r"\b" + re.escape(n).replace(r"\ ", r"\s+") + r"(e?s)?\b")
        for n in ordered
    }

    totals: Counter = Counter()
    videos: dict[str, set] = defaultdict(set)
    quote: dict[str, dict] = {}

    for doc in docs:
        for sentence in doc["sentences"]:
            text = canonicalise(sentence["text"])
            for name in ordered:
                found = patterns[name].findall(text)
                if not found:
                    continue
                totals[name] += len(found)
                videos[name].add(doc["video_id"])
                if name not in quote and 40 < len(sentence["text"]) < 190:
                    quote[name] = {
                        "text": sentence["text"],
                        "video_id": doc["video_id"],
                        "channel": doc["meta"]["channel"],
                        "t_ms": sentence["t_start_ms"],
                    }
                # Mask so shorter names cannot re-match inside this one.
                text = patterns[name].sub(" ", text)
    return totals, videos, quote


# ------------------------------------------------------------------- equipment

# Tier 1 — the name itself says what you need.
EQUIPMENT_FROM_NAME = [
    (r"\bsmith machine\b", "Smith machine"),
    (r"\bhack squat\b", "Hack squat machine"),
    (r"\bpendulum squat\b", "Pendulum squat machine"),
    (r"\bleg press\b", "Leg press machine"),
    (r"\bleg extension\b", "Leg extension machine"),
    (r"\bleg curl\b", "Leg curl machine"),
    (r"\bpulldown\b", "Cable pulldown station"),
    (r"\bcable|crossover\b", "Cable station"),
    (r"\bpreacher|scott\b", "Preacher bench"),
    (r"\bpullup|chinup\b", "Pull-up bar"),
    (r"\bmachine\b", "Plate-loaded machine"),
    (r"\bbosu\b", "BOSU ball"),
    (r"\bez bar\b", "EZ bar"),
    (r"\bband(ed)?\b", "Resistance band"),
    (r"\bkettlebell\b", "Kettlebell"),
    (r"\bdumbbell\b", "Dumbbells"),
    (r"\bbarbell\b", "Barbell"),
    (r"\bincline|decline\b", "Adjustable bench"),
]

# Tier 2 — equipment nouns to look for in the chapter's own transcript window.
EQUIPMENT_IN_CONTEXT = [
    (r"\bsmith machine\b", "Smith machine"),
    (r"\bhack squat\b", "Hack squat machine"),
    (r"\bleg press\b", "Leg press machine"),
    (r"\bpreacher\b", "Preacher bench"),
    (r"\bcable[s]?\b|\bpulley\b", "Cable station"),
    (r"\bez bar\b", "EZ bar"),
    (r"\bdumbbell[s]?\b", "Dumbbells"),
    (r"\bbarbell\b", "Barbell"),
    (r"\b(squat|power) rack\b", "Squat rack"),
    (r"\bincline bench\b", "Adjustable bench"),
    (r"\bflat bench\b", "Flat bench"),
    (r"\bband[s]?\b", "Resistance band"),
]

# Tier 3 — what a movement implies when nothing else says.
EQUIPMENT_BY_MOVEMENT = [
    # Specific variants first — a bare "squat" implies a loaded bar, but a
    # goblet, pistol or sissy squat certainly does not.
    (r"\bgoblet\b", "One dumbbell or kettlebell"),
    (r"\b(pistol|sissy|jump|air|bodyweight|wall)\b", "Bodyweight"),
    (r"\b(bulgarian|split squat|stepup|walking lunge|reverse lunge)\b",
     "Dumbbells (bodyweight to start)"),
    (r"\bsissy\b", "Bodyweight"),
    (r"\bnordic\b", "Bodyweight + a partner or anchor"),
    (r"\bskullcrusher\b", "EZ bar + flat bench"),
    (r"\bhip thrust\b", "Barbell + bench"),
    (r"\bbridge\b", "Bodyweight (barbell optional)"),
    (r"\bcalf raise|calf\b", "Calf raise machine or a step"),
    (r"\bbench press|bench\b", "Barbell + flat bench"),
    (r"\bsquat\b", "Barbell + squat rack"),
    (r"\bdeadlift\b", "Barbell"),
    (r"\brow\b", "Barbell"),
    (r"\bpushdown\b", "Cable station"),
    (r"\bfly|flye\b", "Dumbbells or cables"),
    (r"\braise\b", "Dumbbells"),
    (r"\bcurl\b", "Dumbbells or EZ bar"),
    (r"\bextension\b", "Cable or dumbbells"),
    (r"\bpullover\b", "Dumbbell or cable"),
    (r"\blunge|stepup|split squat\b", "Dumbbells (bodyweight to start)"),
    (r"\bdip\b", "Dip bars"),
    (r"\bshrug\b", "Barbell or dumbbells"),
    (r"\bgood morning|hinge\b", "Barbell"),
    (r"\bcarry|hang\b", "Dumbbells or a bar"),
    (r"\bplank|crunch|pushup\b", "Bodyweight"),
    (r"\bpress\b", "Barbell or dumbbells"),
]


def resolve_equipment(entry: dict, context: str) -> dict:
    """Decide what the lifter needs, recording which tier answered."""
    canon = entry["canonical"]

    for pattern, kit in EQUIPMENT_FROM_NAME:
        if re.search(pattern, canon):
            return {"needs": kit, "source": "name", "confidence": "high"}

    # A parenthetical in the chapter title is the creator's own note.
    for aside in entry["asides"]:
        for pattern, kit in EQUIPMENT_FROM_NAME:
            if re.search(pattern, aside.lower()):
                return {"needs": kit, "source": "chapter note", "confidence": "high"}

    # Movement defaults are checked BEFORE transcript context. Context sounds
    # like better evidence but is not: it matches any equipment noun spoken
    # nearby, so a chapter that merely compares a skullcrusher to a Smith
    # machine press resolved "Skullcrusher -> Smith machine". The movement
    # default ("EZ bar + flat bench") is deterministic and was right in every
    # case the noisy context rule got wrong.
    for pattern, kit in EQUIPMENT_BY_MOVEMENT:
        if re.search(pattern, canon):
            return {"needs": kit, "source": "movement", "confidence": "medium"}

    if context:
        for pattern, kit in EQUIPMENT_IN_CONTEXT:
            if re.search(pattern, context, re.I):
                return {"needs": kit, "source": "context", "confidence": "low"}

    return {"needs": "Unknown", "source": "none", "confidence": "none"}


def chapter_sentences(docs_by_id: dict[str, dict], entry: dict, limit: int = 3) -> list[dict]:
    """Sentences spoken inside this exercise's own chapter windows."""
    out = []
    for chapter in entry["chapters"][:limit]:
        doc = docs_by_id.get(chapter["video_id"])
        if not doc:
            continue
        start, end = chapter["start"] * 1000, chapter["end"] * 1000
        for sentence in doc["sentences"]:
            if start <= sentence["t_start_ms"] < end:
                out.append(
                    {
                        "text": sentence["text"],
                        "t_ms": sentence["t_start_ms"],
                        "video_id": doc["video_id"],
                        "channel": doc["meta"]["channel"],
                    }
                )
    return out


def chapter_context(docs_by_id: dict[str, dict], entry: dict, limit: int = 3) -> str:
    """Transcript text inside this exercise's own chapter windows."""
    return " ".join(s["text"] for s in chapter_sentences(docs_by_id, entry, limit))


# Auto-captions mangle sentences badly enough to be unquotable ("depicts this bad
# exports are, of course"). These are cheap signals that one is not safe to show.
_BROKEN = re.compile(
    r"\b(uh|um|erm)\b|"              # audible filler
    r"\b\w+-\s|\s-\w+\b|"           # dangling hyphen from a false start
    r"\b(\w{1,2}\s+){4,}",            # a run of fragment tokens
    re.I,
)


def pick_quote(sentences: list[dict], canonical: str) -> dict | None:
    """
    Choose a quotable sentence about this exercise.

    Two rules, both learned from bad output: the sentence must come from the
    exercise's OWN chapter (a corpus-wide search gave "Bench Press" a sentence
    about pulldowns and "Romanian Deadlift" one about calves), and it must
    actually name the exercise, so a chapter's throat-clearing is not quoted.
    """
    head = canonical.split()[-1]  # the movement word, e.g. "squat"
    best = None
    for item in sentences:
        text = item["text"].strip()
        if not (55 <= len(text) <= 185):
            continue
        if _BROKEN.search(text):
            continue
        if not re.search(r"\b" + re.escape(head) + r"s?\b", text, re.I):
            continue
        # Prefer one that names the exercise in full.
        score = 2 if re.search(re.escape(canonical), text, re.I) else 1
        if best is None or score > best[0]:
            best = (score, item)
            if score == 2:
                break
    return best[1] if best else None


# ------------------------------------------------------------------------ main


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--part", help="restrict to one body part")
    ap.add_argument("--top", type=int, default=3, help="how many to flag as top (default 3)")
    args = ap.parse_args()

    files = sorted(CLEAN.glob("*/*.json"))
    if not files:
        print("no cleaned transcripts found — run pipeline/02_clean.py first", file=sys.stderr)
        return 1

    docs = [json.loads(p.read_text()) for p in files]
    if args.part:
        docs = [d for d in docs if d["body_part"] == args.part]
    docs_by_id = {d["video_id"]: d for d in docs}

    print(f"[exercises] {len(docs)} cleaned transcripts")

    entries, rejected = build_gazetteer(docs)
    print(f"[exercises] gazetteer: {len(entries)} names from chapter titles")
    for reason, n in rejected.most_common():
        print(f"              rejected {n:>4}  {reason}")

    totals, videos, quotes = count_mentions(docs, list(entries))
    print(f"[exercises] counted mentions across {sum(len(d['sentences']) for d in docs):,} sentences")

    # Attach counts, equipment and evidence to every entry.
    #
    # A creator who gives an exercise its own chapter has demonstrably covered
    # it, even when the spoken words never match the title exactly ("Kroc Row"
    # written, "these" said). Counting literal mentions alone scored 40 of 165
    # placements at zero. Chapters therefore count as evidence in their own
    # right, and are reported separately so the two signals stay distinguishable.
    for canon, entry in entries.items():
        own_sentences = chapter_sentences(docs_by_id, entry)
        context = " ".join(s["text"] for s in own_sentences)
        entry["equipment"] = resolve_equipment(entry, context)
        entry["mentions"] = totals.get(canon, 0)
        spoken = videos.get(canon, set())
        chaptered = {c["video_id"] for c in entry["chapters"]}
        entry["videos"] = len(spoken | chaptered)
        entry["videos_spoken"] = len(spoken)
        entry["videos_chaptered"] = len(chaptered)
        entry["quote"] = pick_quote(own_sentences, canon)
        entry["parts"] = sorted(entry["parts"])

    # Group by body part. An exercise is listed under every part that chaptered it.
    by_part: dict[str, list[dict]] = defaultdict(list)
    for entry in entries.values():
        for part in entry["parts"]:
            chapters_here = [c for c in entry["chapters"] if c["body_part"] == part]
            by_part[part].append(
                {
                    "name": entry["name"],
                    "slug": entry["slug"],
                    "canonical": entry["canonical"],
                    "mentions": entry["mentions"],
                    "videos": entry["videos"],
                    "videos_spoken": entry["videos_spoken"],
                    "videos_chaptered": entry["videos_chaptered"],
                    "equipment": entry["equipment"],
                    "quote": entry["quote"],
                    "chapters": chapters_here,
                    "demo": (
                        {
                            "video_id": chapters_here[0]["video_id"],
                            "channel": chapters_here[0]["channel"],
                            "start": chapters_here[0]["start"],
                            "url": f"https://www.youtube.com/watch?v={chapters_here[0]['video_id']}&t={chapters_here[0]['start']}s",
                        }
                        if chapters_here
                        else None
                    ),
                }
            )

    # Rank by videos first: raw mentions are skewed by one video repeating a term.
    for part in by_part:
        by_part[part].sort(key=lambda e: (-e["videos"], -e["mentions"], e["name"]))
        for rank, entry in enumerate(by_part[part], 1):
            entry["rank"] = rank
            entry["is_top"] = rank <= args.top

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "data/02_clean",
        "method": "chapter-seeded gazetteer + normalised phrase matching",
        "ranking": "document frequency (distinct videos), then total mentions",
        "stats": {
            "transcripts": len(docs),
            "gazetteer_size": len(entries),
            "exercises_placed": sum(len(v) for v in by_part.values()),
            "top_n": args.top,
        },
        "by_part": {k: by_part[k] for k in sorted(by_part)},
    }
    (OUT_DIR / "exercises.json").write_text(json.dumps(payload, indent=1))

    # Human-readable review file.
    lines = [
        "EXERCISE EXTRACTION REPORT",
        f"generated {payload['generated_at']}",
        f"method: {payload['method']}",
        f"ranking: {payload['ranking']}",
        "",
    ]
    conf_total: Counter = Counter()
    for part in DISPLAY_PARTS:
        items = by_part.get(part, [])
        if not items:
            continue
        lines.append(f"{part}  ({len(items)} exercises)")
        for e in items:
            flag = "TOP" if e["is_top"] else "   "
            conf_total[e["equipment"]["confidence"]] += 1
            lines.append(
                f"  {flag} {e['name'][:34]:<35}{e['videos']:>3} vids{e['mentions']:>5} mentions   "
                f"{e['equipment']['needs'][:30]:<31}({e['equipment']['source']})"
            )
        lines.append("")
    lines.append(f"equipment confidence: {dict(conf_total)}")
    (OUT_DIR / "report.txt").write_text("\n".join(lines))

    print(f"[exercises] {sum(len(v) for v in by_part.values())} placements across {len(by_part)} body parts")
    print(f"[exercises] equipment confidence: {dict(conf_total)}")
    print(f"\n-> {(OUT_DIR / 'exercises.json').relative_to(ROOT)}")
    print(f"-> {(OUT_DIR / 'report.txt').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

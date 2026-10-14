"""
03b_baseline — the naive version of stage 03, for comparison.

Reads  data/02_clean/<BodyPart>/<video_id>.json
Writes data/03b_baseline/baseline.json

This is the control condition. It does the same three jobs as the rule-based
pipeline and the LLM extraction, using the most obvious method available, so the
evaluation can answer: *did the extra machinery actually buy anything?*

A baseline is only useful if it is honest. This one is not a strawman — it is
what a competent person would reasonably write first, and it exploits the single
biggest shortcut in the data (creators type exercise names into chapter markers,
so you can just read those).

What it deliberately does NOT do, each corresponding to one piece of stage 03:

  1. No name normalisation. "pull down", "pull-down" and "pulldown" stay
     distinct — the thing that cost 132 of 132 mentions when measured.
  2. No filtering of chapter titles. Section headers and topic chapters become
     "exercises" alongside real ones.
  3. No tier classification. The last "<letter> tier" in the window wins, so
     hedges, negations and forward references are all read as verdicts.
  4. No equipment inference. If the chapter text does not literally name a
     piece of equipment, the answer is Unknown.
  5. No frequency analysis. Exercises are ranked by order of appearance.

    python pipeline/03b_baseline.py
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

# This file lives at <project>/web/pipeline/, so the project root — the
# directory holding data/ and web/ — is three levels up.
ROOT = Path(__file__).resolve().parents[2]
CLEAN = ROOT / "data" / "02_clean"
OUT_DIR = ROOT / "data" / "03b_baseline"

DISPLAY_PARTS = [
    "Chest", "Shoulders", "Triceps", "Back", "Biceps",
    "Forearms", "Quadriceps", "Hamstrings", "Glutes", "Calves",
]

# The naive tier rule: find "<letter> tier", take the last one in the window.
TIER_RE = re.compile(r"\b([SABCDF])[\s-]?tier\b", re.I)

# The naive equipment rule: first keyword that appears, in this fixed order.
EQUIPMENT_KEYWORDS = [
    ("Smith machine", r"smith machine"),
    ("Leg press machine", r"leg press"),
    ("Cable station", r"\bcable"),
    ("Dumbbells", r"\bdumbbell"),
    ("Barbell", r"\bbarbell"),
    ("Machine", r"\bmachine"),
    ("Bench", r"\bbench"),
    ("Resistance band", r"\bband\b"),
]


def chapter_text(doc: dict, start: int, end: int) -> str:
    """Sentences spoken inside this chapter's time window."""
    lo, hi = start * 1000, end * 1000
    return " ".join(s["text"] for s in doc["sentences"] if lo <= s["t_start_ms"] < hi)


def naive_tier(text: str) -> str | None:
    """Last '<letter> tier' mentioned. No notion of hedging or negation."""
    hits = TIER_RE.findall(text)
    return hits[-1].upper() if hits else None


def naive_equipment(text: str) -> str:
    """First equipment keyword that appears anywhere in the chapter."""
    for label, pattern in EQUIPMENT_KEYWORDS:
        if re.search(pattern, text, re.I):
            return label
    return "Unknown"


def main() -> int:
    files = sorted(CLEAN.glob("*/*.json"))
    if not files:
        print("no cleaned transcripts — run pipeline/02_clean.py first")
        return 1

    by_part: dict[str, dict[str, dict]] = defaultdict(dict)
    chapters_seen = 0
    videos_without_chapters = 0

    for path in files:
        doc = json.loads(path.read_text())
        part = doc["body_part"]
        chapters = doc["meta"].get("chapters") or []
        if not chapters:
            videos_without_chapters += 1
            continue

        for chapter in chapters:
            chapters_seen += 1
            # Verbatim: no stripping, no filtering, no case folding beyond lower().
            name = chapter["title"].strip()
            key = name.lower()
            if not key:
                continue
            text = chapter_text(doc, chapter["start_time"], chapter.get("end_time", chapter["start_time"]))

            entry = by_part[part].setdefault(
                key,
                {
                    "name": name,
                    "slug": re.sub(r"[^a-z0-9]+", "-", key).strip("-"),
                    "videos": set(),
                    "tier": None,
                    "equipment": "Unknown",
                    "first_seen": (chapter["start_time"], path.stem),
                },
            )
            entry["videos"].add(doc["video_id"])
            # First value wins — no voting across videos.
            if entry["tier"] is None:
                entry["tier"] = naive_tier(text)
            if entry["equipment"] == "Unknown":
                entry["equipment"] = naive_equipment(text)

    out: dict[str, list[dict]] = {}
    for part, items in by_part.items():
        # Ranked by order of appearance, not by any measure of importance.
        rows = sorted(items.values(), key=lambda e: e["first_seen"])
        for rank, row in enumerate(rows, 1):
            row["rank"] = rank
            row["is_top"] = rank <= 3
            row["videos"] = len(row["videos"])
            del row["first_seen"]
        out[part] = rows

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "baseline.json").write_text(
        json.dumps(
            {
                "method": "naive: verbatim chapter titles, last-tier-match, first-equipment-keyword, appearance order",
                "chapters_read": chapters_seen,
                "videos_skipped_no_chapters": videos_without_chapters,
                "by_part": out,
            },
            indent=1,
        )
    )

    total = sum(len(v) for v in out.values())
    tiered = sum(1 for v in out.values() for e in v if e["tier"])
    known_kit = sum(1 for v in out.values() for e in v if e["equipment"] != "Unknown")

    print(f"[baseline] {chapters_seen} chapters read, {videos_without_chapters} videos skipped (no chapters)")
    print(f"[baseline] {total} 'exercises' extracted, {tiered} with a tier, {known_kit} with equipment")
    print()
    for part in DISPLAY_PARTS:
        rows = out.get(part, [])
        top = " | ".join(e["name"][:26] for e in rows[:3])
        print(f"   {part:<12}{len(rows):>4}  top3: {top}")
    print(f"\n-> {(OUT_DIR / 'baseline.json').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

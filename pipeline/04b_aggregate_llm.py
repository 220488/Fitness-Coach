"""
04b_aggregate_llm — roll per-video LLM extractions up to per-muscle.

Reads  data/04_llm/<BodyPart>/<video_id>.json
Writes data/04_llm/by_part.json

Split out from 04_llm_extract.py so the extraction itself can be done any way —
by the API script, or by a Claude Code session reading the transcripts directly —
and still produce the exact shape pipeline/05_compare.py expects.

    python pipeline/04b_aggregate_llm.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

# This file lives at <project>/web/pipeline/, so the project root — the
# directory holding data/ and web/ — is three levels up.
ROOT = Path(__file__).resolve().parents[2]
LLM_DIR = ROOT / "data" / "04_llm"

REQUIRED_EXERCISE_KEYS = {"name", "tier", "equipment", "recommended"}
VALID_TIERS = {"S", "A", "B", "C", "D", "F", "none"}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def validate(doc: dict, path: Path) -> list[str]:
    """Catch malformed hand-written extractions before they reach the comparison."""
    problems = []
    for key in ("video_id", "body_part", "exercises"):
        if key not in doc:
            problems.append(f"missing top-level '{key}'")
    for i, ex in enumerate(doc.get("exercises", [])):
        missing = REQUIRED_EXERCISE_KEYS - set(ex)
        if missing:
            problems.append(f"exercise[{i}] missing {sorted(missing)}")
        if ex.get("tier") not in VALID_TIERS:
            problems.append(f"exercise[{i}] tier={ex.get('tier')!r} not one of {sorted(VALID_TIERS)}")
        if not isinstance(ex.get("recommended"), bool):
            problems.append(f"exercise[{i}] 'recommended' must be true/false")
    return problems


def main() -> int:
    files = sorted(LLM_DIR.glob("*/*.json"))
    if not files:
        print(f"no extractions found in {LLM_DIR.relative_to(ROOT)}", file=sys.stderr)
        return 1

    docs, bad = [], 0
    for path in files:
        try:
            doc = json.loads(path.read_text())
        except json.JSONDecodeError as e:
            print(f"  SKIP {path.relative_to(ROOT)} — invalid JSON: {e}")
            bad += 1
            continue
        problems = validate(doc, path)
        if problems:
            print(f"  SKIP {path.relative_to(ROOT)} — {'; '.join(problems[:3])}")
            bad += 1
            continue
        docs.append(doc)

    by_part: dict[str, dict[str, dict]] = defaultdict(dict)
    for doc in docs:
        part = doc["body_part"]
        for ex in doc["exercises"]:
            slug = slugify(ex["name"])
            if not slug:
                continue
            entry = by_part[part].setdefault(
                slug,
                {"name": ex["name"], "slug": slug, "videos": set(),
                 "tiers": [], "equipment": [], "recommended": []},
            )
            entry["videos"].add(doc["video_id"])
            if ex["tier"] != "none":
                entry["tiers"].append(ex["tier"])
            entry["equipment"].append(ex["equipment"])
            entry["recommended"].append(bool(ex["recommended"]))

    out: dict[str, list[dict]] = {}
    for part, items in by_part.items():
        rows = []
        for slug, e in items.items():
            rows.append({
                "name": e["name"],
                "slug": slug,
                "videos": len(e["videos"]),
                # Most common explicit verdict across videos; None when never ranked.
                "tier": Counter(e["tiers"]).most_common(1)[0][0] if e["tiers"] else None,
                "equipment": Counter(e["equipment"]).most_common(1)[0][0] if e["equipment"] else "Unknown",
                "recommended": sum(e["recommended"]) >= len(e["recommended"]) / 2,
            })
        rows.sort(key=lambda r: (-r["videos"], r["name"]))
        for rank, row in enumerate(rows, 1):
            row["rank"] = rank
            row["is_top"] = rank <= 3
        out[part] = rows

    model = next((d.get("model") for d in docs if d.get("model")), "unknown")
    (LLM_DIR / "by_part.json").write_text(
        json.dumps({"model": model, "videos": len(docs), "by_part": out}, indent=1)
    )

    print(f"[aggregate] {len(docs)} videos ({bad} skipped) -> {sum(len(v) for v in out.values())} exercises")
    for part in sorted(out):
        top = ", ".join(e["name"] for e in out[part][:3])
        print(f"   {part:<12}{len(out[part]):>3}  {top}")
    print(f"\n-> {(LLM_DIR / 'by_part.json').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

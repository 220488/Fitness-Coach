"""
04_llm_extract — extract the same facts as the rule-based pipeline, using an LLM.

Reads  data/02_clean/<BodyPart>/<video_id>.json
Writes data/04_llm/<BodyPart>/<video_id>.json   (per-video extraction)
       data/04_llm/by_part.json                 (aggregated, shaped like 03_exercises)

This exists to be COMPARED, not to replace stage 03. The rule-based pipeline and
this one are given the same input and asked for the same three things:

    1. the exercises discussed
    2. the tier the coach assigns each one (S-F, or none)
    3. the equipment needed

`pipeline/05_compare.py` then measures where they agree and where they differ,
which is the evaluation: a deterministic lexicon-and-rules system versus a
generative model on an identical task.

Design notes:

  * One request per video, not per corpus. Each transcript is self-contained, a
    video is the unit a coach's tier verdicts are scoped to, and per-video calls
    keep any single failure cheap to retry.
  * Structured output via `messages.parse`, so the model returns validated JSON
    rather than prose we would have to parse — the thing stage 03 is built to
    avoid doing by hand.
  * The prompt deliberately does NOT describe the rule-based method. Telling the
    model how the gazetteer works would leak the answer and make agreement
    meaningless as a measurement.
  * Results are cached per video. Re-running costs nothing for work already done,
    and an interrupted run resumes.

    export ANTHROPIC_API_KEY=sk-ant-...
    python pipeline/04_llm_extract.py --limit 2    # smoke test, ~2 calls
    python pipeline/04_llm_extract.py              # whole corpus
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

# This file lives at <project>/web/pipeline/, so the project root — the
# directory holding data/ and web/ — is three levels up.
ROOT = Path(__file__).resolve().parents[2]
CLEAN = ROOT / "data" / "02_clean"
OUT = ROOT / "data" / "04_llm"

MODEL = "claude-opus-5"

# Body parts the app renders. Core has no region on the 3D model.
DISPLAY_PARTS = [
    "Chest", "Shoulders", "Triceps", "Back", "Biceps",
    "Forearms", "Quadriceps", "Hamstrings", "Glutes", "Calves",
]


# --------------------------------------------------------------- output schema


class ExtractedExercise(BaseModel):
    """One exercise the coach discusses in this video."""

    name: str = Field(description="The exercise name as a lifter would say it, e.g. 'Barbell Back Squat'.")
    tier: Literal["S", "A", "B", "C", "D", "F", "none"] = Field(
        description=(
            "The letter tier the coach explicitly assigns this exercise in this video. "
            "Use 'none' if the coach does not rank it, or only considers a tier without "
            "committing to it. Do not infer a tier from how positively they speak."
        )
    )
    tier_quote: str = Field(
        default="",
        description="The words the coach used to assign that tier. Empty when tier is 'none'.",
    )
    equipment: str = Field(
        description="What a lifter needs to perform this, e.g. 'Barbell + squat rack', 'Cable station', 'Bodyweight'."
    )
    recommended: bool = Field(
        description="True if the coach recommends doing this exercise, false if they advise against it."
    )


class VideoExtraction(BaseModel):
    exercises: list[ExtractedExercise] = Field(
        description="Every distinct exercise discussed. Omit exercises only mentioned in passing as comparisons."
    )


SYSTEM = """You extract structured facts from fitness coaching video transcripts.

The transcripts are auto-generated captions: no reliable punctuation in places, \
and specialist terms are sometimes misheard (for example "solus" for soleus, \
"easy bar" for EZ bar). Read through those errors.

Rules:
- Only report exercises the coach actually discusses as exercises. Ignore ones \
named purely as a passing comparison.
- A tier is only assigned when the coach commits to it out loud. These coaches \
often deliberate — "it's close to S tier, but I'm leaving it in A tier" means A, \
not S. "I'm not putting it in D or F tier" assigns neither D nor F.
- Equipment should name what a beginner would need to find in a gym, not a \
description of the movement.
- Report what the transcript says, not what you know about training."""


def build_prompt(doc: dict) -> str:
    meta = doc["meta"]
    chapters = meta.get("chapters") or []
    chapter_lines = "\n".join(f"  {c['start_time']}s  {c['title']}" for c in chapters)
    return (
        f"Video: {meta['title']}\n"
        f"Channel: {meta['channel']}\n"
        f"Muscle group this video was collected under: {doc['body_part']}\n\n"
        + (f"Chapter markers the creator wrote:\n{chapter_lines}\n\n" if chapters else "")
        + "Transcript:\n"
        + doc["text"]
    )


# ------------------------------------------------------------------ extraction


def extract_video(client, doc: dict) -> dict:
    """One API call for one video. Returns the parsed extraction plus usage."""
    started = time.time()
    response = client.messages.parse(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM,
        messages=[{"role": "user", "content": build_prompt(doc)}],
        output_format=VideoExtraction,
        # Adaptive thinking: reading a coach's hedging to decide whether a tier
        # was actually committed to is exactly the kind of judgement it helps with.
        thinking={"type": "adaptive"},
        # Opus 5 may decline via a safety classifier; route around it rather than
        # losing the video from the comparison.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )

    parsed = response.parsed_output
    return {
        "video_id": doc["video_id"],
        "body_part": doc["body_part"],
        "channel": doc["meta"]["channel"],
        "title": doc["meta"]["title"],
        "model": MODEL,
        "exercises": [e.model_dump() for e in parsed.exercises],
        "usage": {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "seconds": round(time.time() - started, 1),
        },
    }


def slugify(name: str) -> str:
    import re

    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def aggregate(per_video: list[dict]) -> dict:
    """
    Roll per-video extractions up to per-muscle, mirroring 03_exercises output.

    An exercise discussed in several videos is one entry; its tier is the most
    common non-'none' verdict, with ties broken by the first seen.
    """
    by_part: dict[str, dict[str, dict]] = defaultdict(dict)

    for video in per_video:
        part = video["body_part"]
        for ex in video["exercises"]:
            slug = slugify(ex["name"])
            if not slug:
                continue
            entry = by_part[part].setdefault(
                slug,
                {
                    "name": ex["name"],
                    "slug": slug,
                    "videos": set(),
                    "tiers": [],
                    "equipment": [],
                    "recommended": [],
                },
            )
            entry["videos"].add(video["video_id"])
            if ex["tier"] != "none":
                entry["tiers"].append(ex["tier"])
            entry["equipment"].append(ex["equipment"])
            entry["recommended"].append(ex["recommended"])

    out: dict[str, list[dict]] = {}
    for part, items in by_part.items():
        rows = []
        for slug, e in items.items():
            from collections import Counter

            tier = Counter(e["tiers"]).most_common(1)[0][0] if e["tiers"] else None
            kit = Counter(e["equipment"]).most_common(1)[0][0] if e["equipment"] else "Unknown"
            rows.append(
                {
                    "name": e["name"],
                    "slug": slug,
                    "videos": len(e["videos"]),
                    "tier": tier,
                    "equipment": kit,
                    "recommended": sum(e["recommended"]) >= len(e["recommended"]) / 2,
                }
            )
        rows.sort(key=lambda r: (-r["videos"], r["name"]))
        for rank, row in enumerate(rows, 1):
            row["rank"] = rank
            row["is_top"] = rank <= 3
        out[part] = rows
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="process only N videos")
    ap.add_argument("--part", help="only this body part")
    ap.add_argument("--force", action="store_true", help="re-extract videos already done")
    args = ap.parse_args()

    try:
        import anthropic
    except ImportError:
        print("pip install anthropic", file=sys.stderr)
        return 1

    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print(
            "No Anthropic credentials found.\n"
            "  export ANTHROPIC_API_KEY=sk-ant-...     (get one at console.anthropic.com)\n"
            "then re-run. Nothing was called.",
            file=sys.stderr,
        )
        return 1

    files = sorted(CLEAN.glob("*/*.json"))
    if args.part:
        files = [f for f in files if f.parent.name == args.part]
    files = [f for f in files if f.parent.name in DISPLAY_PARTS or args.part]
    if args.limit:
        files = files[: args.limit]

    client = anthropic.Anthropic()
    OUT.mkdir(parents=True, exist_ok=True)

    print(f"[llm] {len(files)} videos -> {OUT.relative_to(ROOT)}  (model: {MODEL})")
    started = time.time()
    tokens_in = tokens_out = 0
    done = 0

    for n, path in enumerate(files, 1):
        dest = OUT / path.parent.name / path.name
        if dest.exists() and not args.force:
            print(f"  [{n:>3}/{len(files)}] {path.stem:<12} cached")
            done += 1
            continue

        doc = json.loads(path.read_text())
        try:
            result = extract_video(client, doc)
        except Exception as error:  # keep going; one bad video shouldn't end the run
            print(f"  [{n:>3}/{len(files)}] {path.stem:<12} FAILED — {type(error).__name__}: {error}")
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(result, indent=1))
        tokens_in += result["usage"]["input_tokens"]
        tokens_out += result["usage"]["output_tokens"]
        done += 1
        print(
            f"  [{n:>3}/{len(files)}] {path.parent.name:<11} {path.stem:<12} "
            f"{len(result['exercises']):>2} exercises  "
            f"{result['usage']['input_tokens']:>6}in/{result['usage']['output_tokens']:>5}out  "
            f"{result['usage']['seconds']:>5.1f}s",
            flush=True,
        )

    # Aggregate everything on disk, not just this run's output.
    per_video = [json.loads(p.read_text()) for p in sorted(OUT.glob("*/*.json"))]
    by_part = aggregate(per_video)
    (OUT / "by_part.json").write_text(
        json.dumps(
            {
                "model": MODEL,
                "videos": len(per_video),
                "by_part": by_part,
            },
            indent=1,
        )
    )

    cost = tokens_in / 1e6 * 5 + tokens_out / 1e6 * 25  # Opus 5 list price
    print(
        f"\n[llm] {done}/{len(files)} videos in {(time.time()-started)/60:.1f}m — "
        f"{tokens_in:,} input / {tokens_out:,} output tokens"
        + (f" (~${cost:.2f} this run)" if tokens_in else "")
    )
    print(f"[llm] aggregated {sum(len(v) for v in by_part.values())} exercises across {len(by_part)} body parts")
    print(f"\n-> {(OUT / 'by_part.json').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Mark which videos have transcripts on disk.

Scans data/01_raw/ and stamps acquisition status back onto workout_videos.csv.
Re-runnable: reads truth from the filesystem every time, so running it again
after more transcripts land just refreshes the columns. Existing columns are
preserved; the acquisition columns are overwritten.
"""

import csv, json, datetime
from pathlib import Path

# Hardcoding an absolute path tied the script to one machine. This file
# lives at <project>/web/pipeline/, so the project root is three levels up.
ROOT = Path(__file__).resolve().parents[2]
CSV = ROOT / "workout_videos.csv"
RAW = ROOT / "data" / "01_raw"
COLS = ["transcript_status", "transcript_path", "transcript_words",
        "caption_kind", "needs_punctuation", "acquired_at"]

# Punctuation marks per 1000 words. The observed distribution is sharply
# bimodal (~0-1.3 vs ~89-145), so anything in the wide empty middle is a safe
# cut point for routing stage 02's punctuation restoration.
PUNCT_THRESHOLD = 50.0


def probe(video_id, body_part):
    """Return the acquisition facts for one video, read fresh off disk."""
    path = RAW / body_part / f"{video_id}.json"
    if not path.exists():
        return {"transcript_status": "missing", "transcript_path": "",
                "transcript_words": "", "caption_kind": "",
                "needs_punctuation": "", "acquired_at": ""}
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {"transcript_status": f"corrupt:{type(e).__name__}",
                "transcript_path": str(path.relative_to(ROOT)),
                "transcript_words": "", "caption_kind": "",
                "needs_punctuation": "", "acquired_at": ""}

    text, words = d.get("text", ""), d.get("n_words") or 0
    per_1k = 1000 * sum(text.count(c) for c in ".,?!") / max(1, words)
    return {
        "transcript_status": "ok",
        "transcript_path": str(path.relative_to(ROOT)),
        "transcript_words": words,
        "caption_kind": d.get("caption_kind", ""),
        "needs_punctuation": "yes" if per_1k < PUNCT_THRESHOLD else "no",
        "acquired_at": (d.get("acquired_at") or "")[:19],
    }


def main():
    rows = list(csv.DictReader(open(CSV)))
    fields = [f for f in rows[0].keys() if f not in COLS] + COLS

    for r in rows:
        r.update(probe(r["video_id"], r["body_part"]))

    tmp = CSV.with_suffix(".csv.tmp")          # write-then-rename, never a half-written CSV
    with open(tmp, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    tmp.replace(CSV)

    done = [r for r in rows if r["transcript_status"] == "ok"]
    print(f"{len(done)}/{len(rows)} transcripts on disk  ({len(rows)-len(done)} missing)")
    print(f"  words so far: {sum(int(r['transcript_words']) for r in done):,}")
    print(f"  need punctuation restoration: "
          f"{sum(1 for r in done if r['needs_punctuation']=='yes')}/{len(done)}")
    print("\n  by body part:")
    for part in dict.fromkeys(r["body_part"] for r in rows):
        sub = [r for r in rows if r["body_part"] == part]
        n = sum(1 for r in sub if r["transcript_status"] == "ok")
        bar = "#" * n + "." * (len(sub) - n)
        print(f"    {part:11} {n:2}/{len(sub):2}  {bar}")

    missing = [r for r in rows if r["transcript_status"] != "ok"]
    if missing:
        out = RAW / "_missing.txt"
        out.write_text("".join(f"{r['body_part']}\t{r['video_id']}\t{r['title']}\n"
                               for r in missing), encoding="utf-8")
        print(f"\n  {len(missing)} still missing -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

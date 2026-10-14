"""Stage 01 - acquire raw transcripts.

Reads workout_videos.csv, fetches the best available English caption track for
each video, and writes one JSON file per video into a folder named for its body
part. Raw means raw: no cleaning happens here, so stage 02 can be re-run without
re-downloading. Idempotent - existing outputs are skipped, so it is safe to
kill and restart.
"""

import csv, json, time, sys, random, datetime
from pathlib import Path

import requests
import yt_dlp

# Hardcoding an absolute path tied the script to one machine. This file
# lives at <project>/web/pipeline/, so the project root is three levels up.
ROOT = Path(__file__).resolve().parents[2]
CSV = ROOT / "workout_videos.csv"
OUT = ROOT / "data" / "01_raw"
SLEEP_S = 4.0          # base pacing between videos; jittered
RETRIES = 6
# Escalating cooldowns for HTTP 429, in seconds. Totals ~32 min of patience per
# video before giving up, which is cheaper than failing 80 videos and re-running.
COOLDOWNS = [60, 120, 300, 600, 900]
# Throttling is per-IP and depends on how busy that IP already is, not on a
# fixed per-run quota: a shared campus NAT blocked after ~18 fetches, while a
# quiet mobile IP did 59 in one run untouched. Waiting does not clear it - only
# a new IP does. So once a video has exhausted its cooldown ladder, stop the
# whole run rather than marching through the rest of the list turning every
# remaining video into a false failure.
GIVE_UP_AFTER_BLOCKED = 1

# The timedtext endpoint throttles aggressively on a default python-requests
# User-Agent. yt-dlp's own calls sail through because they look like a browser,
# so the plain requests session has to look like one too.
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")


class RateLimited(Exception):
    """HTTP 429 from the caption endpoint - needs a long cooldown, not a quick retry."""

YDL_OPTS = {
    "skip_download": True,
    "quiet": True,
    "no_warnings": True,
    "writesubtitles": False,
    "noplaylist": True,
    "retries": 3,
    "socket_timeout": 30,
}


def pick_track(info):
    """Prefer a human-written English track; fall back to ASR. Return (url, kind, lang)."""
    manual = info.get("subtitles") or {}
    auto = info.get("automatic_captions") or {}
    for langs, kind in ((manual, "manual"), (auto, "auto")):
        # en-orig is the original-language ASR; plain "en" may be round-tripped
        # through translation, so only take it as a fallback.
        for lang in ("en-orig", "en", "en-US", "en-GB"):
            for track in langs.get(lang, []):
                if track.get("ext") == "json3":
                    return track["url"], kind, lang
    return None, None, None


def parse_json3(payload):
    """Flatten json3 events into per-event word lists, keeping absolute ms timings.

    Caption line-wraps arrive as whitespace-only segs. They carry no timing and
    are not words, but they DO separate two words that otherwise have no space
    between them ("matter" + "\\n" + "how"), so they must become a space rather
    than being dropped.
    """
    events = []
    for ev in payload.get("events", []):
        segs = ev.get("segs")
        if not segs:
            continue
        base = ev.get("tStartMs", 0)
        words = []
        for s in segs:
            tok = s.get("utf8", "").strip()
            if not tok:
                continue
            words.append({"t_ms": base + s.get("tOffsetMs", 0), "w": tok})
        if words:
            events.append({"t_ms": base, "dur_ms": ev.get("dDurationMs", 0), "words": words})
    return events


def fetch_captions(session, url):
    """GET the caption track, distinguishing throttling from real failures.

    Silently .json()-ing the response was the original bug: a 429 returns an
    HTML "Sorry..." page, which surfaced as an opaque JSON decode error and got
    retried after 3s - making the throttling worse rather than backing off.
    """
    r = session.get(url, timeout=30)
    if r.status_code == 429:
        raise RateLimited(r.headers.get("Retry-After", "no Retry-After header"))
    r.raise_for_status()
    ctype = r.headers.get("content-type", "")
    if "json" not in ctype:
        raise RuntimeError(f"expected json, got {ctype!r}: {r.text[:120]!r}")
    return r.json()


def acquire(row, ydl, session):
    vid = row["video_id"]
    dest = OUT / row["body_part"] / f"{vid}.json"
    if dest.exists():
        return "skipped", None

    info = ydl.extract_info(f"https://www.youtube.com/watch?v={vid}", download=False)
    url, kind, lang = pick_track(info)
    if not url:
        raise RuntimeError("no english json3 caption track available")

    payload = fetch_captions(session, url)
    events = parse_json3(payload)
    if not events:
        raise RuntimeError("caption track was empty after parsing")

    text = " ".join(w["w"] for ev in events for w in ev["words"])

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps({
        "video_id": vid,
        "body_part": row["body_part"],
        "rank_in_body_part": int(row["rank"]),
        "acquired_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "yt_dlp_version": yt_dlp.version.__version__,
        "caption_kind": kind,
        "caption_lang": lang,
        "meta": {
            "title": info.get("title"),
            "channel": info.get("channel") or info.get("uploader"),
            "channel_id": info.get("channel_id"),
            "duration_s": info.get("duration"),
            "upload_date": info.get("upload_date"),
            "view_count": info.get("view_count"),
            "description": info.get("description"),
            "chapters": info.get("chapters"),
            "credibility_tier": row["credibility_tier"],
        },
        "n_events": len(events),
        "n_words": len(text.split()),
        "text": text,          # convenience: full flat transcript
        "events": events,      # canonical: word-level timings preserved
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    return "ok", kind


def main():
    rows = list(csv.DictReader(open(CSV)))
    OUT.mkdir(parents=True, exist_ok=True)
    failures, stats = [], {"ok": 0, "skipped": 0, "failed": 0, "manual": 0, "auto": 0}
    t0 = time.time()
    session = requests.Session()
    session.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    throttle = SLEEP_S          # grows if the endpoint pushes back
    blocked = 0                 # videos lost to an exhausted 429 ladder

    with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
        for i, row in enumerate(rows, 1):
            vid, part = row["video_id"], row["body_part"]
            for attempt in range(1, RETRIES + 1):
                try:
                    status, kind = acquire(row, ydl, session)
                    stats[status] += 1
                    if kind:
                        stats[kind] += 1
                    print(f"[{i:3}/{len(rows)}] {status:7} {part:11} {vid} {kind or ''}", flush=True)
                    break
                except RateLimited as e:
                    # Back off hard and slow the whole run down; a quick retry
                    # here is what turned two 429s into a cascade last time.
                    cool = COOLDOWNS[min(attempt - 1, len(COOLDOWNS) - 1)]
                    throttle = min(throttle * 1.5, 20.0)
                    print(f"[{i:3}/{len(rows)}] 429     {part:11} {vid} :: cooling {cool}s "
                          f"(retry-after={e}); pacing now {throttle:.1f}s", flush=True)
                    if attempt == RETRIES:
                        stats["failed"] += 1
                        blocked += 1
                        failures.append({"video_id": vid, "body_part": part,
                                         "title": row["title"], "error": f"RateLimited: {e}"})
                        print(f"[{i:3}/{len(rows)}] FAILED  {part:11} {vid} :: rate limited", flush=True)
                    else:
                        time.sleep(cool)
                except Exception as e:
                    if attempt == RETRIES:
                        stats["failed"] += 1
                        failures.append({"video_id": vid, "body_part": part,
                                         "title": row["title"], "error": repr(e)[:300]})
                        print(f"[{i:3}/{len(rows)}] FAILED  {part:11} {vid} :: {e}", flush=True)
                    else:
                        time.sleep(3 * attempt)
            if blocked >= GIVE_UP_AFTER_BLOCKED:
                print(f"\nSTOPPING: IP looks throttled ({blocked} video(s) lost to 429).\n"
                      f"  {stats['ok']} fetched this run, {len(rows)-i} not yet attempted.\n"
                      f"  Change IP (toggle airplane mode) and re-run - already-downloaded "
                      f"files are skipped.", flush=True)
                break
            time.sleep(throttle * random.uniform(0.8, 1.3))

    (OUT / "_failures.jsonl").write_text(
        "".join(json.dumps(f) + "\n" for f in failures), encoding="utf-8")
    (OUT / "_manifest.json").write_text(json.dumps({
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "yt_dlp_version": yt_dlp.version.__version__,
        "source_csv": str(CSV),
        "n_input": len(rows), "stats": stats,
        "elapsed_s": round(time.time() - t0, 1),
        "failures": failures,
    }, indent=1), encoding="utf-8")
    print(f"\ndone in {time.time()-t0:.0f}s :: {stats}")
    return 1 if stats["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())

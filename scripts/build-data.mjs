// Builds src/data/muscles.json from the NLP project's curated video data.
// Sources: ../workout_videos.csv (the curated list) and ../data/01_raw/<BodyPart>/<id>.json (chapters).
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..", "..");
const csvPath = join(projectRoot, "workout_videos.csv");
const rawRoot = join(projectRoot, "data", "01_raw");

/** Minimal RFC4180 parser: handles quoted fields, embedded commas and doubled quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const EXERCISE_TERM =
  /\b(press|bench|row|curl|squat|deadlift|dl|raise|extension|fly|flye|pulldown|pull[- ]?up|pull[- ]?over|chin[- ]?up|push[- ]?up|pushdown|dip|lunge|thrust|bridge|shrug|kickback|crunch|plank|hinge|hyperextension|good morning|pull[- ]?in|leg press|calf|carry|hang|face pull|pullthrough|split squat|step[- ]?up|hip thrust|rdl|jm|skull ?crusher)\b/i;

const NOT_AN_EXERCISE =
  /^(untitled|<|intro|outro|conclusion|sponsor|recap|summary|mistake|tip|the )|\b(mistakes?|wrong|too much|not enough|do(n't| not)|why|how to|vs\.?|versus|anatomy|science|myth|takeaway|benefits?|master\w+|common|rule \d|programming|volume|frequency|exercises?|injur\w+|training|tips?|best|worst|ranked|routine|workout|warm[- ]?up|stretch\w*)\b/i;

/** Some channels write chapters in caps; normalise so the names look uniform. */
const titleCase = (n) =>
  n !== n.toUpperCase() ? n : n.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

const slugify = (n) =>
  n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Chapter titles in these videos are exercise names — the most useful bit for a beginner. */
function loadChapters(bodyPart, videoId) {
  const path = join(rawRoot, bodyPart, `${videoId}.json`);
  if (!existsSync(path)) return [];
  try {
    const doc = JSON.parse(readFileSync(path, "utf8"));
    return (doc.meta?.chapters ?? [])
      .filter((c) => !/^(intro|outro|conclusion|sponsor|recap|summary)\b/i.test(c.title.trim()))
      .map((c) => ({ title: c.title.trim(), start: c.start_time, end: c.end_time }));
  } catch {
    return [];
  }
}

// The research data lives outside this app, so it is absent on a clean checkout
// (Vercel, a fresh clone). The generated JSON is committed, so just keep it.
if (!existsSync(csvPath)) {
  console.log(`[data] ${csvPath} not found — keeping the committed src/data/muscles.json`);
  process.exit(0);
}

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const byPart = {};
for (const r of rows) {
  const part = r.body_part?.trim();
  if (!part) continue;
  (byPart[part] ??= []).push({
    videoId: r.video_id,
    rank: Number(r.rank) || 999,
    title: r.title,
    channel: r.channel,
    tier: r.credibility_tier || "?",
    tierBasis: r.credibility_basis || "",
    duration: r.duration,
    minutes: Number(r.duration_min) || 0,
    views: Number(r.views) || 0,
    published: r.published,
    url: r.url,
    chapters: loadChapters(part, r.video_id),
  });
}

for (const part of Object.keys(byPart)) {
  byPart[part].sort((a, b) => a.rank - b.rank);
}

/**
 * Pull the exercise list for a muscle out of its videos' chapters, keeping the
 * timestamp so the app can deep-link to the exact moment it is demonstrated.
 * Editorial content (tier, cues, mistakes) is matched to these by slug in
 * src/lib/exercises.ts — this step only establishes what exists and where.
 */
function exercisesFor(videos, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const video of videos) {
    for (const chapter of video.chapters) {
      const name = chapter.title.replace(/^\d+[.)]\s*/, "").trim();
      const slug = slugify(name);
      if (!slug || seen.has(slug)) continue;
      if (name.length > 38 || name.includes("?") || name.includes(":")) continue;
      if (NOT_AN_EXERCISE.test(name) || !EXERCISE_TERM.test(name)) continue;
      seen.add(slug);
      out.push({
        name: titleCase(name),
        slug,
        videoId: video.videoId,
        channel: video.channel,
        videoTitle: video.title,
        start: chapter.start,
        seconds: Math.max(0, (chapter.end ?? chapter.start) - chapter.start),
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

const data = {};
for (const part of Object.keys(byPart)) {
  data[part] = { videos: byPart[part], exercises: exercisesFor(byPart[part]) };
}

const out = join(here, "..", "src", "data", "muscles.json");
writeFileSync(out, JSON.stringify(data, null, 2));

const parts = Object.keys(byPart).sort();
console.log(
  `[data] ${rows.length} videos across ${parts.length} body parts -> src/data/muscles.json`
);
for (const p of parts) {
  console.log(
    `       ${p.padEnd(12)} ${String(byPart[p].length).padStart(2)} videos, ${String(data[p].exercises.length).padStart(2)} exercises`
  );
}

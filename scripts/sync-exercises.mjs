/**
 * Bring the exercise lexicon built by pipeline/03_exercises.py into the app.
 *
 * Source: ../data/03_exercises/exercises.json  (produced from the NLP corpus)
 * Output: src/data/exercises.json              (committed, read at build time)
 *
 * The research corpus lives outside this repo and is absent on a clean checkout
 * (Vercel, a fresh clone), so the committed JSON is the copy the app actually
 * depends on — this script only refreshes it when the corpus is present.
 *
 * Shape is flattened for rendering: keyed by body part, already ordered, with
 * the fields the UI needs and nothing else. Provenance (mention counts, the
 * source video, the timestamp) is kept so any claim on screen can be traced
 * back to the video that produced it.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "data", "03_exercises", "exercises.json");
const out = join(here, "..", "src", "data", "exercises.json");

/** Body parts with a region on the 3D model. Core is in the data but unreachable. */
const DISPLAY_PARTS = [
  "Chest", "Shoulders", "Triceps", "Back", "Biceps",
  "Forearms", "Quadriceps", "Hamstrings", "Glutes", "Calves",
];

if (!existsSync(source)) {
  console.log(`[exercises] ${source} not found — keeping the committed src/data/exercises.json`);
  process.exit(0);
}

const raw = JSON.parse(readFileSync(source, "utf8"));
const byPart = {};

for (const part of DISPLAY_PARTS) {
  const items = raw.by_part?.[part] ?? [];
  byPart[part] = items.map((e) => ({
    name: e.name,
    slug: e.slug,
    rank: e.rank,
    isTop: e.isTop ?? e.is_top ?? false,

    // Two different signals, deliberately kept apart: `videos` is how many
    // distinct videos discuss it (what the ranking uses, because raw mention
    // counts are skewed by one video repeating a term), `mentions` is how many
    // times it is actually said aloud.
    videos: e.videos,
    mentions: e.mentions,

    equipment: e.equipment?.needs ?? "Unknown",
    // "name" | "movement" | "context" | "chapter note" — how the equipment was
    // determined, so the UI can hedge on low-confidence guesses if it wants to.
    equipmentSource: e.equipment?.source ?? "none",

    demo: e.demo
      ? {
          videoId: e.demo.video_id,
          channel: e.demo.channel,
          // Chapter starts arrive as floats from Python; YouTube's ?t= wants whole seconds.
          start: Math.floor(e.demo.start),
          url: `https://www.youtube.com/watch?v=${e.demo.video_id}&t=${Math.floor(e.demo.start)}s`,
        }
      : null,
    quote: e.quote
      ? { text: e.quote.text, channel: e.quote.channel, videoId: e.quote.video_id, at: e.quote.t_ms }
      : null,
  }));
}

writeFileSync(out, JSON.stringify(byPart, null, 1));

const counts = DISPLAY_PARTS.map((p) => [p, byPart[p].length]);
const thin = counts.filter(([, n]) => n < 3);
const total = counts.reduce((sum, [, n]) => sum + n, 0);

console.log(`[exercises] ${total} exercises across ${DISPLAY_PARTS.length} body parts -> src/data/exercises.json`);
for (const [part, n] of counts) {
  const top = byPart[part].slice(0, 3).map((e) => e.name).join(", ") || "—";
  console.log(`       ${part.padEnd(12)} ${String(n).padStart(2)}  ${top}`);
}
if (thin.length) {
  console.log(
    `[exercises] WARNING: ${thin.map(([p, n]) => `${p} has ${n}`).join(", ")} — fewer than 3, ` +
      `so the UI must handle a short list`
  );
}

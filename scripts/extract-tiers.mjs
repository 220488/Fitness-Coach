/**
 * Derive each exercise's tier from the source transcript. Run as part of the data
 * build; output is src/data/tiers.json, which the app reads directly.
 *
 * Why this is not a plain regex: these coaches deliberate out loud before ruling.
 *
 *   "the barbell curl belongs in C tier plus but I'll bump it up to B tier"
 *
 * Both C and B appear, but only B is the verdict. So every tier mention is
 * classified by the words immediately before it:
 *
 *   DECISION    "I'm putting it in", "bump it up to", "going straight to"  -> a ruling
 *   HEDGE       "close to", "belongs in", "tempted to", "on paper"         -> considered, rejected
 *   CONDITIONAL "if you", "on a lower body day", "for powerlifting"        -> a caveat, not the ruling
 *
 * The verdict is the LAST DECISION in the exercise's time window. Anything that
 * resolves no other way is emitted with needs_review so it shows up in the report
 * instead of silently guessing.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..", "..");
const rawRoot = join(projectRoot, "data", "01_raw");
const dataPath = join(here, "..", "src", "data", "muscles.json");
const outPath = join(here, "..", "src", "data", "tiers.json");

/**
 * A coach's ruling. "belongs in X tier" counts — it is how most verdicts are
 * phrased. When a ruling is later overturned ("belongs in C … bump it up to B")
 * both are decisions, and taking the last one resolves it correctly.
 */
const DECISION =
  /\b(?:put(?:ting|s)?|bump(?:ing|s)?|drop(?:ping|s)?|knock(?:ing|s)?|leav(?:e|ing)|mov(?:e|ing)|slot(?:ting)?|plac(?:e|ing)|go(?:ing|es)?|land(?:s|ing)?|stay(?:s|ing)?|keep(?:ing)?|belongs? in|feeling|call it|is|it'?s|straight)\b[^.]{0,45}$/i;

/** A tier the coach names only to approach or reject it. */
const HEDGE =
  /\b(?:close to|closer to|almost|nearly|tempted|should (?:also )?be|on paper|probably|possibly|might|may|arguably|wanted to|borderline|just about|if i|could|not quite)\b[^.]{0,45}$/i;

/**
 * A tier named while pointing at a different exercise — "before I get to our
 * first S tier exercise" ranks whatever comes next, not the one being discussed.
 */
const FORWARD_REFERENCE =
  /\b(?:before (?:i|we) (?:get|move)|next up|coming up|moving on to)\b[^.]{0,45}$/i;

/** A ruling that only applies under some other condition — not the headline verdict. */
const CONDITIONAL =
  /\b(?:if |when |on a .{0,20}day|for (?:strength|powerlifting|athletes?|sports?)|in the .{0,20}(?:space|context)|assuming|provided|as long as|unless|bump them up to|no problem)\b[^.]{0,60}$/i;

const TIER_RE = /\b([SABCDF])[\s-]?tier\b/gi;

/**
 * Auto-captions sometimes drop the word "tier" at a chapter boundary, leaving
 * "it's obviously going an S". Only used when the window has no normal match, and
 * "a" is excluded because it collides with the article.
 */
const BARE_TIER_RE = /\bgo(?:ing|es)\s+(?:in|into|an|on)\s+([SBCDF])\b/gi;

/** "I'm not putting it in D or F tier" rejects those tiers rather than assigning them. */
const NEGATION = /\b(?:not|never|isn'?t|wouldn'?t|won'?t|don'?t|doesn'?t)\b[^.]{0,35}$/i;

/** Words spoken between two timestamps. */
function sliceWords(doc, from, to) {
  const out = [];
  for (const event of doc.events ?? []) {
    for (const word of event.words ?? []) {
      const t = word.t_ms / 1000;
      if (t >= from && t < to) out.push(word.w);
    }
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function classify(text, at, since = 0) {
  const before = text.slice(Math.max(since, at - 70), at);
  if (NEGATION.test(before)) return "negated";
  if (FORWARD_REFERENCE.test(before)) return "forward-ref";
  if (CONDITIONAL.test(before)) return "conditional";
  if (HEDGE.test(before)) return "hedge";
  if (DECISION.test(before)) return "decision";
  return "neutral";
}

/**
 * Read the chapter's own window first. Only when it contains no tier at all do we
 * look a few seconds past the end — some rulings land just after the boundary
 * ("...obviously going an S | tier"). Using the grace window by default pulls in
 * the NEXT exercise's verdict, which silently mislabels both.
 */
function resolveTier(doc, chapter, graceSeconds) {
  let text = sliceWords(doc, chapter.start_time, chapter.end_time);
  TIER_RE.lastIndex = 0;
  if (!TIER_RE.test(text)) {
    text = sliceWords(doc, chapter.start_time, chapter.end_time + graceSeconds);
  }

  // Still nothing? Fall back to a ruling whose "tier" the captions swallowed.
  TIER_RE.lastIndex = 0;
  if (!TIER_RE.test(text)) {
    BARE_TIER_RE.lastIndex = 0;
    const bare = [...text.matchAll(BARE_TIER_RE)];
    if (bare.length === 1) {
      return {
        tier: bare[0][1].toUpperCase(),
        claims: [],
        reason: 'ruling with "tier" missing from captions',
        evidence: text.slice(Math.max(0, bare[0].index - 95), bare[0].index + 30).trim(),
      };
    }
  }
  const claims = [];
  let m;
  let previousEnd = 0;
  TIER_RE.lastIndex = 0;
  while ((m = TIER_RE.exec(text))) {
    claims.push({
      tier: m[1].toUpperCase(),
      kind: classify(text, m.index, previousEnd),
      evidence: text.slice(Math.max(0, m.index - 95), m.index + 24).trim(),
    });
    previousEnd = m.index + m[0].length;
  }
  if (!claims.length) return { tier: null, claims, reason: "no tier mentioned" };

  const decisions = claims.filter((c) => c.kind === "decision");
  if (decisions.length) {
    const last = decisions[decisions.length - 1];
    return {
      tier: last.tier,
      claims,
      reason: decisions.length > 1 ? "last of several rulings" : "single ruling",
      evidence: last.evidence,
    };
  }
  const neutral = claims.filter((c) => c.kind === "neutral");
  if (neutral.length === 1) {
    return { tier: neutral[0].tier, claims, reason: "one unqualified mention", evidence: neutral[0].evidence };
  }
  return { tier: null, claims, reason: "only hedged or conditional mentions", needsReview: true };
}

// Absent on a clean checkout (Vercel); the derived tiers.json is committed.
if (!existsSync(rawRoot)) {
  console.log("[tiers] transcript corpus not found — keeping committed src/data/tiers.json");
  process.exit(0);
}

const muscles = JSON.parse(readFileSync(dataPath, "utf8"));
const result = {};
const review = [];
let resolved = 0;
let untiered = 0;

for (const [muscle, { exercises }] of Object.entries(muscles)) {
  for (const exercise of exercises) {
    const path = join(rawRoot, muscle, `${exercise.videoId}.json`);
    if (!existsSync(path)) continue;
    const doc = JSON.parse(readFileSync(path, "utf8"));
    const chapter = (doc.meta?.chapters ?? []).find(
      (c) => c.start_time === exercise.start
    );
    if (!chapter) continue;

    // Grace window: up to 20s, but never into the next chapter's second half.
    const next = (doc.meta?.chapters ?? []).find((c) => c.start_time === chapter.end_time);
    const grace = next ? Math.min(20, Math.round((next.end_time - next.start_time) / 2)) : 20;

    const { tier, claims, reason, evidence, needsReview } = resolveTier(doc, chapter, grace);
    const key = `${muscle}/${exercise.slug}`;

    if (tier) {
      resolved++;
      result[key] = { tier, reason, evidence, source: exercise.videoId, at: chapter.start_time };
    } else if (needsReview) {
      review.push({ key, reason, claims });
    } else {
      untiered++;
    }
  }
}

writeFileSync(outPath, JSON.stringify(result, null, 2));

console.log(`[tiers] ${resolved} resolved, ${untiered} unranked (source isn't a ranking video), ${review.length} need review`);
for (const r of review) {
  console.log(`\n  NEEDS REVIEW  ${r.key} — ${r.reason}`);
  for (const c of r.claims) console.log(`      [${c.tier}] ${c.kind.padEnd(11)} ...${c.evidence}`);
}
console.log(`\n-> ${outPath}`);

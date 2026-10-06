/**
 * Fetch one photograph per equipment type from Wikimedia Commons.
 *
 * Run by hand, not as part of the build — it hits the network, and the results
 * are committed so the app never depends on Commons being reachable:
 *
 *     node scripts/fetch-equipment-photos.mjs
 *
 * Writes public/equipment/<icon>.jpg plus src/data/equipment-photos.json, which
 * carries the title, author, licence and source page for every image.
 *
 * Licensing is the whole reason this is careful rather than a one-line download:
 * almost everything on Commons is reusable, but nearly all of it requires
 * visible credit, and some licences add share-alike obligations. So each
 * candidate is scored by licence first and the attribution is stored alongside
 * the file, for the UI to display. Nothing is used unless its licence is one we
 * recognise.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const PHOTO_DIR = join(here, "..", "public", "equipment");
const META_OUT = join(here, "..", "src", "data", "equipment-photos.json");

const API = "https://commons.wikimedia.org/w/api.php";
const WIDTH = 720;

/** Lower rank is preferred: fewest obligations first. */
const LICENCE_RANK = [
  [/public domain|^pd|cc0/i, 0, "no attribution required"],
  [/cc by 4\.0|cc by 3\.0|cc by 2\.0|^cc by$/i, 1, "credit required"],
  [/cc by-sa/i, 2, "credit + share-alike"],
];

function scoreLicence(name = "") {
  for (const [pattern, rank, note] of LICENCE_RANK) {
    if (pattern.test(name)) return { rank, note };
  }
  return null; // unrecognised — do not use
}

/**
 * Search terms per icon. Several phrasings per type because Commons titles are
 * inconsistent, and the first query that yields a usable image wins.
 */
/**
 * A title must match this before the image is considered at all.
 *
 * Sorting purely by licence picked a CC0 photograph of an Egyptian sphinx for
 * "leg curl" and a medieval manuscript for "leg extension" — both scored better
 * than the correct CC BY-SA machine photos because the licence was freer.
 * Relevance is therefore a gate, and licence only breaks ties among images that
 * actually show the equipment.
 */
const MUST_MATCH = {
  dumbbell: /dumbbell|kurzhantel|hantel/i,
  barbell: /barbell|langhantel|olympic.?bar\b/i,
  ezbar: /ez.?bar|curl.?bar/i,
  kettlebell: /kettlebell/i,
  cable: /cable|pulley|crossover/i,
  pulldown: /pulldown|pull.?down|lat.?machine/i,
  smith: /smith.?machine/i,
  machine: /machine|weight.?stack/i,
  rack: /(squat|power|half|combo)\s*(rack|cage)|rack\b(?!ed)/i,  // not "Racked Overhead ..."
  bench: /bench/i,
  incline: /incline|bench/i,
  preacher: /preacher|scott.?bench/i,
  pullupBar: /pull.?up bar|chin.?up bar|pull.?up station/i,
  legPress: /leg.?press/i,
  legCurl: /leg.?curl|hamstring.?curl/i,
  legExtension: /leg.?extension|knee.?extension/i,
  hackSquat: /hack.?squat/i,
  pendulum: /pendulum|hack.?squat/i,
  bosu: /bosu|balance.?(ball|trainer)|half.?ball/i,  // drawings filtered below
  band: /resistance.?band|elastic.?band|theraband|rubber.?band/i,
  step: /step.?(platform|bench|aerobic)|aerobic.?step/i,
};

const QUERIES = {
  dumbbell: ["dumbbell weight", "dumbbells gym"],
  barbell: ["barbell weight plates gym", "olympic weightlifting barbell", "barbell plates loaded"],
  ezbar: ["ez curl bar barbell", "curl bar weight"],
  kettlebell: ["kettlebell"],
  cable: ["cable machine gym", "cable crossover machine"],
  pulldown: ["lat pulldown machine", "pulldown machine gym"],
  smith: ["smith machine barbell", "smith machine squat", "Smith machine"],
  machine: ["weight stack machine", "selectorized weight machine", "gym machine weights"],
  rack: ["squat rack", "power rack gym"],
  bench: ["weight bench press", "flat bench gym"],
  incline: ["incline bench press", "adjustable weight bench"],
  preacher: ["preacher curl bench", "preacher bench gym"],
  pullupBar: ["pull-up bar", "chin-up bar gym"],
  legPress: ["leg press machine"],
  legCurl: ["leg curl machine"],
  legExtension: ["leg extension machine"],
  hackSquat: ["hack squat machine"],
  // Pendulum squats are rare on Commons; a plate-loaded squat machine is the
  // closest honest match, so the gate accepts that family.
  pendulum: ["pendulum squat machine", "hack squat machine"],
  bosu: ["bosu ball", "balance trainer dome"],
  band: ["resistance band fitness", "theraband elastic", "exercise rubber band"],
  step: ["aerobic step platform", "step platform exercise"],
};

const stripHtml = (s = "") =>
  s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Commons throttles rapid anonymous queries, returning an empty result set
 * rather than an error — which silently looked like "no such image" for eleven
 * equipment types that do in fact have photographs. Pace the requests and retry
 * once before believing a miss.
 */
async function search(term, attempt = 0) {
  const url =
    `${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(`filetype:bitmap ${term}`)}` +
    `&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=${WIDTH}&format=json&origin=*`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "FitnessCoach/1.0 (student project)" } });
    // Commons returns 429 under sustained querying; wait noticeably longer for
    // that than for a transient socket error.
    if (res.status === 429) {
      if (attempt < 4) {
        await sleep(5000 * (attempt + 1));
        return search(term, attempt + 1);
      }
      throw new Error("HTTP 429 (rate limited)");
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const pages = Object.values(data?.query?.pages ?? {});
    if (!pages.length && attempt < 2) {
      await sleep(1200 * (attempt + 1));
      return search(term, attempt + 1);
    }
    return pages;
  } catch (error) {
    // A dropped socket mid-run previously aborted the whole script, losing
    // every image fetched after it. Back off and retry instead.
    if (attempt < 3) {
      await sleep(1500 * (attempt + 1));
      return search(term, attempt + 1);
    }
    console.log(`     (search "${term}" failed: ${error.message})`);
    return [];
  }
}

/** Gate on relevance, then prefer the most permissive licence among survivors. */
function pick(pages, icon, alreadyUsed = new Set()) {
  const usable = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) continue;
    const meta = info.extmetadata ?? {};
    const licence = scoreLicence(meta.LicenseShortName?.value);
    if (!licence) continue;
    // Skip diagrams and animations; we want a photograph. Commons line
    // drawings are almost always PNG, so the extension is a usable proxy —
    // "ez bar" and "incline bench" both resolved to anatomical sketches.
    // PNG/SVG/GIF on Commons are overwhelmingly diagrams; WebP is a photo
    // format and excluding it wrongly discarded real photographs.
    if (/\.(svg|gif|png)$/i.test(page.title)) continue;
    // Rooms and storage shots match the keyword without showing the kit.
    if (/closet|room|storage|shelf|warehouse|store|shop|museum|manuscript/i.test(page.title)) continue;
    // Titles describing something being done TO the equipment, or a rendering
    // of it, rather than the equipment in use: "welds a pull-up bar in place",
    // "BOSU - Zeichnung" (German for drawing).
    if (/\b(weld|install|assembl|construct|repair|build(ing)?|demolit)/i.test(page.title)) continue;
    if (/zeichnung|drawing|sketch|illustration|diagram|render|icon|logo|clipart|abandoned|derelict|ruin/i.test(page.title)) continue;
    // Archival portraits of historic athletes match "barbell" but show a person,
    // not the equipment ("Perikles Kakousis from the Pan-Hellenic Gymnastic...").
    if (/\b(1[89]\d{2})\b|pan-hellenic|gymnastic (club|society)|portrait|olympiad|champion of/i.test(page.title)) continue;
    // geograph.org.uk indexes the British countryside, so "Squat rack" there is
    // a farm structure in a wood, not gym equipment.
    if (/geograph\.org\.uk|footpath|woodland|field|farm|village/i.test(page.title)) continue;
    // The title must actually name this equipment.
    const required = MUST_MATCH[icon];
    if (required && !required.test(page.title)) continue;
    // One photo per equipment type, except where Commons has no alternative:
    // pendulum squat machines are not photographed there.
    if (icon !== "pendulum" && alreadyUsed.has(page.title)) continue;
    // Landscape frames the equipment far better in a wide panel. Portrait
    // sources (as narrow as 0.50) letterbox badly and show the machine small.
    const ratio = info.width && info.height ? info.width / info.height : 1;
    usable.push({
      ratio,
      title: page.title.replace(/^File:/, ""),
      thumb: info.thumburl,
      page: info.descriptionurl,
      author: stripHtml(meta.Artist?.value) || "Unknown",
      licence: meta.LicenseShortName?.value ?? "unknown",
      licenceUrl: meta.LicenseUrl?.value ?? null,
      rank: licence.rank,
      note: licence.note,
    });
  }
  // Framing first, licence second. Every candidate here is already legally
  // usable, so the thing that actually varies in quality is the crop.
  const frameScore = (r) => (r >= 1.2 && r <= 2.4 ? 0 : r >= 1.0 ? 1 : 2);
  usable.sort(
    (a, b) => frameScore(a.ratio) - frameScore(b.ratio) || a.rank - b.rank
  );
  return usable[0] ?? null;
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": "FitnessCoach/1.0 (student project)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buffer);
  // Persist after every success so a later failure cannot undo earlier work.
  return buffer.length;
}

mkdirSync(PHOTO_DIR, { recursive: true });

// Resume: keep anything already fetched so a network failure costs only the
// remaining items, not the whole run.
const manifest = existsSync(META_OUT) ? JSON.parse(readFileSync(META_OUT, "utf8")) : {};
const usedTitles = new Set(Object.values(manifest).map((m) => `File:${m.title}`));
let found = 0;
let missing = [];

for (const [icon, terms] of Object.entries(QUERIES)) {
  if (manifest[icon] && existsSync(join(PHOTO_DIR, `${icon}.jpg`))) {
    console.log(`  ${icon.padEnd(14)} kept (already fetched)`);
    found++;
    continue;
  }
  let chosen = null;
  for (const term of terms) {
    await sleep(500);
    const pages = await search(term);
    chosen = pick(pages, icon, usedTitles);
    if (chosen) break;
  }
  if (!chosen) {
    missing.push(icon);
    console.log(`  ${icon.padEnd(14)} NOT FOUND`);
    continue;
  }

  const file = `${icon}.jpg`;
  try {
    const bytes = await download(chosen.thumb, join(PHOTO_DIR, file));
    manifest[icon] = {
      src: `/equipment/${file}`,
      title: chosen.title,
      author: chosen.author,
      licence: chosen.licence,
      licenceUrl: chosen.licenceUrl,
      source: chosen.page,
      // Whether the UI must show a credit line beside the image.
      needsCredit: chosen.rank > 0,
    };
    found++;
    usedTitles.add(`File:${chosen.title}`);
    writeFileSync(META_OUT, JSON.stringify(manifest, null, 1));
    console.log(
      `  ${icon.padEnd(14)} ${(bytes / 1024).toFixed(0).padStart(4)}KB  ${chosen.licence.padEnd(14)} ${chosen.title.slice(0, 44)}`
    );
  } catch (error) {
    missing.push(icon);
    console.log(`  ${icon.padEnd(14)} DOWNLOAD FAILED — ${error.message}`);
  }
}

writeFileSync(META_OUT, JSON.stringify(manifest, null, 1));
console.log(`\n[photos] ${found} downloaded, ${missing.length} missing${missing.length ? `: ${missing.join(", ")}` : ""}`);
console.log(`-> public/equipment/  and  src/data/equipment-photos.json`);

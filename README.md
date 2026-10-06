# Fitness Coach

A beginner's training guide. The landing page is an interactive 3D body: drag to
turn it horizontally, click any muscle on the front or the back, and the panel
offers the three exercises most discussed by sports-science coaches — what
equipment each needs, how to perform it, and the one cue that matters.

## Muscles

Chest, Shoulders, Triceps, Back, Biceps, Forearms, Quadriceps, Hamstrings,
Glutes, Calves.

## Run it

```bash
npm install     # .npmrc sets legacy-peer-deps; R3F declares optional Expo peers we don't need
npm run dev     # http://localhost:3000
```

## Deploying

Vercel builds this as-is — it is a stock Next.js app at the repo root, no settings
needed. `.npmrc` is what keeps `npm install` from failing on the peer conflict.

## How it works

- `src/components/HumanBody.tsx` — the figure: a lathed trunk silhouette plus
  tapered limb segments, drawn twice (a shaded shell and a slightly larger
  wireframe) for the holographic look. Each muscle is a curved shell *patch* — an
  open, partial cylinder wrapping only its share of the circumference, sitting a
  few millimetres proud of the segment beneath — so muscles read as regions of
  the body rather than lumps stuck onto it. Clicking is ordinary raycasting; no
  UV maps or invisible hit-boxes. Body segments carry no-op handlers purely so
  they *block* the raycast — without them a click would pass through the torso
  and select the muscle on the far side.
- `src/components/BodyViewer.tsx` — the canvas, lighting, and horizontal-only
  drag rotation. Drags shorter than 5px count as a click. Selecting a back
  muscle turns the model around on its own.
- `src/lib/muscles.ts` — per-muscle copy and shared types.
- `src/lib/exercises.ts` — the written coaching for each exercise (setup, cue,
  mistake). Deliberately holds no tiers.
- `src/lib/exerciseData.ts` — typed access to the extracted exercise lexicon.
- `src/components/EquipmentIcon.tsx` — hand-drawn line icons for 22 kinds of
  gym equipment, resolved from the equipment string.
- `src/components/EquipmentPhoto.tsx` — the photograph shown in the detail view,
  with the attribution its licence requires.

## Where the exercises come from

`pipeline/03_exercises.py` (in the parent research project, not this repo) builds
a lexicon from the corpus and `scripts/sync-exercises.mjs` brings it in as
`src/data/exercises.json`. The method is gazetteer phrase matching:

1. Creators type exercise names into YouTube chapter markers, which gives a
   high-precision seed for free — 155 names with no annotation effort.
2. Compound spellings are normalised first. "pull down" / "pull-down" /
   "pulldown" are three strings to a matcher, so counting "lat pulldown" naively
   finds 0 of the 132 mentions actually present.
3. Matching is longest-first, so "barbell back squat" never also scores as
   "squat".
4. Ranking uses **document frequency** — how many distinct videos discuss an
   exercise — because raw mention counts are skewed by one video repeating a
   term.

Equipment resolves from the exercise name, then the movement type, then the
surrounding transcript, and the method used is recorded per exercise so the UI
can hedge on the inferred ones.

## Equipment photos

`scripts/fetch-equipment-photos.mjs` pulls one photograph per equipment type
from Wikimedia Commons into `public/equipment/`, committed so nothing is
hotlinked. Run it by hand; it is not part of the build.

Licence handling is the fiddly part. Candidates are gated on relevance first and
licence second — sorting by licence alone picked a CC0 photograph of an Egyptian
sphinx for "leg curl" — and the manifest records author, licence and source for
each image, with `needsCredit` driving the credit line in the UI.

## Where the tiers come from

The S–F badge on each exercise is the verdict the coach gives out loud in the
source video. `scripts/extract-tiers.mjs` derives it rather than trusting anyone's
memory:

1. A chapter gives the exercise name and its time window.
2. Captions are timestamped per word, so the window is sliced to just that
   exercise's speech.
3. Every `"<letter> tier"` mention in the window is classified by the words
   immediately before it — a **ruling** ("I'm putting it in"), a **hedge**
   ("close to", "tempted to"), a **negation** ("I'm *not* putting it in D or F"),
   a **conditional** ("on a lower body day"), or a **forward reference**
   ("before I get to…"). Only rulings count, and the last one wins, because these
   coaches reason aloud before deciding.
4. Anything that resolves no other way is printed as NEEDS REVIEW rather than
   guessed.

Output is `src/data/tiers.json`, with the evidence string and timestamp behind
every verdict, so any badge can be traced back to the sentence that produced it.
Re-run it with `npm run data`.

## Content

The coaching copy in `src/lib/muscles.ts` — the form cues, warm-ups, range of
motion, breathing and stretches — is written by hand, one entry per muscle.

The exercise chips and video links come from an NLP research corpus of 110
curated lifting videos (titles, channels, credibility tiers and chapter lists).
That corpus lives outside this repo, so `src/data/muscles.json` is **committed**
and is the only copy a clone or a Vercel build needs.

To regenerate it, put this app back beside the corpus and run `npm run data`,
which reads:

- `../workout_videos.csv` — the curated video list
- `../data/01_raw/<BodyPart>/<id>.json` — chapter lists, used as exercise names

`dev` and `build` run that script automatically; when the corpus is absent it
logs and leaves the committed JSON alone, so a clean checkout still builds.
`Core` exists in the data but has no body part on the model, so it is carried in
the JSON and simply never shown.

# Fitness Coach

A beginner's training guide. The landing page is an interactive 3D body: drag to
turn it horizontally, click any muscle on the front or the back, and the panel
explains what that muscle does and what to train it with.

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
- `src/lib/muscles.ts` — per-muscle copy, plus the filter that turns video
  chapter titles into exercise names.

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

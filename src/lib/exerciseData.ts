/**
 * Exercise lexicon extracted from the NLP corpus by pipeline/03_exercises.py
 * and brought in by scripts/sync-exercises.mjs.
 *
 * Nothing here is hand-written. Names come from the chapter markers creators
 * typed themselves; counts come from phrase matching over 16,338 cleaned
 * sentences; equipment is resolved from the name, the movement type, or the
 * surrounding transcript, with the method recorded per entry.
 */
import data from "@/data/exercises.json";
import type { MuscleId } from "@/lib/muscles";

/** How the equipment for an exercise was determined, least inferred first. */
export type EquipmentSource = "name" | "chapter note" | "movement" | "context" | "none";

export interface ExerciseDemo {
  videoId: string;
  channel: string;
  /** Seconds into the video where this exercise is demonstrated. */
  start: number;
  url: string;
}

export interface ExerciseQuote {
  text: string;
  channel: string;
  videoId: string;
  /** Milliseconds into the video. */
  at: number;
}

export interface Exercise {
  name: string;
  slug: string;
  /** 1-based, already sorted. */
  rank: number;
  isTop: boolean;
  /** Distinct videos discussing it — what the ranking is based on. */
  videos: number;
  /** Times it is said aloud across the corpus. */
  mentions: number;
  equipment: string;
  equipmentSource: EquipmentSource;
  demo: ExerciseDemo | null;
  quote: ExerciseQuote | null;
}

const EXERCISES = data as unknown as Record<string, Exercise[]>;

/** Every exercise for a muscle, best first. */
export function exercisesFor(muscle: MuscleId): Exercise[] {
  return EXERCISES[muscle] ?? [];
}

/**
 * The opening choice for a muscle. Returns fewer than `n` when the corpus
 * simply does not cover that muscle well — Calves currently yields one — so
 * callers must render a short list rather than assume three.
 */
export function topExercises(muscle: MuscleId, n = 3): Exercise[] {
  return exercisesFor(muscle).slice(0, n);
}

export function findExercise(muscle: MuscleId, slug: string): Exercise | undefined {
  return exercisesFor(muscle).find((e) => e.slug === slug);
}

/** Equipment resolved from the exercise's own name is certain; a movement-type default is a guess. */
export function isEquipmentCertain(exercise: Exercise): boolean {
  return exercise.equipmentSource === "name" || exercise.equipmentSource === "chapter note";
}

/**
 * The Python pipeline normalises slugs more aggressively than the earlier
 * JS version did ("db" -> "dumbbell", "pull-up" -> "pullup"), so hand-written
 * coaching keyed to the old spellings would otherwise be orphaned. Maps the
 * legacy slug to the current one.
 */
const LEGACY_SLUGS: Record<string, string> = {
  "Back/wide-grip-pull-up": "wide-grip-pullup",
  "Back/neutral-grip-pull-up": "neutral-grip-pullup",
  "Back/chin-up": "chinup",
  "Back/half-kneeling-1-arm-lat-pulldown": "half-kneeling-single-arm-lat-pulldown",
  "Biceps/standing-db-curl": "standing-dumbbell-curl",
  "Biceps/db-preacher-curl": "dumbbell-preacher-curl",
  "Biceps/lying-db-curl": "lying-dumbbell-curl",
  "Triceps/1-arm-dumbbell-overhead-extension": "single-arm-dumbbell-overhead-extension",
};

/** Current slug for a legacy one, so older keyed content still resolves. */
export function resolveSlug(muscle: MuscleId, slug: string): string {
  return LEGACY_SLUGS[`${muscle}/${slug}`] ?? slug;
}

/** Legacy slug for a current one — for looking up content keyed the old way. */
export function legacySlug(muscle: MuscleId, slug: string): string | undefined {
  const hit = Object.entries(LEGACY_SLUGS).find(
    ([key, value]) => value === slug && key.startsWith(`${muscle}/`)
  );
  return hit?.[0].split("/")[1];
}

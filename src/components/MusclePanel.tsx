"use client";

import { useEffect, useRef } from "react";

import {
  MUSCLES,
  MUSCLE_IDS,
  formatClock,
  formatViews,
  watchAt,
  type ExerciseEntry,
  type MuscleData,
  type MuscleId,
} from "@/lib/muscles";
import { TIER_NOTE, coachingFor, type Tier } from "@/lib/exercises";
import { EquipmentIcon } from "@/components/EquipmentIcon";
import { EquipmentPhoto } from "@/components/EquipmentPhoto";
import {
  findExercise,
  isEquipmentCertain,
  legacySlug,
  topExercises,
  type Exercise,
} from "@/lib/exerciseData";
import tierData from "@/data/tiers.json";

/** Tiers derived from the source transcripts — see scripts/extract-tiers.mjs. */
const TIERS = tierData as Record<string, { tier: Tier; reason: string; evidence: string }>;

const tierFor = (muscle: string, slug: string) => TIERS[`${muscle}/${slug}`];

/** Tiers a coach gave as a warning rather than a recommendation. */
const POOR_TIERS: Tier[] = ["D", "F"];

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`tierBadge tb${tier}`} title={TIER_NOTE[tier]}>
      {tier}
    </span>
  );
}

/** The detail view for one exercise, opened from the pick list. */
function ExerciseDetail({
  muscle,
  exercise,
  onBack,
  panelRef,
}: {
  muscle: MuscleId;
  exercise: Exercise;
  onBack: () => void;
  panelRef: React.RefObject<HTMLElement | null>;
}) {
  // Written coaching predates the extraction pipeline and is keyed by the older
  // slug spelling for a handful of exercises.
  const coaching =
    coachingFor(muscle, exercise.slug) ??
    coachingFor(muscle, legacySlug(muscle, exercise.slug) ?? exercise.slug);
  const ranked = tierFor(muscle, exercise.slug);
  const poor = ranked ? POOR_TIERS.includes(ranked.tier) : false;

  return (
    <aside className="panel" ref={panelRef}>
      <button type="button" className="crumb" onClick={onBack}>
        ← {muscle}
      </button>

      <div className="exHead">
        <h1>{exercise.name}</h1>
        {ranked && <TierBadge tier={ranked.tier} />}
      </div>

      <dl className="facts">
        <div className="kitRow">
          <div>
            <dt>What you need</dt>
            <dd>
              {exercise.equipment}
              {!isEquipmentCertain(exercise) && <span className="hedge"> (typical setup)</span>}
            </dd>
          </div>
          <EquipmentIcon equipment={exercise.equipment} size={38} />
        </div>
        <EquipmentPhoto equipment={exercise.equipment} />
      </dl>

      {coaching ? (
        <>
          <p className={poor ? "verdict poorVerdict" : "verdict"}>{coaching.verdict}</p>

          <section className="coach">
            <h2>{poor ? "Why to skip it" : "How to do it"}</h2>
            <ol className="steps">
              {coaching.setup.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="coach">
            <h2>{poor ? "Do this instead" : "The one cue"}</h2>
            <p className="body">{coaching.cue}</p>
          </section>

          <section className="coach">
            <h2>Common mistake</h2>
            <p className="warn plainWarn">{coaching.mistake}</p>
          </section>

        </>
      ) : null}

      {exercise.demo && (
        <a className="watch" href={exercise.demo.url} target="_blank" rel="noopener noreferrer">
          <span className="watchPlay">▶</span>
          <span className="watchText">
            <strong>Watch {exercise.demo.channel} demo it</strong>
            <span>Jumps to {formatClock(exercise.demo.start)}</span>
          </span>
        </a>
      )}
    </aside>
  );
}

export function MusclePanel({
  selected,
  onSelect,
  data,
  openExercise,
  onOpenExercise,
}: {
  selected: MuscleId | null;
  onSelect: (id: MuscleId | null) => void;
  data: Record<string, MuscleData>;
  openExercise: string | null;
  onOpenExercise: (slug: string | null) => void;
}) {
  // The panel is its own scroll container, so switching muscles or opening an
  // exercise would otherwise leave the reader part-way down the previous view.
  const panelRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [selected, openExercise]);


  if (!selected) {
    return (
      <aside className="panel" ref={panelRef}>
        <p className="eyebrow">Start here</p>
        <h1>Which muscle do you want to train?</h1>
        <p className="lede">
          Click a muscle on the body and you get the four things that decide whether a session
          works: how to actually feel it, how to warm it up, how far to move and breathe, and
          how to stretch it afterwards.
        </p>
        <ul className="muscleList">
          {MUSCLE_IDS.map((id) => (
            <li key={id}>
              <button type="button" onClick={() => onSelect(id)}>
                <span>{id}</span>
                <span className="alias">{MUSCLES[id].alias}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  const info = MUSCLES[selected];
  const muscle = data[selected] ?? { videos: [], exercises: [] };

  const picks = topExercises(selected, 3);

  const open = openExercise ? findExercise(selected, openExercise) : undefined;
  if (open) {
    return (
      <ExerciseDetail
        muscle={selected}
        exercise={open}
        onBack={() => onOpenExercise(null)}
        panelRef={panelRef}
      />
    );
  }

  return (
    <aside className="panel" ref={panelRef}>
      <p className="eyebrow">{info.side === "front" ? "Front of the body" : "Back of the body"}</p>
      <h1>{info.id}</h1>
      <p className="alias big">also called: {info.alias}</p>

      {picks.length > 0 && (
        <section className="coach">
          <h2>
            <span className="step">1</span> Pick an exercise
          </h2>
          <ul className="picks">
            {picks.map((exercise) => (
              <li key={exercise.slug}>
                <button type="button" className="pick" onClick={() => onOpenExercise(exercise.slug)}>
                  <span className="pickRank">{exercise.rank}</span>
                  <span className="pickBody">
                    <span className="pickTop">
                      <span className="pickName">{exercise.name}</span>
                      {tierFor(selected, exercise.slug) && (
                        <TierBadge tier={tierFor(selected, exercise.slug)!.tier} />
                      )}
                    </span>
                    <span className="pickKit">
                      <EquipmentIcon equipment={exercise.equipment} size={17} />
                      {exercise.equipment}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

        </section>
      )}

      <section className="coach">
        <h2>
          <span className="step">2</span> Stretch it afterwards
        </h2>
        <p className="label">{info.stretch.name}</p>
        <p className="body">{info.stretch.how}</p>
        <p className="hold">Hold {info.stretch.hold}</p>
      </section>

      {muscle.videos.length > 0 && (
        <section>
          <h3>Where this came from</h3>
          <ul className="videos">
            {muscle.videos.slice(0, 3).map((video) => (
              <li key={video.videoId}>
                <a href={video.url} target="_blank" rel="noopener noreferrer">
                  <span className={`tier tier${video.tier}`} title={video.tierBasis}>
                    {video.tier}
                  </span>
                  <span className="videoText">
                    <span className="videoTitle">{video.title}</span>
                    <span className="videoMeta">
                      {video.channel} · {video.duration} · {formatViews(video.views)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="back" onClick={() => onSelect(null)}>
        ← Pick another muscle
      </button>
    </aside>
  );
}

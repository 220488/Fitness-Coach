"use client";

import {
  MUSCLES,
  MUSCLE_IDS,
  exercisesFor,
  formatViews,
  type MuscleId,
  type VideoEntry,
} from "@/lib/muscles";

export function MusclePanel({
  selected,
  onSelect,
  videos,
}: {
  selected: MuscleId | null;
  onSelect: (id: MuscleId | null) => void;
  videos: Record<string, VideoEntry[]>;
}) {
  if (!selected) {
    return (
      <aside className="panel">
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
  const list = videos[selected] ?? [];
  const exercises = exercisesFor(list);

  return (
    <aside className="panel">
      <p className="eyebrow">{info.side === "front" ? "Front of the body" : "Back of the body"}</p>
      <h1>{info.id}</h1>
      <p className="alias big">also called: {info.alias}</p>
      <p className="lede">{info.what}</p>

      <section className="coach">
        <h2>
          <span className="step">1</span> Feel it in the right muscle
        </h2>
        <p className="warn">
          <strong>What takes over instead:</strong> {info.engage.compensators}
        </p>
        <ul className="cues">
          {info.engage.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      </section>

      <section className="coach">
        <h2>
          <span className="step">2</span> Warm it up
        </h2>
        <ol className="steps">
          {info.warmup.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="coach">
        <h2>
          <span className="step">3</span> Range of motion &amp; breathing
        </h2>
        <p className="label">How far to move</p>
        <p className="body">{info.rom}</p>
        <p className="label">How to breathe</p>
        <p className="body">{info.breathing}</p>
      </section>

      <section className="coach">
        <h2>
          <span className="step">4</span> Stretch it afterwards
        </h2>
        <p className="label">{info.stretch.name}</p>
        <p className="body">{info.stretch.how}</p>
        <p className="hold">Hold {info.stretch.hold}</p>
      </section>

      {exercises.length > 0 && (
        <section>
          <h3>Exercises that train it</h3>
          <ul className="chips">
            {exercises.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      )}

      {list.length > 0 && (
        <section>
          <h3>If you want to watch someone do it</h3>
          <ul className="videos">
            {list.slice(0, 3).map((video) => (
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

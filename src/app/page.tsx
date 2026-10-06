"use client";

import { useState } from "react";
import { BodyViewer } from "@/components/BodyViewer";
import { MusclePanel } from "@/components/MusclePanel";
import type { MuscleData, MuscleId } from "@/lib/muscles";
import muscleData from "@/data/muscles.json";

const data = muscleData as unknown as Record<string, MuscleData>;

export default function Home() {
  const [selected, setSelected] = useState<MuscleId | null>(null);
  // Lifted out of MusclePanel so the layout can give the panel more room while
  // an exercise is open — the detail view carries a photo and far more text
  // than the muscle overview.
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  const selectMuscle = (id: MuscleId | null) => {
    setSelected(id);
    setOpenExercise(null);
  };

  return (
    <main className={openExercise ? "layout layoutWide" : "layout"}>
      <BodyViewer selected={selected} onSelect={selectMuscle} />
      <MusclePanel
        selected={selected}
        onSelect={selectMuscle}
        data={data}
        openExercise={openExercise}
        onOpenExercise={setOpenExercise}
      />
    </main>
  );
}

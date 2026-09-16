"use client";

import { useState } from "react";
import { BodyViewer } from "@/components/BodyViewer";
import { MusclePanel } from "@/components/MusclePanel";
import type { MuscleId, VideoEntry } from "@/lib/muscles";
import muscleData from "@/data/muscles.json";

const videos = muscleData as unknown as Record<string, VideoEntry[]>;

export default function Home() {
  const [selected, setSelected] = useState<MuscleId | null>(null);

  return (
    <main className="layout">
      <BodyViewer selected={selected} onSelect={setSelected} />
      <MusclePanel selected={selected} onSelect={setSelected} videos={videos} />
    </main>
  );
}

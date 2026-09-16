"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { BodyProvider, HumanBody } from "./HumanBody";
import { MUSCLES, type MuscleId } from "@/lib/muscles";

/** Drags under this many pixels count as a click, not a rotation. */
const CLICK_SLOP = 5;
const DRAG_SENSITIVITY = 0.008;

interface RotationState {
  target: number;
  current: number;
}

function RotatingBody({ rotation }: { rotation: React.MutableRefObject<RotationState> }) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    const r = rotation.current;
    // Frame-rate independent easing toward the target yaw.
    const t = 1 - Math.pow(0.001, delta);
    r.current += (r.target - r.current) * t;
    if (group.current) group.current.rotation.y = r.current;
  });

  return (
    <group ref={group}>
      <HumanBody />
    </group>
  );
}

export function BodyViewer({
  selected,
  onSelect,
}: {
  selected: MuscleId | null;
  onSelect: (id: MuscleId) => void;
}) {
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const rotation = useRef<RotationState>({ target: 0, current: 0 });
  const drag = useRef({ active: false, lastX: 0, distance: 0 });
  const [facing, setFacing] = useState<"front" | "back">("front");

  // Turn the model to whichever side the selected muscle is actually on.
  useEffect(() => {
    if (!selected) return;
    const side = MUSCLES[selected].side;
    const turns = Math.round(rotation.current.target / (Math.PI * 2));
    rotation.current.target = turns * Math.PI * 2 + (side === "back" ? Math.PI : 0);
    setFacing(side);
  }, [selected]);

  const turnTo = useCallback((side: "front" | "back") => {
    const turns = Math.round(rotation.current.target / (Math.PI * 2));
    rotation.current.target = turns * Math.PI * 2 + (side === "back" ? Math.PI : 0);
    setFacing(side);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = { active: true, lastX: e.clientX, distance: 0 };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.lastX;
    drag.current.lastX = e.clientX;
    drag.current.distance += Math.abs(dx);
    rotation.current.target += dx * DRAG_SENSITIVITY;
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    drag.current.active = false;
    const el = e.target as Element;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // Snap the facing label to whichever half of the turn we ended on.
    const normalised = Math.abs(((rotation.current.target % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    setFacing(normalised > Math.PI / 2 && normalised < (Math.PI * 3) / 2 ? "back" : "front");
  }, []);

  const handleSelect = useCallback(
    (id: MuscleId) => {
      if (drag.current.distance > CLICK_SLOP) return; // this was a rotate, not a pick
      onSelect(id);
    },
    [onSelect]
  );

  return (
    <div className="viewer">
      <div
        className="canvasWrap"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{ cursor: hovered ? "pointer" : "grab" }}
      >
        <Canvas
          camera={{ position: [0, 0, 3.75], fov: 32 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.55} color="#bde9f7" />
          <directionalLight position={[2.5, 3.5, 3]} intensity={1.1} color="#e0f7ff" />
          <directionalLight position={[-3, 1.5, 1.5]} intensity={0.7} color="#3b82f6" />
          <directionalLight position={[0, 1.5, -4]} intensity={1.2} color="#22d3ee" />

          <BodyProvider
            value={{ hovered, selected, onHover: setHovered, onSelect: handleSelect }}
          >
            <RotatingBody rotation={rotation} />
          </BodyProvider>

        </Canvas>

        <div className="hint">
          {hovered ? (
            <span className="hintMuscle">{hovered}</span>
          ) : (
            <span>Drag to turn the body · click a muscle</span>
          )}
        </div>
      </div>

      <div className="facing">
        <button
          type="button"
          className={facing === "front" ? "active" : ""}
          onClick={() => turnTo("front")}
        >
          Front
        </button>
        <button
          type="button"
          className={facing === "back" ? "active" : ""}
          onClick={() => turnTo("back")}
        >
          Back
        </button>
      </div>
    </div>
  );
}

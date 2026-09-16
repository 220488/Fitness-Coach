"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DoubleSide, Vector2 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { MuscleId } from "@/lib/muscles";

/**
 * A holographic anatomy figure. The body is built from a lathed trunk and tapered
 * limb segments; each muscle is a curved shell patch (a partial cylinder) sitting a
 * few millimetres proud of the segment it wraps, so muscles read as regions of the
 * body rather than lumps stuck onto it.
 *
 * Units are metres: feet at y=0, head at y≈1.82. The parent group recentres it.
 */

interface BodyState {
  hovered: MuscleId | null;
  selected: MuscleId | null;
  onHover: (id: MuscleId | null) => void;
  onSelect: (id: MuscleId) => void;
}

const BodyContext = createContext<BodyState | null>(null);

export function BodyProvider({ value, children }: { value: BodyState; children: ReactNode }) {
  return <BodyContext.Provider value={value}>{children}</BodyContext.Provider>;
}

type Vec3 = [number, number, number];

const BODY = {
  color: "#0d3245",
  emissive: "#0a2537",
  emissiveIntensity: 0.55,
  wire: "#2bb8d8",
  wireOpacity: 0.42,
};

const MUSCLE_STATES = {
  idle: {
    color: "#115f78",
    emissive: "#0e7490",
    emissiveIntensity: 0.75,
    wire: "#4fe3ff",
    wireOpacity: 0.7,
  },
  hover: {
    color: "#1d8fb2",
    emissive: "#22d3ee",
    emissiveIntensity: 1.15,
    wire: "#bdf5ff",
    wireOpacity: 0.95,
  },
  selected: {
    color: "#a8450f",
    emissive: "#f97316",
    emissiveIntensity: 1.25,
    wire: "#fed7aa",
    wireOpacity: 1,
  },
};

type Look = typeof MUSCLE_STATES.idle;

function useBody() {
  const ctx = useContext(BodyContext);
  if (!ctx) throw new Error("Body part rendered outside BodyProvider");
  return ctx;
}

/**
 * R3F only raycasts meshes that carry handlers, so an un-handled torso would let
 * clicks pass straight through to the muscle on the far side. Body parts absorb them.
 */
function useBlocker() {
  const ctx = useBody();
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      ctx.onHover(null);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
    },
  };
}

/**
 * One surface drawn twice: a shaded shell plus a wireframe a hair larger, which is
 * what gives the figure its holographic grid. The wire copy never takes clicks.
 */
function Holo({
  geom,
  look,
  position,
  rotation,
  scale,
  handlers,
  doubleSided = false,
}: {
  geom: ReactNode;
  look: Look;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  handlers?: Record<string, unknown>;
  doubleSided?: boolean;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale} {...handlers}>
      <mesh>
        {geom}
        <meshStandardMaterial
          color={look.color}
          emissive={look.emissive}
          emissiveIntensity={look.emissiveIntensity}
          roughness={0.35}
          metalness={0.15}
          side={doubleSided ? DoubleSide : undefined}
        />
      </mesh>
      <mesh scale={1.006} raycast={() => null}>
        {geom}
        <meshBasicMaterial color={look.wire} wireframe transparent opacity={look.wireOpacity} />
      </mesh>
    </group>
  );
}

/** A body segment — not clickable itself, but it blocks clicks to the far side. */
function Part({ geom, position, rotation, scale }: { geom: ReactNode; position?: Vec3; rotation?: Vec3; scale?: Vec3 }) {
  return <Holo geom={geom} look={BODY} position={position} rotation={rotation} scale={scale} handlers={useBlocker()} />;
}

/** A muscle — one or more shell patches sharing a hit target and a highlight state. */
function Muscle({
  id,
  patches,
}: {
  id: MuscleId;
  patches: { geom: ReactNode; position?: Vec3; rotation?: Vec3; scale?: Vec3 }[];
}) {
  const ctx = useBody();
  const look =
    ctx.selected === id
      ? MUSCLE_STATES.selected
      : ctx.hovered === id
        ? MUSCLE_STATES.hover
        : MUSCLE_STATES.idle;

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      ctx.onHover(id);
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      ctx.onHover(null);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      ctx.onSelect(id);
    },
  };

  return (
    <group {...handlers}>
      {patches.map((patch, i) => (
        <Holo
          key={i}
          geom={patch.geom}
          look={look}
          position={patch.position}
          rotation={patch.rotation}
          scale={patch.scale}
          doubleSided
        />
      ))}
    </group>
  );
}

/* ---------- geometry helpers ---------- */

const TAU = Math.PI * 2;

/** Tapered limb segment. */
const seg = (rTop: number, rBottom: number, h: number, rows = 8) => (
  <cylinderGeometry args={[rTop, rBottom, h, 22, rows, true]} />
);

/**
 * A muscle shell: an open, tapered cylinder covering only part of the circumference.
 * theta 0 faces +Z (the front of the body), so `centre` is measured from there.
 */
const patch = (rTop: number, rBottom: number, h: number, centre: number, arc: number, rows = 6) => (
  <cylinderGeometry args={[rTop, rBottom, h, 24, rows, true, centre - arc / 2, arc]} />
);

/** Unit sphere; the caller scales it into whatever ellipsoid it needs. */
const ball = () => <sphereGeometry args={[1, 22, 16]} />;

/** Half-silhouette of the trunk (radius, height), revolved and then flattened in Z. */
const TRUNK_PROFILE = [
  [0.02, 0.8],
  [0.11, 0.825],
  [0.148, 0.87],
  [0.158, 0.93],
  [0.152, 1.0],
  [0.134, 1.08],
  [0.124, 1.15],
  [0.126, 1.21],
  [0.142, 1.27],
  [0.162, 1.34],
  [0.176, 1.4],
  [0.178, 1.44],
  [0.163, 1.49],
  [0.118, 1.53],
  [0.055, 1.555],
].map(([r, y]) => new Vector2(r, y));

const TRUNK_SQUASH: Vec3 = [1, 1, 0.62];

/** side: -1 is the model's right, which is screen-left when it faces you. */
function Arm({ side }: { side: 1 | -1 }) {
  const front = 0;
  const back = Math.PI;
  return (
    <group position={[side * 0.163, 1.435, 0]} rotation={[0, 0, side * 0.42]}>
      <Muscle
        id="Shoulders"
        patches={[{ geom: ball(), position: [side * 0.012, 0.01, 0], scale: [0.071, 0.074, 0.07] }]}
      />
      <Part geom={seg(0.053, 0.042, 0.3)} position={[0, -0.19, 0]} />
      <Muscle id="Biceps" patches={[{ geom: patch(0.055, 0.047, 0.17, front, TAU * 0.3), position: [0, -0.175, 0] }]} />
      <Muscle id="Triceps" patches={[{ geom: patch(0.058, 0.048, 0.2, back, TAU * 0.32), position: [0, -0.185, 0] }]} />
      <Part geom={ball()} position={[0, -0.345, 0]} scale={[0.044, 0.042, 0.044]} />
      <Muscle id="Forearms" patches={[{ geom: seg(0.049, 0.03, 0.28), position: [0, -0.49, 0] }]} />
      <Part geom={ball()} position={[0, -0.645, 0]} scale={[0.031, 0.03, 0.026]} />
      <Part geom={ball()} position={[0, -0.712, 0.004]} scale={[0.04, 0.066, 0.023]} />
    </group>
  );
}

function Leg({ side }: { side: 1 | -1 }) {
  const front = 0;
  const back = Math.PI;
  return (
    <group position={[side * 0.088, 0.89, 0]} rotation={[0, 0, side * 0.085]}>
      <Part geom={seg(0.094, 0.058, 0.39)} position={[0, -0.195, 0]} />
      <Muscle id="Quadriceps" patches={[{ geom: patch(0.098, 0.063, 0.31, front, TAU * 0.32), position: [0, -0.185, 0] }]} />
      <Muscle id="Hamstrings" patches={[{ geom: patch(0.096, 0.063, 0.29, back, TAU * 0.3), position: [0, -0.195, 0] }]} />
      <Part geom={ball()} position={[0, -0.395, 0]} scale={[0.057, 0.05, 0.056]} />
      <Part geom={seg(0.057, 0.032, 0.44)} position={[0, -0.615, 0]} />
      <Muscle id="Calves" patches={[{ geom: patch(0.062, 0.045, 0.22, back, TAU * 0.32), position: [0, -0.51, 0] }]} />
      <Part
        geom={<boxGeometry args={[0.078, 0.048, 0.21, 2, 1, 4]} />}
        position={[0, -0.852, 0.05]}
        rotation={[0, 0, -side * 0.085]}
      />
    </group>
  );
}

export function HumanBody() {
  const front = 0;
  const back = Math.PI;
  return (
    <group position={[0, -0.9, 0]}>
      {/* head and neck */}
      <Part geom={ball()} position={[0, 1.715, 0.004]} scale={[0.083, 0.102, 0.093]} />
      <Part geom={seg(0.042, 0.052, 0.1, 3)} position={[0, 1.59, 0]} />

      {/* trunk */}
      <Part geom={<latheGeometry args={[TRUNK_PROFILE, 32]} />} scale={TRUNK_SQUASH} />
      <Part geom={ball()} position={[0, 0.862, 0]} scale={[0.143, 0.1, 0.088]} />

      {/* Pecs: two arcs either side of the sternum, wrapped onto the ribcage. */}
      <Muscle
        id="Chest"
        patches={[
          {
            geom: patch(0.172, 0.181, 0.15, front - TAU * 0.082, TAU * 0.142, 5),
            position: [0, 1.385, 0],
            scale: TRUNK_SQUASH,
          },
          {
            geom: patch(0.172, 0.181, 0.15, front + TAU * 0.082, TAU * 0.142, 5),
            position: [0, 1.385, 0],
            scale: TRUNK_SQUASH,
          },
        ]}
      />

      {/* Lats taper from the armpits down to the waist; traps sit above them. */}
      <Muscle
        id="Back"
        patches={[
          { geom: patch(0.181, 0.142, 0.3, back, TAU * 0.34, 8), position: [0, 1.312, 0], scale: TRUNK_SQUASH },
          { geom: patch(0.152, 0.181, 0.09, back, TAU * 0.28, 3), position: [0, 1.482, 0], scale: TRUNK_SQUASH },
        ]}
      />

      <Muscle
        id="Glutes"
        patches={[
          { geom: patch(0.16, 0.142, 0.15, back, TAU * 0.32, 5), position: [0, 0.912, 0], scale: [1, 1, 0.68] },
        ]}
      />

      <Arm side={-1} />
      <Arm side={1} />
      <Leg side={-1} />
      <Leg side={1} />
    </group>
  );
}

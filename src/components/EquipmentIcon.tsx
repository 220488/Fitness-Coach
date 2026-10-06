/**
 * Line icons for the gym equipment an exercise needs.
 *
 * Drawn here rather than sourced as photographs: equipment varies by brand, so a
 * photo of one manufacturer's hack squat often looks nothing like the one in the
 * reader's gym, while the characteristic silhouette generalises. They also carry
 * no licensing or attribution obligations, inherit the page's colour via
 * `currentColor`, and add no network request.
 *
 * All paths are drawn on a 24x24 grid with a 1.6 stroke, no fills.
 */

/** Canonical icon names. `equipmentIcon()` maps free-text equipment onto these. */
export type IconName =
  | "dumbbell"
  | "barbell"
  | "ezbar"
  | "kettlebell"
  | "cable"
  | "pulldown"
  | "smith"
  | "machine"
  | "rack"
  | "bench"
  | "incline"
  | "preacher"
  | "pullupBar"
  | "legPress"
  | "legCurl"
  | "legExtension"
  | "hackSquat"
  | "pendulum"
  | "bosu"
  | "band"
  | "step"
  | "bodyweight";

const PATHS: Record<IconName, React.ReactNode> = {
  // Short bar, a plate at each end.
  dumbbell: (
    <>
      <path d="M3 9.5v5M5.5 7.5v9M18.5 7.5v9M21 9.5v5" />
      <path d="M5.5 12h13" />
    </>
  ),
  // Long bar, collars and plates.
  barbell: (
    <>
      <path d="M2 10v4M4.5 7.5v9M6.5 9.5v5M17.5 9.5v5M19.5 7.5v9M22 10v4" />
      <path d="M6.5 12h11" />
    </>
  ),
  // Cambered bar — the zigzag is the whole point.
  ezbar: (
    <>
      <path d="M3 9.5v5M5.5 8v8M18.5 8v8M21 9.5v5" />
      <path d="M5.5 12h2l1.5-2 2 2 2-2 2 2 1.5-2h2" />
    </>
  ),
  // Bell with a looped handle.
  kettlebell: (
    <>
      <path d="M9 7.5a3 3 0 0 1 6 0" />
      <path d="M9.5 7.5C6.5 9 5 11.5 5 14.5A4.5 4.5 0 0 0 9.5 19h5a4.5 4.5 0 0 0 4.5-4.5c0-3-1.5-5.5-4.5-7z" />
    </>
  ),
  // Tall column, pulley head, cable hanging to a D-handle.
  cable: (
    <>
      <path d="M5 3.5v17M3 20.5h6" />
      <path d="M5 5h3.5a1 1 0 0 1 1 1v1" />
      <path d="M9.5 8v7" />
      <path d="M7.8 15h3.4v2.2H7.8z" />
    </>
  ),
  // Overhead pulley, the wide bar, and the seat with its thigh pad.
  pulldown: (
    <>
      <path d="M4 3.5v17M2 20.5h6" />
      <path d="M4 5h4a1 1 0 0 1 1 1v1.5" />
      <path d="M9 7.5v2" />
      <path d="M13 9.5h8M15 9v1M19 9v1" />
      <path d="M11.5 15.5h7M15 15.5v5" />
      <path d="M12.5 13h5" />
    </>
  ),
  // The bar runs ON two fixed tracks — collars show it is captive.
  smith: (
    <>
      <path d="M5 3v18M19 3v18M3 21h18" />
      <path d="M4 11.5h16" />
      <rect x="3.6" y="10" width="2.8" height="3" rx="0.6" />
      <rect x="17.6" y="10" width="2.8" height="3" rx="0.6" />
    </>
  ),
  // Generic plate-loaded frame with a weight stack.
  machine: (
    <>
      <path d="M4 4v17M20 21H4" />
      <rect x="7" y="7" width="6" height="11" rx="1" />
      <path d="M7 10.5h6M7 14h6" />
      <path d="M16 7v9" />
    </>
  ),
  // Two uprights with J-hooks and a loaded bar.
  rack: (
    <>
      <path d="M5 4v17M19 4v17M3.5 21h17" />
      <path d="M5 9h-1.5M19 9h1.5" />
      <path d="M5 9h14" />
      <path d="M7 7v4M17 7v4" />
    </>
  ),
  // Flat pad on a frame.
  bench: (
    <>
      <path d="M3 10h18" />
      <path d="M3 10v-1.5M21 10v-1.5" />
      <path d="M6 10v8M18 10v8" />
      <path d="M4 18h4M16 18h4" />
    </>
  ),
  // Pad set at an angle plus a short seat.
  incline: (
    <>
      <path d="M5 18 16 7" />
      <path d="M5 18h7" />
      <path d="M7 18v3M14 12v4" />
      <path d="M5.5 21h3M12.5 16h3" />
      <path d="M16 7l2.5 2.5" />
    </>
  ),
  // Seat, then the sloped arm pad you drape your arms over.
  preacher: (
    <>
      <path d="M3.5 20.5h7" />
      <path d="M5 20.5v-4h5v4" />
      <path d="M9.5 16.5 16 8.5" />
      <path d="M13.5 11.5l3 2.5" />
      <path d="M16 8.5h3.5v2" />
    </>
  ),
  // Overhead bar on two uprights.
  pullupBar: (
    <>
      <path d="M4 5h16" />
      <path d="M6 5v16M18 5v16" />
      <path d="M4 21h4M16 21h4" />
      <path d="M10 5v2.5M14 5v2.5" />
    </>
  ),
  // Seat at the bottom, sled rails, big footplate up at an angle.
  legPress: (
    <>
      <path d="M3 20.5h6" />
      <path d="M4.5 20.5v-4h4.5v3" />
      <path d="M9 17 17 7.5" />
      <path d="M13.5 15.5h4" />
      <path d="M14 7 20 4.5l1.5 3.5L15.5 10.5z" />
    </>
  ),
  // Seated, roller BEHIND the ankle — the heel curls back under.
  legCurl: (
    <>
      <path d="M4 7.5h7v5H4z" />
      <path d="M4 12.5v8M2.5 20.5h5" />
      <path d="M11 10h5" />
      <circle cx="18" cy="10" r="2" />
      <path d="M16 15.5 18 12" />
    </>
  ),
  // Seated, roller IN FRONT at the shin — the leg straightens outward.
  legExtension: (
    <>
      <path d="M4 6.5h7v5H4z" />
      <path d="M4 11.5v9M2.5 20.5h5" />
      <path d="M11 11.5v4.5" />
      <path d="M11 16h5" />
      <circle cx="18" cy="16" r="2" />
      <path d="M20 16h1.5" />
    </>
  ),
  // Angled back pad on rails, with shoulder pads on top.
  hackSquat: (
    <>
      <path d="M3 20.5h8" />
      <path d="M5 20.5 15 6.5" />
      <path d="M8.5 20.5 18.5 6.5" />
      <path d="M11.5 12.5h4" />
      <path d="M13.5 7.5h6" />
      <path d="M15 5.5v4M18 5.5v4" />
    </>
  ),
  // Pivot above, pad swinging through an arc below it.
  pendulum: (
    <>
      <circle cx="12" cy="4.5" r="1.4" />
      <path d="M12 6 8.5 14" />
      <path d="M6 14.5h5.5" />
      <path d="M4.5 19.5a9 9 0 0 1 15-3.5" />
      <path d="M3.5 20.5h4" />
    </>
  ),
  // Dome on a flat base.
  bosu: (
    <>
      <path d="M3.5 16a8.5 8.5 0 0 1 17 0" />
      <path d="M2.5 16h19" />
      <path d="M7 16a5 5 0 0 1 10 0" />
    </>
  ),
  // A stretched elastic loop with a handle at each end.
  band: (
    <>
      <path d="M6.5 9.5h11a3.5 3.5 0 0 1 0 5h-11a3.5 3.5 0 0 1 0-5z" />
      <path d="M4 10v4M20 10v4" />
    </>
  ),
  // A single raised step.
  step: (
    <>
      <path d="M3 19h18" />
      <path d="M6 19v-4h7v4" />
      <path d="M13 15v-3h6v7" />
    </>
  ),
  // Standing figure — nothing to fetch.
  bodyweight: (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 7.5v7" />
      <path d="M7.5 10.5 12 9l4.5 1.5" />
      <path d="M12 14.5 9 21M12 14.5 15 21" />
    </>
  ),
};

/**
 * Map a free-text equipment string onto an icon.
 *
 * Order matters: the most specific machine is checked first, so "Cable pulldown
 * station" does not fall through to the generic cable icon, and "Barbell +
 * squat rack" picks the rack rather than the bare barbell.
 */
const RULES: [RegExp, IconName][] = [
  [/hack squat/i, "hackSquat"],
  [/pendulum/i, "pendulum"],
  [/leg press/i, "legPress"],
  [/leg curl/i, "legCurl"],
  [/leg extension/i, "legExtension"],
  [/pulldown/i, "pulldown"],
  [/smith/i, "smith"],
  [/preacher/i, "preacher"],
  [/pull-up bar|pullup bar|dip bar/i, "pullupBar"],
  [/squat rack|power rack/i, "rack"],
  [/bosu/i, "bosu"],
  [/kettlebell/i, "kettlebell"],
  [/band/i, "band"],
  [/step\b/i, "step"],
  [/adjustable bench|incline/i, "incline"],
  [/flat bench|\bbench\b/i, "bench"],
  [/plate-loaded|machine/i, "machine"],
  [/cable/i, "cable"],
  [/ez bar/i, "ezbar"],
  [/dumbbell/i, "dumbbell"],
  [/barbell/i, "barbell"],
  [/bodyweight/i, "bodyweight"],
];

export function equipmentIcon(equipment: string): IconName | null {
  // "Bodyweight (barbell optional)" is bodyweight work; the aside is not the
  // apparatus you look for, so drop it before matching.
  let text = equipment.replace(/\s*\([^)]*\)/g, "").trim();

  // For "X or Y" the first alternative is the canonical one — "Barbell or
  // dumbbells" should show a barbell, not a dumbbell. "X + Y" is left intact,
  // since there the rule order picks the station you actually walk up to
  // ("Barbell + squat rack" -> the rack).
  if (/\bor\b/i.test(text) && !/\+/.test(text)) {
    text = text.split(/\s+or\s+/i)[0].trim();
  }

  for (const [pattern, icon] of RULES) {
    if (pattern.test(text)) return icon;
  }
  return null;
}

export function EquipmentIcon({
  equipment,
  size = 30,
}: {
  equipment: string;
  size?: number;
}) {
  const icon = equipmentIcon(equipment);
  if (!icon) return null;
  return (
    <svg
      className="kitIcon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[icon]}
    </svg>
  );
}

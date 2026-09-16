export const MUSCLE_IDS = [
  "Chest",
  "Shoulders",
  "Triceps",
  "Back",
  "Biceps",
  "Forearms",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

export interface MuscleInfo {
  id: MuscleId;
  /** Which way the user has to face the model to see it. */
  side: "front" | "back";
  /** Plain-language name for someone who has never trained. */
  alias: string;
  what: string;
  /** What steals the work when form slips, and the cues that stop it. */
  engage: { compensators: string; cues: string[] };
  /** Done in order, before the first working set. */
  warmup: string[];
  rom: string;
  breathing: string;
  stretch: { name: string; how: string; hold: string };
}

export const MUSCLES: Record<MuscleId, MuscleInfo> = {
  Chest: {
    id: "Chest",
    side: "front",
    alias: "Pecs",
    what: "The fan-shaped muscle across the front of your ribcage. It pushes things away from you.",
    engage: {
      compensators: "Front shoulders and triceps take the press, and your shoulders roll forward under the weight.",
      cues: [
        "Pull your shoulder blades back and down before you unrack, and hold them there for the whole set.",
        "Keep your elbows about 45–60° from your torso. Flaring them to 90° hands the work to your shoulders.",
        "Think about squeezing your hands toward each other rather than pushing the weight up.",
      ],
    },
    warmup: [
      "20 arm circles each direction, then 2 × 15 band pull-aparts.",
      "1 × 15 push-ups, or 15 reps with the empty bar.",
      "Ramp up your first exercise: 50% weight × 10, then 70% × 5.",
    ],
    rom: "Lower until the bar or dumbbells reach mid-chest and you feel a stretch across the pecs — never bounce off your ribs. Stop just short of locking your elbows so the tension stays on the chest instead of your joints.",
    breathing: "Big breath in at the top, hold it as you lower, breathe out as you press past the hardest point.",
    stretch: {
      name: "Doorway pec stretch",
      how: "Forearm flat on a doorframe with your elbow at shoulder height, then step through until you feel the stretch across the front of your chest.",
      hold: "30 seconds each side",
    },
  },
  Shoulders: {
    id: "Shoulders",
    side: "front",
    alias: "Delts",
    what: "Caps the top of each arm in three parts — front, side and rear. It lifts your arm in every direction.",
    engage: {
      compensators: "Your traps shrug the weight up, and on presses your chest and triceps take over.",
      cues: [
        "Lead with your elbow, not your hand — on a lateral raise the elbow stays the highest point.",
        "Keep your shoulders pressed down away from your ears for the whole set.",
        "Stop lateral raises at shoulder height. Going higher hands the work straight to your traps.",
      ],
    },
    warmup: [
      "2 × 20 band pull-aparts and 2 × 15 face pulls.",
      "1 × 15 overhead press with a broomstick or the empty bar.",
      "One set of lateral raises with 2–4 kg for 20 slow reps.",
    ],
    rom: "On a press, travel from chin height to just short of lockout. On a lateral raise, start with your arms hanging at your sides — not already out to the side — and stop level with your shoulders.",
    breathing: "Breathe out as you press or raise, in as you lower. Don't hold your breath on overhead work.",
    stretch: {
      name: "Cross-body delt stretch",
      how: "Pull one arm straight across your chest with the opposite hand, keeping that shoulder pressed down.",
      hold: "30 seconds each side",
    },
  },
  Triceps: {
    id: "Triceps",
    side: "back",
    alias: "Back of the arm",
    what: "Runs down the back of your upper arm and straightens your elbow. It is about two thirds of your arm's size.",
    engage: {
      compensators: "Your shoulders and chest take over the moment your elbows drift forward or flare out.",
      cues: [
        "Pin your upper arm still. Only your forearm should move.",
        "On pushdowns keep your elbows glued to your ribs and lean slightly forward.",
        "Squeeze for a beat at full lockout — that is where the triceps works hardest.",
      ],
    },
    warmup: [
      "2 × 15 pushdowns with a light band.",
      "10 slow close-grip push-ups or bench dips.",
      "One set of your first exercise at 50% for 15 reps.",
    ],
    rom: "Let your elbow bend all the way so the triceps stretches — especially on overhead work, where that stretched position drives most of the growth — then straighten your arm completely.",
    breathing: "Breathe in as your elbow bends, out as you straighten it.",
    stretch: {
      name: "Overhead triceps stretch",
      how: "Reach one hand down your back and press gently on that elbow with your other hand.",
      hold: "30 seconds each side",
    },
  },
  Back: {
    id: "Back",
    side: "back",
    alias: "Lats and traps",
    what: "The big sheet of muscle from your armpits to your waist, plus the yoke across the top. It pulls things toward you.",
    engage: {
      compensators: "Your biceps and grip fail before your back does, and your lower back swings the weight up.",
      cues: [
        "Pull with your elbows, as if your hands were just hooks on the bar.",
        "Start every rep by pulling your shoulder blade down and back, then bend your arm.",
        "Keep your torso still on rows. If you are swinging, the weight is too heavy.",
      ],
    },
    warmup: [
      "2 × 15 band pull-aparts, then 2 × 10 scapular pull-ups or dead hangs.",
      "1 × 15 light straight-arm pulldown, purely to feel the lats switch on.",
      "Ramp up your first pull at 50% and 70%.",
    ],
    rom: "Pull until the bar reaches your upper chest, or until your elbows pass your torso on a row. Then let the weight stretch your lats all the way out — let the shoulder blade travel, don't lock it in place.",
    breathing: "Breathe out as you pull, in as you let the weight stretch you back out.",
    stretch: {
      name: "Lat stretch",
      how: "Hold a rack or doorframe at waist height, sit your hips back and let your chest drop between your arms.",
      hold: "30 seconds",
    },
  },
  Biceps: {
    id: "Biceps",
    side: "front",
    alias: "Front of the arm",
    what: "The two-headed muscle on the front of your upper arm. It bends your elbow and turns your palm up.",
    engage: {
      compensators: "Your front shoulders swing the weight up as soon as your elbows drift forward.",
      cues: [
        "Keep your elbows pinned to your sides and slightly behind your ribs.",
        "If your elbow travels forward, your shoulder is curling the weight, not your biceps.",
        "Take three seconds to lower every rep. That is half the exercise.",
      ],
    },
    warmup: [
      "2 × 20 band curls, or one set of 20 very light dumbbell curls.",
      "10 slow bodyweight rows to warm the elbow joint.",
      "One set of your working curl at 50% for 12 reps.",
    ],
    rom: "Straighten your arm fully at the bottom — the stretched position builds the most muscle — and curl until your forearm is just past vertical. Curling higher only rests the weight on your shoulder.",
    breathing: "Breathe out as you curl up, in as you lower.",
    stretch: {
      name: "Biceps wall stretch",
      how: "Place your palm flat on a wall behind you at shoulder height, then slowly turn your body away from it.",
      hold: "30 seconds each side",
    },
  },
  Forearms: {
    id: "Forearms",
    side: "front",
    alias: "Grip",
    what: "Everything between elbow and wrist. It controls your grip, which is usually what fails first on pulling exercises.",
    engage: {
      compensators: "Nothing takes over here — your grip simply gives out and you end the set before the target muscle is done.",
      cues: [
        "Use straps on heavy back work so your back gets trained, then train grip separately afterwards.",
        "Squeeze the bar hard for the whole set instead of letting it roll down into your fingers.",
        "Train forearms at the end of a session. A fried grip ruins everything that comes after it.",
      ],
    },
    warmup: [
      "30 seconds of wrist circles each direction.",
      "2 × 20 light wrist curls and reverse wrist curls.",
      "One 20-second dead hang from a bar.",
    ],
    rom: "Let the bar roll to your fingertips at the bottom of a wrist curl, then curl it all the way closed. On carries and hangs there is no range of motion to manage — just hold on until your grip genuinely fails.",
    breathing: "Breathe steadily and normally. Never hold your breath through a long hang or a heavy carry.",
    stretch: {
      name: "Wrist flexor and extensor stretch",
      how: "Arm straight out in front of you. Pull your fingers back with the other hand, then pull them down.",
      hold: "20 seconds each direction",
    },
  },
  Quadriceps: {
    id: "Quadriceps",
    side: "front",
    alias: "Front of the thigh",
    what: "Four muscles on the front of your thigh that straighten your knee. The biggest muscle group you have.",
    engage: {
      compensators: "Your hips shoot back and up so your glutes and lower back take the squat, and your knees cave inward.",
      cues: [
        "Stay as upright as you can — goblet or high-bar position, with your heels flat or slightly raised.",
        "Let your knees travel forward over your toes. That is exactly what loads the quads.",
        "Push your knees out against the floor so they track over your toes instead of collapsing in.",
      ],
    },
    warmup: [
      "5 minutes on a bike, or 20 bodyweight squats.",
      "2 × 10 leg swings each leg, then 10 deep bodyweight squats holding the bottom for a second.",
      "Ramp up: empty bar × 10, 50% × 8, 70% × 5.",
    ],
    rom: "Go to at least parallel — the crease of your hip level with your knee — and deeper if you can do it without your lower back rounding. Stand all the way up, but don't slam your knees straight.",
    breathing: "Big breath in at the top, brace your stomach hard, hold it all the way down and up, and breathe out only once you are standing. Never exhale at the bottom of a heavy squat.",
    stretch: {
      name: "Kneeling quad stretch",
      how: "Kneel with one shin against a wall or bench behind you, then squeeze the glute on that side to open the hip.",
      hold: "30 seconds each side",
    },
  },
  Hamstrings: {
    id: "Hamstrings",
    side: "back",
    alias: "Back of the thigh",
    what: "Runs from your sit bones to below the knee. It bends the knee and drives your hips forward.",
    engage: {
      compensators: "Your lower back rounds and takes over the hinge, or your glutes finish the rep early.",
      cues: [
        "Push your hips straight back, not down. The bar should graze your thighs the whole way.",
        "Keep a soft, fixed knee angle. The moment your knees start bending more, it has become a squat.",
        "Stop lowering the instant your back wants to round — even if that is above your knees.",
      ],
    },
    warmup: [
      "5 minutes of easy cardio, then 2 × 10 leg swings front to back.",
      "2 × 12 bodyweight good mornings to groove the hinge.",
      "Ramp up your first hinge at 40% and 60%.",
    ],
    rom: "Lower until you feel a real stretch down the back of your thigh, and not one inch further. On leg curls, straighten your leg completely at the start of each rep — that stretch is where hamstrings grow.",
    breathing: "Breathe in and brace at the top, hold it as you hinge down, breathe out as you stand back up.",
    stretch: {
      name: "Standing hamstring stretch",
      how: "Heel on a low step with the leg straight, then hinge forward from your hips keeping your back flat.",
      hold: "30 seconds each side",
    },
  },
  Glutes: {
    id: "Glutes",
    side: "back",
    alias: "Butt",
    what: "The strongest muscle in your body. It extends your hip — every time you stand up, climb or sprint.",
    engage: {
      compensators: "Your lower back and hamstrings finish the rep instead of your glutes, and your ribs flare up at lockout.",
      cues: [
        "Tuck your ribs down and your pelvis under before you lock out a hip thrust.",
        "Finish with a hard glute squeeze at the top, not by arching your lower back.",
        "Keep your chin tucked and your eyes on your hips through the whole rep.",
      ],
    },
    warmup: [
      "2 × 15 bodyweight glute bridges.",
      "2 × 15 banded lateral walks.",
      "One light set of your first exercise for 15 reps.",
    ],
    rom: "Lock your hips out fully so your torso and thighs form a straight line, then lower until you feel the stretch without your lower back taking over. On split squats, drop until your back knee is just off the floor.",
    breathing: "Breathe in on the way down, out hard as you drive your hips up and squeeze.",
    stretch: {
      name: "Figure-4 glute stretch",
      how: "Lie on your back, cross one ankle over the opposite knee, and pull that thigh toward your chest.",
      hold: "30 seconds each side",
    },
  },
  Calves: {
    id: "Calves",
    side: "back",
    alias: "Lower leg",
    what: "The two muscles behind your shin that point your toes. Stubborn for most people.",
    engage: {
      compensators: "You bounce out of the bottom on your Achilles tendon, so the muscle barely does any work.",
      cues: [
        "Pause for two seconds in the stretched bottom position of every rep.",
        "Drive up slowly and deliberately. If you are hopping, the tendon is doing it.",
        "Train both versions: straight-legged raises for the upper calf, seated or bent-knee raises for the lower one.",
      ],
    },
    warmup: [
      "1 minute of easy skipping, or walking on your toes.",
      "2 × 20 bodyweight calf raises on flat ground.",
      "One light set on the machine for 20 slow reps.",
    ],
    rom: "Drop your heel as far below the step as your ankle allows, pause there, then rise all the way onto your toes and hold for a beat. Half reps do almost nothing for calves.",
    breathing: "Breathe out as you rise, in as you lower. Keep it steady — this is a high-rep muscle.",
    stretch: {
      name: "Wall calf stretch",
      how: "Hands on a wall, back leg straight with the heel pressed down. Then repeat with that knee bent to reach the lower calf.",
      hold: "30 seconds each side, both versions",
    },
  },
};

export interface Chapter {
  title: string;
  start: number;
}

export interface VideoEntry {
  videoId: string;
  rank: number;
  title: string;
  channel: string;
  tier: string;
  tierBasis: string;
  duration: string;
  minutes: number;
  views: number;
  published: string;
  url: string;
  chapters: Chapter[];
}

/**
 * Chapter titles double as exercise names in these videos, but they are mixed in with
 * section headers ("SHOULDER ADDUCTION: LATS AND TERES MAJOR") and mistake call-outs
 * ("USING TOO MUCH BODY ENGLISH"). Keep only titles that name a real movement.
 */
const EXERCISE_TERM =
  /\b(press|bench|row|curl|squat|deadlift|dl|raise|extension|fly|flye|pulldown|pull[- ]?up|pull[- ]?over|chin[- ]?up|push[- ]?up|pushdown|dip|lunge|thrust|bridge|shrug|kickback|crunch|plank|hinge|hyperextension|good morning|pull[- ]?in|leg press|calf|carry|hang|face pull|pullthrough|split squat|step[- ]?up|hip thrust|rdl|jm|skull ?crusher)\b/i;

const NOT_AN_EXERCISE =
  /^(untitled|<|intro|outro|conclusion|sponsor|recap|summary|mistake|tip|the )|\b(mistakes?|wrong|too much|not enough|do(n't| not)|why|how to|vs\.?|versus|anatomy|science|myth|takeaway|benefits?|master\w+|common|rule \d|programming|volume|frequency|exercises?|injur\w+|training|tips?|best|worst|ranked|routine|workout|warm[- ]?up|stretch\w*)\b/i;

export function exercisesFor(videos: VideoEntry[], limit = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const video of videos) {
    for (const chapter of video.chapters) {
      const name = chapter.title.replace(/^\d+[.)]\s*/, "").trim();
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!key || seen.has(key)) continue;
      if (name.length > 38 || name.includes("?") || name.includes(":")) continue;
      if (NOT_AN_EXERCISE.test(name) || !EXERCISE_TERM.test(name)) continue;
      seen.add(key);
      out.push(titleCase(name));
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Some channels write chapters in caps; normalise so the chips look uniform. */
function titleCase(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${Math.round(views / 1_000)}K views`;
  return `${views} views`;
}

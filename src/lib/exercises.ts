/**
 * Per-exercise coaching, keyed by `<Muscle>/<slug>` — the same slugs
 * scripts/build-data.mjs derives from video chapter titles.
 *
 * Tiers live in src/data/tiers.json, derived from the source transcripts by
 * scripts/extract-tiers.mjs. An absent tier means nobody ranked that exercise —
 * not that it is mediocre.
 *
 * The setup steps, cue and mistake are written for a beginner, grounded in what
 * the chapter actually says. `quote` is a short verbatim line from that coach.
 */

export type Tier = "S" | "A" | "B" | "C" | "D" | "F";

export interface ExerciseCoaching {
  /**
   * No tier here. Tiers are derived from the transcripts by
   * scripts/extract-tiers.mjs into src/data/tiers.json; this file holds only the
   * written coaching, so a re-extraction can never silently disagree with it.
   */
  /** One line on why it landed there. */
  verdict: string;
  setup: string[];
  /** The single thing to think about while the set is happening. */
  cue: string;
  mistake: string;
  quote?: string;
}

export const TIER_NOTE: Record<Tier, string> = {
  S: "Best in class — build your session around it.",
  A: "Excellent. Nothing wrong with living here.",
  B: "Solid. Worth doing, not worth prioritising.",
  C: "Mediocre. Better uses of your time exist.",
  D: "Poor for this muscle. Train something else.",
  F: "Skip it. It does not do what people think.",
};

export const EXERCISES: Record<string, ExerciseCoaching> = {
  /* ---------------- Chest ---------------- */
  "Chest/hex-press": {
    verdict: "Your arms stay tucked the whole time, so the pecs never stretch and the triceps take over.",
    setup: [
      "Lie on a flat bench with two dumbbells pressed together over your chest.",
      "Squeeze them into each other and press straight up.",
    ],
    cue: "Don't bother — pick the flat dumbbell press instead and get the stretch.",
    mistake: "Doing it at all for chest size. The squeeze feels like work, but your pecs never lengthen under load.",
    quote: "you never get a big stretch in your pecs",
  },
  "Chest/plate-press": {
    verdict: "A hex press that feels more awkward, with even less room to add weight over time.",
    setup: [
      "Hold a weight plate flat between both palms at chest height.",
      "Press it straight out, squeezing your hands together.",
    ],
    cue: "Same problem as the hex press, plus you run out of loadable plates quickly.",
    mistake: "Choosing it as a main chest movement. It is a finisher at best.",
    quote: "even more awkward with even less overload potential",
  },
  "Chest/dumbbell-pullover": {
    verdict: "A far better lat exercise than a chest one, despite the theory.",
    setup: [
      "Lie across or along a bench, one dumbbell held over your chest with both hands.",
      "Lower it back over your head, keeping a slight elbow bend.",
      "Pull it back over your chest.",
    ],
    cue: "If you do these, do them on back day and think about your lats.",
    mistake: "Counting it as chest volume. Your pecs are barely the prime mover here.",
    quote: "a much better lat exercise than a pec exercise",
  },
  "Chest/bench-press": {
    verdict: "A superb chest builder and the easiest lift to add weight to; only shoulder wear keeps it off the top.",
    setup: [
      "Shoulder blades pulled back and down, feet flat, slight arch in the lower back.",
      "Grip a little wider than shoulder width.",
      "Lower to mid-chest, then press back up.",
    ],
    cue: "Keep the shoulder blades pinned back for the whole set — that is what keeps it in your chest.",
    mistake: "Flaring the elbows to 90°, which hands the work to the front of your shoulders.",
  },
  "Chest/incline-bench-press": {
    verdict: "Everything the flat bench does, with better upper-chest growth on top.",
    setup: [
      "Set the bench to roughly 30°. Steeper turns it into a shoulder press.",
      "Same setup as a flat bench: blades back, feet planted.",
      "Lower to your upper chest, just below the collarbone.",
    ],
    cue: "Touch higher on your chest than you would on a flat bench.",
    mistake: "Setting the bench at 45° or more and wondering why your shoulders are doing the work.",
  },
  "Chest/decline-bench-press": {
    verdict: "A genuinely effective chest builder, but awkward to set up and no better than flat.",
    setup: [
      "Lock your legs into the decline bench first.",
      "Grip as you would on a flat bench and lower to your lower chest.",
    ],
    cue: "Treat it as a flat-bench substitute, not an extra.",
    mistake: "Adding it on top of flat and incline pressing for the sake of 'lower chest'.",
  },
  "Chest/flat-dumbbell-press": {
    verdict: "Close to the best there is — a deeper stretch than a barbell, held back only by how hard heavy dumbbells are to handle.",
    setup: [
      "Sit with the dumbbells on your thighs, then kick them back as you lie down.",
      "Blades back, dumbbells at the outside of your chest.",
      "Press up and slightly inward.",
    ],
    cue: "Let the dumbbells travel lower than a bar could — that stretch is the whole point.",
    mistake: "Stopping short at the bottom, which throws away the one advantage over a barbell.",
  },
  "Chest/incline-dumbbell-press": {
    verdict: "The incline stretch plus dumbbell range of motion. Hard to fault.",
    setup: [
      "Bench at about 30°, dumbbells kicked back into position.",
      "Lower to the outside of your upper chest.",
    ],
    cue: "Control the bottom. Rushing it is how shoulders get cranky on incline work.",
    mistake: "Going so heavy that you cannot get the dumbbells into position on your own.",
  },

  /* ---------------- Back ---------------- */
  "Back/deadlift": {
    verdict: "A tremendous whole-body lift, but your back only holds position — it never actually shortens.",
    setup: [
      "Bar over mid-foot, shins almost touching.",
      "Hinge down and grip just outside your knees, chest up, back flat.",
      "Push the floor away and stand, keeping the bar against your legs.",
    ],
    cue: "Think 'push the floor', not 'pull the bar'.",
    mistake: "Treating it as your main back exercise. For lat growth, a pulldown beats it easily.",
    quote: "as a back builder the deadlift is going in C tier",
  },
  "Back/wide-grip-pull-up": {
    verdict: "Excellent lat builder; the only knock is that adding weight is awkward.",
    setup: [
      "Grip the bar a little wider than shoulder width, palms forward.",
      "Start from a full dead hang.",
      "Pull until your chest is near the bar, then lower all the way down.",
    ],
    cue: "Start each rep by pulling your shoulder blades down, before your arms bend.",
    mistake: "Half reps. Not getting back to a full hang costs you the stretch that grows lats.",
  },
  "Back/neutral-grip-pull-up": {
    verdict: "As good as the wide grip and kinder to most people's shoulders and elbows.",
    setup: [
      "Use parallel handles so your palms face each other.",
      "Dead hang, then pull your chest to the handles.",
    ],
    cue: "Drive your elbows down and back toward your hips.",
    mistake: "Letting your biceps do it. Lead with the elbows, not the hands.",
  },
  "Back/chin-up": {
    verdict: "Still a good lat exercise, but the underhand grip hands a real share of the work to your biceps.",
    setup: [
      "Palms facing you, hands about shoulder width.",
      "Dead hang, then pull your chest toward the bar.",
    ],
    cue: "Keep your elbows pointing down, not drifting forward.",
    mistake: "Counting it as both back and biceps volume — it is mostly biceps once you fatigue.",
  },
  "Back/wide-grip-lat-pulldown": {
    verdict: "All the benefit of a pull-up, with easy loading and a stretch you can actually control.",
    setup: [
      "Set the thigh pad snug so you stay down.",
      "Grip slightly wider than shoulder width.",
      "Pull the bar to your upper chest, then let it travel all the way back up.",
    ],
    cue: "Let your shoulder blades rise at the top — the stretch is where the growth is.",
    mistake: "Leaning back and heaving. If your torso swings, drop the weight.",
  },
  "Back/neutral-grip-lat-pulldown": {
    verdict: "Everything the wide grip offers, but biased to your lats over your mid traps.",
    setup: [
      "Attach a neutral (palms-facing) handle.",
      "Pull to your upper chest, elbows driving down.",
    ],
    cue: "Think specifically about driving your elbows toward your back pockets.",
    mistake: "Pulling with the hands and finishing with the biceps.",
  },
  "Back/half-kneeling-1-arm-lat-pulldown": {
    verdict: "One side at a time, with the most lat range of motion of any pulldown.",
    setup: [
      "Kneel on the leg nearest the machine, other foot planted.",
      "Hold a single handle overhead, arm fully extended.",
      "Pull down and slightly across toward your hip.",
    ],
    cue: "Let your torso stay tall; reach high at the top so the lat lengthens fully.",
    mistake: "Twisting your whole body to finish the rep.",
  },
  "Back/barbell-row": {
    verdict: "A strong mid-back builder, but your lower back gives out before your lats do.",
    setup: [
      "Hinge to roughly 45°, back flat, bar hanging at arm's length.",
      "Row to your lower ribs, elbows close to your body.",
      "Lower under control.",
    ],
    cue: "Keep your torso angle frozen for the entire set.",
    mistake: "Standing up a little on every rep, which turns it into a shrug.",
  },

  /* ---------------- Shoulders ---------------- */
  "Shoulders/standing-dumbbell-lateral-raise": {
    verdict: "The classic side-delt move, but the resistance disappears at the bottom where the stretch is.",
    setup: [
      "Dumbbells at your sides, soft elbow bend.",
      "Raise out to shoulder height, leading with your elbows.",
      "Lower slowly.",
    ],
    cue: "Lead with the elbow — it stays the highest point the whole way up.",
    mistake: "Swinging the weights up with your traps. Shoulders stay down, away from your ears.",
  },
  "Shoulders/lean-in-dumbbell-lateral-raise": {
    verdict: "Leaning in puts tension on the side delt at the bottom, which is exactly what the standing version lacks.",
    setup: [
      "Hold a rack with one hand and lean your body in toward it.",
      "Let the working arm hang across your body.",
      "Raise out to shoulder height.",
    ],
    cue: "The lean is the exercise. Keep it for every rep.",
    mistake: "Straightening up as you fatigue, which cancels the whole advantage.",
  },
  "Shoulders/lean-away-dumbbell-lateral-raise": {
    verdict: "Loads the top of the raise hard, but gives up the stretched position to do it.",
    setup: [
      "Hold a rack and lean your body away from it.",
      "Raise the free arm out to shoulder height.",
    ],
    cue: "Good as a second lateral variation, not your only one.",
    mistake: "Using it instead of a lean-in raise and never training the stretch.",
  },
  "Shoulders/super-rom-lateral-raise": {
    verdict: "A rare move that fully shortens the side delt, but it carries the same resistance-curve problem as a normal raise.",
    setup: [
      "Start with the dumbbells in front of your thighs.",
      "Sweep them out and up past shoulder height, finishing overhead.",
    ],
    cue: "Worth trying for the squeeze at the top; keep the weight genuinely light.",
    mistake: "Loading it like a normal lateral raise and turning it into a swing.",
  },
  "Shoulders/overhead-press": {
    verdict: "A great front-delt and pressing-strength builder, but the side delts barely participate.",
    setup: [
      "Bar on your front delts, hands just outside shoulder width.",
      "Brace hard, then press overhead, moving your head back out of the way.",
      "Finish with the bar over your mid-foot.",
    ],
    cue: "Squeeze your glutes to stop your lower back arching as you press.",
    mistake: "Leaning back until it becomes a standing incline press.",
  },
  "Shoulders/seated-overhead-press": {
    verdict: "Same as standing with less cheating available, which is good and bad.",
    setup: [
      "Set the bench upright, back supported.",
      "Press from chin height to just short of lockout.",
    ],
    cue: "Keep your ribs down and your lower back against the pad.",
    mistake: "Arching off the bench to grind out extra reps.",
  },
  "Shoulders/dumbbell-overhead-press": {
    verdict: "A longer range of motion than a barbell and each side has to work on its own.",
    setup: [
      "Dumbbells at shoulder height, palms forward or slightly turned in.",
      "Press up and slightly together.",
    ],
    cue: "Lower until your upper arms are just below parallel.",
    mistake: "Clanging the dumbbells together at the top and losing tension.",
  },
  "Shoulders/machine-shoulder-press": {
    verdict: "Fixed path, so you can push genuinely close to failure without the weight wandering.",
    setup: [
      "Set the seat so the handles sit level with your shoulders.",
      "Press up without locking out hard.",
    ],
    cue: "This is the safest place to train to failure. Use that.",
    mistake: "Setting the seat too low, which turns it into an incline chest press.",
  },

  /* ---------------- Biceps ---------------- */
  "Biceps/barbell-curl": {
    verdict: "Middling on its own merits, but so accessible and easy to load that it earns its place.",
    setup: [
      "Shoulder-width grip, elbows pinned at your sides.",
      "Curl up, then lower over about three seconds.",
    ],
    cue: "Keep your elbows from drifting forward — that is your shoulders joining in.",
    mistake: "Swinging the bar up with your lower back.",
  },
  "Biceps/ez-bar-curl": {
    verdict: "A barbell curl that is much kinder on the wrists, so most people can actually train hard on it.",
    setup: [
      "Grip the angled part of the bar, palms slightly turned in.",
      "Elbows at your sides, curl and lower under control.",
    ],
    cue: "If straight-bar curls bother your wrists, this is your default.",
    mistake: "Letting the elbows travel forward at the top to rest.",
  },
  "Biceps/standing-db-curl": {
    verdict: "Dumbbells let you turn your palm up as you curl, which is part of what the biceps actually does.",
    setup: [
      "Dumbbells at your sides, palms facing in.",
      "Curl and rotate your palm upward as you go.",
      "Lower slowly, rotating back.",
    ],
    cue: "Finish each rep with your little finger slightly higher than your thumb.",
    mistake: "Curling both arms with a body swing instead of alternating cleanly.",
  },
  "Biceps/db-preacher-curl": {
    verdict: "The preacher pad holds your arm in front of you, which loads the biceps hardest exactly where it is stretched.",
    setup: [
      "Set the pad so your armpit rests at the top of it.",
      "Let the arm straighten fully at the bottom.",
      "Curl up, then lower all the way back down.",
    ],
    cue: "Full extension at the bottom is the entire reason to do this one.",
    mistake: "Cutting the bottom short because it feels vulnerable. That is the rep.",
  },
  "Biceps/incline-curl": {
    verdict: "Lying back puts your arms behind your body, stretching the biceps more than any standing curl.",
    setup: [
      "Set a bench to about 45–60° and sit back against it.",
      "Let your arms hang straight down, slightly behind you.",
      "Curl without letting the elbows travel forward.",
    ],
    cue: "Keep your shoulders back on the pad so the stretch stays in the biceps.",
    mistake: "Shrugging forward off the bench to start the rep.",
  },
  "Biceps/lying-db-curl": {
    verdict: "An even more extreme stretched position than the incline curl.",
    setup: [
      "Lie flat on a bench with your arms hanging straight down either side.",
      "Curl up without moving your upper arm.",
    ],
    cue: "Go lighter than you expect. The bottom is very hard here.",
    mistake: "Using momentum from your shoulder to start each rep.",
  },
  "Biceps/scott-curl": {
    verdict: "The vertical arm position removes tension in the stretched position — a worse version of a 45° preacher curl.",
    setup: [
      "Set a steep preacher bench so your upper arm is near vertical.",
      "Curl from the bottom.",
    ],
    cue: "If a preacher bench is free, set it shallower and do a normal preacher curl instead.",
    mistake: "Picking it over the 45° version for no reason.",
    quote: "it's basically just a worse version of the 45 degree preacher curl",
  },
  "Biceps/flat-bench-curl": {
    verdict: "Decent, but it sits between the incline and preacher versions without beating either.",
    setup: [
      "Stand behind a flat bench set upright, chest against the pad.",
      "Let your arms hang and curl.",
    ],
    cue: "Keep your chest glued to the pad.",
    mistake: "Pushing off the pad with your chest to help the weight up.",
  },

  /* ---------------- Triceps ---------------- */
  "Triceps/overhead-cable-triceps-extension": {
    verdict: "Overhead means the long head is stretched, and a cable keeps tension on it the whole way.",
    setup: [
      "Set a rope at about head height and face away from the machine.",
      "Hands behind your head, upper arms beside your ears.",
      "Straighten your elbows without moving your upper arms.",
    ],
    cue: "Keep your upper arms locked beside your ears for every rep.",
    mistake: "Letting your elbows flare and drift forward, turning it into a press.",
  },
  "Triceps/katana-cable-triceps-extension": {
    verdict: "A superb stretched-position triceps move, held back only by a fiddly setup.",
    setup: [
      "Set two cables at about waist height.",
      "Grab each side's handle with the opposite hand so your arms cross overhead.",
      "Extend both arms out and forward at roughly 30–40°.",
    ],
    cue: "Getting in is the hard part — grab both, then turn through 180°.",
    mistake: "Setting the cables too high, which kills the stretch.",
  },
  "Triceps/dumbbell-french-press": {
    verdict: "Good stretch, but the dumbbell gets unwieldy and the bottom position can nag at your elbows.",
    setup: [
      "Sit upright holding one dumbbell overhead with both hands.",
      "Lower it behind your head, then extend.",
    ],
    cue: "Go slow at the bottom; this is where elbows complain.",
    mistake: "Loading it heavy. The cable version does the same job more comfortably.",
  },
  "Triceps/1-arm-dumbbell-overhead-extension": {
    verdict: "One arm at a time, with a deep stretch and an easy setup anywhere.",
    setup: [
      "Hold one dumbbell overhead, upper arm beside your ear.",
      "Lower behind your head, then straighten.",
    ],
    cue: "Hold your working elbow with your free hand to keep it still.",
    mistake: "Letting the elbow wander outward as you tire.",
  },
  "Triceps/skullcrusher": {
    verdict: "Lying down with the bar travelling past your head keeps the long head under a hard stretch.",
    setup: [
      "Lie on a flat bench, EZ bar held over your chest.",
      "Lower the bar to just past the top of your head, not your forehead.",
      "Extend without moving your upper arms.",
    ],
    cue: "Aim behind your head, not at it. That is what loads the stretch.",
    mistake: "Lowering straight to your forehead, which shortens the range and worries everyone nearby.",
  },
  "Triceps/dumbbell-skullcrusher": {
    verdict: "As good as the bar version on paper, just more awkward to control in practice.",
    setup: [
      "Lie flat with a dumbbell in each hand over your chest.",
      "Lower both past your head, then extend.",
    ],
    cue: "Keep the dumbbells travelling in a straight line.",
    mistake: "Letting each arm drift on its own path.",
  },
  "Triceps/jm-press": {
    verdict: "A hybrid of a close-grip bench and a skullcrusher; effective, but hard on elbows for a lot of people.",
    setup: [
      "Close-grip bench setup, hands about shoulder width.",
      "Lower the bar toward your chin, elbows travelling forward.",
      "Press back up.",
    ],
    cue: "Meet in the middle — not your chest, not behind your head.",
    mistake: "Pushing through elbow pain because it is a popular lift.",
  },
  "Triceps/smith-machine-jm-press": {
    verdict: "The fixed path makes it much easier to keep the work in your triceps instead of your chest and shoulders.",
    setup: [
      "Set the Smith bar at bench-press height.",
      "Lower toward your chin with elbows forward, then press.",
    ],
    cue: "Because the bar path is fixed, you can focus purely on pushing with the triceps.",
    mistake: "Setting up too far up or down the bench so the bar misses your chin line.",
  },

  /* ---------------- Quadriceps ---------------- */
  "Quadriceps/bosu-ball-squat": {
    verdict: "So unstable that your ankles do the stabilising, which caps how much tension ever reaches your quads.",
    setup: [
      "Don't. Squat on the floor.",
      "If balance work is the goal, train it separately from growing your legs.",
    ],
    cue: "Skip this entirely. Do a goblet or barbell squat instead.",
    mistake: "Believing instability makes an exercise harder in a way that builds muscle. It does not.",
    quote: "bosu ball squats are going straight to F tier",
  },
  "Quadriceps/barbell-back-squat": {
    verdict: "High quad tension in the deepest, most stretched position, and the easiest big lift to add weight to over years.",
    setup: [
      "Bar across your upper traps, feet about shoulder width, toes turned out slightly.",
      "Brace, then sit down between your hips.",
      "Descend to at least parallel and drive back up.",
    ],
    cue: "Push your knees out over your toes on the way down.",
    mistake: "Letting your hips shoot up first, which turns it into a good morning.",
    quote: "high tension on the quads deep in the hole when they're most stretched",
  },
  "Quadriceps/barbell-front-squat": {
    verdict: "More upright, so more quad and less lower back — but your upper back usually fails first.",
    setup: [
      "Bar resting on your front delts, elbows high.",
      "Squat straight down, chest tall.",
      "Stand back up keeping the elbows up.",
    ],
    cue: "Elbows up. The moment they drop, the bar rolls forward.",
    mistake: "Gripping with the hands instead of letting the shoulders carry the bar.",
  },
  "Quadriceps/low-bar-squat": {
    verdict: "Lets you move the most weight, but the extra forward lean shifts work toward your hips.",
    setup: [
      "Bar sits lower, across your rear delts.",
      "More forward lean, hips travel further back.",
    ],
    cue: "Choose this for strength. For quad size, high-bar beats it.",
    mistake: "Using it for quad growth and wondering why your glutes are the sore ones.",
  },
  "Quadriceps/hack-squat": {
    verdict: "A brilliant quad builder — the machine handles balance so your legs do all the work.",
    setup: [
      "Shoulders under the pads, feet mid-platform, shoulder width.",
      "Descend until your thighs pass parallel.",
      "Drive back up without locking out hard.",
    ],
    cue: "Because you cannot fall over, push genuinely close to failure.",
    mistake: "Placing your feet too high, which turns it into a glute exercise.",
  },
  "Quadriceps/pendulum-squat": {
    verdict: "Like a hack squat, but the arc feels more natural than a straight line.",
    setup: [
      "Shoulders under the pads, feet flat on the platform.",
      "Descend deep, then drive up along the arc.",
    ],
    cue: "If your gym has one, use it. Most do not.",
    mistake: "Skipping depth. The arc makes a deep squat feel good — take it.",
  },
  "Quadriceps/smith-machine-squat": {
    verdict: "The fixed bar path removes the balance problem, so you can place your feet purely for quad growth.",
    setup: [
      "Feet slightly forward of the bar, shoulder width.",
      "Descend to at least parallel, back against the fixed path.",
    ],
    cue: "Walk your feet forward a little — you cannot do that with a free bar.",
    mistake: "Standing with your feet directly under the bar, which makes it awkward and shallow.",
  },
  "Quadriceps/45-degree-leg-press": {
    verdict: "Feels good, easy to load heavily, and safe to push hard — just rarely as deep as a squat.",
    setup: [
      "Feet shoulder width, mid-platform.",
      "Lower until your knees approach your chest without your hips curling off the pad.",
      "Press back without locking your knees.",
    ],
    cue: "Chase depth, not plates. Depth is where the quad growth is.",
    mistake: "Loading it up and doing quarter reps.",
  },

  /* ---------------- Hamstrings ---------------- */
  "Hamstrings/hip-hinge": {
    verdict: "Not an exercise so much as the movement every hamstring exercise is built on. Learn it first.",
    setup: [
      "Stand tall, feet hip width, soft knees.",
      "Push your hips straight back, letting your chest drop.",
      "Stop when you feel the stretch; stand by squeezing your glutes.",
    ],
    cue: "Hips back, not down. Your knees barely move.",
    mistake: "Squatting instead of hinging, which takes the hamstrings out entirely.",
  },
  "Hamstrings/seated-leg-curl": {
    verdict: "Trains the hamstrings in a stretched position, which is where they grow most.",
    setup: [
      "Set the pad above your ankles, thigh pad locked down snug.",
      "Start with your legs almost straight.",
      "Curl your heels under the seat, then return slowly.",
    ],
    cue: "Let the legs straighten fully between reps — that stretch is the point.",
    mistake: "Lifting your hips off the seat to finish the rep.",
  },
  "Hamstrings/stiff-leg-deadlift": {
    verdict: "The big loadable hamstring stretch, as long as your back stays flat.",
    setup: [
      "Bar at arm's length, knees slightly bent and fixed.",
      "Push your hips back, bar grazing your legs.",
      "Stop at the stretch, then stand by driving your hips forward.",
    ],
    cue: "The bar stays in contact with your legs the whole way down.",
    mistake: "Chasing depth until your lower back rounds. Stop above that point.",
  },
  "Hamstrings/lying-leg-curl": {
    verdict: "Hits the hamstrings in a shortened position — a good partner to the seated version, not a replacement.",
    setup: [
      "Lie face down, pad just above your heels.",
      "Curl your heels toward your backside, then lower slowly.",
    ],
    cue: "Keep your hips pressed into the bench.",
    mistake: "Jerking your hips up to swing the weight.",
  },

  /* ---------------- Glutes ---------------- */
  "Glutes/barbell-hip-thrust": {
    verdict: "Outstanding in the shortened position, but it only trains half of what the glutes do — squats cover the stretch.",
    setup: [
      "Upper back on a bench, bar across your hips with a pad.",
      "Feet flat, shins vertical at the top.",
      "Drive your hips up until your body is straight, then lower.",
    ],
    cue: "Tuck your ribs down and chin in, then squeeze hard at the top.",
    mistake: "Finishing with a lower-back arch instead of a glute squeeze.",
  },
  "Glutes/machine-hip-thrust": {
    verdict: "Everything the barbell version does, without spending a minute setting it up.",
    setup: [
      "Sit in the machine, belt or pad across your hips.",
      "Drive your hips forward to lockout, then return under control.",
    ],
    cue: "Easier to set up means more hard sets. That is the advantage.",
    mistake: "Shortening the range because the machine makes rushing easy.",
  },
  "Glutes/single-leg-dumbbell-hip-thrust": {
    verdict: "One side at a time, which exposes and fixes side-to-side differences.",
    setup: [
      "Upper back on a bench, one foot planted, other leg lifted.",
      "Dumbbell on the working hip.",
      "Drive up through the planted heel.",
    ],
    cue: "Keep your hips level — do not let the free side drop.",
    mistake: "Pushing off the floor with the lifted leg.",
  },
  "Glutes/glute-bridge": {
    verdict: "A good starting point with less setup, but a shorter range than a hip thrust.",
    setup: [
      "Lie on the floor, knees bent, feet flat.",
      "Drive your hips up, squeeze, lower.",
    ],
    cue: "Ideal for learning the squeeze before you add a bench and a bar.",
    mistake: "Staying here once you can do twenty. Progress to a hip thrust.",
  },
  "Glutes/barbell-back-squat": {
    verdict: "Trains the glutes hard in the stretched position, which hip thrusts never do.",
    setup: [
      "Bar on your upper traps, feet shoulder width.",
      "Squat deep — below parallel is where the glutes take over.",
    ],
    cue: "Depth is what makes this a glute exercise. Half squats are quad work.",
    mistake: "Stopping at parallel and calling it glute training.",
  },
  "Glutes/smith-machine-squat": {
    verdict: "Lets you set your feet further forward than a free bar allows, which biases the glutes.",
    setup: [
      "Feet clearly forward of the bar.",
      "Sit down and back, going deep.",
    ],
    cue: "The further forward your feet, the more glute and the less quad.",
    mistake: "Setting up like a normal squat and losing the advantage.",
  },
  "Glutes/bulgarian-split-squat": {
    verdict: "A deep stretch under load on one leg at a time — about as good as glute training gets.",
    setup: [
      "Rear foot on a bench, front foot far enough forward to lean slightly.",
      "Drop straight down until your back knee is just off the floor.",
      "Drive up through the front heel.",
    ],
    cue: "Lean your torso forward slightly — that is what shifts it into the glute.",
    mistake: "Standing too upright and too close, which turns it into a quad exercise.",
  },
  "Glutes/kickback": {
    verdict: "Especially good for the upper glutes when you kick up and diagonally outward.",
    setup: [
      "Brace against the machine or a bench.",
      "Drive the working leg back and slightly out, on a diagonal.",
      "Return under control.",
    ],
    cue: "Up and out, not just up. The diagonal is what reaches the upper glute.",
    mistake: "Arching your lower back to get more range.",
    quote: "the upper glute fibers perform both hip extension and hip abduction",
  },

  /* ---------------- Calves ---------------- */
  "Calves/calf-raises": {
    verdict: "The whole calf story: do them standing for the upper calf, seated for the lower, and go all the way through the range.",
    setup: [
      "Stand with the balls of your feet on a step or platform.",
      "Drop your heels as far below as your ankles allow and pause.",
      "Rise onto your toes and hold for a beat.",
    ],
    cue: "Pause two seconds at the bottom so your tendon stops doing the work.",
    mistake: "Bouncing. Hopping through reps trains the Achilles, not the muscle.",
  },


  /* ---- added for exercises surfaced by the extraction pipeline ---- */

  "Shoulders/upright-row": {
    verdict:
      "Builds side delts and traps, but the narrow-grip version pinches the shoulder for a lot of people.",
    setup: [
      "Grip the bar at about shoulder width — not narrow.",
      "Pull your elbows up and out to the sides, stopping at chest height.",
      "Lower under control.",
    ],
    cue: "Stop when your upper arms reach shoulder level. Higher is where shoulders complain.",
    mistake:
      "A narrow grip pulled up to the chin. If you feel a pinch at the top, widen the grip or do lateral raises instead.",
  },
  "Shoulders/cable-lateral-raise": {
    verdict:
      "A cable keeps tension on the side delt at the bottom, which is exactly where a dumbbell loses it.",
    setup: [
      "Set the pulley at the lowest point and stand side-on to it.",
      "Take the handle in the far hand so the cable crosses in front of you.",
      "Raise out to shoulder height, leading with the elbow.",
    ],
    cue: "The cable should stay taut at the bottom — never let the stack touch down between reps.",
    mistake: "Standing too close, which kills the tension in the stretched position.",
  },
  "Triceps/cable-pushdown": {
    verdict:
      "The easiest triceps movement to do correctly, and smooth tension the whole way through.",
    setup: [
      "Attach a rope or bar at upper-chest height.",
      "Elbows pinned to your ribs, lean forward slightly.",
      "Straighten your arms fully, then let the weight return to a bent elbow.",
    ],
    cue: "Only your forearm moves. If your elbows drift forward, drop the weight.",
    mistake: "Leaning hard over the bar and pressing with your chest and shoulders.",
  },
  "Biceps/hammer-curl": {
    verdict:
      "The neutral grip shifts work onto the brachialis underneath the biceps, which pushes the whole arm wider.",
    setup: [
      "Dumbbells at your sides, palms facing each other.",
      "Curl straight up without rotating your wrist.",
      "Lower slowly.",
    ],
    cue: "Keep the palms facing in for the entire rep — that is the only thing separating this from a normal curl.",
    mistake: "Swinging the weights up with your shoulders because hammer curls let you go heavier.",
  },
  "Quadriceps/squat": {
    verdict:
      "The most-discussed exercise in the whole corpus, and the one that loads the quads hardest in a deep, stretched position.",
    setup: [
      "Bar on your upper traps, feet about shoulder width, toes turned out slightly.",
      "Take a big breath, brace your stomach, then sit down between your hips.",
      "Descend to at least parallel and drive back up.",
    ],
    cue: "Push your knees out over your toes on the way down.",
    mistake: "Hips rising first out of the bottom, which turns it into a good morning.",
  },
  "Quadriceps/deadlift": {
    verdict:
      "A tremendous whole-body lift, but it is a hip hinge — your quads only help off the floor.",
    setup: [
      "Bar over mid-foot, shins almost touching.",
      "Hinge down, grip just outside your knees, chest up and back flat.",
      "Push the floor away and stand, keeping the bar against your legs.",
    ],
    cue: "Think 'push the floor', not 'pull the bar'.",
    mistake: "Counting it as quad training. For quads, squat instead — this trains your back and hips.",
  },
  "Quadriceps/leg-extension": {
    verdict:
      "Pure quad isolation with no balance or lower-back limit, so you can push genuinely close to failure.",
    setup: [
      "Set the back pad so your knee lines up with the machine's pivot.",
      "Pad resting on your shins, just above the ankle.",
      "Straighten your legs fully, pause, then lower under control.",
    ],
    cue: "Pause a beat at the top with the quads squeezed — that is the whole exercise.",
    mistake: "Swinging the weight up and letting it drop back. Slow the lowering down.",
  },
  "Glutes/deadlift": {
    verdict:
      "A genuinely good glute builder, because it loads hip extension with heavy weight you can keep adding to.",
    setup: [
      "Bar over mid-foot, hinge down and grip just outside your knees.",
      "Chest up, back flat, hips lower than your shoulders.",
      "Stand by driving your hips forward and squeezing your glutes at the top.",
    ],
    cue: "Finish by squeezing your glutes, not by leaning back.",
    mistake: "Rounding your lower back to reach the bar. Raise the bar on blocks instead.",
  },
  "Glutes/romanian-deadlift": {
    verdict:
      "Trains the glutes and hamstrings in the stretched position, which hip thrusts never reach.",
    setup: [
      "Stand holding the bar at arm's length, knees slightly bent and fixed.",
      "Push your hips straight back, letting the bar graze your thighs.",
      "Stop at the stretch, then drive your hips forward to stand.",
    ],
    cue: "Hips back, not down. The bar stays in contact with your legs the whole way.",
    mistake: "Chasing depth until your lower back rounds. Stop above that point, even if it is above your knees.",
  },
  "Glutes/hip-thrust": {
    verdict:
      "Loads the glutes hardest at full lockout, where almost nothing else does.",
    setup: [
      "Upper back against a bench, bar across your hips with a pad.",
      "Feet flat, far enough forward that your shins are vertical at the top.",
      "Drive your hips up until your body is straight, then lower.",
    ],
    cue: "Tuck your ribs down and your chin in, then squeeze hard at the top.",
    mistake: "Finishing with a lower-back arch instead of a glute squeeze.",
  },

  /* ---------------- Forearms ---------------- */
  "Forearms/reverse-grip-curl": {
    verdict: "The core forearm builder — palms-down curling trains the muscles on top of your forearm.",
    setup: [
      "Hold an EZ or straight bar with palms facing down.",
      "Elbows at your sides, curl up without letting the wrists bend back.",
      "Lower slowly.",
    ],
    cue: "Keep your wrists locked straight for the whole set.",
    mistake: "Going heavy. Your grip fails long before the muscle is trained.",
  },
  "Forearms/top-half-reverse-curl": {
    verdict: "Only the top half of the movement, where the forearm muscles work hardest.",
    setup: [
      "Start a reverse curl from around 90° rather than straight arms.",
      "Curl to the top and lower back to halfway.",
    ],
    cue: "Grip the bar hard and high in your palm throughout.",
    mistake: "Letting the bar roll down into your fingers, which makes it easier and trains less.",
    quote: "letting the bar rest in your hand will make the lift easier",
  },
};

/** Look up coaching for one exercise; missing entries simply render without it. */
export function coachingFor(muscle: string, slug: string): ExerciseCoaching | undefined {
  return EXERCISES[`${muscle}/${slug}`];
}

(function () {
  // ============================================================
  // IMPORTANT NOTES (read before editing)
  //
  // 1. The MutationObserver below (`mo`) watches poster-active on the
  //    SAME element it also mutates (lid-open/crt-visible/etc.).
  //    classList.add()/remove() always re-fires the observer even as a
  //    no-op, so without `wasActive` edge-triggering this loops forever
  //    (froze the tab once already). Only act when poster-active itself
  //    actually flips.
  // 2. Any multi-phase class-toggle animation (travel/wobble) must swap
  //    the old class out and the new class in in the SAME step. A gap
  //    with no matching class present makes the disc fall back to its
  //    jittered open-state transform and visibly snap there — hit twice
  //    during development.
  // 3. DISC_WOBBLE_ENABLED is a clean on/off switch — when false, the
  //    disc skips straight to disk-travel-3 with no other code changes
  //    needed.
  // 4. settleGeneration guards against a transitionend from an
  //    interrupted PREVIOUS open cycle counting toward the current one.
  // 5. Setting scrollTop while an element (or ancestor) is [hidden]
  //    (display:none) doesn't stick — no layout box to scroll, so the
  //    write is silently dropped, and un-hiding it later restores
  //    whatever scroll position it had the LAST time it was visible
  //    instead. Reset scroll position AFTER unhiding, not before (see
  //    showTextProjectScreen) — hit once already.
  // 6. See Posters/FloppyCase.html's own Important Notes for the CSS-
  //    side lessons (z-index/stacking context, transform-origin,
  //    perspective-origin, the .FloppyCrt img specificity trap).
  //
  // See "ADDING NEW DISKS AND SKINS", "ADDING NEW PROJECT SCREENS", and
  // "ADDING NEW WIKI-STYLE FLOPPY SCREENS" at the bottom of this file.
  // ============================================================

  // ============================================================
  // Open/close timing
  // ============================================================
  const LID_OPEN_DELAY = 400; // ms after poster-active before the lid starts sliding
  const LID_TRAVEL_DISTANCE = 1200; // px the lid slides up
  const LID_ANIMATION_DURATION = 500; // ms lid slide duration

  const CRT_SLIDE_EXTRA_TIME = 500; // ms breathing room added on top of lid+disc timing

  // ============================================================
  // Disc stacks
  // ============================================================
  const DISK_SIZE = 420; // px — native FloppyDiskPlaceholder.png size
  const DISK_STACK_Y_BASE = 60; // px — shared closed-position anchor for every stack
  const DISK_CLOSED_STEP = 4; // px — per-disc closed offset (depth while shut)
  const DISK_OPEN_BASE_OFFSET = -200; // px disc 1 travels on open
  const DISK_OPEN_DISPLACEMENT = -100; // px extra travel per subsequent disc
  const DISK_OPEN_SPEED = 800; // px/sec — constant speed, farther discs take longer
  const DISK_OPEN_START_DELAY = 150; // ms after the lid starts moving
  const DISK_CLOSE_DURATION = 150; // ms — fast, fixed, identical for every disc

  // Per-stack count + shared X offset — add more entries for more stacks
  const DISK_STACK_1_COUNT = 3;
  const DISK_STACK_1_X = 37; // px
  const DISK_STACK_2_COUNT = 5;
  const DISK_STACK_2_X = 472; // px
  const DISK_STACK_3_COUNT = 4;
  const DISK_STACK_3_X = 902; // px

  const DISK_STACKS = [
    { count: DISK_STACK_1_COUNT, xOffset: DISK_STACK_1_X },
    { count: DISK_STACK_2_COUNT, xOffset: DISK_STACK_2_X },
    { count: DISK_STACK_3_COUNT, xOffset: DISK_STACK_3_X },
  ];

  // Per-disk skins — see "ADDING NEW DISKS AND SKINS" at the bottom of this file
  const DISK_PLACEHOLDER_SRC =
    "Assets/FloppyDiskCodeBase/FloppyDiskPlaceholder.png";
  const DISK_SKINS = {
    "1-1": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy1-1.png",
    "1-2": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy1-2.png",
    "1-3": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy1-3.png",
    "2-1": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy2-1.png",
    "2-2": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy2-2.png",
    "2-3": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy2-3.png",
    "2-4": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy2-4.png",
    "2-5": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy2-5.png",
    "3-1": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy3-1.png",
    "3-2": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy3-2.png",
    "3-3": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy3-3.png",
    "3-4": "Assets/FloppyDiskCodeBase/FloppyDisks/Floppy3-4.png",
  };

  function getDiskSkin(stackNumber, diskIndex) {
    return DISK_SKINS[`${stackNumber}-${diskIndex}`] || DISK_PLACEHOLDER_SRC;
  }

  function createDiskStacks(poster) {
    poster.style.setProperty("--diskSize", `${DISK_SIZE}px`);
    poster.style.setProperty("--diskCloseDuration", `${DISK_CLOSE_DURATION}ms`);
    poster.style.setProperty(
      "--diskOpenStartDelay",
      `${DISK_OPEN_START_DELAY}ms`,
    );

    DISK_STACKS.forEach((stack, stackIndex) => {
      for (let i = 1; i <= stack.count; i++) {
        const closedY = DISK_STACK_Y_BASE + (i - 1) * DISK_CLOSED_STEP;
        // distance from closed position, not an absolute Y
        const openTravel =
          DISK_OPEN_BASE_OFFSET + (i - 1) * DISK_OPEN_DISPLACEMENT;
        const openY = closedY + openTravel;
        // constant speed, not constant duration
        const openDuration = (Math.abs(openTravel) / DISK_OPEN_SPEED) * 1000;
        // must stay within 1-100 (below the lid at 101); per-stack, not global
        const zIndex = Math.max(1, Math.min(100, 101 - i));

        const disk = document.createElement("img");
        disk.src = getDiskSkin(stackIndex + 1, i);
        disk.alt = `Floppy disk stack ${stackIndex + 1}, disc ${i}`;
        disk.className = "FloppyDisk";
        disk.dataset.diskIndex = i;
        disk.dataset.stackNumber = stackIndex + 1;
        disk.style.zIndex = zIndex;
        disk.style.setProperty("--diskStackX", `${stack.xOffset}px`);
        disk.style.setProperty("--diskClosedY", `${closedY}px`);
        disk.style.setProperty("--diskOpenY", `${openY}px`);
        disk.style.setProperty("--diskOpenDuration", `${openDuration}ms`);
        poster.appendChild(disk);
      }
    });
  }

  // One hitbox per stack, reusing that stack's own X offset
  function createStackHitboxes(poster) {
    DISK_STACKS.forEach((stack, stackIndex) => {
      const hitbox = document.createElement("div");
      hitbox.className = "FloppyStackHitbox";
      hitbox.dataset.stackNumber = stackIndex + 1;
      hitbox.style.left = `${stack.xOffset}px`;
      poster.appendChild(hitbox);
    });
  }

  // Fan-out randomization — fresh jitter each open, disc 1 excluded, never cumulative between discs
  const DISK_RANDOM_POSITION_JITTER = 10; // px, +/- range
  const DISK_RANDOM_ROTATION_JITTER = 2; // deg, +/- range

  function randomJitter(range) {
    return (Math.random() * 2 - 1) * range;
  }

  function randomizeDiskFanning(poster) {
    poster.querySelectorAll(".FloppyDisk").forEach((disk) => {
      if (disk.dataset.diskIndex === "1") return;
      disk.style.setProperty(
        "--diskOpenJitterX",
        `${randomJitter(DISK_RANDOM_POSITION_JITTER)}px`,
      );
      disk.style.setProperty(
        "--diskOpenJitterY",
        `${randomJitter(DISK_RANDOM_POSITION_JITTER)}px`,
      );
      disk.style.setProperty(
        "--diskOpenRotate",
        `${randomJitter(DISK_RANDOM_ROTATION_JITTER)}deg`,
      );
    });
  }

  // ============================================================
  // Disc selection — hover + scroll. Gated on stacksSettled (every disc
  // finished its open transition), enforced in both JS and CSS.
  // ============================================================
  // Scroll pacing — accumulate delta rather than time-debounce; first
  // step of a burst fires instantly, remaining queued steps drain in
  // roughly DISK_SCROLL_BURST_BASELINE_MS total regardless of count.
  const DISK_SCROLL_BURST_BASELINE_MS = 180;
  const DISK_SCROLL_MIN_STEP_MS = 30; // floor per-step time in a big burst
  const DISK_SCROLL_STEP_THRESHOLD = 100; // accumulated wheel delta per index step

  let stacksSettled = false;
  let settleGeneration = 0;
  let selectedStack = 0; // 0 = none, 1-3 = hovered stack
  let selectedIndex = 1;
  let scrollAccumulator = 0;
  let pendingScrollSteps = [];
  let scrollBurstTimer = null;

  function stackDiscCount(stackNumber) {
    const stack = DISK_STACKS[stackNumber - 1];
    return stack ? stack.count : 0;
  }

  // Drives both the glow (disk-hover-highlight) and the pop-preview lift (disk-popped)
  function updateSelectionVisuals(poster) {
    poster
      .querySelectorAll(
        ".FloppyDisk.disk-hover-highlight, .FloppyDisk.disk-popped",
      )
      .forEach((disk) => {
        disk.classList.remove("disk-hover-highlight", "disk-popped");
      });
    if (selectedStack === 0) return;
    const target = poster.querySelector(
      `.FloppyDisk[data-stack-number="${selectedStack}"][data-disk-index="${selectedIndex}"]`,
    );
    if (target) target.classList.add("disk-hover-highlight", "disk-popped");
  }

  function setSelection(poster, stackNumber, index) {
    selectedStack = stackNumber;
    selectedIndex = index;
    updateSelectionVisuals(poster);
  }

  function clearScrollBurst() {
    scrollAccumulator = 0;
    pendingScrollSteps.length = 0;
    if (scrollBurstTimer !== null) {
      clearTimeout(scrollBurstTimer);
      scrollBurstTimer = null;
    }
  }

  // Plays queued steps one at a time; the first step of a burst fires synchronously from the wheel handler
  function playNextScrollStep(poster) {
    if (pendingScrollSteps.length === 0) {
      scrollBurstTimer = null;
      return;
    }
    const direction = pendingScrollSteps.shift();
    const maxIndex = stackDiscCount(selectedStack);
    const nextIndex = Math.max(
      1,
      Math.min(maxIndex, selectedIndex + direction),
    );
    setSelection(poster, selectedStack, nextIndex);

    if (pendingScrollSteps.length === 0) {
      scrollBurstTimer = null;
      return;
    }
    // recomputed every step so a burst still adapts if more input arrives mid-burst
    const perStepDuration = Math.max(
      DISK_SCROLL_MIN_STEP_MS,
      DISK_SCROLL_BURST_BASELINE_MS / (pendingScrollSteps.length + 1),
    );
    scrollBurstTimer = setTimeout(
      () => playNextScrollStep(poster),
      perStepDuration,
    );
  }

  // ============================================================
  // Click-to-travel — travel+shrink -> pause -> rotate -> pause -> slot in.
  // Durations are needed here (not just CSS) since JS schedules each
  // phase's follow-up; pushed into CSS custom properties so this file
  // stays the single source of truth.
  // ============================================================
  const DISC_TRAVEL_DURATION_MS = 450; // phase 1: home -> pre-rotation, shrinking throughout
  const DISC_PAUSE_AFTER_TRAVEL_MS = 50; // phase 2: pause before rotating
  const DISC_ROTATE_DURATION_MS = 500; // phase 3: lean-away rotation
  const DISC_PAUSE_AFTER_ROTATE_MS = 150; // phase 4: pause before the slot-in move
  const DISC_SLOT_IN_DURATION_MS = 400; // phase 5 (final beat): remaining travel -> final slot position

  // Slot-in wobble — approach, then two hesitation beats before the final settle
  const DISC_WOBBLE_ENABLED = true;
  const DISC_PRE_WOBBLE_APPROACH_DURATION_MS = 250; // plain advance before any wobbling starts
  const DISC_WOBBLE_BEAT_DURATION_MS = 220; // each hesitation beat's own movement
  const DISC_WOBBLE_PAUSE_MS = 150; // pause before wobble-2 and before the final settle

  // Retract — reverse of the travel sequence for a disc being deselected
  // in favor of a newly-clicked one. No wobble; quicker than forward.
  const DISC_RETRACT_DURATION_MS = 250; // slot -> pre-rotation, unrotating
  const DISC_RETRACT_PAUSE_MS = 100; // short pause once back at pre-rotation
  const DISC_RETRACT_HOME_DURATION_MS = 300; // pre-rotation -> home stack position

  let travelingDisk = null; // non-null while a disc is mid-forward-travel
  let retractingDisk = null; // non-null while a disc is mid-retract
  let pluggedDiskElement = null; // the actual <img> currently plugged in, or null

  // Floppy-plugged state — true once a disc finishes its travel and
  // arrives at the slot; false again on close. Mirrored as "floppy-plugged".
  let floppyPlugged = false;
  let pluggedDisk = null;

  function setFloppyPlugged(poster, disk, stackNumber, diskIndex) {
    floppyPlugged = true;
    pluggedDisk = { stackNumber, diskIndex };
    pluggedDiskElement = disk;
    poster.classList.add("floppy-plugged");
  }

  function clearFloppyPlugged(poster) {
    floppyPlugged = false;
    pluggedDisk = null;
    pluggedDiskElement = null;
    poster.classList.remove("floppy-plugged");
  }

  // Reverse of the travel sequence — quick, no wobble. Used when a
  // different disc is selected while this one is still plugged in.
  function retractDisk(disk) {
    retractingDisk = disk;
    disk.classList.remove(
      "disk-hover-highlight",
      "disk-popped",
      "disk-travel-1",
      "disk-travel-2",
      "disk-travel-3",
      "disk-travel-3-approach",
      "disk-travel-3-wobble-1",
      "disk-travel-3-wobble-2",
    );
    disk.style.setProperty(
      "--discRetractDuration",
      `${DISC_RETRACT_DURATION_MS}ms`,
    );
    disk.style.setProperty(
      "--discRetractHomeDuration",
      `${DISC_RETRACT_HOME_DURATION_MS}ms`,
    );
    disk.style.setProperty(
      "--discRetractPauseDelay",
      `${DISC_RETRACT_PAUSE_MS}ms`,
    );

    disk.classList.add("disk-retract-1");

    setTimeout(() => {
      disk.classList.remove("disk-retract-1");
      disk.classList.add("disk-retract-2");
      setTimeout(() => {
        disk.classList.remove("disk-retract-2");
        if (retractingDisk === disk) retractingDisk = null;
      }, DISC_RETRACT_PAUSE_MS + DISC_RETRACT_HOME_DURATION_MS);
    }, DISC_RETRACT_DURATION_MS);
  }

  // For a future screen implementation — currently-plugged disc's skin, or null
  function getPluggedDiskSkin() {
    if (!pluggedDisk) return null;
    return getDiskSkin(pluggedDisk.stackNumber, pluggedDisk.diskIndex);
  }

  // ============================================================
  // CRT screen — boot/idle text, then per-project content once a disc
  // is fully plugged in. Renders into .FloppyCrtScreen
  // (Posters/FloppyCase.html), between the CRT's Back and Foot layers.
  // ============================================================
  const CRT_BOOT_LINE_1_TEXT = "KC-OS v1.0 INITIALIZING...";
  const CRT_BOOT_LINE_2_TEXT = "KC BULLETIN";
  const CRT_AWAITING_TEXT = "AWAITING FLOPPY DISK";
  const CRT_DETECTED_TEXT = "FLOPPY DISK DETECTED";
  const CRT_NO_SIGNAL_TEXT = "NO SIGNAL"; // shown if a disc has no matching ProjectScreens PNG yet
  const CRT_ELLIPSIS_FRAMES = ["", ".", "..", "..."];

  // Line 1 is already on screen the instant the CRT appears (no delay).
  const CRT_BOOT_LINE_2_DELAY_MS = 1000; // line 2 appears this long after
  const CRT_BOOT_GAP_DELAY_MS = 700; // then the awaiting-disk prompt starts this long after line 2
  const CRT_ELLIPSIS_FRAME_MS = 800; // each ellipsis frame's hold time

  const PROJECT_SCREEN_DIR = "Assets/FloppyDiskCodeBase/ProjectScreens/";

  let crtBootTimers = [];
  let crtEllipsisTimer = null;
  let crtEllipsisFrameIndex = 0;
  // Two independent line groups, composed by renderCrtText: header lines
  // (the two filler/boot lines) and status lines (awaiting/detected).
  let crtHeaderLines = [];
  let crtStatusLines = [];

  function crtTextEl(poster) {
    return poster.querySelector(".FloppyCrtText");
  }

  function crtImageEl(poster) {
    return poster.querySelector(".FloppyCrtProjectImage");
  }

  function getProjectScreenSrc(stackNumber, diskIndex) {
    return `${PROJECT_SCREEN_DIR}Screen${stackNumber}-${diskIndex}.png`;
  }

  // Text-entry project screens ("wiki-style" floppies) — see "ADDING NEW
  // WIKI-STYLE FLOPPY SCREENS" at the bottom of this file for the shape.
  const TEXT_PROJECT_SCREENS = {
    "3-1": {
      title: "ENTRY 3-1",
      titleImage: "Assets/FloppyDiskCodeBase/CrtMosiacTitle.png",
      intro: [
        "Project Mosaic isn't a game I built once and finished — it's the project I keep coming back to, three separate times across three different eras of learning to code, using it as a testing ground for whatever I'd just picked up. Type systems, procedural generation with guaranteed invariants, deterministic simulation, automated regression testing, a maintained decision log — each one landed in this codebase specifically because I'd just learned it and wanted a real place to prove I actually understood it, not just that I could follow a tutorial.",
        "What's here now is Floor 1 of a fully playtested, solo-built ASCII roguelike: a hermit crab navigating procedurally generated underwater dungeons, scavenging junk-drawer items — bottle caps, fishing hooks, glass shards — that blindly identify on pickup, permanently equip across seven slots, and never let you see a run coming twice. No sprites, no hand-drawn tiles — every enemy, every item, every room is text and Unicode, because the constraint was chosen, not settled for.",
        "The game is really the byproduct. The actual throughline is that every time I got better at this, Mosaic got better too — and here's what that adds up to:",
      ],
      stats: [
        { num: "~15,200", label: "lines of Python" },
        { num: "10", label: "CSV-driven data tables" },
        { num: "7", label: "headless automated test suites" },
        { num: "68", label: "documented engineering rounds" },
      ],
      sections: [
        {
          id: "crt-text-section-1",
          heading: "History",
          paragraphs: [
            "Project Mosaic has been built three times.",
            "The first version, in middle school, was two people teaching themselves Python with no prior experience. It became a browser-toggle dungeon crawler rendered into a 10x10 console grid, seeded by typed-in text, with movement and a tile legend working end to end. The seed-driven generation idea was already there, and it still runs the current build. It never got further than that, because neither of us had the experience yet to build the systems the game actually needed.",
            "The second version, in high school, is where the real game design happened: a hermit crab theme, an item system with type-based buffs and dynamically weighted loot rarity, and a character-class layer that reused the same stats items already modified instead of a second system. Most of what makes the current build's systems coherent was worked out here first. It stalled because the focus shifted to how it looked and sounded and what it could become, and none of it ever turned into a finished, playable game.",
            "The third version, built in 2026, took the systems that already worked and brought in a couple extra years of coding experience, finally turning them into something complete: ASCII and Unicode only, no art pipeline to maintain, playtested against real feedback, and engineered to hold up like a codebase meant to last.",
          ],
        },
        {
          id: "crt-text-section-2",
          heading: "Procedural Generation",
          paragraphs: [
            "Runtime dungeon generation built from graph theory and pathfinding primitives — not layered noise, not a hand-authored layout.",
          ],
          cards: [
            {
              title: "Constructive random-walk generation",
              description:
                "Instead of generating a layout and checking afterward whether it holds together, this generator makes connectivity impossible to break: every new cell is carved directly adjacent to one already connected, so the result is guaranteed connected as a property of how it's built, not something validated after the fact. A directional bias term keeps the walk moving toward a target instead of wandering forever.",
              spec: "max_steps = width × height × 40, with a guaranteed fallback corridor if the walk doesn't converge.",
            },
            {
              title: "0-1 BFS shortest-path search",
              description:
                "A specialized search for graphs where every edge costs either 0 or 1: zero-cost moves get pushed to the front of a deque, unit-cost moves to the back, which reproduces Dijkstra's correctness in linear time without needing a priority queue. Used to reconnect any part of a generated floor that ends up isolated.",
              spec: "Repairs any disconnected floor pocket left over from softlock prevention, repeated until none remain.",
            },
            {
              title: "Directed-graph reachability analysis",
              description:
                "Dungeon layout is generated as a graph first and rendered second — a room's position in that graph, not its position on screen, determines what's allowed to spawn there. A separate breadth-first pass computes each room's real depth from the entrance, and that depth is what content placement actually checks against.",
              spec: "No dangerous enemy can spawn in the first two rooms, on either branch path, regardless of which one a run takes.",
            },
          ],
        },
        {
          id: "crt-text-section-3",
          heading: "Generation Detail & Deterministic Seeding",
          tocLabel: "Gen/Seeding",
          paragraphs: [
            "Where the generation gets its texture and its reproducibility — organic shapes built from math instead of art, and randomness that's fully seedable without becoming exploitable.",
          ],
          cards: [
            {
              title: "Harmonic synthesis for landmark silhouettes",
              description:
                "Irregular, natural-looking room shapes are generated by summing several randomized sine waves around a base radius, rather than hand-drawing a shape or running an expensive noise field. A handful of parameters produce a different, non-repeating outline every time.",
              spec: "3-5 independently randomized harmonics (amplitude, frequency, phase) per silhouette.",
            },
            {
              title: "Parametric curves fixing a visual defect",
              description:
                "Straight-line room edges were reading as obviously artificial. Replacing them with quadratic Bézier curves bowed through a control point fixed it — the standard way to get organic-looking curvature instead of hard angles.",
              spec: "Every straight room edge replaced with a Bézier curve bowed through one control point.",
            },
            {
              title: "Separating odds from outcome",
              description:
                'Any system where a deterministic input can shift an outcome risks that input being farmed for a guaranteed result. Fixed by splitting "how likely is this" (computed deterministically from input) from "did it actually happen" (real randomness) — the same separation a fair gambling system relies on between house edge and the actual draw.',
              spec: "chance = 0.05 + 0.30 × (vowels / letters) — nudgeable, never guaranteed.",
            },
          ],
        },
        {
          id: "crt-text-section-4",
          heading: "Combat & Simulation Design",
          tocLabel: "Simulation",
          paragraphs: [
            "The rules combat actually runs on — formulas engineered around specific edge cases, and a correction system that can reach back into a result already computed.",
          ],
          cards: [
            {
              title:
                "An asymmetric damage floor that closes a guaranteed-loss edge case",
              description:
                "One formula serving both attacker and defender needed different guarantees depending on which side it applied to. The fix is a single piecewise rule: no combination of stats can floor the player's outgoing damage to zero, while the same isn't true in reverse.",
              spec: "damage = max(floor, ATK − 0.5 × DEF), floor = 1 except against a weak enough attacker.",
            },
            {
              title:
                "Reaching back into a resolved computation to apply a correction",
              description:
                "Certain effects need to retroactively change something the game already fully calculated — recomputing exactly what a removed input would have changed to every downstream total, entirely separate from and before anything about how it's displayed. That correction is then handed to its own independently-timed animation sequence once the actual result is finalized.",
              spec: "slide_in → fade_favor → hold → fade_sacrifice → pop → fade_out, each stage timed independently.",
            },
          ],
        },
        {
          id: "crt-text-section-5",
          heading: "Systems & Content Architecture",
          tocLabel: "Architecture",
          paragraphs: [
            "How the game separates what the player experiences from how it's actually built underneath — hidden scoring targets, and content that's entirely data, never code.",
          ],
          cards: [
            {
              title: "Scoring what the player can't see, not what they can",
              description:
                "The bone-dig minigame scores your input against a hidden reference path that never gets displayed — what you see on screen isn't what's actually being measured. That separation between the visible representation and the real scoring target is what keeps the puzzle from being solvable by just tracing what's on screen.",
              spec: "Tight ≤ 10px, stray ≥ 26px — Pristine requires 60%+ of samples tight.",
            },
            {
              title: "Content lives as data, not code",
              description:
                "Every enemy, item, effect, and event is defined in external tables the game reads, not hardcoded by name anywhere in the logic. Adding new content is a data-entry change, never a code change.",
              spec: "10 tables: enemies, items, effects, shells, events, event_effects, event_outcomes, landmarks, modifiers, bosses.",
            },
          ],
        },
        {
          id: "crt-text-section-6",
          heading: "Playtesting & Iteration",
          tocLabel: "Playtesting",
          paragraphs: [
            "Floor 1 has been through real playtesting, not just self-testing — a small group of players working through it on Discord, reporting back what actually broke the game rather than what was supposed to work. The clearest example: high DEF builds were trivializing combat almost entirely, a problem that only showed up once real players started optimizing for survival instead of playing the way the systems were designed around. The fix was Over-Encumbered — stacking too much DEF starts costing SPD, with matching tradeoffs planned for ATK and SPD so no single stat can be maxed for free. The goal wasn't to punish any specific build, just to make sure every stat came with a real cost attached to it.",
          ],
        },
        {
          id: "crt-text-section-7",
          heading: "What's Next",
          paragraphs: [
            "Floor 1 is done, but the project isn't. Floor 2, new enemies, new events, new items, and new mechanics are all still ahead — this is Floor 1 of a game that's meant to keep growing. The most significant thing in active development right now is a boss that remembers: a local, on-device system that tracks how you've fought it across attempts and adjusts its patterns in response, so repeating the same strategy stops working the more you rely on it. Nothing about it phones home — whatever it learns about how you play stays on your machine.",
            "More on that soon.",
          ],
        },
      ],
      nextDisk: { stackNumber: 3, diskIndex: 2 },
      nextDiskNotice: "DISK FULL — INSERT NEXT FLOPPY TO CONTINUE",
    },

    // Particle Playground — leaner than Mosaic: no stats strip, three
    // sections (one per simulation), then a screenshot + external link.
    // Own palette (see [data-entry="1-2"] in Posters/FloppyCase.html);
    // each section's `accent` recolors its heading/cards.
    "1-2": {
      title: "PARTICLE SIM",
      titleText: "PARTICLE SIM", // text stand-in until a real title graphic exists; swap for titleImage later
      intro: [
        "I got interested in this because of a slime mold. <em>Physarum polycephalum</em> is the mold behind the Tokyo rail experiment: researchers put food at the stations, let it grow, and watched it converge on a network almost identical to what human engineers had designed by hand over decades. A single-celled organism finding efficient structure out of nothing but a few local rules. I wanted to see that happen myself, not just read about it.",
        "Building it pulled me into particle-based simulation more broadly: flocking, spatial hashing, real-time audio analysis, each one its own small rabbit hole in making a few simple-minded local rules add up to something that looks intelligent from a distance. Boids and the audio-reactive mode grew out of that same curiosity, not out of a plan. It's all live, so if you want to mess around with the particles yourself, the Playground is linked at the bottom of this page, and if it ever grows into something more, that will be linked there too.",
      ],
      // Bottom-of-page TOC entry: scrolls to the very end (see tocBottom)
      tocBottom: "Try It",
      sections: [
        {
          id: "crt-text-section-1",
          heading: "Slime Mold",
          accent: "var(--crtPpTeal)",
          paragraphs: [
            "Based on Jeff Jones' 2010 model of Physarum. Each agent does one thing: sniff the scent trail at three points ahead of it, turn toward the strongest, step forward, and leave scent behind. Nobody draws the network. It emerges from that one rule feeding back on itself.",
            "Up to three species can share the world, each with its own scent channel and color. Rivals form braided, interleaving highways that never share a lane.",
          ],
          cards: [
            {
              title: "Trail map as raw memory",
              description:
                "The scent trail is a Float32Array, not canvas pixels, so agents read and write plain memory. The only canvas work per frame is one putImageData and one scaled drawImage.",
              spec: "250,000 agents in plain JavaScript on the CPU, ~15 ms per step.",
            },
            {
              title: "Zero trig in the hot loop",
              description:
                "Headings are stored as unit vectors and turned with precomputed sine and cosine. The first version called Math.cos and Math.sin eight times per agent per step. Removing them made each step about 4.5x faster.",
              spec: "~30 ms down to ~6.5 ms at 80,000 agents.",
            },
            {
              title: "Denormal float protection",
              description:
                "Trail values that decay toward zero get flushed to exactly 0. Left alone they slide into denormal floats, which x86 CPUs handle 10 to 100 times slower, and the frame rate quietly falls apart after about a minute.",
              spec: "Flushed to zero, so the frame rate stays flat over time.",
            },
            {
              title: "The trail-saturation bug",
              description:
                "The first version collapsed the whole colony into one thick tube: the busiest strand kept getting stronger until it swallowed every other one. Capping each cell's scent keeps weaker branches alive, which is what turns a tube into a network.",
              spec: "Found by running headless for 900 steps per config and comparing screenshots.",
            },
          ],
        },
        {
          id: "crt-text-section-2",
          heading: "Boids",
          accent: "var(--crtPpAmber)",
          paragraphs: [
            "Craig Reynolds' three rules: don't crowd your neighbors, match their heading, stay close to them. There's no leader and no global plan. Flocks form, split and merge on their own.",
          ],
          cards: [
            {
              title: "Spatial hash for neighbor search",
              description:
                "The screen is split into cells the size of the perception radius and rebuilt every frame with a counting sort. Each boid only checks the 3x3 block of cells around it instead of every other boid.",
              spec: "600 boids: ~24,000 pair checks instead of 359,400.",
            },
            {
              title: "A torus, including the math",
              description:
                "Boids wrap around the edges, and neighbor distances wrap too, so a flock crossing an edge stays one flock instead of snapping apart. Cohesion averages relative offsets, not absolute positions, which is the detail that makes wrapping correct.",
            },
            {
              title: "Double-buffered velocities",
              description:
                "Every boid steers from the same snapshot of velocities, so update order can't bias the flock. State lives in preallocated typed arrays, so nothing is created per frame and there are no garbage-collection hitches.",
            },
            {
              title: "One draw call for the flock",
              description:
                "Every triangle goes into one path, rotated straight from the velocity vector, with no per-boid save, rotate and restore.",
              spec: "3,000 boids: ~4.4 ms per frame.",
            },
          ],
        },
        {
          id: "crt-text-section-3",
          heading: "Audio Reactive",
          tocLabel: "Audio",
          accent: "var(--crtPpRose)",
          paragraphs: [
            "Live frequency analysis drives three rings of particles: bass snaps the inner ring outward on every kick, mids spin and brighten the middle ring, treble jitters the outer ring. The source can be the mic, a local audio file, or a demo beat the page synthesizes itself.",
          ],
          cards: [
            {
              title: "A drum machine written in code",
              description:
                "The demo beat is a 4-bar groove (kick, snare, hats, filtered sawtooth bass, chord stabs) synthesized live in Web Audio, so the mode works with no mic and no music file. It's scheduled against the audio clock with a look-ahead timer, which keeps timing tight even though JavaScript timers are sloppy.",
              spec: "124 BPM, zero audio files.",
            },
            {
              title: "Energy-based beat detection",
              description:
                "Current bass energy is compared against the average of the last second, and a beat fires when it spikes past that average times a threshold. A noise floor and a refractory window make one kick count as one beat, and the threshold is drawn live on the meter.",
            },
            {
              title: "Tempo from beat gaps",
              description:
                "The estimate is the median of recent beat gaps, which shrugs off missed or extra beats, averaged with every gap near the median to cancel out frame-timing jitter.",
              spec: "Reads 124 to 125 BPM against a true 124.",
            },
            {
              title: "Browser rules, handled properly",
              description:
                "Audio only starts from a click. Switching modes stops the mic tracks, the file and the synth and closes the AudioContext, so the recording indicator turns off right away. Mic failures get specific messages: blocked, not found, busy, or an insecure page.",
              spec: "Analyzed locally. Nothing is recorded or sent anywhere.",
            },
          ],
        },
      ],
      screenshot: {
        src: "Assets/FloppyDiskCodeBase/ProjectScreens/Screen1-2.png",
        alt: "Particle Playground running the slime mold mode",
      },
      externalLink: {
        label: "VISIT THE PARTICLE PLAYGROUND",
        url: "https://kenchollacoop2005.github.io/particle_playground/",
      },
    },
  };

  const CRT_TOC_SCROLL_DURATION_MS = 900; // fixed — every jump takes the same time regardless of distance
  const CRT_TOC_SCROLL_OFFSET_PX = 150; // headroom above the target heading — landing at offsetTop exactly reads as "scrolled too far"

  let crtTextScreenActive = false;

  function crtTextScreenEl(poster) {
    return poster.querySelector(".FloppyCrtTextScreen");
  }

  function crtTextScreenViewportEl(poster) {
    return poster.querySelector(".FloppyCrtTextScreenViewport");
  }

  function crtTextScreenTrackEl(poster) {
    return poster.querySelector(".FloppyCrtTextScreenScrollTrack");
  }

  function crtTextScreenThumbEl(poster) {
    return poster.querySelector(".FloppyCrtTextScreenScrollThumb");
  }

  function hideTextProjectScreen(poster) {
    const textScreen = crtTextScreenEl(poster);
    if (textScreen) textScreen.hidden = true;
    poster.classList.remove("crt-text-active");
    crtTextScreenActive = false;
  }

  function buildTextScreenHtml(entry) {
    // tocLabel (when set) is a short TOC-only stand-in — the section's
    // own on-page heading is never shortened.
    // entry.tocBottom (optional) adds one last TOC link that scrolls to
    // the very bottom of the page instead of to a section.
    const toc =
      entry.sections
        .map(
          (s, i) =>
            `<div class="FloppyCrtTextScreenTocLink" data-target="${s.id}"><span class="FloppyCrtTextScreenTocNum">${String(i + 1).padStart(2, "0")}</span>${s.tocLabel || s.heading}</div>`,
        )
        .join("") +
      (entry.tocBottom
        ? `<div class="FloppyCrtTextScreenTocLink" data-scroll="bottom"><span class="FloppyCrtTextScreenTocNum">${String(entry.sections.length + 1).padStart(2, "0")}</span>${entry.tocBottom}</div>`
        : "");
    const intro = entry.intro
      ? `<div class="FloppyCrtTextScreenIntro">${entry.intro.map((p) => `<p>${p}</p>`).join("")}</div>`
      : "";
    const stats = entry.stats
      ? `<div class="FloppyCrtStatStrip">${entry.stats
          .map(
            (s) =>
              `<div class="FloppyCrtStatTile">
                <div class="FloppyCrtStatNum">${s.num}</div>
                <div class="FloppyCrtStatLabel">${s.label}</div>
              </div>`,
          )
          .join("")}</div>`
      : "";
    const sections = entry.sections
      .map((s) => {
        // Up to 3 cards share one row; 4+ wrap into 2 columns (a 4th
        // column would be too narrow). Grids of 4+ are wide enough that
        // titles need ~2 lines, so they reserve less title height; 1-3
        // card grids keep the original 3-line reserve (Mosaic).
        const cols = s.cards ? (s.cards.length <= 3 ? s.cards.length : 2) : 0;
        const titleMin = s.cards && s.cards.length > 3 ? "2.6em" : "3.9em";
        const cardsHtml = s.cards
          ? `<div class="FloppyCrtCardGrid" style="--crtCardCount: ${cols}; --crtCardTitleMin: ${titleMin}">${s.cards
              .map(
                (c) =>
                  `<div class="FloppyCrtCard">
                    <h4 class="FloppyCrtCardTitle">${c.title}</h4>
                    <p>${c.description}</p>
                    ${c.spec ? `<div class="FloppyCrtCardSpec">${c.spec}</div>` : ""}
                  </div>`,
              )
              .join("")}</div>`
          : "";
        // Optional per-section accent: recolors this section's heading and
        // card accents (see the entry's [data-entry] block in the HTML)
        const accentStyle = s.accent
          ? ` style="--crtTextScreenAccent: ${s.accent}; --crtTextScreenAccentDim: color-mix(in srgb, ${s.accent} 55%, transparent)"`
          : "";
        return `<div class="FloppyCrtTextScreenSection" id="${s.id}"${accentStyle}>
            <h3 class="FloppyCrtTextScreenHeading">${s.heading}</h3>
            ${s.paragraphs.map((p) => `<p>${p}</p>`).join("")}
            ${cardsHtml}
          </div>`;
      })
      .join("");
    // Click hands off to startDiscTravel exactly like a normal disc click
    // (see showTextProjectScreen); nextDiskNotice is optional flavor text.
    const nextFloppyPrompt = entry.nextDisk
      ? `<div class="FloppyCrtNextFloppySection">
          ${
            entry.nextDiskNotice
              ? `<div class="FloppyCrtDiskFullNotice">${entry.nextDiskNotice}</div>`
              : ""
          }
          <div
            class="FloppyCrtNextFloppyPrompt"
            data-stack-number="${entry.nextDisk.stackNumber}"
            data-disk-index="${entry.nextDisk.diskIndex}"
          >&gt;&gt; LOAD NEXT FLOPPY</div>
        </div>`
      : "";
    // Optional screenshot + external link, rendered after the last
    // section (where nextDisk's prompt goes). The link is a plain anchor
    // in a new tab — not the in-system disc handoff nextDisk does.
    const screenshot = entry.screenshot
      ? `<figure class="FloppyCrtScreenshot"><img src="${entry.screenshot.src}" alt="${entry.screenshot.alt}" /></figure>`
      : "";
    const externalLink = entry.externalLink
      ? `<div class="FloppyCrtExternalSection">
          <a
            class="FloppyCrtNextFloppyPrompt"
            href="${entry.externalLink.url}"
            target="_blank"
            rel="noopener noreferrer"
          >&gt;&gt; ${entry.externalLink.label}</a>
        </div>`
      : "";
    // Title slot: an image (titleImage) or styled text (titleText) —
    // each with its own position vars in Posters/FloppyCase.html.
    const titleGraphic = entry.titleImage
      ? `<img class="FloppyCrtMosaicTitle" src="${entry.titleImage}" alt="${entry.title}" />`
      : entry.titleText
        ? `<div class="FloppyCrtTitleText">${entry.titleText}</div>`
        : "";
    // No wrapper around intro/sections — the TOC is a CSS float, so they
    // need to be plain sibling blocks to wrap around it correctly.
    // Title div stays empty (reserves its own line-height/margin as a
    // gap); the title graphic sits there instead.
    return `
      <div class="FloppyCrtTextScreenTitle"></div>
      ${titleGraphic}
      <div class="FloppyCrtTextScreenBody">
        <div class="FloppyCrtTextScreenToc">
          <div class="FloppyCrtTextScreenTocLabel">CONTENTS</div>
          ${toc}
        </div>
        ${intro}
        ${stats}
        ${sections}
        ${screenshot}
        ${externalLink}
        ${nextFloppyPrompt}
      </div>
    `;
  }

  // Starts moderate, ramps up to fast through the middle, back down to
  // moderate at the end — a fixed duration regardless of distance.
  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function animateScrollTo(viewport, targetTop) {
    const startTop = viewport.scrollTop;
    const distance = targetTop - startTop;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime) / CRT_TOC_SCROLL_DURATION_MS);
      viewport.scrollTop = startTop + distance * easeInOutSine(t);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function syncCrtScrollThumb(poster) {
    const viewport = crtTextScreenViewportEl(poster);
    const track = crtTextScreenTrackEl(poster);
    const thumb = crtTextScreenThumbEl(poster);
    if (!viewport || !track || !thumb) return;
    const trackHeight = track.clientHeight;
    const contentHeight = viewport.scrollHeight;
    const viewHeight = viewport.clientHeight;
    const thumbHeight = Math.max(
      24,
      (viewHeight / contentHeight) * trackHeight,
    );
    const maxScroll = contentHeight - viewHeight;
    const maxThumbTravel = trackHeight - thumbHeight;
    const scrollPercent = maxScroll > 0 ? viewport.scrollTop / maxScroll : 0;
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${scrollPercent * maxThumbTravel}px)`;
  }

  function showTextProjectScreen(poster, entry, key) {
    const textScreen = crtTextScreenEl(poster);
    const viewport = crtTextScreenViewportEl(poster);
    if (!textScreen || !viewport) return;

    // Lets Posters/FloppyCase.html scope per-entry palettes: [data-entry="1-2"]
    textScreen.dataset.entry = key;
    viewport.innerHTML = buildTextScreenHtml(entry);

    viewport.querySelectorAll(".FloppyCrtTextScreenTocLink").forEach((link) => {
      link.addEventListener("click", () => {
        if (link.dataset.scroll === "bottom") {
          animateScrollTo(viewport, viewport.scrollHeight - viewport.clientHeight);
          return;
        }
        const target = viewport.querySelector(`#${link.dataset.target}`);
        if (!target) return;
        // offsetTop, not getBoundingClientRect — the poster sits inside a
        // scaled ancestor, so real screen-pixel rects don't line up with
        // scrollTop's own unscaled space; offsetTop does. The
        // CRT_TOC_SCROLL_OFFSET_PX subtraction leaves headroom above the
        // heading instead of landing flush against the viewport's top edge.
        animateScrollTo(
          viewport,
          Math.max(0, target.offsetTop - CRT_TOC_SCROLL_OFFSET_PX),
        );
      });
    });

    const nextFloppyPrompt = viewport.querySelector(
      ".FloppyCrtNextFloppyPrompt",
    );
    if (nextFloppyPrompt) {
      nextFloppyPrompt.addEventListener("click", () => {
        const stackNumber = Number(nextFloppyPrompt.dataset.stackNumber);
        const diskIndex = Number(nextFloppyPrompt.dataset.diskIndex);
        const target = poster.querySelector(
          `.FloppyDisk[data-stack-number="${stackNumber}"][data-disk-index="${diskIndex}"]`,
        );
        // Same lookup + call as the hitbox click handler in
        // initDiskSelection — indistinguishable from a normal selection.
        if (target) startDiscTravel(poster, target);
      });
    }

    const img = crtImageEl(poster);
    if (img) img.hidden = true;
    const text = crtTextEl(poster);
    if (text) text.hidden = true;
    textScreen.hidden = false;
    poster.classList.add("crt-text-active");
    crtTextScreenActive = true;

    // Must happen AFTER unhiding — see IMPORTANT NOTES #5.
    viewport.scrollTop = 0;
    syncCrtScrollThumb(poster);
  }

  // Wheel-over-CRT forwarding + draggable scrollbar — set up once at
  // init; both are no-ops whenever crtTextScreenActive is false.
  function initCrtTextScreen(poster) {
    const screen = poster.querySelector(".FloppyCrtScreen");
    const viewport = crtTextScreenViewportEl(poster);
    const track = crtTextScreenTrackEl(poster);
    const thumb = crtTextScreenThumbEl(poster);
    if (!screen || !viewport || !track || !thumb) return;

    screen.addEventListener(
      "wheel",
      (e) => {
        if (!crtTextScreenActive) return;
        e.preventDefault();
        viewport.scrollTop += e.deltaY;
      },
      { passive: false },
    );

    viewport.addEventListener("scroll", () => syncCrtScrollThumb(poster));

    let dragging = false;
    let dragStartY = 0;
    let dragStartScrollTop = 0;

    thumb.addEventListener("mousedown", (e) => {
      dragging = true;
      dragStartY = e.clientY;
      dragStartScrollTop = viewport.scrollTop;
      e.preventDefault();
    });

    // The poster renders inside a scaled ancestor, so a real on-screen
    // mouse-pixel delta isn't a layout-pixel delta — divide by this ratio.
    function trackScale() {
      return track.getBoundingClientRect().height / track.clientHeight;
    }

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const maxThumbTravel = track.clientHeight - thumb.clientHeight;
      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      if (maxThumbTravel <= 0 || maxScroll <= 0) return;
      const deltaY = (e.clientY - dragStartY) / trackScale();
      viewport.scrollTop =
        dragStartScrollTop + (deltaY / maxThumbTravel) * maxScroll;
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
    });

    // Clicking the bare track (not the thumb) jumps to that position
    track.addEventListener("mousedown", (e) => {
      if (e.target === thumb) return;
      const rect = track.getBoundingClientRect();
      const maxThumbTravel = track.clientHeight - thumb.clientHeight;
      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      if (maxThumbTravel <= 0 || maxScroll <= 0) return;
      const clickY = (e.clientY - rect.top) / trackScale();
      const targetThumbTop = Math.max(
        0,
        Math.min(maxThumbTravel, clickY - thumb.clientHeight / 2),
      );
      viewport.scrollTop = (targetThumbTop / maxThumbTravel) * maxScroll;
    });
  }

  // Renders crtHeaderLines + crtStatusLines and hides whatever project screen was showing.
  function renderCrtText(poster) {
    hideTextProjectScreen(poster);
    const text = crtTextEl(poster);
    if (!text) return;
    const lines = crtHeaderLines.length
      ? [...crtHeaderLines, "", ...crtStatusLines]
      : [...crtStatusLines];
    text.innerHTML = lines
      .map((line) => `<div class="FloppyCrtLine">${line}</div>`)
      .join("");
    text.hidden = false;
    const img = crtImageEl(poster);
    if (img) img.hidden = true;
  }

  function clearCrtBootTimers() {
    crtBootTimers.forEach((t) => clearTimeout(t));
    crtBootTimers = [];
    if (crtEllipsisTimer !== null) {
      clearInterval(crtEllipsisTimer);
      crtEllipsisTimer = null;
    }
  }

  function startCrtIdleEllipsis(poster) {
    crtEllipsisFrameIndex = 0;
    const render = () => {
      crtStatusLines = [
        `${CRT_AWAITING_TEXT}${CRT_ELLIPSIS_FRAMES[crtEllipsisFrameIndex]}`,
      ];
      renderCrtText(poster);
      crtEllipsisFrameIndex =
        (crtEllipsisFrameIndex + 1) % CRT_ELLIPSIS_FRAMES.length;
    };
    render();
    crtEllipsisTimer = setInterval(render, CRT_ELLIPSIS_FRAME_MS);
  }

  // Plays once each time the CRT comes on screen (runOpenSequence)
  function startCrtBootSequence(poster) {
    clearCrtBootTimers();
    crtHeaderLines = [CRT_BOOT_LINE_1_TEXT];
    crtStatusLines = [];
    renderCrtText(poster);

    crtBootTimers.push(
      setTimeout(() => {
        crtHeaderLines = [CRT_BOOT_LINE_1_TEXT, CRT_BOOT_LINE_2_TEXT];
        renderCrtText(poster);
      }, CRT_BOOT_LINE_2_DELAY_MS),
    );
    crtBootTimers.push(
      setTimeout(
        () => startCrtIdleEllipsis(poster),
        CRT_BOOT_LINE_2_DELAY_MS + CRT_BOOT_GAP_DELAY_MS,
      ),
    );
  }

  // Fully resets both line groups — used on close, so the next open
  // replays the boot sequence from scratch rather than resuming stale text.
  function resetCrtScreen(poster) {
    clearCrtBootTimers();
    crtHeaderLines = [];
    crtStatusLines = [];
    renderCrtText(poster);
  }

  // Wobble beat 2 — stops the ellipsis wherever it is and appends the
  // detected line below it. Wobble beat 1 does nothing to the CRT.
  function showCrtDiskDetected(poster) {
    clearCrtBootTimers();
    crtStatusLines = [...crtStatusLines, CRT_DETECTED_TEXT];
    renderCrtText(poster);
  }

  // Disc-swap interrupt — both header lines appear immediately (no boot
  // stagger), status starts empty (no "awaiting disk" phase during a swap).
  function showCrtHeaderOnly(poster) {
    clearCrtBootTimers();
    crtHeaderLines = [CRT_BOOT_LINE_1_TEXT, CRT_BOOT_LINE_2_TEXT];
    crtStatusLines = [];
    renderCrtText(poster);
  }

  // Third stage — disc fully plugged in. A disc in TEXT_PROJECT_SCREENS
  // loads a scrollable text entry instead; otherwise it's a plain <img>
  // swap, with a missing PNG falling back to the text layer's "NO SIGNAL".
  function showProjectScreen(poster, stackNumber, diskIndex) {
    const entryKey = `${stackNumber}-${diskIndex}`;
    const textEntry = TEXT_PROJECT_SCREENS[entryKey];
    if (textEntry) {
      showTextProjectScreen(poster, textEntry, entryKey);
      return;
    }

    hideTextProjectScreen(poster);
    const img = crtImageEl(poster);
    if (!img) return;
    img.onload = () => {
      const text = crtTextEl(poster);
      if (text) text.hidden = true;
      img.hidden = false;
    };
    img.onerror = () => {
      crtStatusLines = [CRT_NO_SIGNAL_TEXT];
      renderCrtText(poster);
    };
    img.src = getProjectScreenSrc(stackNumber, diskIndex);
  }

  // Phase 5, wobble variant: plain approach, then two hesitation beats,
  // then hands off to the unchanged disk-travel-3 rule for the final
  // approach. Every class swap happens in one step (IMPORTANT NOTES #2).
  function runSlotInWobble(disk, onWobble1, onWobble2, onDone) {
    disk.classList.add("disk-travel-3-approach");

    const wobble1At = DISC_PRE_WOBBLE_APPROACH_DURATION_MS;
    const wobble1FinishesAt = wobble1At + DISC_WOBBLE_BEAT_DURATION_MS;
    const wobble2At = wobble1FinishesAt + DISC_WOBBLE_PAUSE_MS;
    const wobble2FinishesAt = wobble2At + DISC_WOBBLE_BEAT_DURATION_MS;
    const finalAt = wobble2FinishesAt + DISC_WOBBLE_PAUSE_MS;
    const doneAt = finalAt + DISC_SLOT_IN_DURATION_MS;

    setTimeout(() => {
      disk.classList.remove("disk-travel-3-approach");
      disk.classList.add("disk-travel-3-wobble-1");
      onWobble1();
    }, wobble1At);
    setTimeout(() => {
      disk.classList.remove("disk-travel-3-wobble-1");
      disk.classList.add("disk-travel-3-wobble-2");
      onWobble2();
    }, wobble2At);
    setTimeout(() => {
      disk.classList.remove("disk-travel-3-wobble-2");
      disk.classList.add("disk-travel-3");
    }, finalAt);
    setTimeout(onDone, doneAt);
  }

  function startDiscTravel(poster, disk) {
    if (travelingDisk !== null) return; // only one disc may be inserting at a time
    if (disk === retractingDisk) return; // this disc is still mid-retract
    if (disk === pluggedDiskElement) return; // already plugged in

    // A different disc is already plugged — send it home in parallel,
    // not blocking this disc's own forward travel.
    if (pluggedDiskElement !== null) {
      retractDisk(pluggedDiskElement);
      clearFloppyPlugged(poster);
      showCrtHeaderOnly(poster);
    }

    travelingDisk = disk;

    disk.style.setProperty(
      "--discTravelDuration",
      `${DISC_TRAVEL_DURATION_MS}ms`,
    );
    disk.style.setProperty(
      "--discRotateDuration",
      `${DISC_ROTATE_DURATION_MS}ms`,
    );
    disk.style.setProperty(
      "--discSlotInDuration",
      `${DISC_SLOT_IN_DURATION_MS}ms`,
    );
    disk.style.setProperty(
      "--discWobbleBeatDuration",
      `${DISC_WOBBLE_BEAT_DURATION_MS}ms`,
    );

    disk.classList.remove("disk-hover-highlight", "disk-popped");

    // Phase 1: travel + shrink
    disk.classList.add("disk-travel-1");

    setTimeout(() => {
      // Phase 3: rotate (lean away)
      disk.classList.remove("disk-travel-1");
      disk.classList.add("disk-travel-2");

      setTimeout(() => {
        // Phase 5: slot in
        disk.classList.remove("disk-travel-2");

        const stackNumber = Number(disk.dataset.stackNumber);
        const diskIndex = Number(disk.dataset.diskIndex);

        const finishTravel = () => {
          setFloppyPlugged(poster, disk, stackNumber, diskIndex);
          showProjectScreen(poster, stackNumber, diskIndex);
          travelingDisk = null;
        };

        if (DISC_WOBBLE_ENABLED) {
          runSlotInWobble(
            disk,
            () => {}, // wobble 1 — no CRT change
            () => showCrtDiskDetected(poster), // wobble 2 — detected line appears
            finishTravel,
          );
        } else {
          disk.classList.add("disk-travel-3");
          setTimeout(
            () => showCrtDiskDetected(poster),
            DISC_SLOT_IN_DURATION_MS * 0.7,
          );
          setTimeout(finishTravel, DISC_SLOT_IN_DURATION_MS);
        }
      }, DISC_ROTATE_DURATION_MS + DISC_PAUSE_AFTER_ROTATE_MS);
    }, DISC_TRAVEL_DURATION_MS + DISC_PAUSE_AFTER_TRAVEL_MS);
  }

  // Tracks every disc's open transitionend before flipping stacksSettled true.
  // myGeneration guards against a late event from an interrupted previous cycle.
  function armStacksSettledWatch(poster) {
    settleGeneration++;
    const myGeneration = settleGeneration;
    stacksSettled = false;
    poster.classList.remove("stacks-settled");

    const discs = Array.from(poster.querySelectorAll(".FloppyDisk"));
    let pending = discs.length;
    if (pending === 0) {
      stacksSettled = true;
      poster.classList.add("stacks-settled");
      return;
    }

    discs.forEach((disk) => {
      const onEnd = (e) => {
        if (e.propertyName !== "transform") return;
        disk.removeEventListener("transitionend", onEnd);
        if (myGeneration !== settleGeneration) return; // stale cycle
        pending--;
        if (pending === 0) {
          stacksSettled = true;
          poster.classList.add("stacks-settled");
        }
      };
      disk.addEventListener("transitionend", onEnd);
    });
  }

  function initDiskSelection(poster) {
    poster.querySelectorAll(".FloppyStackHitbox").forEach((hitbox) => {
      const stackNumber = Number(hitbox.dataset.stackNumber);
      hitbox.addEventListener("mouseenter", () => {
        if (!stacksSettled) return;
        setSelection(poster, stackNumber, 1);
      });
      hitbox.addEventListener("mouseleave", () => {
        if (!stacksSettled) return;
        setSelection(poster, 0, 1);
        clearScrollBurst();
      });
      // Click-to-travel triggers here (the hitbox), not on the disc
      // itself — discs stay pointer-events: none always.
      hitbox.addEventListener("click", () => {
        if (!stacksSettled || selectedStack !== stackNumber) return;
        const target = poster.querySelector(
          `.FloppyDisk[data-stack-number="${selectedStack}"][data-disk-index="${selectedIndex}"]`,
        );
        if (target) startDiscTravel(poster, target);
      });
    });

    poster.addEventListener(
      "wheel",
      (e) => {
        if (!stacksSettled || selectedStack === 0) return;
        if (!e.target.closest(".FloppyStackHitbox")) return;
        e.preventDefault();

        // Capped to one step per event and reset fully to 0 on fire — a
        // single wheel click can report an oversized delta on some
        // mice/browsers; this stops that reading as multiple steps.
        scrollAccumulator += e.deltaY;
        if (Math.abs(scrollAccumulator) >= DISK_SCROLL_STEP_THRESHOLD) {
          pendingScrollSteps.push(scrollAccumulator > 0 ? -1 : 1);
          scrollAccumulator = 0;
        }

        if (scrollBurstTimer === null && pendingScrollSteps.length > 0) {
          playNextScrollStep(poster);
        }
      },
      { passive: false },
    );
  }

  let lidOpenTimer = null;

  function runOpenSequence(poster) {
    lidOpenTimer = setTimeout(() => {
      randomizeDiskFanning(poster);
      poster.classList.add("lid-open");
      poster.classList.add("crt-visible");
      armStacksSettledWatch(poster);
      startCrtBootSequence(poster);
    }, LID_OPEN_DELAY);
  }

  function runCloseSequence(poster) {
    clearTimeout(lidOpenTimer);
    lidOpenTimer = null;
    poster.classList.remove("lid-open");
    poster.classList.remove("crt-visible");
    settleGeneration++;
    stacksSettled = false;
    poster.classList.remove("stacks-settled");
    setSelection(poster, 0, 1);
    clearScrollBurst();
    travelingDisk = null;
    retractingDisk = null;
    poster
      .querySelectorAll(
        ".disk-travel-1, .disk-travel-2, .disk-travel-3, .disk-travel-3-approach, .disk-travel-3-wobble-1, .disk-travel-3-wobble-2, .disk-retract-1, .disk-retract-2",
      )
      .forEach((disk) => {
        disk.classList.remove(
          "disk-travel-1",
          "disk-travel-2",
          "disk-travel-3",
          "disk-travel-3-approach",
          "disk-travel-3-wobble-1",
          "disk-travel-3-wobble-2",
          "disk-retract-1",
          "disk-retract-2",
        );
      });
    clearFloppyPlugged(poster);
    resetCrtScreen(poster); // also hides any project image/text screen that was showing
  }

  // Same pattern as GPSolar.js: watch poster-active, edge-triggered via
  // wasActive (see IMPORTANT NOTES #1).
  let wasActive = false;
  const mo = new MutationObserver(() => {
    const poster = document.querySelector(".poster.FloppyCase");
    if (!poster) return;

    const isActive = poster.classList.contains("poster-active");
    if (isActive === wasActive) return;
    wasActive = isActive;

    if (isActive) {
      runOpenSequence(poster);
    } else {
      runCloseSequence(poster);
    }
  });

  window._floppyCaseMOInit = function (poster) {
    poster.style.setProperty(
      "--floppyLidTravelDistance",
      `${LID_TRAVEL_DISTANCE}px`,
    );
    poster.style.setProperty(
      "--floppyLidDuration",
      `${LID_ANIMATION_DURATION}ms`,
    );

    const crtSlideDuration =
      LID_ANIMATION_DURATION + DISK_OPEN_START_DELAY + CRT_SLIDE_EXTRA_TIME;
    poster.style.setProperty("--crtSlideDuration", `${crtSlideDuration}ms`);

    createDiskStacks(poster);
    createStackHitboxes(poster);
    initDiskSelection(poster);
    initCrtTextScreen(poster);

    mo.observe(poster, {
      attributes: true,
      attributeFilter: ["class"],
    });
  };

  // ============================================================
  // ADDING NEW DISKS AND SKINS
  //
  // To give a disc real art instead of the shared placeholder:
  //   1. Drop the image in Assets/FloppyDiskCodeBase/FloppyDisks/.
  //   2. Add one line to DISK_SKINS above, keyed by "stackNumber-diskIndex"
  //      (both 1-indexed):
  //        "1-1": "Assets/FloppyDiskCodeBase/FloppyDisks/MyProject.png",
  //      Stack 1's third disc would be "1-3", stack 2's first disc "2-1",
  //      etc. — the number matches that disc's position in DISK_STACKS
  //      and its own dataset.stackNumber/diskIndex.
  //   Any disc with no entry falls back to DISK_PLACEHOLDER_SRC
  //   automatically, so discs can be skinned one at a time.
  //
  // To add more discs to an existing stack: raise that stack's own
  // *_COUNT constant (e.g. DISK_STACK_2_COUNT). Nothing else needs to
  // change — createDiskStacks() builds however many the count says.
  //
  // To add a whole new stack: add one more { count, xOffset } entry to
  // DISK_STACKS (with its own new *_COUNT/*_X constants above it, for
  // consistency with the existing three). createDiskStacks,
  // createStackHitboxes, initDiskSelection, and stackDiscCount all
  // already loop over DISK_STACKS generically — no other code changes
  // needed. Just pick an xOffset that doesn't visually overlap the
  // neighboring stacks' fanned-open disc area (~450px wide per stack,
  // see --diskHitboxWidth in Posters/FloppyCase.html).
  // ============================================================

  // ============================================================
  // ADDING NEW PROJECT SCREENS
  //
  // Each disc's CRT content is a single PNG in
  // Assets/FloppyDiskCodeBase/ProjectScreens/, named to match that
  // disc's own stack+index — same "stackNumber-diskIndex" pairing
  // DISK_SKINS uses:
  //   stack 1, index 1 -> Assets/FloppyDiskCodeBase/ProjectScreens/Screen1-1.png
  //   stack 2, index 3 -> Assets/FloppyDiskCodeBase/ProjectScreens/Screen2-3.png
  //
  // Just drop the file in — getProjectScreenSrc() points the <img> at
  // it by that same naming convention the moment the disc is plugged
  // in, so there's no lookup table to maintain and no other code to
  // touch. A disc with no matching PNG shows "NO SIGNAL" instead (the
  // <img>'s error handler falls back to the text layer).
  //
  // A disc can load a scrollable TEXT entry instead — see "ADDING NEW
  // WIKI-STYLE FLOPPY SCREENS" below. showProjectScreen checks
  // TEXT_PROJECT_SCREENS first, so a disc only needs an entry in ONE of
  // the two places, never both.
  // ============================================================

  // ============================================================
  // ADDING NEW WIKI-STYLE FLOPPY SCREENS
  //
  // This is the system built for disc 3-1 (Project Mosaic) — a full
  // scrollable page instead of a single static image, with its own
  // table of contents, an optional stat strip, card grids, a custom
  // scrollbar, and a "load next floppy" handoff button. Add one by
  // giving TEXT_PROJECT_SCREENS above a new "stackNumber-diskIndex" key:
  //
  //   title          — the title graphic's alt text (the title div
  //                    itself stays empty; the graphic sits in that gap
  //                    — see buildTextScreenHtml)
  //   titleImage     — optional image path for the title graphic
  //                    (Mosaic); position via --crtMosaicTitle*
  //   titleText      — optional styled-text title instead (Particle
  //                    Sim); position/font via --crtTitleText*. Use one
  //                    or the other.
  //   intro          — array of paragraph strings (HTML like <em> is
  //                    fine), untitled, rendered right after the TOC so
  //                    it wraps beside it
  //   stats          — optional array of { num, label } (4 fit one row
  //                    cleanly, matching the stat-strip's own grid)
  //   tocBottom      — optional label for one extra, last TOC link that
  //                    scrolls to the very bottom of the page
  //   sections       — array of:
  //                      id        — anchor id for the TOC's click-to-
  //                                  scroll (unique within the entry)
  //                      heading   — the section's own on-page title,
  //                                  never shortened
  //                      tocLabel  — optional short (1-2 word) TOC-only
  //                                  stand-in; a long heading with none
  //                                  makes the TOC tall enough to crowd
  //                                  out the intro's float-wrap
  //                      paragraphs — array of strings
  //                      cards     — optional array of { title,
  //                                  description, spec? }, rendered as
  //                                  a card grid below the paragraphs
  //                                  (1-3 cards share one row, 4+
  //                                  wrap into 2 columns)
  //                      accent    — optional CSS color (e.g.
  //                                  "var(--crtPpAmber)") recoloring
  //                                  this section's heading/cards
  //   screenshot     — optional { src, alt }, full content-column width,
  //                    rendered after the last section
  //   externalLink   — optional { label, url }; a plain new-tab anchor
  //                    styled like the "load next floppy" button, under
  //                    the screenshot. Bottom space: --crtExternalBottomPad
  //   nextDisk       — optional { stackNumber, diskIndex }; renders a
  //                    clickable prompt after the last section that
  //                    calls startDiscTravel on that disc exactly like
  //                    a normal hitbox click (see showTextProjectScreen)
  //   nextDiskNotice — optional flavor text shown above that prompt
  //
  // PER-ENTRY LOOK: showTextProjectScreen stamps the entry's key on the
  // screen as data-entry="1-2", so a [data-entry="…"] block in
  // Posters/FloppyCase.html can override the --crtTextScreen* palette
  // for just that entry (see the "1-2" block, built from Particle
  // Playground's own palette, --crtPp*). Mosaic's palette is the default.
  //
  // Everything about SIZE/POSITION — the background box, the scrollable
  // text box, the mosaic-title logo, the scrollbar, the TOC's own
  // width/font — lives in Posters/FloppyCase.html's :root as
  // --crtEntryBg*/--crtEntryText*/--crtMosaicTitle*/--crtScrollbar*/
  // --crtTextScreenToc*. The background and text boxes are two fully
  // independent rectangles by design (see the comment above them there)
  // — tune those, not this file, to fit a new entry's layout.
  // ============================================================
})();

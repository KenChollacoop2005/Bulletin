// File: js/SaturnCD.js

(function () {
  // Config
  const SPIN_MS_PER_REV = 4000; // 1 full rotation every 3s
  const SPIN_DEG_PER_MS = 360 / SPIN_MS_PER_REV;

  // State
  let spinState = "idle"; // "idle" | "spinning"
  let spinRaf = null;
  let lastTimestamp = null;
  let currentRotation = -45; // baseline rotation
  // State — music note emitter
  let noteEmitterActive = false;
  let noteTimeout = null;

  // State — module selections
  let selectedBody = null;
  let selectedMouth = null;
  let selectedBell = null;

  let assemblyInProgress = false;

  const noteFiles = [
    "Assets/Quarternote1.png",
    "Assets/Quarternote2.png",
    "Assets/Eigthnote1.png",
    "Assets/Eigthnote2.png",
    "Assets/Doublenote1.png",
    "Assets/Doublenote2.png",
    "Assets/Quadruplenote1.png",
    "Assets/Quadruplenote2.png",
  ];

  // State — add this with your other state variables
  let currentConfigCode = null; // Will store "TKT", "PKE", etc. for info bloom

  // Configuration code lookup - ONLY for info bloom panels
  const CONFIG_CODES = {
    "titan-pandoraK-tethys": "TKT",
    "titan-pandoraK-enceladus": "TKE",
    "titan-pandoraM-tethys": "TMT",
    "titan-pandoraM-enceladus": "TME",
    "titan-pandoraS-tethys": "TST",
    "titan-pandoraS-enceladus": "TSE",
    "phoebe-pandoraK-tethys": "PKT",
    "phoebe-pandoraK-enceladus": "PKE",
    "phoebe-pandoraM-tethys": "PMT",
    "phoebe-pandoraM-enceladus": "PME",
    "phoebe-pandoraS-tethys": "PST",
    "phoebe-pandoraS-enceladus": "PSE",
  };

  // ============================================================================================================================
  // 🔊 MODULAR SOUND EFFECT SYSTEM 🔊
  // ============================================================================================================================

  // Function to play a random modular sound
  function playRandomModularSound() {
    const randomSound = Math.floor(Math.random() * 5) + 1;
    soundEffects.play(`SatMod${randomSound}`);
  }
  // match the number before +1 with the amount of sounds, 5 sounds = * 5
  // ============================================================================================================================

  function emitCDNotes(poster) {
    const layer = poster.querySelector(".cd-note-layer");
    if (!layer) return;

    // Random count: 0, 1, or 2
    const count = Math.floor(Math.random() * 3); // 0, 1, or 2

    for (let i = 0; i < count; i++) {
      const note = document.createElement("img");
      note.className = "cd-music-note";

      // Pick a random note
      const randomIndex = Math.floor(Math.random() * noteFiles.length);
      note.src = noteFiles[randomIndex];
      note.style.width = "38px"; // desired width
      note.style.height = "auto"; // keep aspect ratio

      // Spray range: 15° left of Y-axis (-105°) to 15° left of X-axis (-15°)
      const minAngle = (-105 * Math.PI) / 180; // -1.833 rad
      const maxAngle = (-15 * Math.PI) / 180; // -0.262 rad
      const angle = minAngle + Math.random() * (maxAngle - minAngle);

      const distance = 120 + Math.random() * 50;

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      note.style.setProperty("--x", `${x}px`);
      note.style.setProperty("--y", `${y}px`);

      const shiftDeg = 10; // shift left by 20 degrees
      const minNoteAngle = ((-15 + shiftDeg) * Math.PI) / 180; // -35° in radians
      const maxNoteAngle = ((15 + shiftDeg) * Math.PI) / 180; // -5° in radians
      const noteRotOffset =
        minNoteAngle + Math.random() * (maxNoteAngle - minNoteAngle);
      note.style.setProperty("--rot", `${(noteRotOffset * 180) / Math.PI}deg`);

      // Combine with existing rotation
      note.style.setProperty("--rot", `${(noteRotOffset * 180) / Math.PI}deg`);

      note.style.setProperty("--dur", `${1.8 + Math.random() * 1.2}s`);

      layer.appendChild(note);

      // Cleanup after duration
      setTimeout(() => {
        note.remove();
      }, 3200);
    }
  }
  function startNoteEmitter(poster) {
    if (noteEmitterActive) return;
    noteEmitterActive = true;

    function emitLoop() {
      if (!noteEmitterActive) return;

      // Random number of notes: 1–3
      const count = 1 + Math.floor(Math.random() * 3);
      emitCDNotes(poster, count);

      // Random delay between bursts (cartoony)
      const delay = 600 + Math.random() * 700;

      noteTimeout = setTimeout(emitLoop, delay);
    }

    emitLoop();
  }

  function stopNoteEmitter() {
    noteEmitterActive = false;
    if (noteTimeout) {
      clearTimeout(noteTimeout);
      noteTimeout = null;
    }
  }

  /*================================================================================*/
  /* Assembly function */
  /*================================================================================*/

  function startAssemblyAnimation() {
    const poster = document.querySelector(".poster.SaturnCD");
    if (!poster) return;

    const moduleOffsets = {
      // Body modules
      Titan: { x: -40, y: -35 }, // positioned center
      Phoebe: { x: -53, y: 65 }, // done

      // Mouth modules
      PandoraK: { x: -115, y: 10 }, // done
      PandoraM: { x: -130, y: 85 }, // done
      PandoraS: { x: -125, y: -60 }, // done

      // Bell modules
      Tethys: { x: 50, y: 70 }, // done
      Enceladus: { x: 55, y: -40 }, // done
    };
    const moduleScaleOffsets = {
      // Body modules - adjust during scale to keep aligned
      Titan: { x: -25, y: -23 }, // done
      Phoebe: { x: 0, y: 35 }, // done

      // Mouth modules
      PandoraK: { x: -115, y: 0 }, // done
      PandoraM: { x: -100, y: 40 }, // done
      PandoraS: { x: -100, y: -30 }, // done

      // Bell modules
      Tethys: { x: 70, y: 30 }, // done
      Enceladus: { x: 65, y: -20 }, // done
    };
    const moduleSlamOffsets = {
      // Body modules - adjust final slam position
      Titan: { x: 20, y: 100 }, // done
      Phoebe: { x: 30, y: 260 }, // done

      // Mouth modules
      PandoraK: { x: 0, y: 170 }, // done
      PandoraM: { x: 0, y: 285 }, // done
      PandoraS: { x: -20, y: 60 }, // done

      // Bell modules
      Tethys: { x: 60, y: 260 }, //
      Enceladus: { x: 50, y: 95 }, // done
    };

    // Phase 1: Add dim overlay to body
    document.body.classList.add("assembly-active");
    window.animationRunning = true;

    // Prevent poster close during assembly
    if (poster) {
      poster.style.pointerEvents = "none";
    }

    // Map lowercase selection names to proper capitalized module names
    const nameMap = {
      titan: "Titan",
      phoebe: "Phoebe",
      pandoraK: "PandoraK",
      pandoraM: "PandoraM",
      pandoraS: "PandoraS",
      tethys: "Tethys",
      enceladus: "Enceladus",
    };

    const allModules = [
      "Titan",
      "Phoebe",
      "PandoraK",
      "PandoraM",
      "PandoraS",
      "Tethys",
      "Enceladus",
    ];

    const selectedModuleNames = [
      nameMap[selectedBody],
      nameMap[selectedMouth],
      nameMap[selectedBell],
    ];

    console.log("Selected module names:", selectedModuleNames);

    // Dim all non-selected modules
    allModules.forEach((moduleName) => {
      if (!selectedModuleNames.includes(moduleName)) {
        const moduleDiv = document.getElementById(`module-${moduleName}`);
        if (moduleDiv) moduleDiv.classList.add("dimmed-module");
      }
    });

    // Clone selected modules and position them above the dim
    const clones = {};
    selectedModuleNames.forEach((moduleName) => {
      const moduleDiv = document.getElementById(`module-${moduleName}`);
      if (!moduleDiv) return;

      const moduleImg = moduleDiv.querySelector(".module-image");
      if (!moduleImg) return;

      // Get the actual rendered position and size on screen
      const rect = moduleImg.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(moduleImg);

      // Create clone
      const clone = document.createElement("img");
      clone.src = moduleImg.src;
      clone.className = "assembly-clone";

      // Set the ACTUAL size and position as rendered on screen
      clone.style.position = "fixed";
      clone.style.left = `${rect.left + 8.5}px`;
      clone.style.top = `${rect.top + 19.5}px`;
      clone.style.width = `${rect.width * 0.945}px`;
      clone.style.height = `${rect.height * 0.945}px`;

      // Apply the blueprint rotation manually
      clone.style.transform = "rotate(-8deg)";
      clone.style.transformOrigin = "center";

      // Copy important rendering properties
      clone.style.filter = computedStyle.filter;
      clone.style.imageRendering = "crisp-edges";
      clone.style.objectFit = "contain";

      // Add data attribute to track which module this is
      clone.dataset.module = moduleName;

      // Store clone reference by type
      if (selectedBody && nameMap[selectedBody] === moduleName) {
        clones.body = clone;
      } else if (selectedMouth && nameMap[selectedMouth] === moduleName) {
        clones.mouth = clone;
      } else if (selectedBell && nameMap[selectedBell] === moduleName) {
        clones.bell = clone;
      }

      // Add to body
      document.body.appendChild(clone);

      // Hide original
      moduleImg.style.opacity = "0";
    });

    console.log("Assembly animation started - Phase 1 complete!");

    // ============================================================
    // PHASE 2: ASCENT - Parts float to their horizontal positions
    // ============================================================

    setTimeout(() => {
      console.log("Phase 2: Ascent beginning...");

      // Calculate screen center and target positions
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      // Horizontal spacing: 30% of screen width
      const horizontalOffset = window.innerWidth * 0.3;

      // Target positions for horizontal arrangement
      // ALL on the same Y line (screenCenterY)
      // SWAPPED: bell is now left, mouth is now right
      const targets = {
        bell: { x: screenCenterX - horizontalOffset, y: screenCenterY }, // Left
        body: { x: screenCenterX, y: screenCenterY }, // Center
        mouth: { x: screenCenterX + horizontalOffset, y: screenCenterY }, // Right
      };

      // Animation duration
      const ascentDuration = 1000; // 1 second

      // Stagger delays (mouth → body → bell in ORDER OF MOVEMENT)
      const staggerDelays = {
        mouth: 0,
        body: 100, // 100ms after mouth
        bell: 200, // 200ms after mouth (100ms after body)
      };

      // Animate each clone
      Object.keys(clones).forEach((type) => {
        const clone = clones[type];
        if (!clone) return;

        setTimeout(() => {
          // Get current size to calculate proper centering
          const currentWidth = parseFloat(clone.style.width);
          const currentHeight = parseFloat(clone.style.height);

          // Get the offset for this specific module
          const moduleName = clone.dataset.module;
          const offset = moduleOffsets[moduleName] || { x: 0, y: 0 };

          // Target position (adjusted so center of image is at target point + module-specific offset)
          const targetLeft = targets[type].x - currentWidth / 2 + offset.x;
          const targetTop = targets[type].y - currentHeight / 2 + offset.y;

          // Smooth rotation with subtle wiggle - MANY KEYFRAMES for buttery smoothness
          const wiggleKeyframes = `
        @keyframes ascentWiggle-${type} {
          0%   { transform: rotate(-8deg); }
          5%   { transform: rotate(-2deg); }
          10%  { transform: rotate(6deg); }
          15%  { transform: rotate(13deg); }
          20%  { transform: rotate(20deg); }
          25%  { transform: rotate(27deg); }
          30%  { transform: rotate(34deg); }
          35%  { transform: rotate(40deg); }
          40%  { transform: rotate(47deg); }
          45%  { transform: rotate(53deg); }
          50%  { transform: rotate(59deg); }
          55%  { transform: rotate(64deg); }
          60%  { transform: rotate(70deg); }
          65%  { transform: rotate(75deg); }
          70%  { transform: rotate(79deg); }
          75%  { transform: rotate(83deg); }
          80%  { transform: rotate(86deg); }
          85%  { transform: rotate(88deg); }
          90%  { transform: rotate(89deg); }
          95%  { transform: rotate(89.5deg); }
          100% { transform: rotate(90deg); }
        }
      `;

          // Inject keyframes into document
          const styleSheet = document.createElement("style");
          styleSheet.textContent = wiggleKeyframes;
          document.head.appendChild(styleSheet);

          // Apply BOTH position transition AND rotation animation
          clone.style.transition = `
        left ${ascentDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
        top ${ascentDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
      `;

          clone.style.animation = `ascentWiggle-${type} ${ascentDuration}ms ease-in-out forwards`;

          // Apply position
          clone.style.left = `${targetLeft}px`;
          clone.style.top = `${targetTop}px`;
        }, staggerDelays[type]);
      });

      console.log("Phase 2: All parts ascending with stagger!");
    }, 1000); // Start Phase 2 after 1s hold (Phase 1 dim duration)

    // ============================================================
    // PHASE 3: CHARGE-UP - Dramatic pause with scale growth
    // ============================================================

    setTimeout(
      () => {
        console.log("Phase 3: Dramatic pause - gathering presence...");

        const chargeUpDuration = 1200; // Slower, more dramatic
        const targetScale = 1.5;

        // Apply scale-up animation to all clones
        Object.keys(clones).forEach((type) => {
          const clone = clones[type];
          if (!clone) return;

          // Get module name and scale offset
          const moduleName = clone.dataset.module;
          const scaleOffset = moduleScaleOffsets[moduleName] || { x: 0, y: 0 };

          // Get current position
          const currentLeft = parseFloat(clone.style.left);
          const currentTop = parseFloat(clone.style.top);

          // Reset transform origin to center
          clone.style.transformOrigin = "center center";

          // Smooth, organic scale-up with slight anticipation
          const scaleUpKeyframes = `
        @keyframes scaleUp-${type} {
          0% {
            transform: rotate(90deg) scale(1);
          }
          15% {
            transform: rotate(90deg) scale(0.98);
          }
          70% {
            transform: rotate(90deg) scale(1.55);
          }
          85% {
            transform: rotate(90deg) scale(1.48);
          }
          100% {
            transform: rotate(90deg) scale(${targetScale});
          }
        }
      `;

          // Inject keyframes
          const styleSheet = document.createElement("style");
          styleSheet.textContent = scaleUpKeyframes;
          document.head.appendChild(styleSheet);

          // Apply animation with elastic easing
          clone.style.transition = `
        left ${chargeUpDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1),
        top ${chargeUpDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1)
      `;
          clone.style.animation = `scaleUp-${type} ${chargeUpDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`;

          // Apply position with scale offset
          clone.style.left = `${currentLeft + scaleOffset.x}px`;
          clone.style.top = `${currentTop + scaleOffset.y}px`;
        });

        console.log("Phase 3: Parts growing with presence...");
      },
      1000 + 1000 + 200,
    ); // Phase 1 (1000ms) + Phase 2 (1000ms) + wait for bell

    // ============================================================
    // PHASE 4: ASSEMBLY SLAM - Parts converge to center
    // ============================================================

    setTimeout(
      () => {
        console.log("Phase 4: SLAM - converging to center!");

        const slamDuration = 400; // Fast and decisive
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;

        // Slam all parts to center
        Object.keys(clones).forEach((type) => {
          const clone = clones[type];
          if (!clone) return;

          // Get module name and slam offset
          const moduleName = clone.dataset.module;
          const slamOffset = moduleSlamOffsets[moduleName] || { x: 0, y: 0 };

          const currentWidth = parseFloat(clone.style.width) * 1.5; // Account for scale
          const currentHeight = parseFloat(clone.style.height) * 1.5;

          // Target: dead center of screen + slam offset
          const targetLeft = screenCenterX - currentWidth / 2 + slamOffset.x;
          const targetTop = screenCenterY - currentHeight / 2 + slamOffset.y;

          // Fast snap to center
          clone.style.transition = `
        left ${slamDuration}ms cubic-bezier(0.6, 0.04, 0.98, 0.34),
        top ${slamDuration}ms cubic-bezier(0.6, 0.04, 0.98, 0.34)
      `;

          clone.style.left = `${targetLeft}px`;
          clone.style.top = `${targetTop}px`;
        });

        console.log("Phase 4: Parts slamming together!");
      },
      1000 + 1000 + 200 + 840, // Start Phase 4 at 70% through Phase 3 (1200ms * 0.7 = 840ms)
    );
    // ============================================================
    // PHASE 5: REVEAL - Flash and image swap
    // ============================================================

    setTimeout(
      () => {
        console.log("Phase 5: REVEAL - flash and swap!");

        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;

        // Create green flash element
        const flash = document.createElement("div");
        flash.style.position = "fixed";
        flash.style.left = `${screenCenterX}px`;
        flash.style.top = `${screenCenterY}px`;
        flash.style.width = "20px";
        flash.style.height = "20px";
        flash.style.borderRadius = "50%";
        flash.style.backgroundColor = "rgba(0, 255, 0, 0.9)";
        flash.style.boxShadow = "0 0 30px 10px rgba(0, 255, 0, 0.8)";
        flash.style.transform = "translate(-50%, -50%)";
        flash.style.zIndex = "150";
        flash.style.pointerEvents = "none";
        document.body.appendChild(flash);

        // Animate flash expansion
        const flashKeyframes = `
      @keyframes flashExplosion {
        0% {
          width: 20px;
          height: 20px;
          opacity: 1;
          box-shadow: 0 0 30px 10px rgba(0, 255, 0, 0.8);
        }
        30% {
          width: 300px;
          height: 300px;
          opacity: 1;
          box-shadow: 0 0 80px 40px rgba(0, 255, 0, 0.9);
        }
        50% {
          width: 400px;
          height: 400px;
          opacity: 1;
          box-shadow: 0 0 100px 50px rgba(0, 255, 0, 0.9);
        }
        100% {
          width: 500px;
          height: 500px;
          opacity: 0;
          box-shadow: 0 0 120px 60px rgba(0, 255, 0, 0);
        }
      }
    `;

        const flashStyle = document.createElement("style");
        flashStyle.textContent = flashKeyframes;
        document.head.appendChild(flashStyle);

        flash.style.animation = "flashExplosion 600ms ease-out forwards";

        // Remove green glow from clones at flash peak
        setTimeout(() => {
          Object.keys(clones).forEach((type) => {
            const clone = clones[type];
            if (clone) {
              clone.style.filter = "none"; // Remove green glow
            }
          });
        }, 150);

        // Swap images at flash peak (when opacity is maximum)
        setTimeout(() => {
          console.log("Swapping to assembled image...");
          // REMOVE individual clones completely
          Object.keys(clones).forEach((type) => {
            const clone = clones[type];
            if (clone) {
              clone.remove(); // Actually remove from DOM instead of just hiding
            }
          });

          // Build the key and get the config code
          const key = `${selectedBody}-${selectedMouth}-${selectedBell}`;
          currentConfigCode = CONFIG_CODES[key];

          if (!currentConfigCode) {
            console.error(`No configuration code found for: ${key}`);
            return;
          }

          console.log(`Assembled configuration code: ${currentConfigCode}`);

          // Build image path directly from the parts
          const imagePath = `Assets/AssembledSatMods/${selectedBody.charAt(0).toUpperCase() + selectedBody.slice(1)}-${selectedMouth.charAt(0).toUpperCase() + selectedMouth.slice(1)}-${selectedBell.charAt(0).toUpperCase() + selectedBell.slice(1)}.png`;

          // Create assembled image
          const assembled = document.createElement("img");
          assembled.className = "assembled-saturn";
          assembled.src = imagePath;
          assembled.style.position = "fixed";
          assembled.style.left = `${screenCenterX}px`;
          assembled.style.top = `${screenCenterY}px`;
          assembled.style.transform =
            "translate(-50%, -50%) rotate(90deg) scale(0.3)";
          assembled.style.width = "1310px"; // Adjust to match your assets
          assembled.style.height = "600";
          assembled.style.zIndex = "101";
          assembled.style.imageRendering = "crisp-edges";
          assembled.style.objectFit = "contain";
          assembled.style.filter = "none"; // No glow

          document.body.appendChild(assembled);
        }, 250);

        // Remove flash element after animation
        setTimeout(() => {
          flash.remove();
        }, 1000);

        console.log("Phase 5: Flash complete, object revealed!");
      },
      1000 + 1000 + 200 + 840 + 400, // After Phase 4 completes (400ms slam duration)
    );
    // ============================================================
    // PHASE 6: POST-ASSEMBLY STILLNESS + SLOW GROWTH
    // ============================================================

    setTimeout(
      () => {
        console.log("Phase 6: Stillness and slow growth...");

        const assembled = document.querySelector(".assembled-saturn");
        if (!assembled) {
          console.error("Phase 6: Could not find assembled image!");
          return;
        }

        console.log("Phase 6: Found assembled image, preparing growth...");

        // Brief pause before growth starts
        setTimeout(() => {
          // Slow, organic growth from scale(0.3) to scale(0.45) [50% increase]
          assembled.style.transition =
            "transform 2000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
          assembled.style.transform =
            "translate(-50%, -50%) rotate(90deg) scale(0.45)";

          console.log("Phase 6: Image growing slowly...");
        }, 200); // 200ms stillness before growth begins
      },
      1000 + 1000 + 200 + 840 + 400 + 300, // Changed from +250 to +300 (50ms after image creation)
    );
    // ============================================================
    // PHASE 7: INFORMATION BLOOM (overlaps with Phase 6 growth)
    // ============================================================

    setTimeout(
      () => {
        console.log("Phase 7: Information bloom beginning...");

        const assembled = document.querySelector(".assembled-saturn");
        if (!assembled) {
          console.error("Phase 7: Could not find assembled image!");
          return;
        }

        const assembledRect = assembled.getBoundingClientRect();
        const padding = 20; // Minimum distance from screen edge
        const gap = 100; // Gap between elements and instrument

        // ============================================================
        // NAMETAG (slides in from top)
        // ============================================================
        const nametagWidth = 1440; // 1920px * 0.75 scaled
        const nametagHeight = 810; // 1080px * 0.75 scaled

        const nametag = document.createElement("img");
        nametag.src = "Assets/SaturnInfobloom/SaturnNametag.png";
        nametag.className = "info-bloom-nametag";
        nametag.style.position = "fixed";
        nametag.style.width = `${nametagWidth}px`;
        nametag.style.height = `${nametagHeight}px`;
        nametag.style.imageRendering = "crisp-edges";
        nametag.style.objectFit = "contain";

        // Center horizontally relative to assembled image
        const nametagLeft =
          assembledRect.left + assembledRect.width / 2 - nametagWidth / 2;
        nametag.style.left = `${nametagLeft}px`;

        // Start off-screen above
        nametag.style.top = `-${nametagHeight + 50}px`;

        nametag.style.zIndex = "102";
        nametag.style.transition =
          "top 1250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        document.body.appendChild(nametag);

        // ============================================================
        // HEADING (slides in from top-right, appears after nametag)
        // ============================================================
        const headingWidth = 960; // 1920px * 0.5 scaled
        const headingHeight = 540; // 1080px * 0.5 scaled

        const heading = document.createElement("img");
        heading.src = "Assets/SaturnInfobloom/SaturnHeading.png";
        heading.className = "info-bloom-heading";
        heading.style.position = "fixed";
        heading.style.width = `${headingWidth}px`;
        heading.style.height = `${headingHeight}px`;
        heading.style.imageRendering = "crisp-edges";
        heading.style.objectFit = "contain";

        // Start position: to the right of nametag, off-screen above
        const headingStartLeft = nametagLeft + nametagWidth - 250;
        heading.style.left = `${headingStartLeft}px`;
        heading.style.top = `-${headingHeight + 100}px`;

        heading.style.zIndex = "102";
        heading.style.transition =
          "top 1250ms cubic-bezier(0.25, 0.46, 0.45, 0.94), left 1250ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        heading.style.transform = "rotate(0deg)";
        document.body.appendChild(heading);

        // ============================================================
        // LEFT PANEL (Release Notes)
        // ============================================================
        const releaseNotesWidth = 614.4; // 1024 * 0.6
        const releaseNotesHeight = 1365; // 1092 * 0.6

        const releaseNotes = document.createElement("img");
        releaseNotes.src = "Assets/SaturnInfobloom/SaturnReleaseNotes.png";
        releaseNotes.className = "info-bloom-left";
        releaseNotes.style.position = "fixed";
        releaseNotes.style.width = `${releaseNotesWidth}px`;
        releaseNotes.style.height = `${releaseNotesHeight}px`;
        releaseNotes.style.imageRendering = "crisp-edges";
        releaseNotes.style.objectFit = "contain";
        releaseNotes.style.zIndex = "102";

        // Position vertically centered with assembled image
        releaseNotes.style.top = `${assembledRect.top + assembledRect.height / 2 - releaseNotesHeight / 2}px`;

        // Start off-screen left
        releaseNotes.style.left = `-${releaseNotesWidth + 200}px`;

        releaseNotes.style.transition =
          "left 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        releaseNotes.style.transform = "rotate(0deg)";
        document.body.appendChild(releaseNotes);

        // ============================================================
        // POLAROID (Team Picture) - slides in with heading, above release notes
        // ============================================================
        const polaroidWidth = 990 * 0.3; // 25% size = 247.5px
        const polaroidHeight = 1150 * 0.3; // 25% size = 287.5px

        const polaroid = document.createElement("img");
        polaroid.src = "Assets/SaturnInfobloom/SaturnTeamPic.png";
        polaroid.className = "info-bloom-polaroid";
        polaroid.style.position = "fixed";
        polaroid.style.width = `${polaroidWidth}px`;
        polaroid.style.height = `${polaroidHeight}px`;
        polaroid.style.imageRendering = "crisp-edges";
        polaroid.style.objectFit = "contain";
        polaroid.style.zIndex = "103"; // Above release notes (102)

        // Position 200px lower than release notes
        polaroid.style.top = `${assembledRect.top + assembledRect.height / 2 - releaseNotesHeight / 2 + 925}px`;

        // Start off-screen left (same as release notes)
        polaroid.style.left = `-${polaroidWidth + 200}px`;

        polaroid.style.transition =
          "left 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        polaroid.style.transform = "rotate(0deg)";
        document.body.appendChild(polaroid);

        // ============================================================
        // RIGHT PANEL (Cutting Board)
        // ============================================================
        const cuttingBoardWidth = 1200 * 0.6;
        const cuttingBoardHeight = 1752 * 0.6;

        const cuttingBoard = document.createElement("img");
        cuttingBoard.src = "Assets/SaturnInfobloom/SaturnCuttingBoard.png";
        cuttingBoard.className = "info-bloom-right";
        cuttingBoard.style.position = "fixed";
        cuttingBoard.style.width = `${cuttingBoardWidth}px`;
        cuttingBoard.style.height = `${cuttingBoardHeight}px`;
        cuttingBoard.style.imageRendering = "crisp-edges";
        cuttingBoard.style.objectFit = "contain";
        cuttingBoard.style.zIndex = "101";

        // Position vertically centered with assembled image
        cuttingBoard.style.top = `${assembledRect.top + assembledRect.height / 2 - cuttingBoardHeight / 2 + 100}px`;

        // Start off-screen right
        cuttingBoard.style.right = `-${cuttingBoardWidth + 200}px`;

        cuttingBoard.style.transition =
          "right 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        cuttingBoard.style.transform = "rotate(10deg)"; // Start at 10 degrees
        document.body.appendChild(cuttingBoard);

        // ============================================================
        // NOTECARDS (Mouthpiece, Body, Bell) - slide in with random delays
        // ============================================================
        const notecardWidth = 1920 * 0.45; // 45% size
        const notecardHeight = 1080 * 0.45; // 45% size

        // Determine which notecard images to use based on selections
        // Mouthpiece: pandoraK, pandoraM, or pandoraS
        let mouthNotecardSrc = "Assets/SaturnInfobloom/PandoraKNotecard.png"; // default
        if (selectedMouth === "pandoraK") {
          mouthNotecardSrc = "Assets/SaturnInfobloom/PandoraKNotecard.png";
        } else if (selectedMouth === "pandoraM") {
          mouthNotecardSrc = "Assets/SaturnInfobloom/PandoraMNotecard.png";
        } else if (selectedMouth === "pandoraS") {
          mouthNotecardSrc = "Assets/SaturnInfobloom/PandoraSNotecard.png";
        }

        // Body: titan or phoebe
        let bodyNotecardSrc = "Assets/SaturnInfobloom/TitanNotecard.png"; // default
        if (selectedBody === "titan") {
          bodyNotecardSrc = "Assets/SaturnInfobloom/TitanNotecard.png";
        } else if (selectedBody === "phoebe") {
          bodyNotecardSrc = "Assets/SaturnInfobloom/PhoebeNotecard.png";
        }

        // Bell: tethys or enceladus
        let bellNotecardSrc = "Assets/SaturnInfobloom/EnceladusNotecard.png"; // default
        if (selectedBell === "tethys") {
          bellNotecardSrc = "Assets/SaturnInfobloom/TethysNotecard.png";
        } else if (selectedBell === "enceladus") {
          bellNotecardSrc = "Assets/SaturnInfobloom/EnceladusNotecard.png";
        }

        // Mouthpiece Notecard
        const mouthNotecard = document.createElement("img");
        mouthNotecard.src = mouthNotecardSrc; // Use selected image
        mouthNotecard.className = "info-bloom-notecard-mouth";
        mouthNotecard.style.position = "fixed";
        mouthNotecard.style.width = `${notecardWidth}px`;
        mouthNotecard.style.height = `${notecardHeight}px`;
        mouthNotecard.style.imageRendering = "crisp-edges";
        mouthNotecard.style.objectFit = "contain";
        mouthNotecard.style.zIndex = "101";

        mouthNotecard.style.top = `${assembledRect.top + assembledRect.height / 2 - notecardHeight / 2 - 220 + 30}px`;
        mouthNotecard.style.right = `-${notecardWidth + 600}px`;

        mouthNotecard.style.transition =
          "right 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        mouthNotecard.style.transform = "rotate(10deg)";
        document.body.appendChild(mouthNotecard);

        // Body Notecard
        const bodyNotecard = document.createElement("img");
        bodyNotecard.src = bodyNotecardSrc; // Use selected image
        bodyNotecard.className = "info-bloom-notecard-body";
        bodyNotecard.style.position = "fixed";
        bodyNotecard.style.width = `${notecardWidth}px`;
        bodyNotecard.style.height = `${notecardHeight}px`;
        bodyNotecard.style.imageRendering = "crisp-edges";
        bodyNotecard.style.objectFit = "contain";
        bodyNotecard.style.zIndex = "103";

        bodyNotecard.style.top = `${assembledRect.top + assembledRect.height / 2 - notecardHeight / 2 + 130 + 30}px`;
        bodyNotecard.style.right = `-${notecardWidth + 0}px`;

        bodyNotecard.style.transition =
          "right 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        bodyNotecard.style.transform = "rotate(10deg)";
        document.body.appendChild(bodyNotecard);

        // Bell Notecard
        const bellNotecard = document.createElement("img");
        bellNotecard.src = bellNotecardSrc; // Use selected image
        bellNotecard.className = "info-bloom-notecard-bell";
        bellNotecard.style.position = "fixed";
        bellNotecard.style.width = `${notecardWidth}px`;
        bellNotecard.style.height = `${notecardHeight}px`;
        bellNotecard.style.imageRendering = "crisp-edges";
        bellNotecard.style.objectFit = "contain";
        bellNotecard.style.zIndex = "102";

        bellNotecard.style.top = `${assembledRect.top + assembledRect.height / 2 - notecardHeight / 2 + 375 + 30}px`;
        bellNotecard.style.right = `-${notecardWidth + 0}px`;

        bellNotecard.style.transition =
          "right 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        bellNotecard.style.transform = "rotate(10deg)";
        document.body.appendChild(bellNotecard);

        // ============================================================
        // SLIDE EVERYTHING IN IMMEDIATE
        // ============================================================
        setTimeout(() => {
          // Slide nametag down from top
          let nametagTop = assembledRect.top - gap - nametagHeight;
          nametagTop = Math.max(padding, nametagTop); // Clamp to screen
          nametag.style.top = `${nametagTop - 200 - 100}px`;

          // Slide left panel in with rotation
          let leftPos = assembledRect.left - gap - releaseNotesWidth;
          leftPos = Math.max(padding, leftPos); // Clamp to screen
          releaseNotes.style.left = `${leftPos}px`;
          releaseNotes.style.transform = "rotate(-2deg)";

          // Slide right panel in with rotation change
          let rightPos = assembledRect.right + gap;
          rightPos = Math.min(
            window.innerWidth - cuttingBoardWidth - padding,
            rightPos,
          ); // Clamp to screen
          cuttingBoard.style.right = `${window.innerWidth - rightPos - cuttingBoardWidth}px`;
          cuttingBoard.style.transform = "rotate(2deg)"; // End at 2 degrees

          console.log("Phase 7: Info panels sliding in...");

          // ============================================================
          // SLIDE IN DELAYED STUFF
          // ============================================================
          setTimeout(() => {
            // Final position: 100px right of starting position, slightly below nametag, rotated 3°
            const headingFinalLeft = headingStartLeft - 600;
            const headingFinalTop = nametagTop - 750 + nametagHeight; // Below nametag with small gap

            heading.style.left = `${headingFinalLeft}px`;
            heading.style.top = `${headingFinalTop - 100}px`;
            heading.style.transform = "rotate(-3deg)";

            // Slide polaroid in with +1 degree rotation (slides at same time as heading)
            let polaroidPos = assembledRect.left - gap - polaroidWidth;
            polaroidPos = Math.max(padding, polaroidPos); // Clamp to screen
            polaroid.style.left = `${polaroidPos - 225}px`;
            polaroid.style.transform = "rotate(-6deg)";

            // Slide notecards in with random delays (100-300ms range)
            const mouthDelay = 100 + Math.random() * 400;
            const bodyDelay = 100 + Math.random() * 400;
            const bellDelay = 100 + Math.random() * 300;

            setTimeout(() => {
              let mouthPos = assembledRect.right + gap;
              mouthPos = Math.min(
                window.innerWidth - notecardWidth - padding,
                mouthPos,
              );
              mouthNotecard.style.right = `${window.innerWidth - mouthPos - notecardWidth + 75 - 10}px`;
              mouthNotecard.style.transform = "rotate(0deg)";
              console.log("Phase 7: Mouth notecard sliding in...");
            }, mouthDelay);

            setTimeout(() => {
              let bodyPos = assembledRect.right + gap;
              bodyPos = Math.min(
                window.innerWidth - notecardWidth - padding,
                bodyPos,
              );
              bodyNotecard.style.right = `${window.innerWidth - bodyPos - notecardWidth - 100 - 10}px`;
              bodyNotecard.style.transform = "rotate(5deg)";
              console.log("Phase 7: Body notecard sliding in...");
            }, bodyDelay);

            setTimeout(() => {
              let bellPos = assembledRect.right + gap;
              bellPos = Math.min(
                window.innerWidth - notecardWidth - padding,
                bellPos,
              );
              bellNotecard.style.right = `${window.innerWidth - bellPos - notecardWidth + 175 - 10}px`;
              bellNotecard.style.transform = "rotate(-4deg)";
              console.log("Phase 7: Bell notecard sliding in...");
            }, bellDelay);

            console.log("Phase 7: Heading sliding in...");
          }, 250); // 150ms after nametag starts sliding
        }, 50); // Small delay to ensure transition triggers

        console.log("Phase 7: Nametag, heading, and panels created!");
        // ============================================================
        // PHASE 8: RE-ENABLE CLICKS
        // ============================================================
        setTimeout(() => {
          window.animationRunning = false;
          window.saturnAssemblyComplete = true;
          console.log("Phase 8: Animation complete - clicks re-enabled.");
        }, 2000); // 2000ms covers the slowest notecard (250 + 400 random + 1000 transition)
      },
      1000 + 1000 + 200 + 840 + 400 + 300 + 1100, // Phase 6 start + 1100ms (halfway through growth)
    );
  }
  /*================================================================================*/
  /* 🛑 🛑 🛑 End Of Assembly function 🛑 🛑 🛑*/
  /*================================================================================*/

  function getActivePosterAndImg() {
    const poster = document.querySelector(".poster.SaturnCD.poster-active");
    if (!poster) return { poster: null, img: null };
    const img = poster.querySelector("#saturn-cd-disk");
    return { poster, img };
  }

  function spinFrame(ts, img) {
    if (!lastTimestamp) lastTimestamp = ts;
    const delta = ts - lastTimestamp;
    lastTimestamp = ts;

    currentRotation = (currentRotation + SPIN_DEG_PER_MS * delta) % 360;
    img.style.transform = `rotate(${currentRotation}deg)`;

    spinRaf = requestAnimationFrame((t) => spinFrame(t, img));
  }

  function startSpinning(img) {
    if (spinState === "spinning") return;
    spinState = "spinning";
    img.style.transition = "none"; // ensure RAF controls it smoothly
    lastTimestamp = performance.now();
    spinRaf = requestAnimationFrame((t) => spinFrame(t, img));
  }

  function stopSpinning(img) {
    if (spinRaf) cancelAnimationFrame(spinRaf);
    spinRaf = null;
    spinState = "idle";
    // Keep the current rotation position - don't reset to -45
    img.style.transition = "transform 0.4s ease";
    // The rotation stays at whatever currentRotation was when stopped
  }

  function stopAndReset(img) {
    if (spinRaf) cancelAnimationFrame(spinRaf);
    spinRaf = null;
    spinState = "idle";
    currentRotation = -45;
    img.style.transition = "transform 0.4s ease";
    img.style.transform = `rotate(${currentRotation}deg)`;
  }

  // Click handler: toggle continuous spin
  document.addEventListener("click", (e) => {
    const { poster, img } = getActivePosterAndImg();
    if (!poster || !img) return;

    const cdContainer = poster.querySelector(".cd-disk");
    if (!cdContainer || !cdContainer.contains(e.target)) return;

    if (spinState === "idle") {
      startSpinning(img);
      startNoteEmitter(poster);
    } else {
      stopSpinning(img); // Just stop, don't reset position
      stopNoteEmitter();
    }
  });

  /*================================================================================*/
  /* Clean up when the poster is inactive */
  /*================================================================================*/

  // Watch for poster closing → stop + reset
  const mo = new MutationObserver(() => {
    mo.disconnect();

    const poster = document.querySelector(".poster.SaturnCD");
    const img = poster?.querySelector("#saturn-cd-disk");

    // If poster is still active, just reconnect and do nothing
    if (!poster || !img || poster.classList.contains("poster-active")) {
      mo.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"],
      });
      return;
    }

    // Poster exists, has img, and is NOT active — run full cleanup
    stopAndReset(img);
    stopNoteEmitter();
    document.body.classList.remove("assembly-active");
    assemblyInProgress = false;
    window.animationRunning = false;
    window.saturnAssemblyComplete = false;
    if (poster) poster.style.pointerEvents = "";

    document.querySelectorAll(".assembly-clone").forEach((c) => c.remove());
    document.querySelectorAll(".assembled-saturn").forEach((a) => a.remove());
    document
      .querySelectorAll(
        ".info-bloom-left, .info-bloom-right, .info-bloom-heading, .info-bloom-nametag, .info-bloom-polaroid, .info-bloom-notecard-mouth, .info-bloom-notecard-body, .info-bloom-notecard-bell",
      )
      .forEach((e) => e.remove());
    document.querySelectorAll(".dimmed-module").forEach((m) => {
      m.classList.remove("dimmed-module");
    });
    document.querySelectorAll(".module-image").forEach((img) => {
      img.style.opacity = "";
    });

    selectedBody = null;
    selectedMouth = null;
    selectedBell = null;

    [
      "titan-select",
      "phoebe-select",
      "pandoraK-select",
      "pandoraM-select",
      "pandoraS-select",
      "tethys-select",
      "enceladus-select",
    ].forEach((id) => {
      const checkbox = document.getElementById(id);
      if (checkbox) checkbox.checked = false;
    });

    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });

  mo.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  // Initialize
  (function initIfPresent() {
    const poster = document.querySelector(".poster.SaturnCD");
    if (!poster) return;
    const img = poster.querySelector("#saturn-cd-disk");
    if (!img) return;
    img.style.transform = `rotate(${currentRotation}deg)`;
  })();

  // ============================================================================================================================
  // 🛰️ MODULE SELECTION MANAGEMENT SYSTEM 🛰️
  // ============================================================================================================================

  // Direct click handling for each module's label/hitbox
  document.addEventListener("click", (e) => {
    const target = e.target;

    // Use setTimeout to let the checkbox state update first
    setTimeout(() => {
      // Check if any module hitbox was clicked AND play sound only if being selected
      if (
        target.id &&
        target.id.includes("module-") &&
        target.id.includes("-hitbox")
      ) {
        // Extract the checkbox ID from the hitbox ID
        // e.g., "module-Titan-hitbox" → "titan-select"
        const moduleName = target.id
          .replace("module-", "")
          .replace("-hitbox", "");

        // Handle special case for PandoraK, PandoraM, PandoraS
        let checkboxId;
        if (moduleName === "PandoraK") {
          checkboxId = "pandoraK-select";
        } else if (moduleName === "PandoraM") {
          checkboxId = "pandoraM-select";
        } else if (moduleName === "PandoraS") {
          checkboxId = "pandoraS-select";
        } else {
          checkboxId = `${moduleName.toLowerCase()}-select`;
        }

        const checkbox = document.getElementById(checkboxId);

        // Only play sound if checkbox is NOW checked (being selected)
        if (checkbox && checkbox.checked) {
          playRandomModularSound();
        }
      }

      // BODY MODULES (Titan, Phoebe)
      if (target.id === "module-Titan-hitbox") {
        const titan = document.getElementById("titan-select");
        const phoebe = document.getElementById("phoebe-select");
        if (titan && phoebe && titan.checked) {
          phoebe.checked = false;
          selectedBody = "titan";
        } else if (titan && !titan.checked) {
          selectedBody = null;
        }
      }

      if (target.id === "module-Phoebe-hitbox") {
        const titan = document.getElementById("titan-select");
        const phoebe = document.getElementById("phoebe-select");
        if (titan && phoebe && phoebe.checked) {
          titan.checked = false;
          selectedBody = "phoebe";
        } else if (phoebe && !phoebe.checked) {
          selectedBody = null;
        }
      }

      // MOUTH MODULES (PandoraK, PandoraM, PandoraS)
      if (target.id === "module-PandoraK-hitbox") {
        const pandoraK = document.getElementById("pandoraK-select");
        const pandoraM = document.getElementById("pandoraM-select");
        const pandoraS = document.getElementById("pandoraS-select");
        if (pandoraK && pandoraK.checked) {
          if (pandoraM) pandoraM.checked = false;
          if (pandoraS) pandoraS.checked = false;
          selectedMouth = "pandoraK";
        } else if (pandoraK && !pandoraK.checked) {
          selectedMouth = null;
        }
      }

      if (target.id === "module-PandoraM-hitbox") {
        const pandoraK = document.getElementById("pandoraK-select");
        const pandoraM = document.getElementById("pandoraM-select");
        const pandoraS = document.getElementById("pandoraS-select");
        if (pandoraM && pandoraM.checked) {
          if (pandoraK) pandoraK.checked = false;
          if (pandoraS) pandoraS.checked = false;
          selectedMouth = "pandoraM";
        } else if (pandoraM && !pandoraM.checked) {
          selectedMouth = null;
        }
      }

      if (target.id === "module-PandoraS-hitbox") {
        const pandoraK = document.getElementById("pandoraK-select");
        const pandoraM = document.getElementById("pandoraM-select");
        const pandoraS = document.getElementById("pandoraS-select");
        if (pandoraS && pandoraS.checked) {
          if (pandoraK) pandoraK.checked = false;
          if (pandoraM) pandoraM.checked = false;
          selectedMouth = "pandoraS";
        } else if (pandoraS && !pandoraS.checked) {
          selectedMouth = null;
        }
      }

      // BELL MODULES (Tethys, Enceladus)
      if (target.id === "module-Tethys-hitbox") {
        const tethys = document.getElementById("tethys-select");
        const enceladus = document.getElementById("enceladus-select");
        if (tethys && enceladus && tethys.checked) {
          enceladus.checked = false;
          selectedBell = "tethys";
        } else if (tethys && !tethys.checked) {
          selectedBell = null;
        }
      }

      if (target.id === "module-Enceladus-hitbox") {
        const tethys = document.getElementById("tethys-select");
        const enceladus = document.getElementById("enceladus-select");
        if (tethys && enceladus && enceladus.checked) {
          tethys.checked = false;
          selectedBell = "enceladus";
        } else if (enceladus && !enceladus.checked) {
          selectedBell = null;
        }
      }

      // Optional: Log current selections for debugging
      console.log("Current selections:", {
        selectedBody,
        selectedMouth,
        selectedBell,
      });
      // Check if all 3 categories are selected
      if (
        selectedBody &&
        selectedMouth &&
        selectedBell &&
        !assemblyInProgress
      ) {
        console.log("All parts selected! Starting assembly...");
        assemblyInProgress = true; // Set flag

        // Wait a moment (let the selection sound finish)
        setTimeout(() => {
          startAssemblyAnimation();
        }, 500); // 0.5 second delay
      }
    }, 0);
  });
  window.saturnDisassemble = function () {
    window.animationRunning = true;
    window.saturnAssemblyComplete = false;

    const speed = 400; // ms — about 2.5x faster than the 1000ms entry

    // ── Nametag ──────────────────────────────────────────
    const nametag = document.querySelector(".info-bloom-nametag");
    if (nametag) {
      const nametagHeight = 810;
      nametag.style.transition = `top ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      nametag.style.top = `-${nametagHeight + 50}px`;
    }

    // ── Heading ───────────────────────────────────────────
    const heading = document.querySelector(".info-bloom-heading");
    if (heading) {
      const headingHeight = 540;
      heading.style.transition = `top ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      heading.style.top = `-${headingHeight + 100}px`;
    }

    // ── Left panel (release notes) ────────────────────────
    const releaseNotes = document.querySelector(".info-bloom-left");
    if (releaseNotes) {
      const releaseNotesWidth = 614.4;
      releaseNotes.style.transition = `left ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      releaseNotes.style.left = `-${releaseNotesWidth + 200}px`;
    }

    // ── Polaroid ──────────────────────────────────────────
    const polaroid = document.querySelector(".info-bloom-polaroid");
    if (polaroid) {
      const polaroidWidth = 990 * 0.3;
      polaroid.style.transition = `left ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      polaroid.style.left = `-${polaroidWidth + 200}px`;
    }

    // ── Right panel (cutting board) ───────────────────────
    const cuttingBoard = document.querySelector(".info-bloom-right");
    if (cuttingBoard) {
      const cuttingBoardWidth = 1200 * 0.6;
      cuttingBoard.style.transition = `right ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      cuttingBoard.style.right = `-${cuttingBoardWidth + 200}px`;
    }

    // ── Notecards ─────────────────────────────────────────
    const mouthNotecard = document.querySelector(".info-bloom-notecard-mouth");
    if (mouthNotecard) {
      const notecardWidth = 1920 * 0.45;
      mouthNotecard.style.transition = `right ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      mouthNotecard.style.right = `-${notecardWidth + 600}px`;
    }

    const bodyNotecard = document.querySelector(".info-bloom-notecard-body");
    if (bodyNotecard) {
      const notecardWidth = 1920 * 0.45;
      bodyNotecard.style.transition = `right ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      bodyNotecard.style.right = `-${notecardWidth}px`;
    }

    const bellNotecard = document.querySelector(".info-bloom-notecard-bell");
    if (bellNotecard) {
      const notecardWidth = 1920 * 0.45;
      bellNotecard.style.transition = `right ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      bellNotecard.style.right = `-${notecardWidth}px`;
    }
    // Fade assembled image and undim simultaneously
    const assembled = document.querySelector(".assembled-saturn");
    if (assembled) {
      assembled.style.transition = "opacity 1000ms ease";
      assembled.style.opacity = "0";
      setTimeout(() => assembled.remove(), 1000);
    }

    // Undim — CSS transition on body::before handles the fade automatically
    document.body.classList.remove("assembly-active");

    // Restore selected module images with fade
    document.querySelectorAll(".module-image").forEach((img) => {
      img.style.transition = "opacity 500ms ease";
      img.style.opacity = "1";
    });

    // Remove dimmed class from non-selected modules
    document.querySelectorAll(".dimmed-module").forEach((m) => {
      m.classList.remove("dimmed-module");
    });

    // Reset checkboxes
    [
      "titan-select",
      "phoebe-select",
      "pandoraK-select",
      "pandoraM-select",
      "pandoraS-select",
      "tethys-select",
      "enceladus-select",
    ].forEach((id) => {
      const checkbox = document.getElementById(id);
      if (checkbox) checkbox.checked = false;
    });

    // Reset state
    selectedBody = null;
    selectedMouth = null;
    selectedBell = null;
    assemblyInProgress = false;

    // ── Cleanup after slides complete ─────────────────────
    setTimeout(() => {
      document
        .querySelectorAll(
          ".info-bloom-nametag, .info-bloom-heading, .info-bloom-left, .info-bloom-right, .info-bloom-polaroid, .info-bloom-notecard-mouth, .info-bloom-notecard-body, .info-bloom-notecard-bell",
        )
        .forEach((el) => el.remove());

      console.log("Disassemble: info bloom cleared.");
      // TODO: assembled image dismiss + blueprint restore will go here
      window.animationRunning = false;
    }, speed + 50); // slight buffer after transition
  };
})();

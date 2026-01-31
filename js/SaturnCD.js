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

  // Watch for poster closing → stop + reset
  const mo = new MutationObserver(() => {
    const poster = document.querySelector(".poster.SaturnCD");
    if (!poster) return;
    const img = poster.querySelector("#saturn-cd-disk");
    if (!img) return;

    if (!poster.classList.contains("poster-active")) {
      stopAndReset(img);
      stopNoteEmitter();

      // Reset module selections
      selectedBody = null;
      selectedMouth = null;
      selectedBell = null;

      // Uncheck all module checkboxes when poster closes
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
    }
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
    }, 0);
  });
})();

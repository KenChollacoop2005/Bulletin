document.addEventListener("DOMContentLoaded", () => {
  const corkboard = document.querySelector(".corkboard");

  const initObserver = new MutationObserver(() => {
    const poster = document.querySelector(".SafeSlip");
    if (!poster) return;

    initObserver.disconnect();

    let bloomElements = [];
    let bloomTimeout = null;
    const speed = 350;

    function dismissBloom() {
      if (bloomElements.length === 0) return;

      bloomElements.forEach((el) => {
        const side = el.dataset.side;
        const offscreenSize = parseFloat(el.dataset.size) + 200;

        if (side === "right") {
          el.style.transition = `right ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
          el.style.right = `-${offscreenSize}px`;
        } else if (side === "left") {
          el.style.transition = `left ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
          el.style.left = `-${offscreenSize}px`;
        } else if (side === "top") {
          el.style.transition = `top ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
          el.style.top = `-${offscreenSize}px`;
        } else if (side === "bottom") {
          el.style.transition = `top ${speed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
          el.style.top = `${window.innerHeight + 200}px`;
        }
      });

      setTimeout(() => {
        bloomElements.forEach((el) => el.remove());
        bloomElements = [];
      }, speed + 50);
    }

    const activeObserver = new MutationObserver(() => {
      if (poster.classList.contains("poster-active")) {
        bloomTimeout = setTimeout(() => {
          triggerInfoBloom(poster, bloomElements);
        }, 1800);
      }

      if (!poster.classList.contains("poster-active")) {
        clearTimeout(bloomTimeout);
        dismissBloom();
      }
    });

    activeObserver.observe(poster, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });

  initObserver.observe(corkboard, { childList: true, subtree: true });
});

function triggerInfoBloom(poster, bloomElements) {
  const posterRect = poster.getBoundingClientRect();
  const padding = 20;
  const gap = 60;

  // ============================================================
  // BOARD (slides in from left)
  // ============================================================
  const boardWidth = 736;
  const boardHeight = 1002;

  const board = document.createElement("img");
  board.src = "Assets/SafeSlip/SafeSlipBoard.png";
  board.style.position = "fixed";
  board.style.width = `${boardWidth}px`;
  board.style.height = `${boardHeight}px`;
  board.style.imageRendering = "crisp-edges";
  board.style.objectFit = "contain";
  board.style.zIndex = "102";
  board.style.top = `${posterRect.top + posterRect.height / 2 - boardHeight / 2 - 100}px`;
  board.style.left = `-${boardWidth + 140}px`;
  board.style.transition =
    "left 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  board.style.transform = "rotate(2deg)";
  board.dataset.side = "left";
  board.dataset.size = boardWidth;
  document.body.appendChild(board);
  bloomElements.push(board);

  //
  // ALL OF THE FOLLOWING CODE FOR SIDE ELEMENTS ARE STOLEN FROM SATURN's INFO BLOOM SO NAMING
  // MAY NOT MAKE 100% SENSE. KEEP THAT IN MIND
  //

  // ============================================================
  // Lock
  // ============================================================
  const notecardWidth = 3648 * 0.2;
  const notecardHeight = 3648 * 0.2;

  const notecardA = document.createElement("img");
  notecardA.src = "Assets/SafeSlip/SafeSlipLock.png";
  notecardA.style.position = "fixed";
  notecardA.style.width = `${notecardWidth}px`;
  notecardA.style.height = `${notecardHeight}px`;
  notecardA.style.imageRendering = "crisp-edges";
  notecardA.style.objectFit = "contain";
  notecardA.style.zIndex = "101";
  notecardA.style.top = `${posterRect.top + posterRect.height / 2 - notecardHeight / 2 - 285}px`;
  notecardA.style.right = `-${notecardWidth + 200}px`;
  notecardA.style.transition =
    "right 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardA.style.transform = "rotate(8deg)";
  notecardA.dataset.side = "right";
  notecardA.dataset.size = notecardWidth;
  document.body.appendChild(notecardA);
  bloomElements.push(notecardA);

  // ============================================================
  // Mask
  // ============================================================
  const notecardWidth2 = 3648 * 0.2;
  const notecardHeight2 = 3648 * 0.2;
  const notecardB = document.createElement("img");
  notecardB.src = "Assets/SafeSlip/SafeSlipMask.png";
  notecardB.style.position = "fixed";
  notecardB.style.width = `${notecardWidth2}px`;
  notecardB.style.height = `${notecardHeight2}px`;
  notecardB.style.imageRendering = "crisp-edges";
  notecardB.style.objectFit = "contain";
  notecardB.style.zIndex = "102";
  notecardB.style.top = `${posterRect.top + posterRect.height / 2 - notecardHeight2 / 2 + 300}px`;
  notecardB.style.right = `-${notecardWidth2 + 200}px`;
  notecardB.style.transition =
    "right 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardB.style.transform = "rotate(-4deg)";
  notecardB.dataset.side = "right";
  notecardB.dataset.size = notecardWidth2;
  document.body.appendChild(notecardB);
  bloomElements.push(notecardB);

  // ============================================================
  // Mask polaroid
  // ============================================================
  const notecardWidth3 = 3648 * 0.1;
  const notecardHeight3 = 3648 * 0.1;
  const notecardC = document.createElement("img");
  notecardC.src = "Assets/SafeSlip/SafeSlipMask2.png";
  notecardC.style.position = "fixed";
  notecardC.style.width = `${notecardWidth3}px`;
  notecardC.style.height = `${notecardHeight3}px`;
  notecardC.style.imageRendering = "crisp-edges";
  notecardC.style.objectFit = "contain";
  notecardC.style.zIndex = "103";
  notecardC.style.top = `${posterRect.top + posterRect.height / 2 - notecardHeight3 / 2 + 243}px`;
  notecardC.style.right = `-${notecardWidth3 + 200}px`;
  notecardC.style.transition =
    "right 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardC.style.transform = "rotate(3deg)";
  notecardC.dataset.side = "right";
  notecardC.dataset.size = notecardWidth3;
  document.body.appendChild(notecardC);
  bloomElements.push(notecardC);

  // ============================================================
  // Welding and fabrics
  // ============================================================
  const notecardWidth4 = 1920 * 0.5;
  const notecardHeight4 = 1080 * 0.5;

  const notecardD = document.createElement("div");
  notecardD.style.position = "fixed";
  notecardD.style.width = `${notecardWidth4}px`;
  notecardD.style.height = `${notecardHeight4}px`;
  notecardD.style.zIndex = "101";
  notecardD.style.left = `${posterRect.left + posterRect.width / 2 - notecardWidth4 / 2 - 170}px`;
  notecardD.style.top = `-${notecardHeight4}px`;
  notecardD.style.transition =
    "top 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardD.style.transform = "rotate(-5deg)";
  notecardD.dataset.side = "top";
  notecardD.dataset.size = notecardHeight4;

  // GIF sits behind the PNG cutout
  const notecardDGif = document.createElement("img");
  notecardDGif.src = "Assets/SafeSlip/SafeSlipTop.gif";
  notecardDGif.style.position = "absolute";
  notecardDGif.style.width = `${2000 * 0.16}px`; // scale factor
  notecardDGif.style.height = `${2500 * 0.16}px`; // scale factor
  notecardDGif.style.top = "80px"; // nudge until aligned
  notecardDGif.style.left = "100px"; // nudge until aligned
  notecardDGif.style.transform = "rotate(-4deg)";
  notecardDGif.style.objectFit = "cover";
  notecardDGif.style.zIndex = "1";
  notecardD.appendChild(notecardDGif);

  // PNG cutout sits on top of the GIF
  const notecardDPng = document.createElement("img");
  notecardDPng.src = "Assets/SafeSlip/SafeSlipTop.png";
  notecardDPng.style.position = "absolute";
  notecardDPng.style.width = "100%";
  notecardDPng.style.height = "100%";
  notecardDPng.style.top = "0";
  notecardDPng.style.left = "0";
  notecardDPng.style.objectFit = "contain";
  notecardDPng.style.imageRendering = "crisp-edges";
  notecardDPng.style.zIndex = "2";
  notecardD.appendChild(notecardDPng);

  document.body.appendChild(notecardD);
  bloomElements.push(notecardD);

  // ============================================================
  // Display Polaroid (slides in from bottom)
  // ============================================================
  const notecardWidth5 = 6000 * 0.19;
  const notecardHeight5 = 3648 * 0.19;

  const notecardE = document.createElement("img");
  notecardE.src = "Assets/SafeSlip/SafeSlipDisplay.png";
  notecardE.style.position = "fixed";
  notecardE.style.width = `${notecardWidth5}px`;
  notecardE.style.height = `${notecardHeight5}px`;
  notecardE.style.imageRendering = "crisp-edges";
  notecardE.style.objectFit = "contain";
  notecardE.style.zIndex = "101";
  notecardE.style.left = `${posterRect.left + posterRect.width / 2 - notecardWidth5 / 2 - 200}px`;
  notecardE.style.top = `${window.innerHeight}px`;
  notecardE.style.transition =
    "top 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  notecardE.style.transform = "rotate(4deg)";
  notecardE.dataset.side = "bottom";
  notecardE.dataset.size = notecardHeight5;
  document.body.appendChild(notecardE);
  bloomElements.push(notecardE);

  // ============================================================
  // SLIDE EVERYTHING IN
  // ============================================================
  setTimeout(() => {
    let boardLeft = posterRect.left - gap - boardWidth;
    boardLeft = Math.max(padding, boardLeft);
    board.style.left = `${boardLeft - 20}px`;
    board.style.transform = "rotate(-2deg)";

    const delayA = 100 + Math.random() * 200;
    const delayB = 100 + Math.random() * 200;
    const delayC = 200 + Math.random() * 200;
    const delayD = 100 + Math.random() * 200;
    const delayE = 100 + Math.random() * 200;

    setTimeout(() => {
      let rightPos = posterRect.right + gap;
      notecardA.style.right = `${window.innerWidth - rightPos - notecardWidth + 300}px`;
      notecardA.style.transform = "rotate(5deg)";
    }, delayA);

    setTimeout(() => {
      let rightPos = posterRect.right + gap;
      notecardB.style.right = `${window.innerWidth - rightPos - notecardWidth2 + 360}px`;
      notecardB.style.transform = "rotate(-8deg)";
    }, delayB);

    setTimeout(() => {
      let rightPos = posterRect.right + gap;
      notecardC.style.right = `${window.innerWidth - rightPos - notecardWidth3 - 256}px`;
      notecardC.style.transform = "rotate(19deg)";
    }, delayC);

    setTimeout(() => {
      notecardD.style.top = `${padding - 70}px`;
      notecardD.style.transform = "rotate(0deg)";
    }, delayD);

    setTimeout(() => {
      notecardE.style.top = `${window.innerHeight - notecardHeight5 - padding + 120}px`;
      notecardE.style.transform = "rotate(0deg)";
    }, delayE);
  }, 50);
}

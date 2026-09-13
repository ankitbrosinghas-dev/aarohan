(function () {
  'use strict';

  const TOTAL_FRAMES = 147;
  const FRAME_PREFIX = 'frames/ezgif-frame-';
  const FRAME_EXT = '.png';

  // The first 22% of scroll operates the game gate opening; the remaining 78% plays the 147 video frames
  const PORTAL_PHASE_RATIO = 0.22;

  // DOM Elements
  const canvas = document.getElementById('scroll-canvas');
  const ctx = canvas.getContext('2d');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const duotoneOverlay = document.getElementById('duotone-overlay');
  const castleTitleContainer = document.getElementById('castle-title-container');
  const seamLightLeak = document.getElementById('seam-light-leak');
  const panelLeft = document.getElementById('panel-left');
  const panelRight = document.getElementById('panel-right');
  const doorImgLeft = document.querySelector('.door-img-left');
  const doorImgRight = document.querySelector('.door-img-right');
  const accentDot1 = document.getElementById('accent-dot-1');
  const accentDot2 = document.getElementById('accent-dot-2');
  const loader = document.getElementById('loader');
  const loaderPercent = document.getElementById('loader-percent');

  const images = [];
  let loadedCount = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let lastDrawnFrame = -1;

  // Mouse Cursor Parallax Tracking (-1.0 to 1.0)
  let mouseTargetX = 0;
  let mouseTargetY = 0;
  let mouseCurrentX = 0;
  let mouseCurrentY = 0;

  const pad = (n) => String(n).padStart(3, '0');

  // Mouse movement listener
  window.addEventListener('mousemove', (e) => {
    mouseTargetX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseTargetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('mouseleave', () => {
    mouseTargetX = 0;
    mouseTargetY = 0;
  });

  // Touch support for mobile tilt
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      mouseTargetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
      mouseTargetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    }
  }, { passive: true });

  // Resize canvas to match window dimensions with high-DPI scaling
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    render(getFrameIndexForProgress(currentProgress));
  }

  // Draw frame maintaining aspect ratio (cover mode)
  function render(frameIndex) {
    const img = images[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = w;
      drawH = w / imgRatio;
      drawX = 0;
      drawY = (h - drawH) / 2;
    } else {
      drawH = h;
      drawW = h * imgRatio;
      drawX = (w - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  // Preload all frames
  function preloadImages() {
    let firstFrameDrawn = false;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `${FRAME_PREFIX}${pad(i)}${FRAME_EXT}`;

      img.onload = () => {
        loadedCount++;
        const percent = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        if (loaderPercent) loaderPercent.textContent = `${percent}%`;

        if (!firstFrameDrawn && i === 1) {
          firstFrameDrawn = true;
          render(0);
        }

        if (loadedCount >= TOTAL_FRAMES) {
          hideLoader();
        }
      };

      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= TOTAL_FRAMES) {
          hideLoader();
        }
      };

      images.push(img);
    }
  }

  function hideLoader() {
    if (loader) {
      loader.classList.add('hidden');
    }
    resizeCanvas();
    render(0);
    updateTransforms(0);
  }

  // Fallback to ensure loader doesn't block
  setTimeout(() => {
    if (loader && !loader.classList.contains('hidden')) {
      hideLoader();
    }
  }, 2500);

  // Scroll calculation
  function onScroll() {
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    const maxScroll = docHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    targetProgress = Math.max(0, Math.min(1, scrollY / maxScroll));
  }

  // Calculate corresponding frame index only after the game gates are fully open
  function getFrameIndexForProgress(prog) {
    if (prog <= PORTAL_PHASE_RATIO) {
      return 0; // Locked on Frame 0 while gates slide open
    }
    // Scrub through video frames 0 to 146
    const videoProgress = (prog - PORTAL_PHASE_RATIO) / (1 - PORTAL_PHASE_RATIO);
    return Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(videoProgress * (TOTAL_FRAMES - 1))));
  }

  // Update Game Gate, Background Parallax, and Castle Title Logo transforms
  function updateTransforms(prog) {
    // 1. Gate Opening Phase (0.0 to 1.0 during first 22% scroll)
    const portalProg = Math.min(1, Math.max(0, prog / PORTAL_PHASE_RATIO));

    // Panel Horizontal Translation
    const panelTranslate = portalProg * 105;
    if (panelLeft) panelLeft.style.transform = `translateX(-${panelTranslate}%)`;
    if (panelRight) panelRight.style.transform = `translateX(${panelTranslate}%)`;

    // Subtle Door Image Parallax with cursor
    const doorShiftX = -mouseCurrentX * 14;
    const doorShiftY = -mouseCurrentY * 10;
    if (doorImgLeft) doorImgLeft.style.transform = `translate3d(${doorShiftX}px, ${doorShiftY}px, 0)`;
    if (doorImgRight) doorImgRight.style.transform = `translate3d(${doorShiftX}px, ${doorShiftY}px, 0)`;

    // Seam Light Leak / Energy Burst
    if (seamLightLeak) {
      if (portalProg > 0.01 && portalProg < 0.8) {
        const flareIntensity = Math.sin(portalProg * Math.PI) * 1.0;
        const leakShiftX = mouseCurrentX * 15;
        seamLightLeak.style.opacity = flareIntensity.toString();
        seamLightLeak.style.transform = `translateX(calc(-50% + ${leakShiftX}px)) scaleX(${1 + portalProg * 12})`;
      } else {
        seamLightLeak.style.opacity = '0';
      }
    }

    // 2. Background Canvas Scale & 3D Mouse Parallax
    const scale = 1.18 - (portalProg * 0.18);
    const bgShiftX = mouseCurrentX * 16;
    const bgShiftY = mouseCurrentY * 12;
    const bgTiltX = -mouseCurrentY * 2.5;
    const bgTiltY = mouseCurrentX * 2.5;
    if (canvasWrapper) {
      canvasWrapper.style.transform = `scale(${scale}) translate3d(${bgShiftX}px, ${bgShiftY}px, 0) rotateX(${bgTiltX}deg) rotateY(${bgTiltY}deg)`;
    }

    // Duotone overlay
    const duotoneOpacity = portalProg * 0.28;
    if (duotoneOverlay) duotoneOverlay.style.opacity = duotoneOpacity;

    // Energy accent nodes
    const travelDistance = portalProg * 48;
    if (accentDot1) {
      accentDot1.style.transform = `translate(-${travelDistance}vw, -${travelDistance}vh)`;
      accentDot1.style.opacity = (portalProg > 0.02 && portalProg < 0.98) ? (portalProg * 1.8) : 0;
    }
    if (accentDot2) {
      accentDot2.style.transform = `translate(${travelDistance}vw, ${travelDistance}vh)`;
      accentDot2.style.opacity = (portalProg > 0.02 && portalProg < 0.98) ? (portalProg * 1.8) : 0;
    }

    // 3. Castle Arrival Title Logo (Foreground 3D Floating Parallax)
    if (castleTitleContainer) {
      if (prog > PORTAL_PHASE_RATIO) {
        const videoProg = (prog - PORTAL_PHASE_RATIO) / (1 - PORTAL_PHASE_RATIO);
        
        // Starts fading in at 45% video progress (castle emergence) and fully reveals by 75%
        const logoProg = Math.min(1, Math.max(0, (videoProg - 0.45) / 0.30));
        
        const logoScale = 0.88 + (logoProg * 0.12);
        const logoOffsetY = (1 - logoProg) * 30; // Smooth slide-up

        // 3D Counter-Parallax for maximum depth perception
        const logoShiftX = -mouseCurrentX * 24;
        const logoShiftY = -mouseCurrentY * 18;
        const logoTiltX = -mouseCurrentY * 5;
        const logoTiltY = mouseCurrentX * 5;
        
        castleTitleContainer.style.opacity = logoProg.toString();
        castleTitleContainer.style.transform = `translate(calc(-50% + ${logoShiftX}px), calc(-50% + ${logoOffsetY + logoShiftY}px)) scale(${logoScale}) rotateX(${logoTiltX}deg) rotateY(${logoTiltY}deg)`;
      } else {
        castleTitleContainer.style.opacity = '0';
      }
    }
  }

  // Main animation loop: frame lerping, scroll physics, and mouse cursor parallax
  function animate() {
    // Smooth scroll progress lerp
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.0001) {
      currentProgress += diff * 0.15;
    } else {
      currentProgress = targetProgress;
    }

    // Smooth mouse parallax lerp
    mouseCurrentX += (mouseTargetX - mouseCurrentX) * 0.08;
    mouseCurrentY += (mouseTargetY - mouseCurrentY) * 0.08;

    // Update gate, background, and logo transforms
    updateTransforms(currentProgress);

    // Render corresponding video frame
    const frameToDraw = getFrameIndexForProgress(currentProgress);
    if (frameToDraw !== lastDrawnFrame && frameToDraw >= 0 && frameToDraw < TOTAL_FRAMES) {
      render(frameToDraw);
      lastDrawnFrame = frameToDraw;
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resizeCanvas);

  // Initial setup
  resizeCanvas();
  preloadImages();
  onScroll();
  animate();
})();

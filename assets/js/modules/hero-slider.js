/* ================================================================
   HERO SLIDER — 5-slide auto-advancing carousel
   Features:
   - Auto-advance every 6 s with segment-dot progress fill
   - Prev / Next arrow buttons
   - Dot indicators (click to jump)
   - Keyboard ← / → (when hero is hovered)
   - Touch swipe (left = next, right = prev)
   - Pause on hover, resume on mouse-leave
   - Per-child stagger-in animation via inline styles
================================================================ */
export function initHeroSlider() {
  const wrapper  = document.querySelector('.hero-slides-wrapper');
  const heroEl   = document.querySelector('.hero');
  if (!wrapper || !heroEl) return;

  const slides   = [...wrapper.querySelectorAll('.hero-slide')];
  const dots     = [...document.querySelectorAll('.slider-dot')];
  const prevBtn  = document.querySelector('.slider-prev');
  const nextBtn  = document.querySelector('.slider-next');

  if (!slides.length) return;

  const INTERVAL = 6000; // ms — must match CSS --slider-interval below
  const CHILD_SELECTORS = [
    '.slide-eyebrow',
    '.slide-h1',
    '.slide-sub',
    '.slide-actions',
    '.slide-stats',
    '.slide-pills',
  ];
  const DELAYS = [70, 180, 290, 390, 470, 545]; // stagger ms per child

  let current = 0;
  let timer   = null;
  let paused  = false;

  /* -------------------------------------------------------------- */
  /* Children helpers                                               */
  /* -------------------------------------------------------------- */
  function getChildren(slide) {
    return CHILD_SELECTORS
      .map(sel => slide.querySelector(sel))
      .filter(Boolean);
  }

  function hideChildren(slide) {
    getChildren(slide).forEach(el => {
      el.style.transition = 'none';
      el.style.opacity    = '0';
      el.style.transform  = 'translateY(16px)';
    });
  }

  function revealChildren(slide) {
    const children = getChildren(slide);
    children.forEach((el, i) => {
      /* Force the hidden state to paint before animating */
      void el.offsetHeight;
      setTimeout(() => {
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.opacity    = '1';
        el.style.transform  = 'translateY(0)';
      }, DELAYS[i] ?? (70 + i * 110));
    });
  }

  /* -------------------------------------------------------------- */
  /* Core: go to slide N                                            */
  /* -------------------------------------------------------------- */
  function goTo(n) {
    if (n === current) return;

    const oldSlide = slides[current];
    const newSlide = slides[n];

    /* Exit old */
    oldSlide.classList.remove('active');
    hideChildren(oldSlide);

    current = n;

    /* Enter new — brief delay so the CSS opacity fade-out starts */
    setTimeout(() => {
      newSlide.classList.add('active');
      revealChildren(newSlide);
    }, 50);

    /* Update dots */
    dots.forEach((dot, i) => {
      const isActive = i === n;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', String(isActive));
    });

    /* Sync CSS progress-fill interval */
    dots.forEach(dot => dot.style.setProperty('--slider-interval', `${INTERVAL}ms`));
  }

  function next() { goTo((current + 1) % slides.length); }
  function prev() { goTo((current - 1 + slides.length) % slides.length); }

  /* -------------------------------------------------------------- */
  /* Auto-advance                                                   */
  /* -------------------------------------------------------------- */
  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => { if (!paused) next(); }, INTERVAL);
  }

  function pauseSlider()  { paused = true; }
  function resumeSlider() { paused = false; }

  /* -------------------------------------------------------------- */
  /* Events                                                         */
  /* -------------------------------------------------------------- */
  prevBtn?.addEventListener('click', () => { prev(); startTimer(); });
  nextBtn?.addEventListener('click', () => { next(); startTimer(); });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startTimer(); });
  });

  heroEl.addEventListener('mouseenter', pauseSlider);
  heroEl.addEventListener('mouseleave', resumeSlider);

  /* Keyboard: only when hero is in view */
  document.addEventListener('keydown', e => {
    if (!heroEl.matches(':hover')) return;
    if (e.key === 'ArrowLeft')  { prev(); startTimer(); }
    if (e.key === 'ArrowRight') { next(); startTimer(); }
  });

  /* Touch swipe */
  let touchStartX = 0;
  heroEl.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  heroEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 48) {
      dx < 0 ? next() : prev();
      startTimer();
    }
  }, { passive: true });

  /* -------------------------------------------------------------- */
  /* Init                                                           */
  /* -------------------------------------------------------------- */
  /* Hide all inactive slides' children upfront */
  slides.forEach((slide, i) => {
    if (i !== 0) hideChildren(slide);
  });

  /* Sync CSS variable on all dots */
  dots.forEach(dot => dot.style.setProperty('--slider-interval', `${INTERVAL}ms`));

  /* Animate first slide in */
  revealChildren(slides[0]);
  startTimer();
}

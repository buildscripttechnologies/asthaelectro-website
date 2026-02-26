/* ================================================================
   ASTHA ELECTRONICS SOLUTION — main.js
   Entry point: imports and initialises all site modules.
================================================================ */
import { initDotGrid }         from './modules/dot-grid.js';
import { initPCBCanvas }       from './modules/pcb-canvas.js';
import { initPCBBackground }   from './modules/pcb-bg-canvas.js';
import { initHeroAnimation }   from './modules/hero-animation.js';
import { initHeroSlider }     from './modules/hero-slider.js';
import { initMagneticButtons } from './modules/magnetic-buttons.js';
import { initNav }             from './modules/nav.js';
import { initNavHide }         from './modules/nav-hide.js';
import { initScrollProgress }  from './modules/scroll-progress.js';
import { initActiveNav }       from './modules/active-nav.js';
import { initReveal }          from './modules/reveal.js';
import { initCounters }        from './modules/counters.js';
import { initFAQ }             from './modules/faq.js';
import { initContactForm }     from './modules/contact-form.js';
import { initTilt }            from './modules/tilt.js';
import { initBackToTop }       from './modules/back-to-top.js';

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initPCBBackground();
  initDotGrid();
  initHeroAnimation();
  initHeroSlider();
  initPCBCanvas();
  initMagneticButtons();
  initNav();
  initNavHide();
  initActiveNav();
  initReveal();
  initCounters();
  initFAQ();
  initContactForm();
  initTilt();
  initBackToTop();
  initYear();
});

function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

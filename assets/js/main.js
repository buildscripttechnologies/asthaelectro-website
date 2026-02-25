/* ================================================================
   ASTHA ELECTRONICS SOLUTION — main.js
   Entry point: imports and initialises all site modules.
================================================================ */
import { initDotGrid }         from './modules/dot-grid.js';
import { initPCBCanvas }       from './modules/pcb-canvas.js';
import { initHeroAnimation }   from './modules/hero-animation.js';
import { initMagneticButtons } from './modules/magnetic-buttons.js';
import { initNav }             from './modules/nav.js';
import { initReveal }          from './modules/reveal.js';
import { initCounters }        from './modules/counters.js';
import { initFAQ }             from './modules/faq.js';
import { initContactForm }     from './modules/contact-form.js';

document.addEventListener('DOMContentLoaded', () => {
  initDotGrid();
  initHeroAnimation();
  initPCBCanvas();
  initMagneticButtons();
  initNav();
  initReveal();
  initCounters();
  initFAQ();
  initContactForm();
  initYear();
});

function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ================================================================
   NAVIGATION — hamburger toggle + scroll-based styling
================================================================ */
export function initNav() {
  const nav    = document.getElementById('nav');
  const toggle = document.getElementById('menu-toggle');
  const links  = document.getElementById('nav-links');
  if (!nav || !toggle || !links) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  links.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', closeMenu));

  document.addEventListener('click', (e) => {
    if (links.classList.contains('open') && !nav.contains(e.target)) closeMenu();
  });

  function closeMenu() {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

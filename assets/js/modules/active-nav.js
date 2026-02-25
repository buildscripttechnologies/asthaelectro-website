/* ================================================================
   ACTIVE NAV — highlights current section link while scrolling
================================================================ */
export function initActiveNav() {
  const navLinks = document.querySelectorAll('.nav-link');
  if (!navLinks.length) return;

  // Build map: section-id → nav link
  const linkMap = {};
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href?.startsWith('#')) linkMap[href.slice(1)] = link;
  });

  // Only observe sections that have a matching nav link
  const sections = [...document.querySelectorAll('section[id]')]
    .filter(s => linkMap[s.id]);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(l => l.classList.remove('active'));
      linkMap[entry.target.id]?.classList.add('active');
    });
  }, {
    threshold: 0.25,
    rootMargin: '-68px 0px -50% 0px',
  });

  sections.forEach(s => observer.observe(s));
}

const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  },
  {
    threshold: 0.18,
  }
);

revealElements.forEach((element) => revealObserver.observe(element));

const board = document.getElementById('pcb-board');

window.addEventListener('mousemove', (event) => {
  if (!board) {
    return;
  }

  const x = (event.clientX / window.innerWidth - 0.5) * 16;
  const y = (event.clientY / window.innerHeight - 0.5) * -14;

  board.style.transform = `rotateX(${8 + y / 2}deg) rotateY(${x}deg)`;
});

const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

document.documentElement.classList.add('js');

const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.site-nav a');

menuToggle?.addEventListener('click', () => {
  const open = header.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(open));
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    header?.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const copyButton = document.querySelector('.copy-email');
const copyStatus = document.querySelector('.copy-status');
copyButton?.addEventListener('click', async () => {
  const email = copyButton.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    copyStatus.textContent = 'コピーしました！';
  } catch {
    copyStatus.textContent = email;
  }
  window.setTimeout(() => { copyStatus.textContent = ''; }, 2600);
});

const currentYear = document.querySelector('#current-year');
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

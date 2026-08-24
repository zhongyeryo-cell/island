const filterButtons = document.querySelectorAll('.filter-button');
const gameCards = document.querySelectorAll('.game-card');
const emptyMessage = document.querySelector('#emptyMessage');
const dailyButton = document.querySelector('#dailyButton');
const highScoreElement = document.querySelector('#portalHighScore');
const currentYear = document.querySelector('#currentYear');

function formatScore(value) { return String(value).padStart(6, '0'); }

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    let visibleCount = 0;
    gameCards.forEach((card) => {
      const visible = filter === 'all' || card.dataset.category === filter;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    emptyMessage.hidden = visibleCount > 0;
  });
});

const gameLinks = Array.from(gameCards).map((card) => ({ href: card.href, title: card.querySelector('h3')?.textContent || 'GAME' }));
function chooseDailyGame() {
  if (!gameLinks.length) return;
  const choice = gameLinks[Math.floor(Math.random() * gameLinks.length)];
  dailyButton.href = choice.href;
  dailyButton.dataset.game = choice.title;
}
dailyButton?.addEventListener('click', chooseDailyGame);
chooseDailyGame();

const scoreKeys = ['neon-patrol-high-score', 'astro-dodge-high-score', 'neon-target-best', 'pixel-match-best', 'tic-tac-toe-wins', 'void-runner-best'];
const scores = scoreKeys.map((key) => {
  try { return Number(window.localStorage.getItem(key)) || 0; } catch { return 0; }
});
if (highScoreElement) highScoreElement.textContent = formatScore(Math.max(...scores, 0));
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

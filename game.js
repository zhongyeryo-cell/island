const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.querySelector('#score');
const levelElement = document.querySelector('#level');
const livesElement = document.querySelector('#lives');
const overlay = document.querySelector('#gameOverlay');
const overlayKicker = document.querySelector('#overlayKicker');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayText = document.querySelector('#overlayText');
const overlayBest = document.querySelector('#overlayBest');
const startButton = document.querySelector('#startButton');
const pauseButton = document.querySelector('#pauseButton');
const currentYear = document.querySelector('#currentYear');

const WIDTH = 960;
const HEIGHT = 640;
const keys = new Set();
const pointer = { active: false, x: WIDTH / 2 };
const player = { x: WIDTH / 2, y: HEIGHT - 66, width: 32, height: 37, speed: 430, cooldown: 0, invulnerable: 0 };
const game = { mode: 'ready', score: 0, highScore: loadHighScore(), lives: 3, level: 1, time: 0, spawnTimer: .7, shake: 0 };
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];

function loadHighScore() {
  try { return Number(window.localStorage.getItem('neon-patrol-high-score')) || 0; } catch { return 0; }
}

function saveHighScore() {
  try { window.localStorage.setItem('neon-patrol-high-score', String(game.highScore)); } catch { /* storage can be disabled */ }
}

function random(min, max) { return Math.random() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function formatScore(value) { return String(value).padStart(6, '0'); }

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WIDTH * pixelRatio;
  canvas.height = HEIGHT * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function createStars() {
  stars = Array.from({ length: 105 }, () => ({
    x: random(0, WIDTH),
    y: random(0, HEIGHT),
    size: random(.5, 2.1),
    speed: random(12, 52),
    alpha: random(.23, .9),
  }));
}

function resetGame() {
  game.score = 0;
  game.lives = 3;
  game.level = 1;
  game.time = 0;
  game.spawnTimer = .7;
  game.shake = 0;
  player.x = WIDTH / 2;
  player.cooldown = 0;
  player.invulnerable = 0;
  bullets = [];
  enemies = [];
  particles = [];
  updateHud();
}

function updateHud() {
  scoreElement.textContent = formatScore(game.score);
  levelElement.textContent = String(game.level).padStart(2, '0');
  livesElement.setAttribute('aria-label', `残りライフ ${game.lives}`);
  livesElement.innerHTML = '';
  for (let index = 0; index < 3; index += 1) {
    const life = document.createElement('span');
    life.className = `life${index >= game.lives ? ' is-empty' : ''}`;
    life.setAttribute('aria-hidden', 'true');
    livesElement.append(life);
  }
}

function showOverlay(kind) {
  overlay.classList.add('is-visible');
  if (kind === 'ready') {
    overlayKicker.textContent = 'SECTOR 893 / TRAINING';
    overlayTitle.innerHTML = 'NEON <span>PATROL</span>';
    overlayText.innerHTML = '迫りくるドローンを撃ち落とせ。<br />いちばん長く、この空を守ろう。';
    startButton.textContent = 'START MISSION  ↗';
  } else {
    overlayKicker.textContent = 'MISSION COMPLETE / RUN ENDED';
    overlayTitle.textContent = 'GAME OVER';
    overlayText.innerHTML = `スコアは <strong>${formatScore(game.score)}</strong>。<br />もう一度、空へ飛び立とう。`;
    startButton.textContent = 'TRY AGAIN  ↗';
  }
  overlayBest.textContent = `BEST ${formatScore(game.highScore)}`;
}

function hideOverlay() { overlay.classList.remove('is-visible'); }

function startGame() {
  resetGame();
  game.mode = 'playing';
  pauseButton.disabled = false;
  pauseButton.textContent = 'Ⅱ';
  hideOverlay();
}

function endGame() {
  game.mode = 'gameover';
  pauseButton.disabled = true;
  if (game.score > game.highScore) {
    game.highScore = game.score;
    saveHighScore();
  }
  burst(player.x, player.y, '#ff5ba7', 26);
  showOverlay('gameover');
}

function togglePause() {
  if (game.mode === 'playing') {
    game.mode = 'paused';
    pauseButton.textContent = '▶';
    pauseButton.setAttribute('aria-label', 'ゲームを再開');
  } else if (game.mode === 'paused') {
    game.mode = 'playing';
    pauseButton.textContent = 'Ⅱ';
    pauseButton.setAttribute('aria-label', 'ゲームを一時停止');
  }
}

function fire() {
  if (game.mode !== 'playing' || player.cooldown > 0) return;
  bullets.push({ x: player.x, y: player.y - 22, width: 4, height: 15, speed: 650 });
  player.cooldown = Math.max(.11, .2 - game.level * .006);
  burst(player.x, player.y - 23, '#66f3e2', 4, 28);
}

function spawnEnemy() {
  const roll = Math.random();
  const kind = roll < .2 ? 'tank' : roll < .52 ? 'zigzag' : 'scout';
  const tank = kind === 'tank';
  const size = tank ? 31 : kind === 'zigzag' ? 23 : 19;
  enemies.push({
    kind,
    x: random(45, WIDTH - 45),
    y: -size - 12,
    width: size * 1.55,
    height: size * 1.28,
    speed: random(70, 104) + game.level * 9 + (tank ? -18 : 0),
    drift: random(-45, 45),
    phase: random(0, Math.PI * 2),
    hp: tank ? 2 : 1,
    maxHp: tank ? 2 : 1,
    value: tank ? 35 : kind === 'zigzag' ? 20 : 10,
    flash: 0,
  });
}

function hitTest(a, b) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
}

function damagePlayer() {
  if (player.invulnerable > 0) return;
  game.lives -= 1;
  player.invulnerable = 1.6;
  game.shake = 12;
  burst(player.x, player.y, '#ff5ba7', 25);
  updateHud();
  if (game.lives <= 0) endGame();
}

function addScore(value) {
  game.score += value;
  const nextLevel = Math.floor(game.score / 100) + 1;
  if (nextLevel !== game.level) {
    game.level = nextLevel;
    burst(player.x, player.y, '#ffd166', 16, 85);
  }
  updateHud();
}

function burst(x, y, color, amount = 10, speed = 110) {
  for (let index = 0; index < amount; index += 1) {
    const angle = random(0, Math.PI * 2);
    const velocity = random(speed * .35, speed);
    particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: random(.25, .6), maxLife: .6, size: random(1, 3), color });
  }
}

function updateStars(dt) {
  stars.forEach((star) => {
    star.y += star.speed * dt * (game.mode === 'playing' ? 1 : .28);
    if (star.y > HEIGHT + 4) { star.y = -4; star.x = random(0, WIDTH); }
  });
}

function update(dt) {
  updateStars(dt);
  particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= .97;
    particle.vy *= .97;
    particle.life -= dt;
  });
  particles = particles.filter((particle) => particle.life > 0);
  if (game.mode !== 'playing') return;

  game.time += dt;
  game.shake = Math.max(0, game.shake - dt * 32);
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  let move = 0;
  if (keys.has('arrowleft') || keys.has('a') || keys.has('touchleft')) move -= 1;
  if (keys.has('arrowright') || keys.has('d') || keys.has('touchright')) move += 1;
  player.x += move * player.speed * dt;
  if (pointer.active) player.x += (pointer.x - player.x) * Math.min(1, dt * 11);
  player.x = clamp(player.x, 28, WIDTH - 28);
  if (keys.has(' ') || keys.has('touchfire') || pointer.active && keys.has('pointerfire')) fire();

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    spawnEnemy();
    game.spawnTimer = Math.max(.24, .78 - game.level * .045) + random(-.1, .14);
  }

  bullets.forEach((bullet) => { bullet.y -= bullet.speed * dt; });
  bullets = bullets.filter((bullet) => bullet.y > -30);

  enemies.forEach((enemy) => {
    enemy.y += enemy.speed * dt;
    enemy.flash = Math.max(0, enemy.flash - dt);
    if (enemy.kind === 'zigzag') enemy.x += Math.sin(game.time * 3.3 + enemy.phase) * 52 * dt;
    else enemy.x += enemy.drift * dt;
    if (enemy.x < 30 || enemy.x > WIDTH - 30) enemy.drift *= -1;
  });

  for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = bullets[bulletIndex];
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];
      if (!hitTest(bullet, enemy)) continue;
      bullets.splice(bulletIndex, 1);
      enemy.hp -= 1;
      enemy.flash = .12;
      burst(bullet.x, bullet.y, enemy.kind === 'tank' ? '#ffd166' : '#66f3e2', 5, 50);
      if (enemy.hp <= 0) {
        addScore(enemy.value);
        burst(enemy.x, enemy.y, enemy.kind === 'tank' ? '#ffd166' : '#ff5ba7', enemy.kind === 'tank' ? 22 : 13, 150);
        enemies.splice(enemyIndex, 1);
      }
      break;
    }
  }

  for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    const enemy = enemies[enemyIndex];
    if (enemy.y > HEIGHT + 35) {
      enemies.splice(enemyIndex, 1);
      damagePlayer();
      continue;
    }
    if (hitTest(player, enemy)) {
      enemies.splice(enemyIndex, 1);
      damagePlayer();
    }
  }
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#080d1d');
  gradient.addColorStop(1, '#111735');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  stars.forEach((star) => {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = star.size > 1.5 ? '#66f3e2' : '#b5c5e8';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
  ctx.globalAlpha = 1;
  const horizon = HEIGHT - 92;
  const glow = ctx.createLinearGradient(0, horizon - 2, 0, horizon + 110);
  glow.addColorStop(0, 'rgba(255,91,167,.18)');
  glow.addColorStop(1, 'rgba(255,91,167,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon - 2, WIDTH, 110);
  ctx.strokeStyle = 'rgba(102,243,226,.1)';
  ctx.lineWidth = 1;
  for (let y = horizon; y < HEIGHT + 45; y += 24) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }
  for (let x = -WIDTH; x < WIDTH * 2; x += 80) {
    ctx.beginPath(); ctx.moveTo(WIDTH / 2, horizon); ctx.lineTo(x, HEIGHT); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,91,167,.28)';
  ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(WIDTH, horizon); ctx.stroke();
}

function drawPlayer() {
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 13) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = '#66f3e2';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#66f3e2';
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.lineTo(17, 17);
  ctx.lineTo(6, 13);
  ctx.lineTo(0, 22);
  ctx.lineTo(-6, 13);
  ctx.lineTo(-17, 17);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#13213c';
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(7, 10); ctx.lineTo(0, 7); ctx.lineTo(-7, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff5ba7';
  ctx.fillRect(-2, 12, 4, 9);
  ctx.restore();
}

function drawBullet(bullet) {
  ctx.save();
  ctx.shadowColor = '#66f3e2';
  ctx.shadowBlur = 13;
  ctx.fillStyle = '#f6f7fa';
  roundRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height, 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.globalAlpha = enemy.flash > 0 ? .45 : 1;
  const color = enemy.kind === 'tank' ? '#ffd166' : enemy.kind === 'zigzag' ? '#66f3e2' : '#ff5ba7';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(8,13,29,.92)';
  ctx.lineWidth = 2;
  if (enemy.kind === 'tank') {
    roundRect(-18, -15, 36, 30, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(-8, -4, 16, 8);
    ctx.fillStyle = '#080d1d'; ctx.fillRect(-4, -2, 8, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,209,102,.35)'; ctx.fillRect(-18, 21, 36 * (enemy.hp / enemy.maxHp), 2);
  } else if (enemy.kind === 'zigzag') {
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(18, 0); ctx.lineTo(0, 16); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -7); ctx.lineTo(8, 0); ctx.lineTo(0, 7); ctx.closePath(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(-3, -3, 6, 6);
    ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(-17, -10); ctx.lineTo(-10, -5); ctx.moveTo(17, -10); ctx.lineTo(10, -5); ctx.stroke();
  }
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.globalAlpha = 1;
}

function drawPause() {
  if (game.mode !== 'paused') return;
  ctx.fillStyle = 'rgba(8,13,29,.45)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#66f3e2';
  ctx.font = '500 17px "DM Mono", monospace';
  ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2);
  ctx.fillStyle = '#8b94ad';
  ctx.font = '11px "DM Mono", monospace';
  ctx.fillText('PRESS P OR TAP Ⅱ TO RESUME', WIDTH / 2, HEIGHT / 2 + 25);
  ctx.textAlign = 'start';
}

function draw() {
  ctx.save();
  if (game.shake > 0) ctx.translate(random(-game.shake, game.shake), random(-game.shake, game.shake));
  drawBackground();
  bullets.forEach(drawBullet);
  enemies.forEach(drawEnemy);
  drawPlayer();
  drawParticles();
  ctx.restore();
  drawPause();
}

function pointerXFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return clamp((event.clientX - rect.left) * WIDTH / rect.width, 28, WIDTH - 28);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'a', 'd', ' ', 'p'].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === 'p') togglePause();
  if (key === 'enter' && (game.mode === 'ready' || game.mode === 'gameover')) startGame();
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
canvas.addEventListener('pointermove', (event) => { pointer.x = pointerXFromEvent(event); });
canvas.addEventListener('pointerdown', (event) => {
  pointer.active = true;
  pointer.x = pointerXFromEvent(event);
  keys.add('pointerfire');
  canvas.setPointerCapture?.(event.pointerId);
});
canvas.addEventListener('pointerup', (event) => { pointer.active = false; keys.delete('pointerfire'); canvas.releasePointerCapture?.(event.pointerId); });
canvas.addEventListener('pointercancel', () => { pointer.active = false; keys.delete('pointerfire'); });

document.querySelectorAll('.control-button').forEach((button) => {
  const control = `touch${button.dataset.control}`;
  const press = (event) => { event.preventDefault(); keys.add(control); button.classList.add('is-pressed'); };
  const release = (event) => { event.preventDefault(); keys.delete(control); button.classList.remove('is-pressed'); };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
});
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

resizeCanvas();
createStars();
updateHud();
overlayBest.textContent = `BEST ${formatScore(game.highScore)}`;
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  window.requestAnimationFrame(frame);
}
window.requestAnimationFrame(frame);

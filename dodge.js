const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.querySelector('#score');
const timeElement = document.querySelector('#time');
const bestElement = document.querySelector('#best');
const overlay = document.querySelector('#overlay');
const overlayKicker = document.querySelector('#overlayKicker');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayCopy = document.querySelector('#overlayCopy');
const overlayBest = document.querySelector('#overlayBest');
const startButton = document.querySelector('#startButton');
const pauseButton = document.querySelector('#pauseButton');
const currentYear = document.querySelector('#currentYear');
const WIDTH = 900;
const HEIGHT = 600;
const keys = new Set();
const pointer = { active: false, x: WIDTH / 2 };
const player = { x: WIDTH / 2, y: HEIGHT - 61, radius: 15, speed: 390, invulnerable: 0 };
const game = { mode: 'ready', time: 0, score: 0, best: loadBest(), spawnTimer: .5, shake: 0 };
let rocks = [];
let particles = [];
let stars = [];

function loadBest() { try { return Number(localStorage.getItem('astro-dodge-high-score')) || 0; } catch { return 0; } }
function saveBest() { try { localStorage.setItem('astro-dodge-high-score', String(game.best)); } catch { /* storage can be disabled */ } }
function random(min, max) { return Math.random() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(6, '0'); }

function resizeCanvas() { const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = WIDTH * ratio; canvas.height = HEIGHT * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
function makeStars() { stars = Array.from({ length: 110 }, () => ({ x: random(0, WIDTH), y: random(0, HEIGHT), size: random(.5, 2), speed: random(12, 50), alpha: random(.2, .8) })); }
function resetGame() { game.time = 0; game.score = 0; game.spawnTimer = .5; game.shake = 0; player.x = WIDTH / 2; player.invulnerable = 0; rocks = []; particles = []; updateHud(); }
function updateHud() { scoreElement.textContent = formatScore(game.score); timeElement.textContent = game.time.toFixed(1).padStart(4, '0'); bestElement.textContent = formatScore(game.best); }

function showOverlay(over) {
  overlay.classList.add('is-visible');
  if (over) { overlayKicker.textContent = 'FLIGHT ENDED / ASTRO DODGE'; overlayTitle.textContent = 'NICE RUN'; overlayCopy.innerHTML = `スコアは <strong>${formatScore(game.score)}</strong>。<br />もう一度、星の間へ。`; startButton.textContent = 'TRY AGAIN  ↗'; }
  else { overlayKicker.textContent = 'SECTOR 02 / DEEP SPACE'; overlayTitle.innerHTML = 'ASTRO <em>DODGE</em>'; overlayCopy.innerHTML = '小惑星の雨をすり抜けろ。<br />最後まで飛び続ければ、スコアは伸びる。'; startButton.textContent = 'START FLIGHT  ↗'; }
  overlayBest.textContent = `BEST ${formatScore(game.best)}`;
}
function startGame() { resetGame(); game.mode = 'playing'; pauseButton.disabled = false; pauseButton.textContent = 'Ⅱ'; pauseButton.setAttribute('aria-label', 'ゲームを一時停止'); overlay.classList.remove('is-visible'); }
function endGame() { game.mode = 'gameover'; pauseButton.disabled = true; if (game.score > game.best) { game.best = game.score; saveBest(); } burst(player.x, player.y, '#ff5ba7', 27, 170); showOverlay(true); }
function pauseGame() { if (game.mode === 'playing') { game.mode = 'paused'; pauseButton.textContent = '▶'; pauseButton.setAttribute('aria-label', 'ゲームを再開'); } else if (game.mode === 'paused') { game.mode = 'playing'; pauseButton.textContent = 'Ⅱ'; pauseButton.setAttribute('aria-label', 'ゲームを一時停止'); } }

function spawnRock() {
  const radius = random(11, 23);
  const vertices = Array.from({ length: 7 }, () => random(.72, 1.22));
  rocks.push({ x: random(radius + 8, WIDTH - radius - 8), y: -radius - 15, radius, vertices, speed: random(90, 146) + game.time * 2.5, drift: random(-38, 38), spin: random(-1.7, 1.7), angle: random(0, Math.PI * 2), color: Math.random() > .5 ? '#ffd166' : '#ff5ba7' });
}
function burst(x, y, color, amount = 10, speed = 100) { for (let i = 0; i < amount; i += 1) { const angle = random(0, Math.PI * 2); const velocity = random(speed * .3, speed); particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: random(.22, .62), maxLife: .62, size: random(1, 3), color }); } }

function update(dt) {
  stars.forEach((star) => { star.y += star.speed * dt * (game.mode === 'playing' ? 1 : .25); if (star.y > HEIGHT + 4) { star.y = -4; star.x = random(0, WIDTH); } });
  particles.forEach((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .97; particle.vy *= .97; particle.life -= dt; });
  particles = particles.filter((particle) => particle.life > 0);
  if (game.mode !== 'playing') return;
  game.time += dt;
  game.score = Math.floor(game.time * 10);
  game.shake = Math.max(0, game.shake - dt * 25);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  let move = 0; if (keys.has('arrowleft') || keys.has('a')) move -= 1; if (keys.has('arrowright') || keys.has('d')) move += 1;
  player.x += move * player.speed * dt;
  if (pointer.active) player.x += (pointer.x - player.x) * Math.min(1, dt * 12);
  player.x = clamp(player.x, 25, WIDTH - 25);
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) { spawnRock(); game.spawnTimer = Math.max(.2, .58 - game.time * .004) + random(-.1, .12); }
  rocks.forEach((rock) => { rock.y += rock.speed * dt; rock.x += rock.drift * dt; rock.angle += rock.spin * dt; if (rock.x < rock.radius || rock.x > WIDTH - rock.radius) rock.drift *= -1; });
  for (let index = rocks.length - 1; index >= 0; index -= 1) { const rock = rocks[index]; if (rock.y > HEIGHT + rock.radius) { rocks.splice(index, 1); continue; } if (player.invulnerable <= 0 && Math.hypot(player.x - rock.x, player.y - rock.y) < player.radius + rock.radius * .8) { player.invulnerable = 1.5; game.shake = 13; burst(player.x, player.y, '#ff5ba7', 27, 170); rocks.splice(index, 1); endGame(); break; } }
  updateHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT); gradient.addColorStop(0, '#080d1d'); gradient.addColorStop(1, '#1a274a'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  stars.forEach((star) => { ctx.globalAlpha = star.alpha; ctx.fillStyle = star.size > 1.4 ? '#66f3e2' : '#b5c5e8'; ctx.fillRect(star.x, star.y, star.size, star.size); }); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(102,243,226,.08)'; ctx.lineWidth = 1;
  for (let y = 70; y < HEIGHT; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  for (let x = 0; x < WIDTH; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
}
function drawPlayer() { if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) return; ctx.save(); ctx.translate(player.x, player.y); ctx.shadowColor = '#66f3e2'; ctx.shadowBlur = 19; ctx.fillStyle = '#66f3e2'; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(15, 16); ctx.lineTo(0, 10); ctx.lineTo(-15, 16); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#152442'; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(7, 8); ctx.lineTo(0, 6); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff5ba7'; ctx.fillRect(-2, 12, 4, 9); ctx.restore(); }
function drawRock(rock) { ctx.save(); ctx.translate(rock.x, rock.y); ctx.rotate(rock.angle); ctx.shadowColor = rock.color; ctx.shadowBlur = 13; ctx.strokeStyle = rock.color; ctx.fillStyle = 'rgba(8,13,29,.88)'; ctx.lineWidth = 2; ctx.beginPath(); rock.vertices.forEach((scale, index) => { const angle = index / rock.vertices.length * Math.PI * 2; const x = Math.cos(angle) * rock.radius * scale; const y = Math.sin(angle) * rock.radius * scale; if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
function drawParticles() { particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); }); ctx.globalAlpha = 1; }
function drawPause() { if (game.mode !== 'paused') return; ctx.fillStyle = 'rgba(8,13,29,.46)'; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.textAlign = 'center'; ctx.fillStyle = '#66f3e2'; ctx.font = '500 17px "DM Mono", monospace'; ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2); ctx.fillStyle = '#8b94ad'; ctx.font = '11px "DM Mono", monospace'; ctx.fillText('PRESS P OR TAP Ⅱ TO RESUME', WIDTH / 2, HEIGHT / 2 + 25); ctx.textAlign = 'start'; }
function draw() { ctx.save(); if (game.shake > 0) ctx.translate(random(-game.shake, game.shake), random(-game.shake, game.shake)); drawBackground(); rocks.forEach(drawRock); drawPlayer(); drawParticles(); ctx.restore(); drawPause(); }
function pointerX(event) { const rect = canvas.getBoundingClientRect(); return clamp((event.clientX - rect.left) * WIDTH / rect.width, 25, WIDTH - 25); }

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (['arrowleft', 'arrowright', 'a', 'd', 'p'].includes(key)) event.preventDefault(); keys.add(key); if (key === 'p' && !event.repeat) pauseGame(); if (key === 'enter' && (game.mode === 'ready' || game.mode === 'gameover')) startGame(); });
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
canvas.addEventListener('pointermove', (event) => { pointer.x = pointerX(event); });
canvas.addEventListener('pointerdown', (event) => { pointer.active = true; pointer.x = pointerX(event); canvas.setPointerCapture?.(event.pointerId); });
canvas.addEventListener('pointerup', (event) => { pointer.active = false; canvas.releasePointerCapture?.(event.pointerId); });
canvas.addEventListener('pointercancel', () => { pointer.active = false; });
startButton.addEventListener('click', startGame); pauseButton.addEventListener('click', pauseGame);
resizeCanvas(); makeStars(); updateHud(); bestElement.textContent = formatScore(game.best); overlayBest.textContent = `BEST ${formatScore(game.best)}`; if (currentYear) currentYear.textContent = String(new Date().getFullYear());
let last = performance.now(); function frame(now) { const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt); draw(); window.requestAnimationFrame(frame); } window.requestAnimationFrame(frame);

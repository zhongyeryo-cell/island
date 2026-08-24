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
const ROUND_TIME = 30;
const game = { mode: 'ready', time: ROUND_TIME, score: 0, best: loadBest(), combo: 0, target: null, targetAge: 0, targetPulse: 0 };
let particles = [];
let stars = [];

function loadBest() { try { return Number(localStorage.getItem('neon-target-best')) || 0; } catch { return 0; } }
function saveBest() { try { localStorage.setItem('neon-target-best', String(game.best)); } catch { /* storage can be disabled */ } }
function random(min, max) { return Math.random() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(6, '0'); }
function resizeCanvas() { const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = WIDTH * ratio; canvas.height = HEIGHT * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
function makeStars() { stars = Array.from({ length: 110 }, () => ({ x: random(0, WIDTH), y: random(0, HEIGHT), size: random(.5, 2), speed: random(9, 37), alpha: random(.2, .8) })); }
function updateHud() { scoreElement.textContent = formatScore(game.score); timeElement.textContent = Math.max(0, game.time).toFixed(1).padStart(4, '0'); bestElement.textContent = formatScore(game.best); }
function newTarget() { const radius = Math.max(17, 40 - game.score / 85); game.target = { x: random(88, WIDTH - 88), y: random(83, HEIGHT - 83), radius, born: game.time }; game.targetAge = 0; game.targetPulse = 0; }
function resetGame() { game.time = ROUND_TIME; game.score = 0; game.combo = 0; game.targetAge = 0; particles = []; newTarget(); updateHud(); }
function showOverlay(over) { overlay.classList.add('is-visible'); if (over) { overlayKicker.textContent = 'ROUND COMPLETE / RANGE 04'; overlayTitle.textContent = 'TIME UP'; overlayCopy.innerHTML = `スコアは <strong>${formatScore(game.score)}</strong>。<br />もう一度、中心を狙おう。`; startButton.textContent = 'TRY AGAIN  ↗'; } else { overlayKicker.textContent = 'RANGE 04 / LIVE FIRE'; overlayTitle.innerHTML = 'NEON <em>TARGET</em>'; overlayCopy.innerHTML = '30秒で、光るターゲットを狙え。<br />小さくなる前に、すばやくクリック。'; startButton.textContent = 'START ROUND  ↗'; } overlayBest.textContent = `BEST ${formatScore(game.best)}`; }
function startGame() { resetGame(); game.mode = 'playing'; pauseButton.disabled = false; pauseButton.textContent = 'Ⅱ'; pauseButton.setAttribute('aria-label', 'ゲームを一時停止'); overlay.classList.remove('is-visible'); }
function endGame() { game.mode = 'gameover'; pauseButton.disabled = true; if (game.score > game.best) { game.best = game.score; saveBest(); } burst(game.target?.x || WIDTH / 2, game.target?.y || HEIGHT / 2, '#ff5ba7', 28, 170); showOverlay(true); }
function togglePause() { if (game.mode === 'playing') { game.mode = 'paused'; pauseButton.textContent = '▶'; pauseButton.setAttribute('aria-label', 'ゲームを再開'); } else if (game.mode === 'paused') { game.mode = 'playing'; pauseButton.textContent = 'Ⅱ'; pauseButton.setAttribute('aria-label', 'ゲームを一時停止'); } }
function burst(x, y, color, amount = 10, speed = 100) { for (let i = 0; i < amount; i += 1) { const angle = random(0, Math.PI * 2); const velocity = random(speed * .3, speed); particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: random(.22, .62), maxLife: .62, size: random(1, 3), color }); } }
function registerHit() { const target = game.target; game.combo += 1; const points = 10 + Math.min(30, (game.combo - 1) * 2); game.score += points; game.targetPulse = .25; burst(target.x, target.y, game.combo > 4 ? '#ffd166' : '#66f3e2', 16, 140); newTarget(); updateHud(); }
function pointerPosition(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height }; }
function handlePointer(event) { if (game.mode !== 'playing' || !game.target) return; const point = pointerPosition(event); const distance = Math.hypot(point.x - game.target.x, point.y - game.target.y); if (distance <= game.target.radius) registerHit(); else { game.combo = 0; burst(point.x, point.y, '#ff5ba7', 4, 38); } }

function update(dt) {
  stars.forEach((star) => { star.y += star.speed * dt * (game.mode === 'playing' ? 1 : .25); if (star.y > HEIGHT + 4) { star.y = -4; star.x = random(0, WIDTH); } });
  particles.forEach((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .97; particle.vy *= .97; particle.life -= dt; }); particles = particles.filter((particle) => particle.life > 0);
  if (game.mode !== 'playing') return;
  game.time -= dt; game.targetAge += dt; game.targetPulse = Math.max(0, game.targetPulse - dt);
  if (game.targetAge > 2.8) { game.combo = 0; newTarget(); }
  if (game.time <= 0) { game.time = 0; updateHud(); endGame(); return; }
  updateHud();
}

function drawBackground() { const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT); gradient.addColorStop(0, '#080d1d'); gradient.addColorStop(1, '#1a274a'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT); stars.forEach((star) => { ctx.globalAlpha = star.alpha; ctx.fillStyle = star.size > 1.4 ? '#66f3e2' : '#b5c5e8'; ctx.fillRect(star.x, star.y, star.size, star.size); }); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(102,243,226,.08)'; ctx.lineWidth = 1; for (let x = 0; x < WIDTH; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); } for (let y = 0; y < HEIGHT; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); } }
function drawTarget() { if (!game.target) return; const target = game.target; const pulse = Math.sin(performance.now() / 130) * 2 + game.targetPulse * 15; ctx.save(); ctx.translate(target.x, target.y); ctx.shadowColor = '#66f3e2'; ctx.shadowBlur = 18; ctx.strokeStyle = '#66f3e2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, target.radius + 11 + pulse, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = 'rgba(102,243,226,.65)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, target.radius + 4, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#ff5ba7'; ctx.shadowColor = '#ff5ba7'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, 0, target.radius * .64, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(0, 0, target.radius * .26, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(246,247,250,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-target.radius - 19, 0); ctx.lineTo(target.radius + 19, 0); ctx.moveTo(0, -target.radius - 19); ctx.lineTo(0, target.radius + 19); ctx.stroke(); ctx.restore(); }
function drawParticles() { particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size); }); ctx.globalAlpha = 1; }
function drawPause() { if (game.mode !== 'paused') return; ctx.fillStyle = 'rgba(8,13,29,.46)'; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.textAlign = 'center'; ctx.fillStyle = '#66f3e2'; ctx.font = '500 17px "DM Mono", monospace'; ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2); ctx.fillStyle = '#8b94ad'; ctx.font = '11px "DM Mono", monospace'; ctx.fillText('PRESS P OR TAP Ⅱ TO RESUME', WIDTH / 2, HEIGHT / 2 + 25); ctx.textAlign = 'start'; }
function draw() { drawBackground(); drawTarget(); drawParticles(); drawPause(); }

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (['p'].includes(key)) event.preventDefault(); if (key === 'p' && !event.repeat) togglePause(); if (key === 'enter' && (game.mode === 'ready' || game.mode === 'gameover')) startGame(); });
canvas.addEventListener('pointerdown', handlePointer);
startButton.addEventListener('click', startGame); pauseButton.addEventListener('click', togglePause);
resizeCanvas(); makeStars(); updateHud(); overlayBest.textContent = `BEST ${formatScore(game.best)}`; if (currentYear) currentYear.textContent = String(new Date().getFullYear());
let last = performance.now(); function frame(now) { const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt); draw(); window.requestAnimationFrame(frame); } window.requestAnimationFrame(frame);

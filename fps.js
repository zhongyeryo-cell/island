const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const hostilesElement = document.querySelector('#hostiles');
const healthElement = document.querySelector('#health');
const bestElement = document.querySelector('#best');
const missionStatus = document.querySelector('#missionStatus');
const overlay = document.querySelector('#overlay');
const overlayKicker = document.querySelector('#overlayKicker');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayCopy = document.querySelector('#overlayCopy');
const overlayBest = document.querySelector('#overlayBest');
const startButton = document.querySelector('#startButton');
const pauseButton = document.querySelector('#pauseButton');
const currentYear = document.querySelector('#currentYear');

const WIDTH = 960;
const HEIGHT = 640;
const FOV = Math.PI / 3;
const RAY_STEP = 2;
const RAY_COUNT = WIDTH / RAY_STEP;
const MAP = [
  '111111111111111',
  '100000000000001',
  '101111011111101',
  '101001010000101',
  '101001010110101',
  '100001010010001',
  '111101010011101',
  '100001000000001',
  '101111011111101',
  '101000000000101',
  '101011111110101',
  '100000000000001',
  '111111111111111',
];
const keys = new Set();
const player = { x: 1.5, y: 1.5, angle: 0, hp: 3, hurt: 0, cooldown: 0 };
const game = { mode: 'ready', score: 0, best: loadBest(), kills: 0, total: 8, time: 0, muzzle: 0 };
let enemies = [];
let particles = [];
let stars = [];
let depthBuffer = new Float32Array(RAY_COUNT);

function loadBest() { try { return Number(localStorage.getItem('void-runner-best')) || 0; } catch { return 0; } }
function saveBest() { try { localStorage.setItem('void-runner-best', String(game.best)); } catch { /* storage can be disabled */ } }
function random(min, max) { return Math.random() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(6, '0'); }
function normalizeAngle(angle) { while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2; return angle; }
function isWall(x, y) { const mapX = Math.floor(x); const mapY = Math.floor(y); return mapY < 0 || mapY >= MAP.length || mapX < 0 || mapX >= MAP[0].length || MAP[mapY][mapX] !== '0'; }
function resizeCanvas() { const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = WIDTH * ratio; canvas.height = HEIGHT * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
function makeStars() { stars = Array.from({ length: 105 }, () => ({ x: random(0, WIDTH), y: random(0, HEIGHT), size: random(.5, 1.9), alpha: random(.2, .8) })); }
function updateHud() { hostilesElement.textContent = `${String(game.kills).padStart(2, '0')} / ${String(game.total).padStart(2, '0')}`; healthElement.textContent = `${'◆'.repeat(game.hp)}${'◇'.repeat(Math.max(0, 3 - game.hp))}`; bestElement.textContent = formatScore(game.best); }
function resetGame() { game.score = 0; game.kills = 0; game.time = 0; game.muzzle = 0; player.x = 1.5; player.y = 1.5; player.angle = 0; player.hp = 3; player.hurt = 0; player.cooldown = 0; particles = []; enemies = [{ x: 5.5, y: 1.5, phase: .3, alive: true, flash: 0 }, { x: 10.5, y: 1.5, phase: 1.5, alive: true, flash: 0 }, { x: 3.5, y: 3.5, phase: 2.2, alive: true, flash: 0 }, { x: 8.5, y: 3.5, phase: 3.1, alive: true, flash: 0 }, { x: 2.5, y: 5.5, phase: .7, alive: true, flash: 0 }, { x: 8.5, y: 5.5, phase: 4.3, alive: true, flash: 0 }, { x: 2.5, y: 7.5, phase: 2.9, alive: true, flash: 0 }, { x: 10.5, y: 9.5, phase: 5, alive: true, flash: 0 }]; enemies.forEach((enemy, index) => { enemy.speed = .28 + (index % 3) * .035; enemy.turn = 0; }); updateHud(); }
function showOverlay(kind) { overlay.classList.add('is-visible'); if (kind === 'ready') { overlayKicker.textContent = 'ZONE 893 / FIRST CONTACT'; overlayTitle.innerHTML = 'VOID <em>RUNNER</em>'; overlayCopy.innerHTML = '迷路の奥に潜むドローンを探し出せ。<br />すべて撃ち落とせば、ミッション完了。'; startButton.textContent = 'START MISSION  ↗'; } else if (kind === 'win') { overlayKicker.textContent = 'ZONE CLEAR / ALL HOSTILES DOWN'; overlayTitle.textContent = 'AREA CLEAR'; overlayCopy.innerHTML = `スコアは <strong>${formatScore(game.score)}</strong>。<br />このゾーンの平和を守った。`; startButton.textContent = 'RUN IT AGAIN  ↗'; } else { overlayKicker.textContent = 'SIGNAL LOST / RUN ENDED'; overlayTitle.textContent = 'GAME OVER'; overlayCopy.innerHTML = `撃破数 ${game.kills} / ${game.total}。<br />もう一度、迷路へ戻ろう。`; startButton.textContent = 'TRY AGAIN  ↗'; } overlayBest.textContent = `BEST ${formatScore(game.best)}`; }
function hideOverlay() { overlay.classList.remove('is-visible'); }
function startGame() { resetGame(); game.mode = 'playing'; missionStatus.textContent = 'LIVE'; pauseButton.disabled = false; pauseButton.textContent = 'Ⅱ'; pauseButton.setAttribute('aria-label', 'ゲームを一時停止'); hideOverlay(); canvas.focus(); }
function finish(kind) { game.mode = kind; pauseButton.disabled = true; missionStatus.textContent = kind === 'win' ? 'CLEAR' : 'OFFLINE'; if (game.score > game.best) { game.best = game.score; saveBest(); } updateHud(); showOverlay(kind); if (document.pointerLockElement === canvas) document.exitPointerLock?.(); }
function togglePause() { if (game.mode === 'playing') { game.mode = 'paused'; missionStatus.textContent = 'PAUSED'; pauseButton.textContent = '▶'; pauseButton.setAttribute('aria-label', 'ゲームを再開'); if (document.pointerLockElement === canvas) document.exitPointerLock?.(); } else if (game.mode === 'paused') { game.mode = 'playing'; missionStatus.textContent = 'LIVE'; pauseButton.textContent = 'Ⅱ'; pauseButton.setAttribute('aria-label', 'ゲームを一時停止'); } }
function castRay(angle) { const rayDirX = Math.cos(angle); const rayDirY = Math.sin(angle); let mapX = Math.floor(player.x); let mapY = Math.floor(player.y); const deltaX = Math.abs(1 / (rayDirX || 0.00001)); const deltaY = Math.abs(1 / (rayDirY || 0.00001)); let stepX; let stepY; let sideX; let sideY; if (rayDirX < 0) { stepX = -1; sideX = (player.x - mapX) * deltaX; } else { stepX = 1; sideX = (mapX + 1 - player.x) * deltaX; } if (rayDirY < 0) { stepY = -1; sideY = (player.y - mapY) * deltaY; } else { stepY = 1; sideY = (mapY + 1 - player.y) * deltaY; } let side = 0; let distance = 20; for (let step = 0; step < 40; step += 1) { if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; } else { sideY += deltaY; mapY += stepY; side = 1; } if (MAP[mapY]?.[mapX] !== '0') { distance = side === 0 ? (mapX - player.x + (1 - stepX) / 2) / rayDirX : (mapY - player.y + (1 - stepY) / 2) / rayDirY; break; } } return { distance: Math.max(.05, Math.abs(distance)), side, mapX, mapY }; }
function tryMove(x, y) { const radius = .19; if (!isWall(x - radius, player.y) && !isWall(x + radius, player.y)) player.x = x; if (!isWall(player.x, y - radius) && !isWall(player.x, y + radius)) player.y = y; }
function shoot() { if (game.mode !== 'playing' || player.cooldown > 0) return; player.cooldown = .22; game.muzzle = .11; const wallDistance = castRay(player.angle).distance; const visible = enemies.filter((enemy) => enemy.alive).map((enemy) => ({ enemy, distance: Math.hypot(enemy.x - player.x, enemy.y - player.y), angle: normalizeAngle(Math.atan2(enemy.y - player.y, enemy.x - player.x) - player.angle) })).filter((item) => Math.abs(item.angle) < .09 && item.distance < wallDistance + .2).sort((a, b) => a.distance - b.distance); if (visible[0]) { const hit = visible[0].enemy; hit.alive = false; hit.flash = .2; game.kills += 1; game.score += 100; burst(hit.x, hit.y, '#ff5ba7', 18, 1.6); updateHud(); if (game.kills >= game.total) finish('win'); } }
function enemyCanOccupy(x, y) { const radius = .16; return !isWall(x - radius, y - radius) && !isWall(x + radius, y - radius) && !isWall(x - radius, y + radius) && !isWall(x + radius, y + radius); }
function moveEnemies(dt) { enemies.filter((enemy) => enemy.alive).forEach((enemy) => { const dx = player.x - enemy.x; const dy = player.y - enemy.y; const distance = Math.hypot(dx, dy); if (distance <= .72) return; const chaseAngle = Math.atan2(dy, dx); const sway = Math.sin(game.time * 1.7 + enemy.phase) * .16; const direction = chaseAngle + sway; const step = Math.min(enemy.speed * dt, Math.max(0, distance - .68)); const nextX = enemy.x + Math.cos(direction) * step; const nextY = enemy.y + Math.sin(direction) * step; if (enemyCanOccupy(nextX, nextY)) { enemy.x = nextX; enemy.y = nextY; return; } if (enemyCanOccupy(nextX, enemy.y)) { enemy.x = nextX; return; } if (enemyCanOccupy(enemy.x, nextY)) { enemy.y = nextY; return; } enemy.phase += Math.PI * .37; }); }
function burst(x, y, color, amount = 10, speed = 1) { for (let i = 0; i < amount; i += 1) { const angle = random(0, Math.PI * 2); const velocity = random(speed * .3, speed); particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: random(.25, .7), maxLife: .7, size: random(.015, .04), color }); } }

function update(dt) {
  stars.forEach((star) => { star.y += star.size * 9 * dt; if (star.y > HEIGHT) { star.y = -3; star.x = random(0, WIDTH); } });
  particles.forEach((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .97; particle.vy *= .97; particle.life -= dt; }); particles = particles.filter((particle) => particle.life > 0);
  enemies.forEach((enemy) => { enemy.flash = Math.max(0, enemy.flash - dt); });
  if (game.mode !== 'playing') return;
  game.time += dt; player.cooldown = Math.max(0, player.cooldown - dt); player.hurt = Math.max(0, player.hurt - dt); game.muzzle = Math.max(0, game.muzzle - dt);
  let forward = 0; let strafe = 0; if (keys.has('w') || keys.has('arrowup') || keys.has('touchforward')) forward += 1; if (keys.has('s') || keys.has('arrowdown') || keys.has('touchback')) forward -= 1; if (keys.has('a') || keys.has('touchleft')) strafe -= 1; if (keys.has('d') || keys.has('touchright')) strafe += 1; if (keys.has('arrowleft')) player.angle -= dt * 2.3; if (keys.has('arrowright')) player.angle += dt * 2.3; const speed = 2.35 * dt; tryMove(player.x + (Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe) * speed, player.y + (Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe) * speed);
  moveEnemies(dt);
  enemies.filter((enemy) => enemy.alive).forEach((enemy) => { const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y); if (distance < .62 && player.hurt <= 0) { player.hp -= 1; player.hurt = 1.4; burst(player.x, player.y, '#ff5ba7', 20, 1.5); updateHud(); if (player.hp <= 0) finish('gameover'); } });
}

function drawBackground() { const ceiling = ctx.createLinearGradient(0, 0, 0, HEIGHT / 2); ceiling.addColorStop(0, '#080d1d'); ceiling.addColorStop(1, '#26375b'); ctx.fillStyle = ceiling; ctx.fillRect(0, 0, WIDTH, HEIGHT / 2); const floor = ctx.createLinearGradient(0, HEIGHT / 2, 0, HEIGHT); floor.addColorStop(0, '#182545'); floor.addColorStop(1, '#080d1d'); ctx.fillStyle = floor; ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2); stars.forEach((star) => { ctx.globalAlpha = star.alpha; ctx.fillStyle = star.size > 1.3 ? '#66f3e2' : '#b5c5e8'; ctx.fillRect(star.x, star.y, star.size, star.size); }); ctx.globalAlpha = 1; }
function wallColor(distance, side, mapX, mapY) { const base = (mapX * 37 + mapY * 19) % 3; const palette = base === 0 ? [67, 177, 177] : base === 1 ? [87, 110, 177] : [178, 76, 129]; const shade = Math.max(.18, 1 - distance / 12) * (side ? .72 : 1); return `rgb(${Math.floor(palette[0] * shade)},${Math.floor(palette[1] * shade)},${Math.floor(palette[2] * shade)})`; }
function drawWorld() { drawBackground(); for (let column = 0; column < RAY_COUNT; column += 1) { const angle = player.angle - FOV / 2 + (column / RAY_COUNT) * FOV; const ray = castRay(angle); depthBuffer[column] = ray.distance; const wallHeight = Math.min(HEIGHT * 2, HEIGHT / ray.distance); const top = HEIGHT / 2 - wallHeight / 2; ctx.fillStyle = wallColor(ray.distance, ray.side, ray.mapX, ray.mapY); ctx.fillRect(column * RAY_STEP, top, RAY_STEP + 1, wallHeight); if (ray.distance < 7) { ctx.fillStyle = `rgba(255,255,255,${Math.max(0, .06 - ray.distance / 150)})`; ctx.fillRect(column * RAY_STEP, top, 1, wallHeight); } } drawFloorLines(); drawEnemies(); drawParticles(); drawMinimap(); if (game.muzzle > 0) { ctx.globalAlpha = game.muzzle / .11; ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(WIDTH / 2, HEIGHT / 2 + 10, 28 + Math.random() * 15, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; } if (player.hurt > 0) { ctx.fillStyle = `rgba(255,31,100,${player.hurt / 8})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); } }
function drawFloorLines() { ctx.strokeStyle = 'rgba(102,243,226,.13)'; ctx.lineWidth = 1; for (let y = HEIGHT / 2 + 28; y < HEIGHT; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); } for (let x = -WIDTH; x < WIDTH * 2; x += 80) { ctx.beginPath(); ctx.moveTo(WIDTH / 2, HEIGHT / 2); ctx.lineTo(x, HEIGHT); ctx.stroke(); } }
function projectEnemy(enemy) { const dx = enemy.x - player.x; const dy = enemy.y - player.y; const distance = Math.hypot(dx, dy); const angle = normalizeAngle(Math.atan2(dy, dx) - player.angle); if (Math.abs(angle) > FOV * .62 || distance < .08) return null; const screenX = (WIDTH / 2) + (angle / FOV) * WIDTH; const spriteHeight = Math.min(500, HEIGHT / distance * .72); const ray = clamp(Math.floor(screenX / RAY_STEP), 0, RAY_COUNT - 1); if (distance > depthBuffer[ray] + .25) return null; return { enemy, distance, screenX, spriteHeight, top: HEIGHT / 2 - spriteHeight * .48 }; }
function drawEnemies() { const visible = enemies.filter((enemy) => enemy.alive).map(projectEnemy).filter(Boolean).sort((a, b) => b.distance - a.distance); visible.forEach(({ enemy, screenX, spriteHeight, top }) => { const width = spriteHeight * .48; ctx.save(); ctx.globalAlpha = enemy.flash > 0 ? .42 : 1; ctx.shadowColor = '#ff5ba7'; ctx.shadowBlur = 17; ctx.fillStyle = '#ff5ba7'; ctx.beginPath(); ctx.moveTo(screenX, top); ctx.lineTo(screenX + width * .44, top + spriteHeight * .3); ctx.lineTo(screenX + width * .38, top + spriteHeight * .78); ctx.lineTo(screenX, top + spriteHeight); ctx.lineTo(screenX - width * .38, top + spriteHeight * .78); ctx.lineTo(screenX - width * .44, top + spriteHeight * .3); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#101a34'; ctx.fillRect(screenX - width * .22, top + spriteHeight * .27, width * .44, spriteHeight * .18); ctx.fillStyle = '#66f3e2'; ctx.fillRect(screenX - width * .14, top + spriteHeight * .32, width * .28, spriteHeight * .055); ctx.fillStyle = '#ffd166'; ctx.fillRect(screenX - width * .08, top + spriteHeight * .53, width * .16, spriteHeight * .12); ctx.strokeStyle = '#ff5ba7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(screenX - width * .35, top + spriteHeight * .77); ctx.lineTo(screenX - width * .52, top + spriteHeight); ctx.moveTo(screenX + width * .35, top + spriteHeight * .77); ctx.lineTo(screenX + width * .52, top + spriteHeight); ctx.stroke(); ctx.restore(); }); }
function drawParticles() { particles.forEach((particle) => { const projected = projectEnemy({ x: particle.x, y: particle.y, alive: true }); if (!projected) return; ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife); ctx.fillStyle = particle.color; const size = Math.max(2, projected.spriteHeight * particle.size); ctx.fillRect(projected.screenX, projected.top + projected.spriteHeight * .45, size, size); }); ctx.globalAlpha = 1; }
function drawMinimap() { const size = 6; const offsetX = 18; const offsetY = HEIGHT - MAP.length * size - 18; ctx.save(); ctx.globalAlpha = .72; ctx.fillStyle = 'rgba(8,13,29,.75)'; ctx.fillRect(offsetX - 6, offsetY - 6, MAP[0].length * size + 12, MAP.length * size + 12); MAP.forEach((row, y) => [...row].forEach((cell, x) => { ctx.fillStyle = cell === '0' ? 'rgba(102,243,226,.12)' : 'rgba(102,243,226,.52)'; ctx.fillRect(offsetX + x * size, offsetY + y * size, size - 1, size - 1); })); ctx.fillStyle = '#66f3e2'; ctx.beginPath(); ctx.arc(offsetX + player.x * size, offsetY + player.y * size, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#66f3e2'; ctx.beginPath(); ctx.moveTo(offsetX + player.x * size, offsetY + player.y * size); ctx.lineTo(offsetX + (player.x + Math.cos(player.angle) * 1.8) * size, offsetY + (player.y + Math.sin(player.angle) * 1.8) * size); ctx.stroke(); enemies.filter((enemy) => enemy.alive).forEach((enemy) => { ctx.fillStyle = '#ff5ba7'; ctx.fillRect(offsetX + enemy.x * size - 1.5, offsetY + enemy.y * size - 1.5, 3, 3); }); ctx.restore(); }
function drawPause() { if (game.mode !== 'paused') return; ctx.fillStyle = 'rgba(8,13,29,.46)'; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.textAlign = 'center'; ctx.fillStyle = '#66f3e2'; ctx.font = '500 17px "DM Mono", monospace'; ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2); ctx.fillStyle = '#8b94ad'; ctx.font = '11px "DM Mono", monospace'; ctx.fillText('PRESS P OR TAP Ⅱ TO RESUME', WIDTH / 2, HEIGHT / 2 + 25); ctx.textAlign = 'start'; }
function draw() { drawWorld(); drawPause(); }

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'p'].includes(key)) event.preventDefault(); keys.add(key); if (key === 'p' && !event.repeat) togglePause(); if (key === 'enter' && (game.mode === 'ready' || game.mode === 'gameover' || game.mode === 'win')) startGame(); });
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
document.addEventListener('mousemove', (event) => { if (document.pointerLockElement === canvas && game.mode === 'playing') player.angle += event.movementX * .0025; });
canvas.addEventListener('click', () => { if (game.mode !== 'playing') return; canvas.requestPointerLock?.(); shoot(); });
document.querySelectorAll('.fps-control').forEach((button) => { const control = `touch${button.dataset.control}`; const press = (event) => { event.preventDefault(); keys.add(control); button.classList.add('is-pressed'); }; const release = (event) => { event.preventDefault(); keys.delete(control); button.classList.remove('is-pressed'); }; button.addEventListener('pointerdown', press); button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('pointerleave', release); });
startButton.addEventListener('click', startGame); pauseButton.addEventListener('click', togglePause);
resizeCanvas(); makeStars(); resetGame(); showOverlay('ready'); if (currentYear) currentYear.textContent = String(new Date().getFullYear());
let last = performance.now(); function frame(now) { const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt); draw(); window.requestAnimationFrame(frame); } window.requestAnimationFrame(frame);

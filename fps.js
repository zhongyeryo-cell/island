const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const hostilesElement = document.querySelector('#hostiles');
const healthElement = document.querySelector('#health');
const relicsElement = document.querySelector('#relics');
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
const stageElement = document.querySelector('#stageLabel');
const medkitsElement = document.querySelector('#medkits');
const viewModeElement = document.querySelector('#viewMode');

const WIDTH = 960;
const HEIGHT = 640;
const FOV = Math.PI / 3;
const RAY_STEP = 2;
const RAY_COUNT = WIDTH / RAY_STEP;
const STAGES = [
  {
    name: 'CRIMSON MAZE',
    location: 'ZONE 01 / RED HALL',
    map: [
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
    ],
    enemySpawns: [
      [5.5, 1.5, .3], [10.5, 1.5, 1.5], [3.5, 3.5, 2.2], [8.5, 3.5, 3.1],
      [2.5, 5.5, .7], [8.5, 5.5, 4.3], [2.5, 7.5, 2.9], [10.5, 9.5, 5],
    ],
    bossSpawn: [12.5, 11.5],
    treasureSpawns: [
      [12.5, 1.5], [3.5, 3.5], [8.5, 3.5], [2.5, 5.5], [8.5, 5.5],
      [2.5, 7.5], [9.5, 7.5], [5.5, 9.5], [10.5, 9.5], [7.5, 11.5],
    ],
  },
  {
    name: 'STATIC HALLS',
    location: 'ZONE 02 / SIGNAL VAULT',
    map: [
      '111111111111111',
      '100000000000001',
      '101111111110101',
      '101000001000101',
      '101011101011101',
      '101010001010101',
      '101011101010101',
      '101000001010101',
      '101111101010101',
      '100000001000001',
      '101111111111101',
      '100000000000001',
      '111111111111111',
    ],
    enemySpawns: [
      [5.5, 1.5, .3], [10.5, 1.5, 1.5], [3.5, 3.5, 2.2], [6.5, 3.5, 3.1],
      [5.5, 5.5, .7], [11.5, 5.5, 4.3], [3.5, 7.5, 2.9], [10.5, 9.5, 5],
    ],
    bossSpawn: [12.5, 11.5],
    treasureSpawns: [
      [2.5, 1.5], [8.5, 1.5], [12.5, 1.5], [4.5, 3.5], [9.5, 3.5],
      [7.5, 5.5], [6.5, 7.5], [11.5, 7.5], [2.5, 9.5], [12.5, 9.5],
    ],
  },
  {
    name: 'DROWNED GRID',
    location: 'ZONE 03 / BLACK CURRENT',
    map: [
      '111111111111111',
      '100000000000001',
      '101011101110101',
      '101000101000101',
      '101110101011101',
      '100010101010001',
      '111010101010111',
      '100010101010001',
      '101110101011101',
      '101000101000101',
      '101011101110101',
      '100000000000001',
      '111111111111111',
    ],
    enemySpawns: [
      [5.5, 1.5, .3], [10.5, 1.5, 1.5], [3.5, 3.5, 2.2], [9.5, 3.5, 3.1],
      [5.5, 5.5, .7], [11.5, 5.5, 4.3], [3.5, 7.5, 2.9], [10.5, 9.5, 5],
    ],
    bossSpawn: [12.5, 11.5],
    treasureSpawns: [
      [2.5, 1.5], [8.5, 1.5], [12.5, 1.5], [4.5, 3.5], [7.5, 3.5],
      [9.5, 5.5], [12.5, 5.5], [5.5, 7.5], [11.5, 7.5], [3.5, 9.5],
    ],
  },
];
let activeStage = STAGES[0];
let MAP = activeStage.map;
const keys = new Set();
const player = { x: 1.5, y: 1.5, angle: 0, hp: 100, hurt: 0, cooldown: 0 };
const view = { mode: 'first' };
const game = { mode: 'ready', score: 0, best: loadBest(), kills: 0, total: 8, relics: 0, relicTotal: 10, stageIndex: -1, time: 0, muzzle: 0, warning: 0 };
let enemies = [];
let enemyBullets = [];
let treasures = [];
let healingItems = [];
let particles = [];
let stars = [];
let boss = null;
let depthBuffer = new Float32Array(RAY_COUNT);
let renderCamera = { x: player.x, y: player.y, angle: player.angle };

function loadBest() {
  try { return Number(localStorage.getItem('void-runner-best')) || 0; } catch { return 0; }
}

function saveBest() {
  try { localStorage.setItem('void-runner-best', String(game.best)); } catch { /* storage can be disabled */ }
}

function random(min, max) { return Math.random() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(6, '0'); }
function normalizeAngle(angle) { while (angle > Math.PI) angle -= Math.PI * 2; while (angle < -Math.PI) angle += Math.PI * 2; return angle; }
function isWall(x, y) { const mapX = Math.floor(x); const mapY = Math.floor(y); return mapY < 0 || mapY >= MAP.length || mapX < 0 || mapX >= MAP[0].length || MAP[mapY][mapX] !== '0'; }
function resizeCanvas() { const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = WIDTH * ratio; canvas.height = HEIGHT * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); }
function makeStars() { stars = Array.from({ length: 92 }, () => ({ x: random(0, WIDTH), y: random(0, HEIGHT), size: random(.4, 1.8), speed: random(7, 31), alpha: random(.08, .56) })); }

function selectRandomStage() {
  let nextIndex = Math.floor(Math.random() * STAGES.length);
  while (STAGES.length > 1 && nextIndex === game.stageIndex) nextIndex = Math.floor(Math.random() * STAGES.length);
  activeStage = STAGES[nextIndex];
  MAP = activeStage.map;
  game.stageIndex = nextIndex;
}

function updateHud() {
  hostilesElement.textContent = `${String(game.kills).padStart(2, '0')} / ${String(game.total).padStart(2, '0')}`;
  healthElement.textContent = String(Math.max(0, Math.ceil(player.hp))).padStart(3, '0');
  healthElement.setAttribute('aria-label', `体力 ${Math.max(0, Math.ceil(player.hp))} / 100`);
  relicsElement.textContent = `${String(game.relics).padStart(2, '0')} / ${String(game.relicTotal).padStart(2, '0')}`;
  relicsElement.setAttribute('aria-label', `回収した宝 ${game.relics}個`);
  bestElement.textContent = formatScore(game.best);
  if (medkitsElement) {
    const remaining = healingItems.filter((item) => !item.collected).length;
    medkitsElement.textContent = String(remaining).padStart(2, '0');
    medkitsElement.setAttribute('aria-label', `残り回復アイテム ${remaining}個`);
  }
  if (viewModeElement) {
    viewModeElement.textContent = view.mode === 'third' ? '3RD' : '1ST';
    viewModeElement.setAttribute('aria-label', view.mode === 'third' ? '三人称視点' : '一人称視点');
  }
  if (stageElement) {
    stageElement.textContent = `STAGE ${String(game.stageIndex + 1).padStart(2, '0')} / ${activeStage.name}`;
    stageElement.setAttribute('aria-label', `${activeStage.name}（${activeStage.location}）`);
  }
}

function updateMissionStatus() {
  if (game.mode !== 'playing') return;
  if (game.relics < game.relicTotal) missionStatus.textContent = game.warning > 0 ? 'RUN' : 'FIND RELICS';
  else if (boss?.alive && boss.vulnerable) missionStatus.textContent = 'BOSS VULNERABLE';
  else if (boss?.alive) missionStatus.textContent = 'BOSS ACTIVE';
  else missionStatus.textContent = 'CLEAR';
}

function resetGame() {
  selectRandomStage();
  game.score = 0;
  game.kills = 0;
  game.relics = 0;
  game.time = 0;
  game.total = activeStage.enemySpawns.length;
  game.relicTotal = activeStage.treasureSpawns.length;
  game.muzzle = 0;
  game.warning = 0;
  player.x = 1.5;
  player.y = 1.5;
  player.angle = 0;
  player.hp = 100;
  player.hurt = 0;
  player.cooldown = 0;
  particles = [];
  enemyBullets = [];
  enemies = activeStage.enemySpawns.map(([x, y, phase], index) => ({ x, y, phase, alive: true, flash: 0, fireFlash: 0, hp: 70, maxHp: 70, speed: (.28 + (index % 3) * .035) * 3, shootTimer: 1.3 + index * .22 }));
  boss = { x: activeStage.bossSpawn[0], y: activeStage.bossSpawn[1], phase: 1.2, speed: .48, alive: true, vulnerable: false, hp: 500, maxHp: 500, flash: 0, fireFlash: 0, shootTimer: 1.8 };
  treasures = activeStage.treasureSpawns.map(([x, y], index) => ({ x, y, index, collected: false, phase: index * .8 }));
  healingItems = generateHealingItems();
  updateHud();
  missionStatus.textContent = 'SEARCHING';
}

function showOverlay(kind) {
  overlay.classList.add('is-visible');
  if (kind === 'ready') {
    overlayKicker.textContent = 'ZONE 893 / NIGHTMARE MODE';
    overlayTitle.innerHTML = 'VOID <em>RUNNER</em>';
    overlayCopy.innerHTML = `${activeStage.name}に散った${game.relicTotal}個の宝と3個の回復アイテムを探せ。<br />追ってくる「それ」は、まだ倒せない。Qキーで視点変更。`;
    startButton.textContent = 'ENTER THE DARK  ↗';
  } else if (kind === 'win') {
    overlayKicker.textContent = 'ZONE CLEAR / THE NIGHT RELEASED';
    overlayTitle.textContent = 'AREA CLEAR';
    overlayCopy.innerHTML = `宝をすべて集め、追跡者を倒した。<br />スコアは <strong>${formatScore(game.score)}</strong>。`;
    startButton.textContent = 'RUN IT AGAIN  ↗';
  } else {
    overlayKicker.textContent = 'SIGNAL LOST / SOMETHING FOUND YOU';
    overlayTitle.textContent = 'GAME OVER';
    overlayCopy.innerHTML = `宝 ${game.relics} / ${game.relicTotal}。撃破 ${game.kills} / ${game.total}。<br />もう一度、暗闇へ戻ろう。`;
    startButton.textContent = 'TRY AGAIN  ↗';
  }
  overlayBest.textContent = `BEST ${formatScore(game.best)}`;
}

function hideOverlay() { overlay.classList.remove('is-visible'); }
function startGame() { resetGame(); game.mode = 'playing'; missionStatus.textContent = 'FIND RELICS'; pauseButton.disabled = false; pauseButton.textContent = 'Ⅱ'; pauseButton.setAttribute('aria-label', 'ゲームを一時停止'); hideOverlay(); canvas.focus(); }
function finish(kind) { game.mode = kind; pauseButton.disabled = true; missionStatus.textContent = kind === 'win' ? 'CLEAR' : 'OFFLINE'; if (game.score > game.best) { game.best = game.score; saveBest(); } updateHud(); showOverlay(kind); if (document.pointerLockElement === canvas) document.exitPointerLock?.(); }
function togglePause() { if (game.mode === 'playing') { game.mode = 'paused'; missionStatus.textContent = 'PAUSED'; pauseButton.textContent = '▶'; pauseButton.setAttribute('aria-label', 'ゲームを再開'); if (document.pointerLockElement === canvas) document.exitPointerLock?.(); } else if (game.mode === 'paused') { game.mode = 'playing'; updateMissionStatus(); pauseButton.textContent = 'Ⅱ'; pauseButton.setAttribute('aria-label', 'ゲームを一時停止'); } }
function toggleView() { view.mode = view.mode === 'first' ? 'third' : 'first'; updateHud(); }

function generateHealingItems() {
  const reserved = [
    [player.x, player.y],
    ...activeStage.enemySpawns.map(([x, y]) => [x, y]),
    activeStage.bossSpawn,
    ...activeStage.treasureSpawns,
  ];
  const candidates = [];
  for (let y = 1; y < MAP.length - 1; y += 1) {
    for (let x = 1; x < MAP[0].length - 1; x += 1) {
      const point = [x + .5, y + .5];
      if (MAP[y][x] !== '0' || reserved.some(([rx, ry]) => Math.hypot(point[0] - rx, point[1] - ry) < .7)) continue;
      candidates.push(point);
    }
  }
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  return candidates.slice(0, 3).map(([x, y], index) => ({ x, y, index, collected: false, phase: random(0, Math.PI * 2) }));
}

function getRenderCamera() {
  if (view.mode === 'first') return { x: player.x, y: player.y, angle: player.angle };
  const distances = [.9, .72, .54, .36, 0];
  for (const distance of distances) {
    const x = player.x - Math.cos(player.angle) * distance;
    const y = player.y - Math.sin(player.angle) * distance;
    if (!isWall(x, y)) return { x, y, angle: player.angle };
  }
  return { x: player.x, y: player.y, angle: player.angle };
}

function castRay(angle, originX = player.x, originY = player.y) {
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);
  let mapX = Math.floor(originX);
  let mapY = Math.floor(originY);
  const deltaX = Math.abs(1 / (rayDirX || 0.00001));
  const deltaY = Math.abs(1 / (rayDirY || 0.00001));
  let stepX; let stepY; let sideX; let sideY;
  if (rayDirX < 0) { stepX = -1; sideX = (originX - mapX) * deltaX; } else { stepX = 1; sideX = (mapX + 1 - originX) * deltaX; }
  if (rayDirY < 0) { stepY = -1; sideY = (originY - mapY) * deltaY; } else { stepY = 1; sideY = (mapY + 1 - originY) * deltaY; }
  let side = 0;
  let distance = 20;
  for (let step = 0; step < 40; step += 1) {
    if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; } else { sideY += deltaY; mapY += stepY; side = 1; }
    if (MAP[mapY]?.[mapX] !== '0') { distance = side === 0 ? (mapX - originX + (1 - stepX) / 2) / rayDirX : (mapY - originY + (1 - stepY) / 2) / rayDirY; break; }
  }
  return { distance: Math.max(.05, Math.abs(distance)), side, mapX, mapY };
}

function tryMove(x, y) {
  const radius = .19;
  if (!isWall(x - radius, player.y) && !isWall(x + radius, player.y)) player.x = x;
  if (!isWall(player.x, y - radius) && !isWall(player.x, y + radius)) player.y = y;
}

function enemyCanOccupy(x, y, radius = .16) { return !isWall(x - radius, y - radius) && !isWall(x + radius, y - radius) && !isWall(x - radius, y + radius) && !isWall(x + radius, y + radius); }

function moveEnemies(dt) {
  enemies.filter((enemy) => enemy.alive).forEach((enemy) => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= .72) return;
    const direction = Math.atan2(dy, dx) + Math.sin(game.time * 1.7 + enemy.phase) * .16;
    const step = Math.min(enemy.speed * dt, Math.max(0, distance - .68));
    const nextX = enemy.x + Math.cos(direction) * step;
    const nextY = enemy.y + Math.sin(direction) * step;
    if (enemyCanOccupy(nextX, nextY)) { enemy.x = nextX; enemy.y = nextY; return; }
    if (enemyCanOccupy(nextX, enemy.y)) { enemy.x = nextX; return; }
    if (enemyCanOccupy(enemy.x, nextY)) { enemy.y = nextY; return; }
    enemy.phase += Math.PI * .37;
  });
}

function moveBoss(dt) {
  if (!boss?.alive) return;
  const distance = Math.hypot(player.x - boss.x, player.y - boss.y);
  if (distance <= .85) return;
  const direction = Math.atan2(player.y - boss.y, player.x - boss.x) + Math.sin(game.time * 1.15 + boss.phase) * .1;
  const step = Math.min(boss.speed * dt, Math.max(0, distance - .8));
  const nextX = boss.x + Math.cos(direction) * step;
  const nextY = boss.y + Math.sin(direction) * step;
  if (enemyCanOccupy(nextX, nextY, .27)) { boss.x = nextX; boss.y = nextY; return; }
  if (enemyCanOccupy(nextX, boss.y, .27)) { boss.x = nextX; return; }
  if (enemyCanOccupy(boss.x, nextY, .27)) { boss.y = nextY; return; }
  boss.phase += Math.PI * .31;
}

function damagePlayer(amount = 10) {
  if (player.hurt > 0 || game.mode !== 'playing') return;
  player.hp = Math.max(0, player.hp - amount);
  player.hurt = 1.25;
  game.warning = .7;
  burst(player.x, player.y, '#ff315f', 23, 1.5);
  updateHud();
  if (player.hp <= 0) finish('gameover');
}

function fireEnemy(enemy, isBoss = false) {
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const speed = isBoss ? 2.75 : 2.25;
  enemyBullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 4, isBoss });
  enemy.shootTimer = isBoss ? 1.1 + random(0, .8) : 1.45 + random(0, 1.35);
  enemy.fireFlash = .13;
}

function updateEnemyFire(dt) {
  const shooters = [...enemies.filter((enemy) => enemy.alive)];
  if (boss?.alive) shooters.push(boss);
  shooters.forEach((enemy) => {
    enemy.shootTimer -= dt;
    enemy.fireFlash = Math.max(0, enemy.fireFlash - dt);
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const isBoss = enemy === boss;
    if (enemy.shootTimer <= 0 && distance < (isBoss ? 10 : 8) && distance > (isBoss ? .95 : .78)) {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      if (castRay(angle).distance > distance - .12) fireEnemy(enemy, isBoss);
      else enemy.shootTimer = .45;
    }
  });
  enemyBullets.forEach((bullet) => { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt; });
  for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
    const bullet = enemyBullets[index];
    if (bullet.life <= 0 || isWall(bullet.x, bullet.y)) { enemyBullets.splice(index, 1); continue; }
    if (Math.hypot(player.x - bullet.x, player.y - bullet.y) < .24) { enemyBullets.splice(index, 1); damagePlayer(bullet.isBoss ? 20 : 10); }
  }
}

function collectTreasures() {
  treasures.forEach((treasure) => {
    if (treasure.collected || Math.hypot(player.x - treasure.x, player.y - treasure.y) > .43) return;
    treasure.collected = true;
    game.relics += 1;
    game.score += 25;
    burst(treasure.x, treasure.y, '#ffd166', 18, 1.4);
    if (game.relics === game.relicTotal) {
      boss.vulnerable = true;
      game.score += 250;
      game.warning = 1.4;
      burst(boss.x, boss.y, '#ffd166', 28, 1.8);
    }
    updateHud();
    updateMissionStatus();
  });
}

function collectHealingItems() {
  healingItems.forEach((item) => {
    if (item.collected || player.hp >= 100 || Math.hypot(player.x - item.x, player.y - item.y) > .43) return;
    item.collected = true;
    player.hp = Math.min(100, player.hp + 30);
    game.score += 35;
    burst(item.x, item.y, '#66f3e2', 22, 1.5);
    updateHud();
  });
}

function shoot() {
  if (game.mode !== 'playing' || player.cooldown > 0) return;
  player.cooldown = .14;
  game.muzzle = .11;
  const wallDistance = castRay(player.angle).distance;
  const targets = enemies.filter((enemy) => enemy.alive).map((enemy) => ({ enemy, distance: Math.hypot(enemy.x - player.x, enemy.y - player.y), angle: normalizeAngle(Math.atan2(enemy.y - player.y, enemy.x - player.x) - player.angle) }));
  if (boss?.alive) targets.push({ enemy: boss, distance: Math.hypot(boss.x - player.x, boss.y - player.y), angle: normalizeAngle(Math.atan2(boss.y - player.y, boss.x - player.x) - player.angle) });
  const visible = targets.filter((item) => Math.abs(item.angle) < (item.enemy === boss ? .12 : .09) && item.distance < wallDistance + .2).sort((a, b) => a.distance - b.distance);
  if (!visible[0]) return;
  const hit = visible[0].enemy;
  if (hit === boss) {
    if (!boss.vulnerable) { boss.flash = .14; burst(boss.x, boss.y, '#7e243c', 5, 1); return; }
    boss.hp = Math.max(0, boss.hp - 35);
    boss.flash = .2;
    game.score += 150;
    burst(boss.x, boss.y, '#ffd166', 10, 1.4);
    if (boss.hp <= 0) { boss.alive = false; game.score += 500; burst(boss.x, boss.y, '#ff315f', 40, 2); finish('win'); }
  } else {
    hit.hp = Math.max(0, hit.hp - 35);
    hit.flash = .2;
    burst(hit.x, hit.y, hit.hp > 0 ? '#ffd166' : '#ff5ba7', hit.hp > 0 ? 7 : 18, 1.6);
    if (hit.hp <= 0) {
      hit.alive = false;
      game.kills += 1;
      game.score += 100;
    }
  }
  updateHud();
}

function burst(x, y, color, amount = 10, speed = 1) {
  for (let index = 0; index < amount; index += 1) {
    const angle = random(0, Math.PI * 2);
    const velocity = random(speed * .3, speed);
    particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: random(.25, .7), maxLife: .7, size: random(.015, .04), color });
  }
}

function update(dt) {
  stars.forEach((star) => { star.y += star.speed * dt * (game.mode === 'playing' ? 1 : .2); if (star.y > HEIGHT) { star.y = -3; star.x = random(0, WIDTH); } });
  particles.forEach((particle) => { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .97; particle.vy *= .97; particle.life -= dt; });
  particles = particles.filter((particle) => particle.life > 0);
  enemies.forEach((enemy) => { enemy.flash = Math.max(0, enemy.flash - dt); });
  if (boss) { boss.flash = Math.max(0, boss.flash - dt); }
  if (game.mode !== 'playing') return;
  game.time += dt;
  game.warning = Math.max(0, game.warning - dt);
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.hurt = Math.max(0, player.hurt - dt);
  game.muzzle = Math.max(0, game.muzzle - dt);
  let forward = 0; let strafe = 0;
  if (keys.has('w') || keys.has('arrowup') || keys.has('touchforward')) forward += 1;
  if (keys.has('s') || keys.has('arrowdown') || keys.has('touchback')) forward -= 1;
  if (keys.has('a') || keys.has('touchleft')) strafe -= 1;
  if (keys.has('d') || keys.has('touchright')) strafe += 1;
  if (keys.has('arrowleft')) player.angle -= dt * 2.3;
  if (keys.has('arrowright')) player.angle += dt * 2.3;
  const moveSpeed = 2.35 * dt;
  tryMove(player.x + (Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe) * moveSpeed, player.y + (Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe) * moveSpeed);
  if (keys.has(' ') || keys.has('pointerfire') || keys.has('touchfire')) shoot();
  moveEnemies(dt);
  moveBoss(dt);
  collectTreasures();
  collectHealingItems();
  updateEnemyFire(dt);
  enemies.filter((enemy) => enemy.alive).forEach((enemy) => { if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < .62) damagePlayer(18); });
  if (boss?.alive && Math.hypot(boss.x - player.x, boss.y - player.y) < .74) damagePlayer(30);
  updateMissionStatus();
}

function drawBackground() {
  const ceiling = ctx.createLinearGradient(0, 0, 0, HEIGHT / 2);
  ceiling.addColorStop(0, '#03040a'); ceiling.addColorStop(1, '#1d111e'); ctx.fillStyle = ceiling; ctx.fillRect(0, 0, WIDTH, HEIGHT / 2);
  const floor = ctx.createLinearGradient(0, HEIGHT / 2, 0, HEIGHT);
  floor.addColorStop(0, '#241527'); floor.addColorStop(1, '#05060d'); ctx.fillStyle = floor; ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);
  stars.forEach((star) => { ctx.globalAlpha = star.alpha; ctx.fillStyle = star.size > 1.3 ? '#ff5b82' : '#a6bccb'; ctx.fillRect(star.x, star.y, star.size, star.size); }); ctx.globalAlpha = 1;
}

function wallColor(distance, side, mapX, mapY) {
  const base = (mapX * 37 + mapY * 19) % 3;
  const palette = base === 0 ? [46, 67, 71] : base === 1 ? [63, 38, 55] : [42, 48, 66];
  const shade = Math.max(.14, 1 - distance / 11) * (side ? .68 : 1);
  return `rgb(${Math.floor(palette[0] * shade)},${Math.floor(palette[1] * shade)},${Math.floor(palette[2] * shade)})`;
}

function drawFloorLines() {
  ctx.strokeStyle = 'rgba(255,49,95,.1)'; ctx.lineWidth = 1;
  for (let y = HEIGHT / 2 + 28; y < HEIGHT; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  for (let x = -WIDTH; x < WIDTH * 2; x += 80) { ctx.beginPath(); ctx.moveTo(WIDTH / 2, HEIGHT / 2); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
}

function projectWorld(x, y, sizeFactor = .72) {
  const dx = x - renderCamera.x;
  const dy = y - renderCamera.y;
  const distance = Math.hypot(dx, dy);
  const angle = normalizeAngle(Math.atan2(dy, dx) - renderCamera.angle);
  if (Math.abs(angle) > FOV * .62 || distance < .08) return null;
  const screenX = (WIDTH / 2) + (angle / FOV) * WIDTH;
  const spriteHeight = Math.min(560, HEIGHT / distance * sizeFactor);
  const ray = clamp(Math.floor(screenX / RAY_STEP), 0, RAY_COUNT - 1);
  if (distance > depthBuffer[ray] + .25) return null;
  return { distance, screenX, spriteHeight, top: HEIGHT / 2 - spriteHeight * .48 };
}

function projectEnemy(enemy) { const projection = projectWorld(enemy.x, enemy.y, enemy === boss ? 1.18 : .72); return projection ? { ...projection, enemy } : null; }

function drawTreasures() {
  const visible = treasures.filter((treasure) => !treasure.collected).map((treasure) => ({ treasure, projection: projectWorld(treasure.x, treasure.y, .34) })).filter((item) => item.projection).sort((a, b) => b.projection.distance - a.projection.distance);
  visible.forEach(({ treasure, projection }) => { const { screenX, spriteHeight, top } = projection; const centerY = top + spriteHeight * .5; const size = Math.max(7, spriteHeight * .22); ctx.save(); ctx.translate(screenX, centerY); ctx.rotate(game.time * .7 + treasure.phase); ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18; ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .68, 0); ctx.lineTo(0, size); ctx.lineTo(-size * .68, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.moveTo(0, -size * .45); ctx.lineTo(size * .3, 0); ctx.lineTo(0, size * .45); ctx.lineTo(-size * .3, 0); ctx.closePath(); ctx.fill(); ctx.restore(); });
}

function drawHealingItems() {
  const visible = healingItems.filter((item) => !item.collected).map((item) => ({ item, projection: projectWorld(item.x, item.y, .38) })).filter((entry) => entry.projection).sort((a, b) => b.projection.distance - a.projection.distance);
  visible.forEach(({ item, projection }) => {
    const { screenX, spriteHeight, top } = projection;
    const size = Math.max(8, spriteHeight * .2);
    const centerY = top + spriteHeight * .53;
    ctx.save();
    ctx.translate(screenX, centerY);
    ctx.rotate(Math.sin(game.time * 1.5 + item.phase) * .08);
    ctx.shadowColor = '#66f3e2';
    ctx.shadowBlur = 19;
    ctx.fillStyle = 'rgba(7,22,37,.95)';
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.strokeStyle = '#66f3e2';
    ctx.lineWidth = Math.max(1, size * .12);
    ctx.strokeRect(-size, -size, size * 2, size * 2);
    ctx.fillStyle = '#66f3e2';
    ctx.fillRect(-size * .22, -size * .68, size * .44, size * 1.36);
    ctx.fillRect(-size * .68, -size * .22, size * 1.36, size * .44);
    ctx.restore();
  });
}

function drawEnemyBullets() {
  enemyBullets.forEach((bullet) => { const projection = projectWorld(bullet.x, bullet.y, bullet.isBoss ? .18 : .12); if (!projection) return; ctx.save(); ctx.globalAlpha = Math.min(1, projection.distance); ctx.fillStyle = bullet.isBoss ? '#ff315f' : '#ffd166'; ctx.shadowColor = bullet.isBoss ? '#ff315f' : '#ffd166'; ctx.shadowBlur = 17; const size = Math.max(3, projection.spriteHeight * .1); ctx.fillRect(projection.screenX - size / 2, projection.top + projection.spriteHeight * .47, size, size); ctx.restore(); });
}

function drawHealthBar(screenX, top, width, ratio, color, label = '') {
  const barWidth = Math.max(28, width * 1.15);
  const barHeight = Math.max(3, Math.min(6, width * .035));
  const barX = screenX - barWidth / 2;
  const barY = Math.max(9, top - (label ? 22 : 13));
  ctx.save();
  ctx.globalAlpha = .92;
  ctx.fillStyle = 'rgba(3,4,10,.85)';
  ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
  ctx.fillStyle = color;
  ctx.fillRect(barX, barY, barWidth * clamp(ratio, 0, 1), barHeight);
  if (label) { ctx.fillStyle = color; ctx.font = '500 9px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(label, screenX, barY - 5); ctx.textAlign = 'start'; }
  ctx.restore();
}

function drawEnemyGun(screenX, top, spriteHeight, width, enemy) {
  ctx.fillStyle = '#3c263b'; ctx.fillRect(screenX + width * .2, top + spriteHeight * .54, width * .34, spriteHeight * .085);
  ctx.fillStyle = enemy === boss ? '#ff315f' : '#ffd166'; ctx.fillRect(screenX + width * .49, top + spriteHeight * .54, width * .2, spriteHeight * .05);
  if (enemy.fireFlash > 0) { ctx.globalAlpha = enemy.fireFlash / .13; ctx.fillStyle = '#fff3bb'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(screenX + width * .74, top + spriteHeight * .565, Math.max(3, spriteHeight * .07), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
}

function drawPlayerAvatar() {
  if (view.mode !== 'third') return;
  const projection = projectWorld(player.x, player.y, .56);
  if (!projection) return;
  const { screenX, spriteHeight, top } = projection;
  const width = spriteHeight * .34;
  const center = top + spriteHeight * .5;
  ctx.save();
  ctx.globalAlpha = .98;
  ctx.shadowColor = '#66f3e2';
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(7,12,27,.96)';
  ctx.beginPath();
  ctx.moveTo(screenX - width * .4, top + spriteHeight * .36);
  ctx.lineTo(screenX + width * .4, top + spriteHeight * .36);
  ctx.lineTo(screenX + width * .52, top + spriteHeight);
  ctx.lineTo(screenX - width * .52, top + spriteHeight);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#66f3e2';
  ctx.lineWidth = Math.max(1, spriteHeight * .018);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#172b46';
  ctx.beginPath();
  ctx.arc(screenX, top + spriteHeight * .24, width * .32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#66f3e2';
  ctx.stroke();
  ctx.fillStyle = '#ff5ba7';
  ctx.fillRect(screenX - width * .14, top + spriteHeight * .22, width * .28, Math.max(2, spriteHeight * .035));
  ctx.fillStyle = '#283d5c';
  ctx.fillRect(screenX - width * .72, center, width * .33, spriteHeight * .08);
  ctx.fillRect(screenX + width * .39, center, width * .33, spriteHeight * .08);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(screenX + width * .55, center, width * .4, spriteHeight * .045);
  if (game.muzzle > 0) {
    ctx.globalAlpha = game.muzzle / .11;
    ctx.fillStyle = '#fff3bb';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(screenX + width * .98, center + spriteHeight * .02, Math.max(3, spriteHeight * .07), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies() {
  const visible = enemies.filter((enemy) => enemy.alive).map(projectEnemy).filter(Boolean).sort((a, b) => b.distance - a.distance);
  visible.forEach(({ enemy, screenX, spriteHeight, top }) => { const width = spriteHeight * .48; ctx.save(); ctx.globalAlpha = enemy.flash > 0 ? .42 : 1; ctx.shadowColor = '#ff5ba7'; ctx.shadowBlur = 17; ctx.fillStyle = '#7f274d'; ctx.beginPath(); ctx.moveTo(screenX, top); ctx.lineTo(screenX + width * .44, top + spriteHeight * .3); ctx.lineTo(screenX + width * .38, top + spriteHeight * .78); ctx.lineTo(screenX, top + spriteHeight); ctx.lineTo(screenX - width * .38, top + spriteHeight * .78); ctx.lineTo(screenX - width * .44, top + spriteHeight * .3); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#100d1d'; ctx.fillRect(screenX - width * .22, top + spriteHeight * .27, width * .44, spriteHeight * .18); ctx.fillStyle = '#ff315f'; ctx.fillRect(screenX - width * .14, top + spriteHeight * .32, width * .28, spriteHeight * .055); ctx.fillStyle = '#ffd166'; ctx.fillRect(screenX - width * .08, top + spriteHeight * .53, width * .16, spriteHeight * .12); drawEnemyGun(screenX, top, spriteHeight, width, enemy); drawHealthBar(screenX, top, width, enemy.hp / enemy.maxHp, '#ff5ba7'); ctx.strokeStyle = '#ff315f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(screenX - width * .35, top + spriteHeight * .77); ctx.lineTo(screenX - width * .52, top + spriteHeight); ctx.moveTo(screenX + width * .35, top + spriteHeight * .77); ctx.lineTo(screenX + width * .52, top + spriteHeight); ctx.stroke(); ctx.restore(); });
}

function drawBoss() {
  if (!boss?.alive) return;
  const projection = projectEnemy(boss);
  if (!projection) return;
  const { screenX, spriteHeight, top } = projection;
  const width = spriteHeight * .57;
  ctx.save();
  ctx.globalAlpha = boss.flash > 0 ? .4 : 1;
  ctx.shadowColor = boss.vulnerable ? '#ffd166' : '#ff315f'; ctx.shadowBlur = boss.vulnerable ? 24 : 32;
  ctx.fillStyle = '#170c19';
  ctx.beginPath(); ctx.moveTo(screenX, top); ctx.lineTo(screenX + width * .45, top + spriteHeight * .22); ctx.lineTo(screenX + width * .55, top + spriteHeight); ctx.lineTo(screenX - width * .55, top + spriteHeight); ctx.lineTo(screenX - width * .45, top + spriteHeight * .22); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#ff315f'; ctx.beginPath(); ctx.arc(screenX - width * .16, top + spriteHeight * .27, Math.max(3, spriteHeight * .055), 0, Math.PI * 2); ctx.arc(screenX + width * .16, top + spriteHeight * .27, Math.max(3, spriteHeight * .055), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e102b'; ctx.fillRect(screenX - width * .2, top + spriteHeight * .44, width * .4, spriteHeight * .1);
  drawEnemyGun(screenX, top, spriteHeight, width, boss);
  ctx.strokeStyle = boss.vulnerable ? '#ffd166' : 'rgba(255,49,95,.65)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(screenX, top + spriteHeight * .5, width * .69 + Math.sin(game.time * 3) * 4, 0, Math.PI * 2); ctx.stroke();
  if (!boss.vulnerable) { ctx.strokeStyle = 'rgba(255,49,95,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(screenX, top + spriteHeight * .5, width * .9 + Math.sin(game.time * 2) * 5, 0, Math.PI * 2); ctx.stroke(); }
  drawHealthBar(screenX, top, width, boss.hp / boss.maxHp, boss.vulnerable ? '#ffd166' : '#ff315f', `BOSS ${boss.hp} / ${boss.maxHp}`);
  ctx.restore();
}

function drawParticles() { particles.forEach((particle) => { const projection = projectWorld(particle.x, particle.y, .6); if (!projection) return; ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife); ctx.fillStyle = particle.color; const size = Math.max(2, projection.spriteHeight * particle.size); ctx.fillRect(projection.screenX, projection.top + projection.spriteHeight * .45, size, size); }); ctx.globalAlpha = 1; }

function drawMinimap() {
  const size = 6; const offsetX = 18; const offsetY = HEIGHT - MAP.length * size - 18; ctx.save(); ctx.globalAlpha = .72; ctx.fillStyle = 'rgba(5,6,13,.84)'; ctx.fillRect(offsetX - 6, offsetY - 6, MAP[0].length * size + 12, MAP.length * size + 12); MAP.forEach((row, y) => [...row].forEach((cell, x) => { ctx.fillStyle = cell === '0' ? 'rgba(255,49,95,.08)' : 'rgba(255,49,95,.4)'; ctx.fillRect(offsetX + x * size, offsetY + y * size, size - 1, size - 1); })); treasures.filter((treasure) => !treasure.collected).forEach((treasure) => { ctx.fillStyle = '#ffd166'; ctx.fillRect(offsetX + treasure.x * size - 1, offsetY + treasure.y * size - 1, 2, 2); }); healingItems.filter((item) => !item.collected).forEach((item) => { ctx.fillStyle = '#66f3e2'; ctx.fillRect(offsetX + item.x * size - 1.5, offsetY + item.y * size - 1.5, 3, 3); }); enemies.filter((enemy) => enemy.alive).forEach((enemy) => { ctx.fillStyle = '#ff5ba7'; ctx.fillRect(offsetX + enemy.x * size - 1.5, offsetY + enemy.y * size - 1.5, 3, 3); }); if (boss?.alive) { ctx.fillStyle = '#ff315f'; ctx.beginPath(); ctx.arc(offsetX + boss.x * size, offsetY + boss.y * size, 3.5, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#66f3e2'; ctx.beginPath(); ctx.arc(offsetX + player.x * size, offsetY + player.y * size, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#66f3e2'; ctx.beginPath(); ctx.moveTo(offsetX + player.x * size, offsetY + player.y * size); ctx.lineTo(offsetX + (player.x + Math.cos(player.angle) * 1.8) * size, offsetY + (player.y + Math.sin(player.angle) * 1.8) * size); ctx.stroke(); ctx.restore();
}

function drawHorrorOverlay() {
  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 120, WIDTH / 2, HEIGHT / 2, 540); vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(.72, 'rgba(0,0,0,.17)'); vignette.addColorStop(1, 'rgba(0,0,0,.74)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (game.warning > 0) { ctx.fillStyle = `rgba(255,20,65,${game.warning * .08})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
  if (boss?.alive && Math.hypot(boss.x - player.x, boss.y - player.y) < 3) { ctx.globalAlpha = .52 + Math.sin(game.time * 8) * .12; ctx.fillStyle = '#ff315f'; ctx.font = '500 10px "DM Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(boss.vulnerable ? 'THE HUNTER CAN BLEED' : 'IT IS RIGHT BEHIND YOU', WIDTH / 2, 38); ctx.textAlign = 'start'; ctx.globalAlpha = 1; }
}

function drawWorld() {
  renderCamera = getRenderCamera();
  drawBackground();
  for (let column = 0; column < RAY_COUNT; column += 1) { const angle = renderCamera.angle - FOV / 2 + (column / RAY_COUNT) * FOV; const ray = castRay(angle, renderCamera.x, renderCamera.y); depthBuffer[column] = ray.distance; const wallHeight = Math.min(HEIGHT * 2, HEIGHT / ray.distance); const top = HEIGHT / 2 - wallHeight / 2; ctx.fillStyle = wallColor(ray.distance, ray.side, ray.mapX, ray.mapY); ctx.fillRect(column * RAY_STEP, top, RAY_STEP + 1, wallHeight); }
  drawFloorLines(); drawTreasures(); drawHealingItems(); drawEnemyBullets(); drawEnemies(); drawBoss(); drawPlayerAvatar(); drawParticles(); drawMinimap();
  if (game.muzzle > 0 && view.mode === 'first') { ctx.globalAlpha = game.muzzle / .11; ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(WIDTH / 2, HEIGHT / 2 + 10, 28 + Math.random() * 15, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  drawHorrorOverlay();
  if (player.hurt > 0) { ctx.fillStyle = `rgba(255,31,95,${player.hurt / 8})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
}

function drawPause() { if (game.mode !== 'paused') return; ctx.fillStyle = 'rgba(3,4,10,.6)'; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.textAlign = 'center'; ctx.fillStyle = '#ffd166'; ctx.font = '500 17px "DM Mono", monospace'; ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2); ctx.fillStyle = '#8b94ad'; ctx.font = '11px "DM Mono", monospace'; ctx.fillText('PRESS P OR TAP Ⅱ TO RESUME', WIDTH / 2, HEIGHT / 2 + 25); ctx.textAlign = 'start'; }
function draw() { drawWorld(); drawPause(); }

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'p', 'q', ' '].includes(key)) event.preventDefault(); keys.add(key); if (key === 'p' && !event.repeat) togglePause(); if (key === 'q' && !event.repeat) toggleView(); if (key === 'enter' && (game.mode === 'ready' || game.mode === 'gameover' || game.mode === 'win')) startGame(); });
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
document.addEventListener('mousemove', (event) => { if (document.pointerLockElement === canvas && game.mode === 'playing') player.angle += event.movementX * .0025; });
canvas.addEventListener('pointerdown', (event) => { if (game.mode !== 'playing') return; keys.add('pointerfire'); canvas.setPointerCapture?.(event.pointerId); });
canvas.addEventListener('pointerup', (event) => { keys.delete('pointerfire'); canvas.releasePointerCapture?.(event.pointerId); });
canvas.addEventListener('pointercancel', () => keys.delete('pointerfire'));
canvas.addEventListener('click', () => { if (game.mode !== 'playing') return; canvas.requestPointerLock?.(); shoot(); });
document.querySelectorAll('.fps-control').forEach((button) => { const control = `touch${button.dataset.control}`; const press = (event) => { event.preventDefault(); keys.add(control); button.classList.add('is-pressed'); }; const release = (event) => { event.preventDefault(); keys.delete(control); button.classList.remove('is-pressed'); }; button.addEventListener('pointerdown', press); button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('pointerleave', release); });
startButton.addEventListener('click', startGame); pauseButton.addEventListener('click', togglePause);
resizeCanvas(); makeStars(); resetGame(); showOverlay('ready'); if (currentYear) currentYear.textContent = String(new Date().getFullYear());
let last = performance.now(); function frame(now) { const dt = Math.min(.033, (now - last) / 1000); last = now; update(dt); draw(); window.requestAnimationFrame(frame); } window.requestAnimationFrame(frame);

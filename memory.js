const grid = document.querySelector('#memoryGrid');
const movesElement = document.querySelector('#moves');
const timeElement = document.querySelector('#time');
const bestElement = document.querySelector('#best');
const overlay = document.querySelector('#overlay');
const overlayKicker = document.querySelector('#overlayKicker');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayCopy = document.querySelector('#overlayCopy');
const overlayBest = document.querySelector('#overlayBest');
const startButton = document.querySelector('#startButton');
const currentYear = document.querySelector('#currentYear');
const symbols = ['✦', '◈', '○', '△', '□', '✺', '♡', '☼'];
const state = { mode: 'ready', moves: 0, seconds: 0, best: loadBest(), first: null, second: null, matched: 0, locked: false, timer: null };

function loadBest() { try { return Number(localStorage.getItem('pixel-match-best')) || 0; } catch { return 0; } }
function saveBest() { try { localStorage.setItem('pixel-match-best', String(state.best)); } catch { /* storage can be disabled */ } }
function shuffle(items) { const result = [...items]; for (let index = result.length - 1; index > 0; index -= 1) { const other = Math.floor(Math.random() * (index + 1)); [result[index], result[other]] = [result[other], result[index]]; } return result; }
function formatMoves(value) { return String(value).padStart(2, '0'); }
function updateHud() { movesElement.textContent = formatMoves(state.moves); timeElement.textContent = String(state.seconds).padStart(2, '0'); bestElement.textContent = state.best ? formatMoves(state.best) : '--'; }
function makeBoard() { grid.innerHTML = ''; shuffle([...symbols, ...symbols]).forEach((symbol, index) => { const button = document.createElement('button'); button.className = 'memory-card'; button.type = 'button'; button.dataset.symbol = symbol; button.setAttribute('aria-label', `カード ${index + 1}`); button.innerHTML = `<span class="card-face card-back" aria-hidden="true"></span><span class="card-face card-front" aria-hidden="true">${symbol}</span>`; button.addEventListener('click', () => chooseCard(button)); grid.append(button); }); }
function resetGame() { window.clearInterval(state.timer); state.mode = 'playing'; state.moves = 0; state.seconds = 0; state.first = null; state.second = null; state.matched = 0; state.locked = false; makeBoard(); updateHud(); state.timer = window.setInterval(() => { if (state.mode !== 'playing') return; state.seconds += 1; updateHud(); }, 1000); }
function showOverlay(over) { overlay.classList.add('is-visible'); if (over) { overlayKicker.textContent = 'PUZZLE CLEAR / MEMORY GRID'; overlayTitle.textContent = 'ALL MATCHED'; overlayCopy.innerHTML = `<strong>${state.moves} MOVES</strong> でクリア。<br />次はもっと少ない手数を目指そう。`; startButton.textContent = 'PLAY AGAIN  ↗'; overlayBest.textContent = `BEST ${state.best ? formatMoves(state.best) : '--'} MOVES`; } else { overlayKicker.textContent = 'PUZZLE 03 / MEMORY GRID'; overlayTitle.innerHTML = 'PIXEL <em>MATCH</em>'; overlayCopy.innerHTML = 'カードをめくって、８組のペアを探そう。<br />少ない手数ほど、いいスコア。'; startButton.textContent = 'START PUZZLE  ↗'; overlayBest.textContent = `BEST ${state.best ? formatMoves(state.best) : '--'} MOVES`; } }
function endGame() { state.mode = 'gameover'; window.clearInterval(state.timer); if (!state.best || state.moves < state.best) { state.best = state.moves; saveBest(); } updateHud(); showOverlay(true); }
function chooseCard(card) { if (state.mode !== 'playing' || state.locked || card.classList.contains('is-flipped') || card.classList.contains('is-matched')) return; card.classList.add('is-flipped'); if (!state.first) { state.first = card; return; } state.second = card; state.moves += 1; state.locked = true; updateHud(); if (state.first.dataset.symbol === state.second.dataset.symbol) { state.first.classList.add('is-matched'); state.second.classList.add('is-matched'); state.matched += 1; state.first = null; state.second = null; state.locked = false; if (state.matched === symbols.length) window.setTimeout(endGame, 330); } else { window.setTimeout(() => { state.first?.classList.remove('is-flipped'); state.second?.classList.remove('is-flipped'); state.first = null; state.second = null; state.locked = false; }, 670); } }
startButton.addEventListener('click', () => { resetGame(); overlay.classList.remove('is-visible'); });
makeBoard(); updateHud(); showOverlay(false); if (currentYear) currentYear.textContent = String(new Date().getFullYear());

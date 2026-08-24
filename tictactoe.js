const boardElement = document.querySelector('#ticBoard');
const messageElement = document.querySelector('#message');
const winsElement = document.querySelector('#wins');
const winsInlineElement = document.querySelector('#winsInline');
const lossesElement = document.querySelector('#losses');
const drawsElement = document.querySelector('#draws');
const drawsInlineElement = document.querySelector('#drawsInline');
const overlay = document.querySelector('#overlay');
const overlayKicker = document.querySelector('#overlayKicker');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayCopy = document.querySelector('#overlayCopy');
const overlayBest = document.querySelector('#overlayBest');
const startButton = document.querySelector('#startButton');
const currentYear = document.querySelector('#currentYear');
const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const state = { mode: 'ready', board: Array(9).fill(''), wins: load('tic-tac-toe-wins'), losses: load('tic-tac-toe-losses'), draws: load('tic-tac-toe-draws'), cpuTimer: null };

function load(key) { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } }
function save(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* storage can be disabled */ } }
function updateScore() { winsElement.textContent = String(state.wins).padStart(2, '0'); winsInlineElement.textContent = state.wins; lossesElement.textContent = state.losses; drawsElement.textContent = String(state.draws).padStart(2, '0'); drawsInlineElement.textContent = state.draws; overlayBest.textContent = `WINS ${String(state.wins).padStart(2, '0')}`; }
function result(board) { for (const line of lines) { const [a, b, c] = line; if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line }; } return board.every(Boolean) ? { winner: 'draw', line: [] } : null; }
function makeBoard() { boardElement.innerHTML = ''; state.board.forEach((value, index) => { const cell = document.createElement('button'); cell.className = 'tic-cell'; cell.type = 'button'; cell.dataset.index = index; cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-label', `${index + 1}マス目`); cell.addEventListener('click', () => humanMove(index)); boardElement.append(cell); }); renderBoard(); }
function renderBoard() { Array.from(boardElement.children).forEach((cell, index) => { cell.textContent = state.board[index]; cell.disabled = state.mode !== 'playing' || Boolean(state.board[index]); }); }
function resetGame() { window.clearTimeout(state.cpuTimer); state.board = Array(9).fill(''); state.mode = 'playing'; makeBoard(); messageElement.textContent = 'あなたの番 — X'; updateScore(); overlay.classList.remove('is-visible'); }
function showOverlay(title, copy) { overlay.classList.add('is-visible'); overlayKicker.textContent = 'MATCH COMPLETE / CLASSIC 05'; overlayTitle.textContent = title; overlayCopy.innerHTML = copy; startButton.textContent = 'PLAY AGAIN  ↗'; }
function finish(winner) { state.mode = 'gameover'; renderBoard(); if (winner === 'X') { state.wins += 1; messageElement.textContent = 'あなたの勝ち！'; showOverlay('YOU WIN', 'きれいな一列。<br />もう一戦いかが？'); save('tic-tac-toe-wins', state.wins); } else if (winner === 'O') { state.losses += 1; messageElement.textContent = 'CPUの勝ち。'; showOverlay('CPU WINS', 'あと一手だったかも。<br />リベンジしよう。'); save('tic-tac-toe-losses', state.losses); } else { state.draws += 1; messageElement.textContent = '引き分け！'; showOverlay('DRAW', 'いい勝負。<br />次は先にそろえよう。'); save('tic-tac-toe-draws', state.draws); } updateScore(); }
function humanMove(index) { if (state.mode !== 'playing' || state.board[index]) return; state.board[index] = 'X'; renderBoard(); const outcome = result(state.board); if (outcome) { finish(outcome.winner); return; } state.mode = 'cpu'; messageElement.textContent = 'CPUが考え中…'; renderBoard(); state.cpuTimer = window.setTimeout(cpuMove, 420); }
function winningMove(mark) { for (let index = 0; index < 9; index += 1) { if (state.board[index]) continue; const test = [...state.board]; test[index] = mark; if (result(test)?.winner === mark) return index; } return -1; }
function cpuMove() { if (state.mode !== 'cpu') return; let choice = winningMove('O'); if (choice < 0) choice = winningMove('X'); if (choice < 0 && !state.board[4]) choice = 4; if (choice < 0) { const openCorners = [0, 2, 6, 8].filter((index) => !state.board[index]); choice = openCorners.length ? openCorners[Math.floor(Math.random() * openCorners.length)] : -1; } if (choice < 0) { const open = state.board.map((value, index) => value ? -1 : index).filter((index) => index >= 0); choice = open[Math.floor(Math.random() * open.length)]; } state.board[choice] = 'O'; state.mode = 'playing'; renderBoard(); const outcome = result(state.board); if (outcome) finish(outcome.winner); else messageElement.textContent = 'あなたの番 — X'; }
startButton.addEventListener('click', resetGame); makeBoard(); updateScore(); if (currentYear) currentYear.textContent = String(new Date().getFullYear());

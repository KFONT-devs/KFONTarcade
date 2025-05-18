const board = document.getElementById('game-board');
const statusDiv = document.getElementById('status');
const restartBtn = document.getElementById('restart');

let currentPlayer = 'X';
let gameActive = true;
let gameState = Array(9).fill("");
let winningPattern = null;

const winPatterns = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // cols
    [0,4,8], [2,4,6]           // diags
];

function renderBoard() {
    board.innerHTML = '';
    gameState.forEach((cell, idx) => {
        const cellDiv = document.createElement('div');
        cellDiv.classList.add('cell');
        cellDiv.dataset.index = idx;
        cellDiv.textContent = cell;
        if (winningPattern && winningPattern.includes(idx)) {
            cellDiv.classList.add('win-cell');
        }
        cellDiv.addEventListener('click', handleCellClick);
        board.appendChild(cellDiv);
    });
}

function handleCellClick(e) {
    const idx = e.target.dataset.index;
    if (!gameActive || gameState[idx] || currentPlayer !== 'X') return;
    gameState[idx] = currentPlayer;
    renderBoard();
    const win = checkWin();
    if (win) {
        winningPattern = win;
        renderBoard();
        statusDiv.textContent = `Player ${currentPlayer} wins!`;
        gameActive = false;
    } else if (gameState.every(cell => cell)) {
        statusDiv.textContent = "It's a draw!";
        gameActive = false;
    } else {
        currentPlayer = 'O';
        statusDiv.textContent = `Player O's turn`;
        setTimeout(botMove, 500); // Bot moves after short delay
    }
}

function botMove() {
    if (!gameActive) return;
    // 1. Try to win
    let move = findBestMove('O');
    // 2. Block player win
    if (move === -1) move = findBestMove('X');
    // 3. Take center
    if (move === -1 && gameState[4] === "") move = 4;
    // 4. Take a corner
    if (move === -1) {
        const corners = [0,2,6,8].filter(i => gameState[i] === "");
        if (corners.length) move = corners[Math.floor(Math.random()*corners.length)];
    }
    // 5. Take any available
    if (move === -1) move = gameState.findIndex(cell => cell === "");
    if (move === -1) return;
    gameState[move] = 'O';
    renderBoard();
    const win = checkWin();
    if (win) {
        winningPattern = win;
        renderBoard();
        statusDiv.textContent = `Player O wins!`;
        gameActive = false;
    } else if (gameState.every(cell => cell)) {
        statusDiv.textContent = "It's a draw!";
        gameActive = false;
    } else {
        currentPlayer = 'X';
        statusDiv.textContent = `Player X's turn`;
    }
}

function findBestMove(player) {
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        const cells = [gameState[a], gameState[b], gameState[c]];
        if (cells.filter(cell => cell === player).length === 2 && cells.includes("")) {
            return pattern[cells.indexOf("")];
        }
    }
    return -1;
}

function checkWin() {
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
            return pattern;
        }
    }
    return null;
}

function restartGame() {
    currentPlayer = 'X';
    gameActive = true;
    gameState = Array(9).fill("");
    winningPattern = null;
    statusDiv.textContent = `Player ${currentPlayer}'s turn`;
    renderBoard();
}

restartBtn.addEventListener('click', restartGame);

// Initial render
restartGame();

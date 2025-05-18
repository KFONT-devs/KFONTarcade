// This file contains the JavaScript functionality for the Minesweeper game.

let rows = 10;
let cols = 10;
let minesCount = 15; // Number of mines in the game
let board = []; // Game board
let revealedCount = 0; // Count of revealed cells
let gameOver = false; // Game over flag
let firstClick = true; // Track if it's the first click

// Initialize the game
function initGame() {
    gameOver = false;        // <-- Reset game over flag
    firstClick = true;       // <-- Reset first click flag
    revealedCount = 0;       // <-- Reset revealed count
    document.getElementById('win-message').style.display = 'none';
    document.getElementById('win-message').style.pointerEvents = 'none';
    document.getElementById('game-over-message').style.display = 'none';
    document.getElementById('game-over-message').style.pointerEvents = 'none';
    document.getElementById('game-board').classList.remove('blur');
    board = createBoard();
    placeMines();
    calculateNumbers();
    renderBoard();
}

// Create an empty game board
function createBoard() {
    const board = [];
    for (let r = 0; r < rows; r++) {
        board[r] = [];
        for (let c = 0; c < cols; c++) {
            board[r][c] = {
                isRevealed: false,
                isMine: false,
                neighborMines: 0,
                isFlagged: false // Add flag property
            };
        }
    }
    return board;
}

// Place mines randomly on the board
function placeMines() {
    let minesPlaced = 0;
    while (minesPlaced < minesCount) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (!board[r][c].isMine) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }
}

// Calculate the number of neighboring mines for each cell
function calculateNumbers() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].isMine) {
                continue;
            }
            board[r][c].neighborMines = countNeighborMines(r, c);
        }
    }
}

// Count mines around a specific cell
function countNeighborMines(row, col) {
    let count = 0;
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c].isMine) {
                count++;
            }
        }
    }
    return count;
}

// Render the game board
function renderBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    for (let r = 0; r < rows; r++) {
        const row = document.createElement('div');
        row.classList.add('row');
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleCellRightClick);

            // Touch support for flagging (long press)
            let touchTimer = null;
            cell.addEventListener('touchstart', function (e) {
                touchTimer = setTimeout(() => {
                    handleCellFlagTouch(e, r, c);
                }, 500); // 500ms for long press
            });
            cell.addEventListener('touchend', function () {
                clearTimeout(touchTimer);
            });
            cell.addEventListener('touchmove', function () {
                clearTimeout(touchTimer);
            });

            if (board[r][c].isRevealed) {
                cell.classList.add('revealed');
                if (board[r][c].isMine) {
                    cell.classList.add('mine');
                } else {
                    cell.textContent = board[r][c].neighborMines || '';
                }
            } else if (board[r][c].isFlagged) {
                cell.textContent = '🚩';
            }
            row.appendChild(cell);
        }
        gameBoard.appendChild(row);
    }
}

// Touch handler for flagging on long press
function handleCellFlagTouch(event, row, col) {
    event.preventDefault();
    if (gameOver) return;
    if (board[row][col].isRevealed) return;
    toggleFlag(row, col);
}

// Handle cell click events
function handleCellClick(event) {
    if (gameOver) return;
    const row = Number(event.target.dataset.row);
    const col = Number(event.target.dataset.col);

    // On first click, ensure the clicked cell is not a mine
    if (firstClick) {
        // If the first clicked cell is a mine, re-generate the board until it's not
        while (board[row][col].isMine) {
            board = createBoard();
            placeMines();
            calculateNumbers();
        }
        firstClick = false;
        renderBoard();
    }

    revealCell(row, col);
}

// Reveal a cell
function revealCell(row, col) {
    if (board[row][col].isRevealed || gameOver) return;
    board[row][col].isRevealed = true;
    revealedCount++;
    if (board[row][col].isMine) {
        gameOver = true;
        triggerGameOverAnimation();
    } else {
        if (board[row][col].neighborMines === 0) {
            revealNeighbors(row, col);
        }
    }
    renderBoard();
    checkWinCondition();
}

// Reveal neighboring cells
function revealNeighbors(row, col) {
    const queue = [[row, col]];

    while (queue.length > 0) {
        const [currentRow, currentCol] = queue.shift();

        for (let r = currentRow - 1; r <= currentRow + 1; r++) {
            for (let c = currentCol - 1; c <= currentCol + 1; c++) {
                if (r >= 0 && r < rows && c >= 0 && c < cols && !board[r][c].isRevealed) {
                    board[r][c].isRevealed = true;
                    revealedCount++;
                    if (board[r][c].neighborMines === 0) {
                        queue.push([r, c]);
                    }
                }
            }
        }
    }
}

// Check for win condition
function checkWinCondition() {
    if (revealedCount === rows * cols - minesCount) {
        gameOver = true;
        triggerWinAnimation();
    }
}

// Add this function at the end of your script.js
function triggerWinAnimation() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.classList.add('blur');
    setTimeout(() => {
        const winMsg = document.getElementById('win-message');
        winMsg.style.display = 'block';
        winMsg.style.pointerEvents = 'auto';
    }, 600);
}

// Toggle flag on a cell
function toggleFlag(row, col) {
    board[row][col].isFlagged = !board[row][col].isFlagged;
    renderBoard();
}

// Add right-click handler for flagging
function handleCellRightClick(event) {
    event.preventDefault();
    if (gameOver) return;
    const row = Number(event.target.dataset.row);
    const col = Number(event.target.dataset.col);

    if (board[row][col].isRevealed) return;

    toggleFlag(row, col);
}
// Add this new function at the end of your script.js
function triggerGameOverAnimation() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.classList.add('blur');
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, i) => {
        setTimeout(() => {
            cell.classList.add('fall');
        }, Math.random() * 400);
    });
    setTimeout(() => {
        const gameOverMsg = document.getElementById('game-over-message');
        gameOverMsg.style.display = 'block';
        gameOverMsg.style.pointerEvents = 'auto';
        const insertCoin = document.getElementById('insert-coin');
        if (insertCoin) {
            insertCoin.onclick = function () {
                gameOverMsg.style.display = 'none';
                gameOverMsg.style.pointerEvents = 'none';
                gameBoard.classList.remove('blur');
                firstClick = true;
                revealedCount = 0;
                gameOver = false;
                document.querySelectorAll('.cell.fall').forEach(cell => cell.classList.remove('fall'));
                initGame();
            };
        }
    }, 900);
}

function getSettingsAndStart() {
    const rowsInput = document.getElementById('rows-input');
    const colsInput = document.getElementById('cols-input');
    // Clamp rows and cols values between 5 and 30
    rows = parseInt(rowsInput.value, 10);
    cols = parseInt(colsInput.value, 10);

    if (isNaN(rows) || rows <= 0) {
        alert('Invalid input for rows. Setting to default value of 10.');
        rows = 10;
    }
    if (isNaN(cols) || cols <= 0) {
        alert('Invalid input for columns. Setting to default value of 10.');
        cols = 10;
    }

    rows = Math.max(5, Math.min(30, rows));
    cols = Math.max(5, Math.min(30, cols));

    // Provide feedback if the input is out of range
    if (rowsInput.value < 5 || rowsInput.value > 30) {
        alert('Rows must be between 5 and 30. Adjusting to the nearest valid value.');
    }
    if (colsInput.value < 5 || colsInput.value > 30) {
        alert('Columns must be between 5 and 30. Adjusting to the nearest valid value.');
    }
    cols = Math.max(5, Math.min(30, parseInt(colsInput.value, 10) || 10));
    // Limit mines to at most rows*cols-1
    const maxMines = rows * cols - 1;
    if (minesInput.value > maxMines) {
        alert(`Number of mines must be less than ${maxMines}. Adjusting to maximum allowed.`);
    }
    minesCount = Math.max(1, Math.min(maxMines, parseInt(minesInput.value, 10) || 10));
    minesInput.max = maxMines; // update max for user
    initGame();
}

// Listen for start button
document.getElementById('start-btn').addEventListener('click', getSettingsAndStart);

// Optionally, start a new game if settings are changed
['rows-input', 'cols-input', 'mines-input'].forEach(id => {
    document.getElementById(id).addEventListener('change', getSettingsAndStart);
});

// Initialize the game on page load
// Initialize the game on page load
window.addEventListener('DOMContentLoaded', () => {
    initGame();
    getSettingsAndStart();
});
// Set up PLAY AGAIN button once
window.addEventListener('DOMContentLoaded', () => {
    const playAgain = document.getElementById('play-again');
    if (playAgain) {
        playAgain.onclick = function() {
            document.getElementById('win-message').style.display = 'none';
            document.getElementById('game-board').classList.remove('blur');
            firstClick = true;
            revealedCount = 0;
            gameOver = false;
            initGame();
        };
    }
});
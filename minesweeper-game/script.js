// This file contains the JavaScript functionality for the Minesweeper game.

const rows = 10; // Number of rows in the game
const cols = 10; // Number of columns in the game
const minesCount = 15; // Number of mines in the game
let board = []; // Game board
let revealedCount = 0; // Count of revealed cells
let gameOver = false; // Game over flag
let firstClick = true; // Track if it's the first click

// Initialize the game
function initGame() {
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
            cell.addEventListener('contextmenu', handleCellRightClick); // Add right-click event
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
        alert('Game Over! You hit a mine.');
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
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < rows && c >= 0 && c < cols) {
                revealCell(r, c);
            }
        }
    }
}

// Check for win condition
function checkWinCondition() {
    if (revealedCount === rows * cols - minesCount) {
        alert('Congratulations! You won the game.');
        gameOver = true;
    }
}

// Add right-click handler for flagging
function handleCellRightClick(event) {
    event.preventDefault();
    if (gameOver) return;
    const row = Number(event.target.dataset.row);
    const col = Number(event.target.dataset.col);

    if (board[row][col].isRevealed) return;

    board[row][col].isFlagged = !board[row][col].isFlagged;
    renderBoard();
}

// Start the game
initGame();
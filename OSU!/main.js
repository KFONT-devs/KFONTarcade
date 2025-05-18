// main.js - osu! web game core logic

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const menu = document.getElementById('menu');
const music = document.getElementById('music');

// Game settings
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const HIT_CIRCLE_RADIUS = 50;
const HIT_WINDOW = 300; // ms

// Dummy beatmap template (used to reset the game)
const beatmapTemplate = [
    { time: 1000 },
    { time: 2000 },
    { time: 3000 },
    { time: 4000 },
    { time: 5000 }
];
let beatmap = [];

// --- Update beatmapTemplate to allow random number of circles (max 6) ---
function randomizeBeatmap() {
    // At least 100 circles, up to 120 for some randomness
    const numCircles = Math.floor(Math.random() * 21) + 100; // 100 to 120
    const interval = 1000; // 1 second between circles
    beatmap = [];
    let nextNumber = 1;
    for (let i = 0; i < numCircles; i++) {
        beatmap.push({
            time: 1000 + i * interval,
            x: Math.floor(Math.random() * (GAME_WIDTH - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS),
            y: Math.floor(Math.random() * (GAME_HEIGHT - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS),
            number: nextNumber
        });
        nextNumber++;
        if (nextNumber > 6) nextNumber = 1; // Loop back to 1 after 6
    }
}

let startTime = 0;
let currentIndex = 0;
let score = 0;
let running = false;

let combo = 0;
let maxCombo = 0;

function resizeCanvas() {
    // Responsive canvas
    const ratio = GAME_WIDTH / GAME_HEIGHT;
    let w = window.innerWidth * 0.98;
    let h = window.innerHeight * 0.7;
    if (w / h > ratio) w = h * ratio;
    else h = w / ratio;
    canvas.width = w;
    canvas.height = h;
}
window.addEventListener('resize', resizeCanvas);

function getApproach(dt) {
    // Approach circle shrinks linearly from 2.5x to 1x radius as dt goes from 2000ms to 0ms
    // At dt=0, approach=1 (outer meets inner)
    return Math.max(1, Math.min(2.5, 1 + (dt / 2000) * 1.5));
}

function drawCircle(circle, alpha = 1, approach = 1) {
    ctx.save();
    // Draw approach circle
    if (approach > 0.01) {
        ctx.beginPath();
        ctx.arc(
            circle.x * canvas.width / GAME_WIDTH,
            circle.y * canvas.height / GAME_HEIGHT,
            HIT_CIRCLE_RADIUS * approach * canvas.width / GAME_WIDTH,
            0, 2 * Math.PI
        );
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#66ccff';
        ctx.globalAlpha = 0.7 * approach;
        ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(circle.x * canvas.width / GAME_WIDTH, circle.y * canvas.height / GAME_HEIGHT, HIT_CIRCLE_RADIUS * canvas.width / GAME_WIDTH, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff66aa';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Draw number in the center
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(HIT_CIRCLE_RADIUS * canvas.width / GAME_WIDTH)}px Arial Black, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(circle.number, circle.x * canvas.width / GAME_WIDTH, circle.y * canvas.height / GAME_HEIGHT);

    ctx.restore();
}

// Update drawScore to also draw combo in the top left corner
function drawScore() {
    ctx.save();
    ctx.font = `${Math.floor(canvas.height/15)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);

    // Draw combo below score
    ctx.font = `${Math.floor(canvas.height/22)}px Arial`;
    ctx.fillStyle = '#ff0';
    ctx.fillText(`Combo: ${combo}`, 20, 75);
    ctx.restore();
}

function getNow() {
    // Use music time if music is loaded and playing, otherwise use performance.now() relative to startTime
    if (music.readyState >= 2 && !music.paused && music.duration > 0) {
        return music.currentTime * 1000;
    } else {
        return performance.now() - startTime;
    }
}

// Mouse state for hit circle interaction
const mouse = { x: 0, y: 0, down: false, up: false, move: false };
canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.down = true;
    mouse.up = false;
    mouse.move = false;
    handleHit(mouse.x, mouse.y); // Only handle normal hit circles
});
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.move = true;
});
canvas.addEventListener('mouseup', e => {
    mouse.up = true;
    mouse.down = false;
    mouse.move = false;
});

// --- Restore normal hit circle event handling ---
canvas.addEventListener('touchstart', e => {
    const rect = canvas.getBoundingClientRect();
    for (let touch of e.touches) {
        handleHit(touch.clientX - rect.left, touch.clientY - rect.top);
    }
});
canvas.addEventListener('touchmove', e => {
    const rect = canvas.getBoundingClientRect();
    for (let touch of e.touches) {
    }
});
canvas.addEventListener('touchend', e => {
    const rect = canvas.getBoundingClientRect();
    for (let touch of e.changedTouches) {
    }
});

// On game start, randomize only normal circles and play music
startBtn.onclick = () => {
    menu.style.display = 'none';
    canvas.style.display = '';
    resizeCanvas();
    score = 0;
    currentIndex = 0;
    running = true;
    startTime = performance.now();
    randomizeBeatmap();
    music.currentTime = 0;
    music.play(); // Start the song
    requestAnimationFrame(gameLoop);
};

// Update gameLoop to use showScoreboard
function gameLoop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawScore();
    const now = getNow();
    let foundActive = false;
    // Draw normal hit circles only
    for (let i = currentIndex; i < beatmap.length; i++) {
        const obj = beatmap[i];
        const dt = obj.time - now;
        if (dt < -HIT_WINDOW) {
            currentIndex++;
            combo = 0; // Reset combo on miss
            continue;
        }
        if (dt > 2000) break;
        let alpha = 1 - Math.abs(dt) / 2000;
        let approach = getApproach(dt);
        drawCircle(obj, alpha, approach);
        foundActive = true;
    }
    if (currentIndex >= beatmap.length || !foundActive) {
        running = false;
        music.pause(); // Stop the song when game ends
        setTimeout(() => {
            showScoreboard();
        }, 100);
        return;
    }
    requestAnimationFrame(gameLoop);
}

// Initial setup
resizeCanvas();
window.addEventListener('DOMContentLoaded', () => {
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function () {
            music.volume = parseFloat(this.value);
        });
        music.volume = parseFloat(volumeSlider.value);
    }
});

// Update handleHit to manage combo
function handleHit(x, y) {
    if (!running) return;
    const now = getNow();
    const obj = beatmap[currentIndex];
    if (!obj) return;
    const dt = obj.time - now;
    let approach = getApproach(dt);
    // Only allow hit when approach circle is visually at the same radius as the inner circle
    if (Math.abs(approach - 1) < 0.12) { // Allow a small margin for user error
        const cx = obj.x * canvas.width / GAME_WIDTH;
        const cy = obj.y * canvas.height / GAME_HEIGHT;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < HIT_CIRCLE_RADIUS * canvas.width / GAME_WIDTH) {
            score += 300 - Math.floor(Math.abs(dt));
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            beatmap.splice(currentIndex, 1);
        } else {
            combo = 0;
        }
    } else {
        combo = 0;
    }
}

// Show scoreboard at the end
function showScoreboard() {
    // Create or update a scoreboard div
    let scoreboard = document.getElementById('scoreboard');
    if (!scoreboard) {
        scoreboard = document.createElement('div');
        scoreboard.id = 'scoreboard';
        scoreboard.style.position = 'fixed';
        scoreboard.style.top = '50%';
        scoreboard.style.left = '50%';
        scoreboard.style.transform = 'translate(-50%, -50%)';
        scoreboard.style.background = 'rgba(0,0,0,0.85)';
        scoreboard.style.color = '#fff';
        scoreboard.style.padding = '40px 60px';
        scoreboard.style.borderRadius = '20px';
        scoreboard.style.fontSize = '2em';
        scoreboard.style.zIndex = 1000;
        scoreboard.style.textAlign = 'center';
        document.body.appendChild(scoreboard);
    }
    scoreboard.innerHTML = `
        <div>Game Over!</div>
        <div style="margin-top:20px;">Score: <b>${score}</b></div>
        <div>Max Combo: <b>${maxCombo}</b></div>
        <button id="closeScoreboard" style="margin-top:30px;font-size:1em;padding:10px 30px;">Close</button>
    `;
    scoreboard.style.display = '';
    document.getElementById('closeScoreboard').onclick = () => {
        scoreboard.style.display = 'none';
        menu.style.display = '';
        canvas.style.display = 'none';
    };
}

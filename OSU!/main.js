// main.js - osu! web game core logic

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const menu = document.getElementById('menu');
const music = document.getElementById('music');

// Game settings
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const HIT_CIRCLE_RADIUS = 70; // or any value larger than before (default is usually 40-48)
const HIT_WINDOW = 300; // ms

const PLAY_WIDTH = GAME_WIDTH;
const PLAY_HEIGHT = GAME_HEIGHT;

// Dummy beatmap template (used to reset the game)
const beatmapTemplate = [
    { time: 1000 },
    { time: 2000 },
    { time: 3000 },
    { time: 4000 },
    { time: 5000 }
];
let beatmap = [];

// Add song and BPM selection UI
let selectedSong = '';
let selectedBPM = 160;

// Update availableSongs to use real assets
const availableSongs = [
    { name: "Amerie - 1 thing (piano)", file: "assets/Amerie - 1 thing (piano).mp3" },
    { name: "Nightcore - Angel With A Shotgun", file: "assets/Nightcore - Angel With A Shotgun.mp3" }
];

// Add song and BPM selection to menu
function showSongAndBPMSelection() {
    // Remove old selection UI if exists
    let old = document.getElementById('songBpmSelect');
    if (old) old.remove();

    const selDiv = document.createElement('div');
    selDiv.id = 'songBpmSelect';
    selDiv.style.position = 'fixed';
    selDiv.style.top = '50%';
    selDiv.style.left = '50%';
    selDiv.style.transform = 'translate(-50%, -50%)';
    selDiv.style.background = 'rgba(0,0,0,0.92)';
    selDiv.style.color = '#fff';
    selDiv.style.padding = '40px 60px';
    selDiv.style.borderRadius = '20px';
    selDiv.style.fontSize = '1.5em';
    selDiv.style.zIndex = 3000;
    selDiv.style.textAlign = 'center';

    // Song select
    let songOptions = availableSongs.map(
        (s, i) => `<option value="${s.file}">${s.name}</option>`
    ).join('');
    selDiv.innerHTML = `
        <div style="margin-bottom:20px;">Select Song</div>
        <select id="songSelect" style="font-size:1em;padding:5px 20px;margin-bottom:20px;">${songOptions}</select>
        <div style="margin:20px 0 10px 0;">Select BPM (Difficulty)</div>
        <div id="bpmStars" style="margin-bottom:20px;">
            <span class="star" data-bpm="160" style="font-size:2em;cursor:pointer;color:gold;">★</span>
            <span class="star" data-bpm="170" style="font-size:2em;cursor:pointer;color:gray;">★</span>
            <span class="star" data-bpm="180" style="font-size:2em;cursor:pointer;color:gray;">★</span>
            <span class="star" data-bpm="190" style="font-size:2em;cursor:pointer;color:gray;">★</span>
            <span class="star" data-bpm="200" style="font-size:2em;cursor:pointer;color:gray;">★</span>
        </div>
        <button id="confirmSongBpm" style="font-size:1em;padding:10px 30px;margin-top:10px;">Start Game</button>
    `;
    document.body.appendChild(selDiv);

    // Star click logic
    const stars = selDiv.querySelectorAll('.star');
    stars.forEach((star, idx) => {
        star.onclick = () => {
            selectedBPM = parseInt(star.getAttribute('data-bpm'));
            stars.forEach((s, i) => {
                s.style.color = i <= idx ? 'gold' : 'gray';
            });
        };
    });

    // Song select logic
    const songSelect = selDiv.querySelector('#songSelect');
    selectedSong = songSelect.value;
    songSelect.onchange = () => {
        selectedSong = songSelect.value;
    };

    // Confirm button
    selDiv.querySelector('#confirmSongBpm').onclick = () => {
        document.body.removeChild(selDiv);
        startGameWithSelection();
    };
}

// --- Beat count is now based on song length and BPM ---
function randomizeBeatmap() {
    // Estimate song duration (in seconds) after music.src is set
    let duration = music.duration && !isNaN(music.duration) ? music.duration : 120; // fallback 120s

    // Calculate number of beats: beats = duration (seconds) * BPM / 60
    const beats = Math.floor(duration * selectedBPM / 60);

    // Interval between beats in ms
    const interval = Math.round(60000 / selectedBPM);

    beatmap = [];
    let nextNumber = 1;
    let lastPositions = [];

    for (let i = 0; i < beats; i++) {
        let x, y, valid;
        let attempts = 0;
        do {
            valid = true;
            x = Math.floor(Math.random() * (GAME_WIDTH - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS);
            y = Math.floor(Math.random() * (GAME_HEIGHT - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS);

            // Don't overlap with last 4 beats
            for (let pos of lastPositions) {
                const dist = Math.hypot(x - pos.x, y - pos.y);
                if (dist < HIT_CIRCLE_RADIUS * 2.2) {
                    valid = false;
                    break;
                }
            }

            // Don't spawn on the line between any two of the last 4 beats
            if (valid && lastPositions.length >= 2) {
                for (let j = 0; j < lastPositions.length - 1; j++) {
                    const a = lastPositions[j];
                    const b = lastPositions[j + 1];
                    // Distance from (x, y) to line segment ab
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const lengthSq = dx * dx + dy * dy;
                    let t = 0;
                    if (lengthSq > 0) {
                        t = ((x - a.x) * dx + (y - a.y) * dy) / lengthSq;
                        t = Math.max(0, Math.min(1, t));
                    }
                    const projX = a.x + t * dx;
                    const projY = a.y + t * dy;
                    const distToLine = Math.hypot(x - projX, y - projY);
                    if (distToLine < HIT_CIRCLE_RADIUS * 1.5) { // 1.5x radius buffer from line
                        valid = false;
                        break;
                    }
                }
            }

            // Don't allow new line to overlap any previous line (simple intersection check)
            if (valid && lastPositions.length >= 2) {
                const newA = lastPositions[lastPositions.length - 1];
                const newB = { x, y };
                for (let j = 0; j < lastPositions.length - 2; j++) {
                    const oldA = lastPositions[j];
                    const oldB = lastPositions[j + 1];
                    if (linesIntersect(newA, newB, oldA, oldB)) {
                        valid = false;
                        break;
                    }
                }
            }

            // Don't allow new beat to be too close to any previous line (avoid overlap with lines)
            if (valid && lastPositions.length >= 2) {
                for (let j = 0; j < lastPositions.length - 1; j++) {
                    const a = lastPositions[j];
                    const b = lastPositions[j + 1];
                    // Distance from (x, y) to line segment ab
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const lengthSq = dx * dx + dy * dy;
                    let t = 0;
                    if (lengthSq > 0) {
                        t = ((x - a.x) * dx + (y - a.y) * dy) / lengthSq;
                        t = Math.max(0, Math.min(1, t));
                    }
                    const projX = a.x + t * dx;
                    const projY = a.y + t * dy;
                    const distToLine = Math.hypot(x - projX, y - projY);
                    if (distToLine < HIT_CIRCLE_RADIUS * 1.5) { // 1.5x radius buffer from line
                        valid = false;
                        break;
                    }
                }
            }

            attempts++;
            if (attempts > 200) break; // Prevent infinite loop
        } while (!valid);

        beatmap.push({
            time: 1000 + i * interval,
            x,
            y,
            number: nextNumber
        });

        lastPositions.push({ x, y });
        if (lastPositions.length > 4) lastPositions.shift();

        nextNumber++;
        if (nextNumber > 6) nextNumber = 1;
    }
}

// Helper function to check if two line segments intersect
function linesIntersect(a, b, c, d) {
    // Returns true if line ab and cd intersect
    function ccw(p1, p2, p3) {
        return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    }
    return (
        ccw(a, c, d) !== ccw(b, c, d) &&
        ccw(a, b, c) !== ccw(a, b, d)
    );
}

let startTime = 0;
let currentIndex = 0;
let score = 0;
let running = false;

let combo = 0;
let maxCombo = 0;

// Add a variable to store miss feedback
let missFeedback = { show: false, x: 0, y: 0, time: 0 };

// Add a variable to store hit feedback
let hitFeedback = { show: false, x: 0, y: 0, time: 0, text: '', color: '#fff' };

function getApproach(dt) {
    // Approach circle shrinks linearly from 2.5x to 1x radius as dt goes from 2000ms to 0ms
    // At dt=0, approach=1 (outer meets inner)
    return Math.max(1, Math.min(2.5, 1 + (dt / 2000) * 1.5));
}

// Helper to get offset for centering the play area
function getPlayAreaOffset() {
    return {
        x: Math.floor((canvas.width - PLAY_WIDTH) / 2),
        y: Math.floor((canvas.height - PLAY_HEIGHT) / 2)
    };
}

// Example: update drawCircle to use offset
function drawCircle(circle, alpha = 1, approach = 1) {
    const { x: offsetX, y: offsetY } = getPlayAreaOffset();
    ctx.save();
    // Draw approach circle
    if (approach > 0.01) {
        ctx.beginPath();
        ctx.arc(
            offsetX + circle.x,
            offsetY + circle.y,
            HIT_CIRCLE_RADIUS * approach,
            0, 2 * Math.PI
        );
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#66ccff';
        ctx.globalAlpha = 0.7 * approach;
        ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(offsetX + circle.x, offsetY + circle.y, HIT_CIRCLE_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff66aa';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Draw number in the center
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(HIT_CIRCLE_RADIUS)}px Arial Black, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(circle.number, offsetX + circle.x, offsetY + circle.y);

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

// --- Wait for music metadata before starting game ---
function startGameWithSelection() {
    menu.style.display = 'none';
    canvas.style.display = '';
    resizeCanvas();
    score = 0;
    currentIndex = 0;
    running = true;
    startTime = performance.now();
    music.src = selectedSong;
    music.currentTime = 0;

    // Wait for duration to be loaded before generating beatmap
    if (isNaN(music.duration) || music.duration === 0) {
        music.onloadedmetadata = () => {
            randomizeBeatmap();
            music.play();
            requestAnimationFrame(gameLoop);
        };
        // In case metadata never loads, fallback after 1s
        setTimeout(() => {
            if (!beatmap.length) {
                randomizeBeatmap();
                music.play();
                requestAnimationFrame(gameLoop);
            }
        }, 1000);
    } else {
        randomizeBeatmap();
        music.play();
        requestAnimationFrame(gameLoop);
    }
}

// Change startBtn.onclick to show song/BPM selection
startBtn.onclick = () => {
    showSongAndBPMSelection();
};

// Pause menu logic
let paused = false;
let pauseMenu = null;

function showPauseMenu() {
    if (!pauseMenu) {
        pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.style.position = 'fixed';
        pauseMenu.style.top = '50%';
        pauseMenu.style.left = '50%';
        pauseMenu.style.transform = 'translate(-50%, -50%)';
        pauseMenu.style.background = 'rgba(0,0,0,0.9)';
        pauseMenu.style.color = '#fff';
        pauseMenu.style.padding = '40px 60px';
        pauseMenu.style.borderRadius = '20px';
        pauseMenu.style.fontSize = '2em';
        pauseMenu.style.zIndex = 2000;
        pauseMenu.style.textAlign = 'center';
        pauseMenu.innerHTML = `
            <div style="margin-bottom:30px;">Paused</div>
            <button id="pauseContinue" style="font-size:1em;padding:10px 30px;margin:10px;">Continue</button><br>
            <button id="pauseRestart" style="font-size:1em;padding:10px 30px;margin:10px;">Restart</button><br>
            <button id="pauseExit" style="font-size:1em;padding:10px 30px;margin:10px;">Exit</button>
        `;
        document.body.appendChild(pauseMenu);
    }
    pauseMenu.style.display = '';
    paused = true;
    music.pause();

    document.getElementById('pauseContinue').onclick = () => {
        pauseMenu.style.display = 'none';
        paused = false;
        if (running) {
            music.play();
            requestAnimationFrame(gameLoop);
        }
    };
    document.getElementById('pauseRestart').onclick = () => {
        pauseMenu.style.display = 'none';
        paused = false;
        // Restart game logic
        score = 0;
        combo = 0;
        maxCombo = 0;
        currentIndex = 0;
        running = true;
        startTime = performance.now();
        randomizeBeatmap();
        music.currentTime = 0;
        music.play();
        requestAnimationFrame(gameLoop);
    };
    document.getElementById('pauseExit').onclick = () => {
        pauseMenu.style.display = 'none';
        paused = false;
        running = false;
        music.pause();
        menu.style.display = '';
        canvas.style.display = 'none';
    };
}

// Listen for ESC key to pause
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && running && !paused) {
        showPauseMenu();
    }
});

// Add this function after drawMissFeedback or near your draw functions

function drawBeatLines() {
    // Draw lines between visible beats in order (1→2→3→4→5→6→1→...)
    const now = getNow();
    let beatsOnScreen = [];
    // Collect up to 4 visible beats (same as gameLoop)
    for (let i = currentIndex, count = 0; i < beatmap.length && count < 4; i++) {
        const obj = beatmap[i];
        const dt = obj.time - now;
        if (dt < -HIT_WINDOW) continue;
        if (dt > 2000) break;
        beatsOnScreen.push(obj);
        count++;
    }
    // Draw lines between consecutive beats
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,180,0.5)';
    ctx.lineWidth = 4;
    const { x: offsetX, y: offsetY } = getPlayAreaOffset();
    for (let i = 0; i < beatsOnScreen.length - 1; i++) {
        const a = beatsOnScreen[i];
        const b = beatsOnScreen[i + 1];
        ctx.beginPath();
        ctx.moveTo(
            offsetX + a.x,
            offsetY + a.y
        );
        ctx.lineTo(
            offsetX + b.x,
            offsetY + b.y
        );
        ctx.stroke();
    }
    ctx.restore();
}

// --- In gameLoop, call drawBeatLines before drawing circles ---
function gameLoop() {
    if (!running || paused) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawScore();
    drawMissFeedback();
    drawHitFeedback();
    drawBeatLines(); // <-- Add this line
    const now = getNow();
    let foundActive = false;
    // Limit to only 4 beats on screen at the same time
    let beatsOnScreen = 0;
    for (let i = currentIndex; i < beatmap.length; i++) {
        if (beatsOnScreen >= 4) break;
        const obj = beatmap[i];
        const dt = obj.time - now;
        if (dt < -HIT_WINDOW) {
            // Missed by time out: show feedback and skip to next beat
            const { x: offsetX, y: offsetY } = getPlayAreaOffset();
            const cx = offsetX + obj.x;
            const cy = offsetY + obj.y;
            missFeedback = {
                show: true,
                x: cx,
                y: cy,
                time: performance.now()
            };
            currentIndex++;
            combo = 0;
            continue;
        }
        if (dt > 2000) break;
        let alpha = 1 - Math.abs(dt) / 2000;
        let approach = getApproach(dt);
        drawCircle(obj, alpha, approach);
        foundActive = true;
        beatsOnScreen++;
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

// Update handleHit to manage combo and show miss feedback
function handleHit(x, y) {
    if (!running) return;
    const now = getNow();
    const obj = beatmap[currentIndex];
    if (!obj) return;
    const { x: offsetX, y: offsetY } = getPlayAreaOffset();
    const cx = offsetX + obj.x;
    const cy = offsetY + obj.y;
    const dt = obj.time - now;
    const dist = Math.hypot(x - cx, y - cy);

    // Only allow hit if within hit window and inside the circle
    if (Math.abs(dt) <= HIT_WINDOW && dist < HIT_CIRCLE_RADIUS * canvas.width / GAME_WIDTH) {
        // Make the timing windows for 50/150/300 easier
        let absDt = Math.abs(dt);
        let scoreText = '';
        let scoreColor = '';
        let addScore = 0;
        if (absDt <= 100) { // was 50
            scoreText = '300';
            scoreColor = '#00eaff';
            addScore = 300;
        } else if (absDt <= 180) { // was 100
            scoreText = '150';
            scoreColor = '#66ff66';
            addScore = 150;
        } else if (absDt <= 300) { // was 200
            scoreText = '50';
            scoreColor = '#ffe066';
            addScore = 50;
        } else {
            scoreText = 'MISS';
            scoreColor = '#ff4444';
            addScore = 0;
        }
        if (scoreText === 'MISS') {
            combo = 0;
        } else {
            combo++;
            if (combo > maxCombo) maxCombo = combo;
        }
        score += addScore;
        hitFeedback = {
            show: true,
            x: cx,
            y: cy,
            time: performance.now(),
            text: scoreText,
            color: scoreColor
        };
        beatmap.splice(currentIndex, 1);
    } else {
        // Miss: show feedback and skip to next beat
        missFeedback = {
            show: true,
            x: cx,
            y: cy,
            time: performance.now()
        };
        combo = 0;
        currentIndex++;
    }
}

// Draw miss feedback in gameLoop
function drawMissFeedback() {
    if (missFeedback.show) {
        const elapsed = performance.now() - missFeedback.time;
        if (elapsed < 600) {
            ctx.save();
            ctx.globalAlpha = 1 - (elapsed / 600);
            ctx.font = `${Math.floor(canvas.height/12)}px Arial Black, Arial, sans-serif`;
            ctx.fillStyle = '#ff4444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('MISS', missFeedback.x, missFeedback.y);
            ctx.restore();
        } else {
            missFeedback.show = false;
        }
    }
}

// Draw hit feedback in gameLoop
function drawHitFeedback() {
    if (hitFeedback.show) {
        const elapsed = performance.now() - hitFeedback.time;
        if (elapsed < 600) {
            ctx.save();
            ctx.globalAlpha = 1 - (elapsed / 600);
            ctx.font = `${Math.floor(canvas.height/12)}px Arial Black, Arial, sans-serif`;
            ctx.fillStyle = hitFeedback.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hitFeedback.text, hitFeedback.x, hitFeedback.y);
            ctx.restore();
        } else {
            hitFeedback.show = false;
        }
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

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

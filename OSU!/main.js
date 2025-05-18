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

function randomizeBeatmap() {
    // Randomly assign x, y for each hit object
    beatmap = beatmapTemplate.map(obj => ({
        time: obj.time,
        x: Math.floor(Math.random() * (GAME_WIDTH - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS),
        y: Math.floor(Math.random() * (GAME_HEIGHT - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS)
    }));
}

let startTime = 0;
let currentIndex = 0;
let score = 0;
let running = false;

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
    ctx.restore();
}

function drawScore() {
    ctx.save();
    ctx.font = `${Math.floor(canvas.height/15)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
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

// --- NEW SLIDER CLASS IMPLEMENTATION ---
class Slider {
    constructor(startTime, duration, start, end) {
        this.startTime = startTime;
        this.endTime = startTime + duration;
        this.start = start;
        this.end = end;
        this.held = false;
        this.completed = false;
        this.holdStart = null;
    }

    update(now, mouse) {
        // Handle slider state (held, completed) based on mouse
        if (this.completed || now < this.startTime || now > this.endTime) return;
        if (mouse.down && !this.held) {
            // Check if mouse is on start circle
            const cx = this.start.x * canvas.width / GAME_WIDTH;
            const cy = this.start.y * canvas.height / GAME_HEIGHT;
            const dist = Math.hypot(mouse.x - cx, mouse.y - cy);
            if (dist < HIT_CIRCLE_RADIUS * canvas.width / GAME_WIDTH) {
                this.held = true;
                this.holdStart = now;
            }
        }
        if (this.held && mouse.move) {
            // Check if mouse is following the slider ball
            const t = (now - this.startTime) / (this.endTime - this.startTime);
            const bx = this.start.x + (this.end.x - this.start.x) * t;
            const by = this.start.y + (this.end.y - this.start.y) * t;
            const cx = mouse.x / canvas.width * GAME_WIDTH;
            const cy = mouse.y / canvas.height * GAME_HEIGHT;
            const dist = Math.hypot(cx - bx, cy - by);
            if (dist > HIT_CIRCLE_RADIUS * 1.2) {
                this.held = false;
            }
        }
        if (this.held && mouse.up) {
            // Check if released at end
            if (now >= this.endTime - 200 && now <= this.endTime + 200) {
                const ex = this.end.x * canvas.width / GAME_WIDTH;
                const ey = this.end.y * canvas.height / GAME_HEIGHT;
                const dist = Math.hypot(mouse.x - ex, mouse.y - ey);
                if (dist < HIT_CIRCLE_RADIUS * canvas.width / GAME_WIDTH) {
                    this.completed = true;
                    this.held = false;
                    score += 300;
                }
            } else {
                this.held = false;
            }
        }
    }

    draw(ctx, now) {
        if (now < this.startTime - 1000 || now > this.endTime + 200) return;
        // Approach circle
        if (now < this.startTime) {
            let approach = Math.max(1, 2.5 - (this.startTime - now) / 800);
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.start.x * canvas.width / GAME_WIDTH, this.start.y * canvas.height / GAME_HEIGHT, HIT_CIRCLE_RADIUS * approach * canvas.width / GAME_WIDTH, 0, 2 * Math.PI);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#66ccff';
            ctx.globalAlpha = 0.7 * approach;
            ctx.stroke();
            ctx.restore();
        }
        // Start circle (always visible)
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(this.start.x * canvas.width / GAME_WIDTH, this.start.y * canvas.height / GAME_HEIGHT, HIT_CIRCLE_RADIUS * canvas.width / GAME_WIDTH, 0, 2 * Math.PI);
        ctx.fillStyle = this.held && now >= this.startTime && now <= this.endTime ? '#66ff66' : '#ff66aa';
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.restore();
        // Slider line and end circle while active
        if (!this.completed && now >= this.startTime && now <= this.endTime) {
            // Slider line
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = this.held ? '#00cc88' : '#66ccff';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(this.start.x * canvas.width / GAME_WIDTH, this.start.y * canvas.height / GAME_HEIGHT);
            ctx.lineTo(this.end.x * canvas.width / GAME_WIDTH, this.end.y * canvas.height / GAME_HEIGHT);
            ctx.stroke();
            ctx.restore();
            // End circle
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(this.end.x * canvas.width / GAME_WIDTH, this.end.y * canvas.height / GAME_HEIGHT, HIT_CIRCLE_RADIUS * canvas.width / GAME_WIDTH, 0, 2 * Math.PI);
            ctx.fillStyle = '#3388ff';
            ctx.fill();
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
            ctx.restore();
            // Moving slider ball
            // FIX: Ball should move from start to end, not just keep going out
            let t = (now - this.startTime) / (this.endTime - this.startTime);
            t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
            if (this.held && now >= this.startTime && now <= this.endTime) {
                const bx = this.start.x + (this.end.x - this.start.x) * t;
                const by = this.start.y + (this.end.y - this.start.y) * t;
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(bx * canvas.width / GAME_WIDTH, by * canvas.height / GAME_HEIGHT, HIT_CIRCLE_RADIUS * 0.7 * canvas.width / GAME_WIDTH, 0, 2 * Math.PI);
                ctx.fillStyle = '#fff700';
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ff8800';
                ctx.stroke();
                ctx.restore();
            }
        }
    }
}

// Replace old sliderNotes with Slider objects
let sliderNotes = [];

function randomizeSliderNotes(count = 1, speed = 2000) {
    sliderNotes = [];
    let lastEnd = 1500;
    for (let i = 0; i < count; i++) {
        const delay = 400 + Math.floor(Math.random() * 500);
        const t = lastEnd + delay;
        const start = {
            x: Math.floor(Math.random() * (GAME_WIDTH - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS),
            y: Math.floor(Math.random() * (GAME_HEIGHT - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS)
        };
        let end;
        do {
            end = {
                x: Math.floor(Math.random() * (GAME_WIDTH - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS),
                y: Math.floor(Math.random() * (GAME_HEIGHT - 2 * HIT_CIRCLE_RADIUS) + HIT_CIRCLE_RADIUS)
            };
        } while (Math.hypot(end.x - start.x, end.y - start.y) < 200);
        sliderNotes.push(new Slider(t, speed, start, end));
        lastEnd = t + speed;
    }
}

// Mouse state for slider interaction
const mouse = { x: 0, y: 0, down: false, up: false, move: false };
canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.down = true;
    mouse.up = false;
    mouse.move = false;
});
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.move = true;
});
canvas.addEventListener('mouseup', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.up = true;
    mouse.down = false;
    mouse.move = false;
});

// --- Restore normal hit circle event handling ---
canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    handleHit(e.clientX - rect.left, e.clientY - rect.top);
});

function gameLoop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawScore();
    const now = getNow();
    let foundActive = false;
    // Draw slider notes
    if (sliderNotes.length > 0) {
        drawSliderNotes(now);
        for (let i = 0; i < sliderNotes.length; i++) {
            const note = sliderNotes[i];
            if (note.completed) continue;
            if (now > note.endTime + 200) continue;
            foundActive = true;
        }
    }
    // Draw normal hit circles
    for (let i = currentIndex; i < beatmap.length; i++) {
        const obj = beatmap[i];
        const dt = obj.time - now;
        if (dt < -HIT_WINDOW) {
            currentIndex++;
            continue;
        }
        if (dt > 2000) break;
        let alpha = 1 - Math.abs(dt) / 2000;
        let approach = getApproach(dt);
        drawCircle(obj, alpha, approach);
        foundActive = true;
    }
    if ((currentIndex >= beatmap.length && sliderNotes.every(n => n.completed)) || !foundActive) {
        running = false;
        music.pause();
        setTimeout(() => {
            menu.style.display = '';
            canvas.style.display = 'none';
            alert(`Game Over! Your score: ${score}`);
        }, 100);
        return;
    }
    requestAnimationFrame(gameLoop);
}

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
            beatmap.splice(currentIndex, 1);
        }
    }
}

// Remove duplicate/old slider event handlers
// Only use the new Slider class and mouse state for slider interaction
// Remove these lines:
// canvas.addEventListener('mousedown', ... handleSliderDown ...);
// canvas.addEventListener('mousemove', ... handleSliderMove ...);
// canvas.addEventListener('mouseup', ... handleSliderUp ...);
// canvas.addEventListener('touchstart', ... handleSliderDown ...);
// canvas.addEventListener('touchmove', ... handleSliderMove ...);
// canvas.addEventListener('touchend', ... handleSliderUp ...);

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

// On game start, randomize both normal circles and slider notes
startBtn.onclick = () => {
    menu.style.display = 'none';
    canvas.style.display = '';
    resizeCanvas();
    score = 0;
    currentIndex = 0;
    running = true;
    startTime = performance.now();
    music.currentTime = 0;
    randomizeBeatmap();
    randomizeSliderNotes(2, 2000); // You can adjust number and speed here
    requestAnimationFrame(gameLoop);
};

// Initial setup
resizeCanvas();
window.addEventListener('DOMContentLoaded', () => {
    setupSliderConfigUI();
});

function drawSliderNotes(now) {
    for (const slider of sliderNotes) {
        slider.update(now, mouse);
        slider.draw(ctx, now);
    }
    // Reset mouse up/move after processing
    mouse.up = false;
    mouse.move = false;
}

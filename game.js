class Game {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        // DOM elements
        this.scoreEl = document.getElementById("score");
        this.highScoreEl = document.getElementById("highScore");
        this.overlay = document.getElementById("gameOverlay");
        this.overlayTitle = document.getElementById("overlayTitle");
        this.overlayMessage = document.getElementById("overlayMessage");
        this.overlayBtn = document.getElementById("overlayBtn");
        this.diffBtns = {
            easy: document.getElementById("diffEasy"),
            normal: document.getElementById("diffNormal"),
            hard: document.getElementById("diffHard"),
        };

        // Difficulty settings: ms per tick
        this.difficultySpeeds = { easy: 200, normal: 130, hard: 80 };
        this.difficulty = "normal";
        this.gameSpeed = this.difficultySpeeds[this.difficulty];

        // Constants
        this.gridWidth = 20;
        this.gridHeight = 20;
        this.cellSize = 30;

        // Set actual canvas resolution
        this.canvas.width = this.gridWidth * this.cellSize;
        this.canvas.height = this.gridHeight * this.cellSize;

        // Bind keyboard
        document.addEventListener("keydown", (e) => this.handleKeydown(e));

        // Bind touch / click on canvas for mobile
        this.canvas.addEventListener("touchstart", (e) => this.handleTouch(e), { passive: false });
        this.canvas.addEventListener("click", (e) => this.handleTouch(e));

        // Bind overlay button
        this.overlayBtn.addEventListener("click", () => this.start());

        // Bind difficulty buttons
        this.diffBtns.easy.addEventListener("click", () => this.setDifficulty("easy"));
        this.diffBtns.normal.addEventListener("click", () => this.setDifficulty("normal"));
        this.diffBtns.hard.addEventListener("click", () => this.setDifficulty("hard"));

        // Load high score
        this.highScore = parseInt(localStorage.getItem("snakeHighScore")) || 0;
        this.highScoreEl.textContent = this.highScore;

        // Show initial overlay
        this.showInitialOverlay();
        this.init();
        this.draw();
    }

    setDifficulty(level) {
        this.difficulty = level;
        this.gameSpeed = this.difficultySpeeds[level];

        // Update active button styling
        for (const [key, btn] of Object.entries(this.diffBtns)) {
            btn.classList.toggle("active", key === level);
        }
    }

    showInitialOverlay() {
        this.overlayTitle.textContent = "贪吃蛇";
        this.overlayMessage.textContent = "选择难度，开始游戏";
        this.overlayBtn.textContent = "开始游戏";
        this.overlay.classList.remove("hidden");
    }

    init() {
        const midX = Math.floor(this.gridWidth / 2);
        const midY = Math.floor(this.gridHeight / 2);
        this.snake = [
            { x: midX, y: midY },
            { x: midX - 1, y: midY },
            { x: midX - 2, y: midY },
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.score = 0;
        this.isRunning = false;
        this.isGameOver = false;
        this.animationId = null;
        this.lastUpdateTime = 0;

        this.scoreEl.textContent = "0";
        this.spawnFood();
    }

    start() {
        this.init();
        this.gameSpeed = this.difficultySpeeds[this.difficulty];
        this.isRunning = true;
        this.isGameOver = false;
        this.overlay.classList.add("hidden");
        this.lastUpdateTime = performance.now();
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
        this.draw();
    }

    stop() {
        this.isRunning = false;
        this.isGameOver = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Save high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem("snakeHighScore", this.highScore);
            this.highScoreEl.textContent = this.highScore;
        }

        // Show game-over overlay (difficulty selector stays visible)
        this.overlayTitle.textContent = "游戏结束";
        this.overlayMessage.textContent = `得分: ${this.score}`;
        this.overlayBtn.textContent = "重新开始";
        this.overlay.classList.remove("hidden");
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));

        const delta = Math.min(timestamp - this.lastUpdateTime, 500);
        if (delta < this.gameSpeed) return;

        this.lastUpdateTime = timestamp - (delta % this.gameSpeed);
        this.update();
        this.draw();
    }

    update() {
        this.direction = this.nextDirection;

        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y,
        };

        // Wall collision
        if (
            newHead.x < 0 ||
            newHead.x >= this.gridWidth ||
            newHead.y < 0 ||
            newHead.y >= this.gridHeight
        ) {
            this.stop();
            return;
        }

        // Self collision
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
                this.stop();
                return;
            }
        }

        this.snake.unshift(newHead);

        // Food check
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 10;
            this.scoreEl.textContent = this.score;
            this.spawnFood();
        } else {
            this.snake.pop();
        }
    }

    draw() {
        const { ctx, gridWidth, gridHeight, cellSize } = this;
        ctx.clearRect(0, 0, gridWidth * cellSize, gridHeight * cellSize);

        // Grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, gridHeight * cellSize);
            ctx.stroke();
        }
        for (let y = 0; y <= gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(gridWidth * cellSize, y * cellSize);
            ctx.stroke();
        }

        this.drawFood();
        this.drawSnake();
    }

    drawFood() {
        const { ctx, food, cellSize } = this;
        const cx = food.x * cellSize + cellSize / 2;
        const cy = food.y * cellSize + cellSize / 2;
        const radius = cellSize / 2 - 3;

        // Glow
        const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.6);
        gradient.addColorStop(0, "rgba(233, 69, 96, 0.4)");
        gradient.addColorStop(1, "rgba(233, 69, 96, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Main circle
        ctx.fillStyle = "#e94560";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSnake() {
        const { ctx, snake, cellSize } = this;

        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const x = seg.x * cellSize;
            const y = seg.y * cellSize;
            const padding = 1;
            const r = 6;

            if (i === 0) {
                // Head
                ctx.fillStyle = "#00ff88";
                this.roundRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, r);

                // Eyes
                const eyeRadius = 3;
                ctx.fillStyle = "#0f3460";
                const dir = this.direction;
                const ecx = x + cellSize / 2;
                const ecy = y + cellSize / 2;
                const eyeOffset = 6;
                if (dir.x === 1) {
                    ctx.beginPath();
                    ctx.arc(ecx + eyeOffset, ecy - 5, eyeRadius, 0, Math.PI * 2);
                    ctx.arc(ecx + eyeOffset, ecy + 5, eyeRadius, 0, Math.PI * 2);
                    ctx.fill();
                } else if (dir.x === -1) {
                    ctx.beginPath();
                    ctx.arc(ecx - eyeOffset, ecy - 5, eyeRadius, 0, Math.PI * 2);
                    ctx.arc(ecx - eyeOffset, ecy + 5, eyeRadius, 0, Math.PI * 2);
                    ctx.fill();
                } else if (dir.y === -1) {
                    ctx.beginPath();
                    ctx.arc(ecx - 5, ecy - eyeOffset, eyeRadius, 0, Math.PI * 2);
                    ctx.arc(ecx + 5, ecy - eyeOffset, eyeRadius, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(ecx - 5, ecy + eyeOffset, eyeRadius, 0, Math.PI * 2);
                    ctx.arc(ecx + 5, ecy + eyeOffset, eyeRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                const t = i / Math.max(snake.length - 1, 1);
                const g = Math.floor(204 * (1 - t));
                const b = Math.floor(106 * (1 - t));
                ctx.fillStyle = `rgb(0, ${g}, ${b})`;
                this.roundRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, r);
            }
        }
    }

    roundRect(x, y, w, h, r) {
        const { ctx } = this;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    spawnFood() {
        const occupied = new Set(this.snake.map((s) => `${s.x},${s.y}`));
        const empty = [];
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                if (!occupied.has(`${x},${y}`)) {
                    empty.push({ x, y });
                }
            }
        }
        if (empty.length === 0) {
            this.stop();
            this.overlayTitle.textContent = "你赢了!";
            this.overlayMessage.textContent = `满分: ${this.score}`;
            return;
        }
        this.food = empty[Math.floor(Math.random() * empty.length)];
    }

    changeDirection(newDir) {
        // Prevent 180-degree reversal
        if (this.direction.x + newDir.x === 0 && this.direction.y + newDir.y === 0) return;
        this.nextDirection = newDir;
    }

    handleKeydown(e) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
        }

        if (!this.isRunning) return;

        switch (e.key) {
            case "ArrowUp":    this.changeDirection({ x: 0, y: -1 }); break;
            case "ArrowDown":  this.changeDirection({ x: 0, y: 1 }); break;
            case "ArrowLeft":  this.changeDirection({ x: -1, y: 0 }); break;
            case "ArrowRight": this.changeDirection({ x: 1, y: 0 }); break;
        }
    }

    handleTouch(e) {
        if (!this.isRunning) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Convert to canvas-local coordinates, accounting for CSS scaling
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const cx = (clientX - rect.left) * scaleX;
        const cy = (clientY - rect.top) * scaleY;

        // Relative to canvas center
        const dx = cx - this.canvas.width / 2;
        const dy = cy - this.canvas.height / 2;

        // Dominant axis decides the direction
        if (Math.abs(dx) > Math.abs(dy)) {
            this.changeDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
        } else {
            this.changeDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    new Game();
});

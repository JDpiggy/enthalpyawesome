document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const fuelBar = document.getElementById('fuelBar');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreDisplay = document.getElementById('finalScore');
    const newHighScoreText = gameOverScreen.querySelector('p:nth-of-type(2)'); // Corrected selector if needed
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const toggleSoundButton = document.getElementById('toggleSoundButton');

    // Game settings
    const GAME_WIDTH = 1280; // Widescreen
    const GAME_HEIGHT = 720;  // 16:9 aspect ratio
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    let rocket, pipes, powerUps, particles;
    let score, highScore, frame, gameSpeed, gameState;
    let soundEnabled = true;

    const rocketImg = new Image();
    rocketImg.src = 'assets/tiles/pixil-frame-0.png'; // Verify this path
    rocketImg.isReady = false;

    let assetsToLoad = 1;
    let assetsLoaded = 0;

    function assetLoadManager() {
        assetsLoaded++;
        if (assetsLoaded >= assetsToLoad) {
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = "Start Game";
            }
            // Optional: initial draw if game starts paused
            // if (gameState === 'START' && !rocket) { initGame(); drawGameObjects(); }
        }
    }

    rocketImg.onload = () => { rocketImg.isReady = true; assetLoadManager(); };
    rocketImg.onerror = () => { console.error("Failed to load rocket image."); rocketImg.isReady = false; assetLoadManager(); };

    // Sounds (placeholders, ensure you have sound files or remove playSound calls)
    const sounds = {
        flap: new Audio(), score: new Audio(), hit: new Audio(),
        powerup: new Audio(), fuelEmpty: new Audio()
    };
    // sounds.flap.src = 'assets/flap.wav'; // Example

    // Rocket properties
    const ROCKET_WIDTH = 80;
    const ROCKET_HEIGHT = 95;
    const GRAVITY = 0.28;
    const FLAP_STRENGTH = -7.2; // Slightly stronger flap for bigger rocket
    const MAX_FUEL = 100;
    const FUEL_CONSUMPTION = 0.8;
    const FUEL_REGEN_RATE = 0.15;

    // Pipe properties
    const PIPE_WIDTH = 120;
    const PIPE_GAP = 250; // ROCKET_HEIGHT (95) + ~155 clearance
    const PIPE_SPACING = 450; // More space between pipe sets
    const PIPE_SPEED_INITIAL = 2.0;
    const PIPE_VERTICAL_MOVEMENT_MAX = 60;
    const PIPE_VERTICAL_SPEED = 0.45;

    // Power-up properties
    const POWERUP_SIZE = 40;
    const POWERUP_SPAWN_CHANCE = 0.0055;
    const SHIELD_DURATION = 540; // 9 seconds at 60fps

    class Rocket {
        constructor() {
            this.x = GAME_WIDTH / 6; // Start a bit further in
            this.y = GAME_HEIGHT / 2 - ROCKET_HEIGHT / 2;
            this.width = ROCKET_WIDTH;
            this.height = ROCKET_HEIGHT;
            this.velocityY = 0;
            this.fuel = MAX_FUEL;
            this.shieldActive = false;
            this.shieldTimer = 0;
        }

        flap() {
            if (this.fuel > 0) {
                this.velocityY = FLAP_STRENGTH;
                this.fuel -= FUEL_CONSUMPTION;
                if (this.fuel < 0) this.fuel = 0;
                playSound(sounds.flap);
                for (let i = 0; i < 8; i++) { // More particles for bigger rocket
                    particles.push(new Particle(this.x + this.width / 2, this.y + this.height * 0.9, 'thrust'));
                }
            } else {
                playSound(sounds.fuelEmpty);
            }
        }

        update() {
            this.velocityY += GRAVITY;
            this.y += this.velocityY;

            if (this.fuel < MAX_FUEL) {
                this.fuel += FUEL_REGEN_RATE;
                if (this.fuel > MAX_FUEL) this.fuel = MAX_FUEL;
            }

            if (this.shieldActive) {
                this.shieldTimer--;
                if (this.shieldTimer <= 0) {
                    this.shieldActive = false;
                }
            }

            if (this.y < 0) {
                this.y = 0;
                this.velocityY = 0;
            }
        }

        draw() {
            if (rocketImg.isReady) {
                ctx.drawImage(rocketImg, this.x, this.y, this.width, this.height);
            } else { // Fallback
                ctx.fillStyle = 'darkred';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }

            if (this.shieldActive) {
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                ctx.lineWidth = 5;
                ctx.beginPath();
                const shieldRadius = Math.max(this.width, this.height) * 0.8;
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, shieldRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    class Pipe {
        constructor(x, isTopPipe, gapY, movesVertically) {
            this.x = x;
            this.width = PIPE_WIDTH;
            this.isTopPipe = isTopPipe;
            this.gapY = gapY;
            this.height = isTopPipe ? gapY - PIPE_GAP / 2 : GAME_HEIGHT - (gapY + PIPE_GAP / 2);
            this.y = isTopPipe ? 0 : gapY + PIPE_GAP / 2;
            this.passed = false;
            this.movesVertically = movesVertically;
            this.verticalDirection = Math.random() > 0.5 ? 1 : -1;
            this.initialY = this.y;
            this.initialHeight = this.height;
        }
        update() {
            this.x -= gameSpeed;
            if (this.movesVertically) {
                const moveAmount = PIPE_VERTICAL_SPEED * this.verticalDirection;
                if (this.isTopPipe) {
                    const newHeight = this.height + moveAmount;
                    if (newHeight > this.initialHeight + PIPE_VERTICAL_MOVEMENT_MAX || newHeight < this.initialHeight - PIPE_VERTICAL_MOVEMENT_MAX || newHeight < 50) {
                        this.verticalDirection *= -1;
                    } else {
                        this.height = newHeight;
                    }
                } else { // Bottom pipe
                    const newY = this.y + moveAmount;
                    const newHeight = GAME_HEIGHT - newY - (PIPE_GAP / 2); // This logic might need refinement to keep gap consistent
                    if (newY > this.initialY + PIPE_VERTICAL_MOVEMENT_MAX || newY < this.initialY - PIPE_VERTICAL_MOVEMENT_MAX || (GAME_HEIGHT - newY) < 50) {
                         this.verticalDirection *= -1;
                    } else {
                         this.y = newY;
                         this.height = GAME_HEIGHT - this.y;
                    }
                }
                 // Clamp heights to prevent pipes from disappearing or becoming too small
                if (this.height < 50) this.height = 50;
                if (this.isTopPipe && this.y + this.height > this.gapY - PIPE_GAP/2) {
                     this.height = this.gapY - PIPE_GAP/2 - this.y;
                } else if (!this.isTopPipe && this.y < this.gapY + PIPE_GAP/2) {
                    this.height = GAME_HEIGHT - (this.gapY + PIPE_GAP/2);
                    this.y = this.gapY + PIPE_GAP/2;
                }

            }
        }
        draw() {
            // Main pipe color
            ctx.fillStyle = '#20bf6b'; // Different green
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Inner highlight/shade
            ctx.fillStyle = this.isTopPipe ? '#199955' : '#26de7a'; // Shade/Highlight
            ctx.fillRect(this.x + 10, this.y + (this.isTopPipe ? 0 : 10), this.width - 20, this.height - 10);
            // Pipe caps
            ctx.fillStyle = '#137942'; // Darker cap
            const capHeight = 25;
            if (this.isTopPipe) {
                ctx.fillRect(this.x - 5, this.y + this.height - capHeight, this.width + 10, capHeight);
            } else {
                ctx.fillRect(this.x - 5, this.y, this.width + 10, capHeight);
            }
        }
    }

    class PowerUp {
        constructor(x, y, type) {
            this.x = x; this.y = y; this.size = POWERUP_SIZE; this.type = type; this.collected = false;
        }
        update() { this.x -= gameSpeed; }
        draw() {
            if (this.collected) return;
            ctx.beginPath();
            ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
            let symbol = '';
            let symbolColor = '#1e272e'; // Dark symbol for contrast
            let powerUpFont = `bold ${this.size * 0.7}px 'Bangers', cursive`;

            if (this.type === 'shield') {
                ctx.fillStyle = 'rgba(0, 220, 255, 0.9)'; symbol = 'S';
            } else if (this.type === 'fuel') {
                ctx.fillStyle = 'rgba(255, 190, 0, 0.9)'; symbol = 'F';
            }
            ctx.fill();
            // Border for powerup
            ctx.strokeStyle = 'rgba(20,20,20,0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = symbolColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = powerUpFont;
            // Adjust Y offset for Bangers font to center better
            ctx.fillText(symbol, this.x + this.size / 2, this.y + this.size / 2 + this.size * 0.08);
        }
        applyEffect(rocket) {
            playSound(sounds.powerup);
            if (this.type === 'shield') {
                rocket.shieldActive = true; rocket.shieldTimer = SHIELD_DURATION;
            } else if (this.type === 'fuel') {
                rocket.fuel = MAX_FUEL;
            }
            this.collected = true;
            for (let i = 0; i < 20; i++) {
                particles.push(new Particle(this.x + this.size / 2, this.y + this.size / 2, 'collect'));
            }
        }
    }

    class Particle {
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type;
            this.size = Math.random() * (type === 'explosion' ? 10 : 7) + 3;
            this.initialLife = (type === 'explosion' ? 70 : 40) + Math.random() * 30;
            this.life = this.initialLife;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (type === 'explosion' ? 10 : (type === 'collect' ? 5 : 3)) + 1;

            if (type === 'thrust') {
                this.color = `rgba(255, ${Math.floor(Math.random() * 100) + 100}, 0, 0.7)`;
                this.velocityX = (Math.random() - 0.5) * 3;
                this.velocityY = Math.random() * 3 + 2;
            } else { // explosion or collect
                this.velocityX = Math.cos(angle) * speed;
                this.velocityY = Math.sin(angle) * speed;
                if (type === 'explosion') {
                    this.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 120)}, 0, 0.8)`;
                } else { // collect
                    this.color = `rgba(255, 230, ${Math.random() > 0.5 ? 50 : 150}, 0.8)`;
                }
            }
        }
        update() {
            this.x += this.velocityX; this.y += this.velocityY;
            if (this.type === 'thrust') this.velocityY += 0.08;
            else if (this.type === 'explosion' || this.type === 'collect') {
                this.velocityX *= 0.97; this.velocityY *= 0.97; // Friction
                if(this.type === 'explosion') this.velocityY += 0.1; // Slight gravity for explosion
            }
            this.life--;
        }
        draw() {
            ctx.globalAlpha = Math.max(0, this.life / this.initialLife); // Fade out
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (this.life / this.initialLife), 0, Math.PI * 2); // Shrink
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    function playSound(sound) {
        if (soundEnabled && sound.src && sound.readyState >= 2) { // Check src and if ready
            sound.currentTime = 0;
            sound.play().catch(e => console.warn("Audio play failed:", e));
        }
    }

    function initGame() {
        rocket = new Rocket(); pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = PIPE_SPEED_INITIAL;
        gameState = 'START'; loadHighScore(); updateUI();
        startScreen.style.display = 'flex'; gameOverScreen.style.display = 'none';
        if (startButton) {
            if (assetsLoaded < assetsToLoad) {
                startButton.disabled = true; startButton.textContent = "Loading...";
            } else {
                startButton.disabled = false; startButton.textContent = "Start Game";
            }
        }
        // Initial draw for start screen if game isn't auto-playing
        if (ctx) drawGameObjects(); // Draw background/static elements if any
    }


    function startGame() {
        gameState = 'PLAYING';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none'; // <<< ADD THIS LINE TO HIDE GAME OVER SCREEN

        // Reset key game state variables for a fresh start
        if(rocket) {
            // If rocket exists, reset its position and velocity too
            rocket.y = GAME_HEIGHT / 2 - ROCKET_HEIGHT / 2;
            rocket.velocityY = 0;
            rocket.fuel = MAX_FUEL;
            rocket.shieldActive = false; // Ensure shield is off
            rocket.shieldTimer = 0;
        } else {
            rocket = new Rocket(); // Create new rocket if it doesn't exist (first game)
        }

        pipes = [];
        powerUps = [];
        particles = [];
        score = 0;
        frame = 0;
        gameSpeed = PIPE_SPEED_INITIAL;

        updateUI(); // Update UI to reflect reset score/fuel
        gameLoop();
    }

// ... (all your existing code after startGame, until the event listeners) ...

    // Event Listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame); // This is fine, as startGame now hides the gameOverScreen

    window.addEventListener('keydown', handleInput);
// ... (rest of your event listeners and initGame call) ...
    }

    function gameOver() {
        playSound(sounds.hit); gameState = 'GAMEOVER';
        if (rocket) { // Check if rocket exists
            for (let i = 0; i < 50; i++) { // More explosion particles
                particles.push(new Particle(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2, 'explosion'));
            }
            rocket.y = -2000; // Effectively remove rocket
        }

        if (score > highScore) {
            highScore = score; saveHighScore();
            newHighScoreText.style.display = 'block';
        } else {
            newHighScoreText.style.display = 'none';
        }
        finalScoreDisplay.textContent = score;
        gameOverScreen.style.display = 'flex';
        updateUI(); // Ensure UI (like high score) is updated on game over screen
    }

    function loadHighScore() { highScore = parseInt(localStorage.getItem('flappyRocketHighScoreAF')) || 0; } // Added AF to key
    function saveHighScore() { localStorage.setItem('flappyRocketHighScoreAF', highScore); }

    function handleInput(e) {
        if (e.code === 'Space' || e.type === 'mousedown' || e.type === 'touchstart') {
            e.preventDefault();
            if (gameState === 'PLAYING' && rocket) { rocket.flap(); }
        }
    }

    function generatePipes() {
        if (frame % Math.floor(PIPE_SPACING / gameSpeed) === 0) {
            const margin = 120; // Min distance of gap center from top/bottom edge
            const gapY = Math.random() * (GAME_HEIGHT - PIPE_GAP - 2 * margin) + (PIPE_GAP / 2) + margin;
            const movesVertically = Math.random() < 0.35;
            pipes.push(new Pipe(GAME_WIDTH, true, gapY, movesVertically));
            pipes.push(new Pipe(GAME_WIDTH, false, gapY, movesVertically));

            if (Math.random() < POWERUP_SPAWN_CHANCE * 80 ) {
                const powerUpType = Math.random() < 0.5 ? 'shield' : 'fuel';
                const powerUpY = gapY - POWERUP_SIZE / 2 + (Math.random() - 0.5) * (PIPE_GAP / 1.8);
                powerUps.push(new PowerUp(GAME_WIDTH + PIPE_WIDTH, powerUpY, powerUpType));
            }
        }
        pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
    }

    function generatePowerUps() {
        if (Math.random() < POWERUP_SPAWN_CHANCE && powerUps.length < 3) { // Max 3 random powerups
            const powerUpType = Math.random() < 0.5 ? 'shield' : 'fuel';
            const powerUpY = Math.random() * (GAME_HEIGHT - POWERUP_SIZE - 150) + 75;
            const powerUpX = GAME_WIDTH + Math.random() * 200;
            powerUps.push(new PowerUp(powerUpX, powerUpY, powerUpType));
        }
        powerUps = powerUps.filter(pu => pu.x + pu.size > 0 && !pu.collected);
    }

    function checkCollisions() {
        if (!rocket || gameState !== 'PLAYING') return;

        if (rocket.y + rocket.height >= GAME_HEIGHT) { // Ground collision
            rocket.y = GAME_HEIGHT - rocket.height; rocket.velocityY = 0;
            if (!rocket.shieldActive) { gameOver(); return; }
            else { rocket.velocityY = FLAP_STRENGTH * 0.3; playSound(sounds.hit); }
        }

        for (let pipe of pipes) {
            if (!rocket.shieldActive &&
                rocket.x < pipe.x + pipe.width && rocket.x + rocket.width > pipe.x &&
                rocket.y < pipe.y + pipe.height && rocket.y + rocket.height > pipe.y) {
                gameOver(); return;
            }
            if (!pipe.passed && pipe.x + pipe.width < rocket.x && pipe.isTopPipe) {
                pipe.passed = true;
                const bottomPipe = pipes.find(p => p.gapY === pipe.gapY && !p.isTopPipe && !p.passed);
                if(bottomPipe) bottomPipe.passed = true;
                score++; playSound(sounds.score);
                gameSpeed += 0.02; // Slower speed increase
            }
        }

        for (let pu of powerUps) {
            if (!pu.collected &&
                rocket.x < pu.x + pu.size && rocket.x + rocket.width > pu.x &&
                rocket.y < pu.y + pu.size && rocket.y + rocket.height > pu.y) {
                pu.applyEffect(rocket);
            }
        }
         if (rocket.fuel <= 0 && !rocket.shieldActive) {
            // Option: could make this a game over condition or just very hard to fly
            // For now, flap simply won't work.
        }
    }

    function updateUI() {
        scoreDisplay.textContent = `Score: ${score}`;
        highScoreDisplay.textContent = `High Score: ${highScore}`;
        if (rocket) {
            const fuelPercentage = (rocket.fuel / MAX_FUEL) * 100;
            fuelBar.style.width = `${fuelPercentage}%`;
            if (fuelPercentage < 20) fuelBar.style.backgroundColor = '#d63031'; // Red
            else if (fuelPercentage < 50) fuelBar.style.backgroundColor = '#fdcb6e'; // Yellow
            else fuelBar.style.backgroundColor = '#e17055'; // Default orange/coral
        } else { // Default state before game starts
             fuelBar.style.width = '100%';
             fuelBar.style.backgroundColor = '#e17055';
        }
    }

    function updateGameObjects() {
        if (gameState !== 'PLAYING') return;
        if (rocket) rocket.update();
        pipes.forEach(pipe => pipe.update());
        powerUps.forEach(pu => pu.update());
        particles.forEach((p, index) => {
            p.update();
            if (p.life <= 0) particles.splice(index, 1);
        });
    }

    function drawBackground() { // Simple parallax idea (optional)
        // Could draw distant clouds/stars here that move very slowly
        // ctx.fillStyle = '#70c5ce'; // Base sky (already in canvas style)
        // ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    function drawGameObjects() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Clear canvas
        drawBackground(); // Draw any background elements

        pipes.forEach(pipe => pipe.draw());
        powerUps.forEach(pu => pu.draw());
        if (gameState !== 'GAMEOVER' && rocket) rocket.draw();
        particles.forEach(p => p.draw());
    }

    function gameLoop() {
        if (gameState !== 'PLAYING') return;
        frame++;
        generatePipes();
        if (frame % 60 === 0) generatePowerUps(); // Generate random powerups less frequently

        updateGameObjects();
        checkCollisions();
        drawGameObjects();
        updateUI();
        requestAnimationFrame(gameLoop);
    }

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame); // Can directly call startGame as it resets state

    window.addEventListener('keydown', handleInput);
    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('touchstart', handleInput, { passive: false });

    toggleSoundButton.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        toggleSoundButton.textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
    });

    initGame(); // Initialize and show start screen
});

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const fuelBar = document.getElementById('fuelBar');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreDisplay = document.getElementById('finalScore');
    const newHighScoreText = gameOverScreen.querySelector('p:nth-of-type(2)');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const toggleSoundButton = document.getElementById('toggleSoundButton');

    // Game settings
    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    let rocket, pipes, powerUps, particles;
    let score, highScore, frame, gameSpeed, gameState;
    let soundEnabled = true;

    // --- ASSET LOADING ---
    const rocketImg = new Image();
    rocketImg.src = 'assets/tiles/pixil-frame-0.png'; // Your rocket image
    rocketImg.isReady = false;

    const pipeImg = new Image(); // For beaker/pipe image
    pipeImg.src = 'assets/tiles/beaker-removebg-preview.png'; // Path to your beaker image
    pipeImg.isReady = false;

    let assetsToLoad = 2; // We have two critical images now
    let assetsLoaded = 0;

    function assetLoadManager() {
        assetsLoaded++;
        if (assetsLoaded >= assetsToLoad) {
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = "Start Game";
            }
            // If game starts on the start screen, do an initial draw once assets are ready
            if (gameState === 'START' && !rocket && ctx) {
                initGame(); // This might re-trigger asset check, ensure it's safe
                drawGameObjects();
            }
            console.log("All critical assets loading attempted.");
        }
    }

    rocketImg.onload = () => { rocketImg.isReady = true; console.log("Rocket image loaded."); assetLoadManager(); };
    rocketImg.onerror = () => { console.error("Failed to load rocket image."); rocketImg.isReady = false; assetLoadManager(); };

    pipeImg.onload = () => { pipeImg.isReady = true; console.log("Pipe/Beaker image loaded."); assetLoadManager(); };
    pipeImg.onerror = () => { console.error("Failed to load pipe/beaker image: " + pipeImg.src); pipeImg.isReady = false; assetLoadManager(); };
    // --- END ASSET LOADING ---

    const sounds = {
        flap: new Audio(), score: new Audio(), hit: new Audio(),
        powerup: new Audio(), fuelEmpty: new Audio()
    };
    // Example: sounds.flap.src = 'assets/sounds/flap.wav'; // Make sure paths are correct

    // Rocket properties
    const ROCKET_WIDTH = 80;
    const ROCKET_HEIGHT = 95;
    const GRAVITY = 0.28;
    const FLAP_STRENGTH = -7.2;
    const MAX_FUEL = 100;
    const FUEL_CONSUMPTION = 2.5;   // Noticeable consumption
    const FUEL_REGEN_RATE = 0.05; // Slow regeneration

    // Pipe properties
    const PIPE_WIDTH = 120; // This will be the drawn width of the beaker image
    const PIPE_GAP = 250;
    const PIPE_SPACING = 450;
    const PIPE_SPEED_INITIAL = 2.0;
    const PIPE_VERTICAL_MOVEMENT_MAX = 60; // Max deviation for gap center
    const PIPE_VERTICAL_SPEED = 0.45;

    // Power-up properties
    const POWERUP_SIZE = 40;
    const POWERUP_SPAWN_CHANCE = 0.0055;
    const SHIELD_DURATION = 540; // 9 seconds at 60fps

    class Rocket {
        constructor() {
            this.x = GAME_WIDTH / 6;
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
                for (let i = 0; i < 8; i++) {
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

            if (this.y < 0) { // Prevent going off top
                this.y = 0;
                this.velocityY = 0;
            }
            // Ground collision is handled in checkCollisions
        }

        draw() {
            if (rocketImg.isReady) {
                ctx.drawImage(rocketImg, this.x, this.y, this.width, this.height);
            } else {
                ctx.fillStyle = 'darkred'; // Fallback
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
            this.gapY = gapY; // Logical center of the gap

            if (isTopPipe) {
                this.y = 0;
                this.height = gapY - PIPE_GAP / 2;
            } else { // Bottom pipe
                this.y = gapY + PIPE_GAP / 2;
                this.height = GAME_HEIGHT - this.y;
            }
            if (this.height < 0) this.height = 0; // Ensure non-negative height

            this.passed = false;
            this.movesVertically = movesVertically;
            this.verticalDirection = Math.random() > 0.5 ? 1 : -1;
        }

        update() {
            this.x -= gameSpeed;

            if (this.movesVertically) {
                const moveAmount = PIPE_VERTICAL_SPEED * this.verticalDirection;
                let newGapCenter = this.gapY + moveAmount;

                const minGapCenter = PIPE_GAP / 2 + 50; // Margin from top for gap center
                const maxGapCenter = GAME_HEIGHT - PIPE_GAP / 2 - 50; // Margin from bottom

                if (newGapCenter > maxGapCenter || newGapCenter < minGapCenter) {
                    this.verticalDirection *= -1;
                    newGapCenter = Math.max(minGapCenter, Math.min(maxGapCenter, this.gapY + (PIPE_VERTICAL_SPEED * this.verticalDirection))); // Recalculate with new direction
                }
                this.gapY = newGapCenter;

                // Recalculate y and height based on the new logical gapY
                if (this.isTopPipe) {
                    this.y = 0;
                    this.height = this.gapY - PIPE_GAP / 2;
                } else {
                    this.y = this.gapY + PIPE_GAP / 2;
                    this.height = GAME_HEIGHT - this.y;
                }
                if (this.height < 0) this.height = 0; // Safety check
            }
        }

        draw() {
            if (!pipeImg.isReady || this.height <= 0) {
                // Optional: Draw a fallback rectangle if image isn't ready
                // ctx.fillStyle = 'darkgrey';
                // ctx.fillRect(this.x, this.y, this.width, this.height);
                return;
            }

            if (this.isTopPipe) {
                ctx.save();
                ctx.translate(this.x, this.y + this.height); // Move to bottom-left of where flipped img starts
                ctx.scale(1, -1); // Flip Y-axis
                ctx.drawImage(pipeImg, 0, 0, this.width, this.height); // Draw from new (0,0)
                ctx.restore();
            } else {
                ctx.drawImage(pipeImg, this.x, this.y, this.width, this.height);
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
            let symbolColor = '#1e272e';
            let powerUpFont = `bold ${this.size * 0.7}px 'Bangers', cursive`;

            if (this.type === 'shield') {
                ctx.fillStyle = 'rgba(0, 220, 255, 0.9)'; symbol = 'S';
            } else if (this.type === 'fuel') {
                ctx.fillStyle = 'rgba(255, 190, 0, 0.9)'; symbol = 'F';
            }
            ctx.fill();
            ctx.strokeStyle = 'rgba(20,20,20,0.7)'; ctx.lineWidth = 2; ctx.stroke();

            ctx.fillStyle = symbolColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = powerUpFont;
            ctx.fillText(symbol, this.x + this.size / 2, this.y + this.size / 2 + this.size * 0.08);
        }
        applyEffect(rocketInstance) { // Renamed parameter to avoid conflict
            playSound(sounds.powerup);
            if (this.type === 'shield') {
                rocketInstance.shieldActive = true; rocketInstance.shieldTimer = SHIELD_DURATION;
            } else if (this.type === 'fuel') {
                rocketInstance.fuel = MAX_FUEL; // This refills the fuel
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
            } else {
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
                this.velocityX *= 0.97; this.velocityY *= 0.97;
                if(this.type === 'explosion') this.velocityY += 0.1;
            }
            this.life--;
        }
        draw() {
            ctx.globalAlpha = Math.max(0, this.life / this.initialLife);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (this.life / this.initialLife), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    function playSound(sound) {
        if (soundEnabled && sound.src && sound.readyState >= 2) {
            sound.currentTime = 0;
            sound.play().catch(e => console.warn("Audio play failed:", e));
        }
    }

    function initGame() {
        // Rocket is created in startGame or if it's null
        pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = PIPE_SPEED_INITIAL;
        gameState = 'START'; loadHighScore();
        startScreen.style.display = 'flex'; gameOverScreen.style.display = 'none';

        if (startButton) {
            if (assetsLoaded < assetsToLoad) {
                startButton.disabled = true; startButton.textContent = "Loading Assets...";
            } else {
                startButton.disabled = false; startButton.textContent = "Start Game";
            }
        }
        // Create a temporary rocket for UI update if it doesn't exist yet for the start screen
        let tempRocketForUI = rocket || { fuel: MAX_FUEL };
        updateUI(tempRocketForUI); // Pass rocket or a default for UI

        if (ctx && gameState === 'START') {
             if (!rocket) rocket = new Rocket(); // Ensure rocket exists for first draw
             drawGameObjects();
        }
    }

    function startGame() {
        gameState = 'PLAYING';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none'; // Crucial for hiding Game Over screen

        if(rocket) {
            rocket.y = GAME_HEIGHT / 2 - ROCKET_HEIGHT / 2;
            rocket.velocityY = 0;
            rocket.fuel = MAX_FUEL;
            rocket.shieldActive = false;
            rocket.shieldTimer = 0;
        } else {
            rocket = new Rocket();
        }

        pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = PIPE_SPEED_INITIAL;

        updateUI(rocket); // Pass the active rocket to UI
        gameLoop();
    }

    function gameOver() {
        playSound(sounds.hit); gameState = 'GAMEOVER';
        if (rocket) {
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2, 'explosion'));
            }
            rocket.y = -2000; // Move off-screen
        }

        if (score > highScore) {
            highScore = score; saveHighScore();
            newHighScoreText.style.display = 'block';
        } else {
            newHighScoreText.style.display = 'none';
        }
        if(finalScoreDisplay) finalScoreDisplay.textContent = score; // Check if element exists
        gameOverScreen.style.display = 'flex';
        updateUI(rocket); // Update UI on game over
    }

    function loadHighScore() { highScore = parseInt(localStorage.getItem('flappyRocketAFHighScoreV2')) || 0; } // Changed key slightly
    function saveHighScore() { localStorage.setItem('flappyRocketAFHighScoreV2', highScore); }

    function handleInput(e) {
        if (e.code === 'Space' || e.type === 'mousedown' || e.type === 'touchstart') {
            e.preventDefault();
            if (gameState === 'PLAYING' && rocket) { rocket.flap(); }
        }
    }

    function generatePipes() {
        if (frame % Math.floor(PIPE_SPACING / gameSpeed) === 0) {
            const margin = 120;
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
        if (Math.random() < POWERUP_SPAWN_CHANCE && powerUps.length < 3) {
            const powerUpType = Math.random() < 0.5 ? 'shield' : 'fuel';
            const powerUpY = Math.random() * (GAME_HEIGHT - POWERUP_SIZE - 150) + 75;
            const powerUpX = GAME_WIDTH + Math.random() * 200;
            powerUps.push(new PowerUp(powerUpX, powerUpY, powerUpType));
        }
        powerUps = powerUps.filter(pu => pu.x + pu.size > 0 && !pu.collected);
    }

    function checkCollisions() {
        if (!rocket || gameState !== 'PLAYING') return;

        if (rocket.y + rocket.height >= GAME_HEIGHT) {
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
                const bottomPipePair = pipes.find(p => p.gapY === pipe.gapY && !p.isTopPipe && !p.passed);
                if(bottomPipePair) bottomPipePair.passed = true;
                score++; playSound(sounds.score);
                gameSpeed += 0.02;
            }
        }

        for (let pu of powerUps) {
            if (!pu.collected &&
                rocket.x < pu.x + pu.size && rocket.x + rocket.width > pu.x &&
                rocket.y < pu.y + pu.size && rocket.y + rocket.height > pu.y) {
                pu.applyEffect(rocket); // Pass the game's rocket instance
            }
        }
    }

    function updateUI(currentRocket) { // Pass rocket instance for fuel
        if(scoreDisplay) scoreDisplay.textContent = `Score: ${score}`;
        if(highScoreDisplay) highScoreDisplay.textContent = `High Score: ${highScore}`;

        let fuelSource = currentRocket || rocket; // Use passed rocket or global if available

        if (fuelSource && fuelBar) { // Check if fuelSource and fuelBar element exist
            const fuelPercentage = (fuelSource.fuel / MAX_FUEL) * 100;
            fuelBar.style.width = `${fuelPercentage}%`;
            if (fuelPercentage < 20) fuelBar.style.backgroundColor = '#d63031';
            else if (fuelPercentage < 50) fuelBar.style.backgroundColor = '#fdcb6e';
            else fuelBar.style.backgroundColor = '#e17055';
        } else if (fuelBar) { // Default if no rocket (e.g. very initial load)
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

    function drawGameObjects() {
        if (!ctx) return; // Ensure context is available
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        pipes.forEach(pipe => pipe.draw());
        powerUps.forEach(pu => pu.draw());
        if (gameState !== 'GAMEOVER' && rocket) rocket.draw();
        particles.forEach(p => p.draw());
    }

    function gameLoop() {
        if (gameState !== 'PLAYING') return;
        frame++;
        generatePipes();
        if (frame % 75 === 0) generatePowerUps(); // Adjusted frequency

        updateGameObjects();
        checkCollisions();
        drawGameObjects();
        updateUI(rocket); // Pass the active rocket
        requestAnimationFrame(gameLoop);
    }

    // Event Listeners
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', startGame);

    window.addEventListener('keydown', handleInput);
    if (canvas) { // Ensure canvas exists before adding listeners
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleInput, { passive: false });
    }

    if (toggleSoundButton) {
        toggleSoundButton.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            toggleSoundButton.textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
        });
    }

    initGame(); // Initialize game state and UI
});

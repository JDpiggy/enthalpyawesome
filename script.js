document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // ... (UI element selections as before) ...

    // Game settings
    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    let rocket, pipes, powerUps, particles;
    let score, highScore, frame, gameSpeed, gameState;

    // --- ASSET LOADING (same as before) ---
    const rocketImg = new Image();
    rocketImg.src = 'assets/tiles/pixil-frame-0.png';
    rocketImg.isReady = false;

    const pipeImg = new Image();
    pipeImg.src = 'assets/tiles/beaker-removebg-preview.png';
    pipeImg.isReady = false;

    let assetsToLoad = 2;
    let assetsLoaded = 0;

    function assetLoadManager() { /* ... same as before ... */
        assetsLoaded++;
        if (assetsLoaded >= assetsToLoad) {
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = "Start Game";
            }
            if (gameState === 'START' && ctx) {
                 updateUI(rocket || { fuel: MAX_FUEL });
            }
            console.log("All critical assets loading attempted.");
        }
    }

    rocketImg.onload = () => { rocketImg.isReady = true; console.log("Rocket image loaded."); assetLoadManager(); };
    rocketImg.onerror = () => { console.error("Failed to load rocket image."); rocketImg.isReady = false; assetLoadManager(); };
    pipeImg.onload = () => { pipeImg.isReady = true; console.log("Pipe/Beaker image loaded."); assetLoadManager(); };
    pipeImg.onerror = () => { console.error("Failed to load pipe/beaker image: " + pipeImg.src); pipeImg.isReady = false; assetLoadManager(); };
    // --- END ASSET LOADING ---

    const sounds = { /* ... same as before ... */ };

    // Rocket properties (same as before)
    const ROCKET_WIDTH = 80;
    const ROCKET_HEIGHT = 95;
    const GRAVITY = 0.28;
    const FLAP_STRENGTH = -7.2;
    const MAX_FUEL = 100;
    const FUEL_CONSUMPTION = 2.5;
    const FUEL_REGEN_RATE = 0.05;

    // Pipe properties
    const PIPE_WIDTH = 120; // Visual width of the beaker image when drawn
    const PIPE_GAP = 260;   // << SLIGHTLY INCREASED for more clearance
    const PIPE_SPACING = 450;
    const PIPE_SPEED_INITIAL = 2.0;
    const PIPE_VERTICAL_MOVEMENT_MAX_OFFSET = 60; // Max offset the gap center can move from its initial random position
    const PIPE_VERTICAL_SPEED = 0.45;
    const MIN_PIPE_SEGMENT_HEIGHT = 40; // Minimum visual height for a pipe segment

    // --- NEW: Hitbox Inset Constants for Pipes/Beakers ---
    const PIPE_HITBOX_INSET_X = 25;       // Pixels to inset from left/right edges for collision
    const PIPE_HITBOX_INSET_Y_GAPEDGE = 10; // Pixels to inset from the edge facing the gap

    // Power-up properties (same as before)
    const POWERUP_SIZE = 40;
    const POWERUP_SPAWN_CHANCE = 0.0055;
    const SHIELD_DURATION = 540;

    class Rocket { /* ... same as before ... */
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

            if (this.y < 0) { 
                this.y = 0;
                this.velocityY = 0;
            }
        }
        draw() {
            if (rocketImg.isReady) {
                ctx.drawImage(rocketImg, this.x, this.y, this.width, this.height);
            } else {
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
        constructor(x, initialGapY, movesVertically) { // Changed constructor parameters
            this.x = x;
            this.width = PIPE_WIDTH;
            this.initialGapY = initialGapY; // Store the initial generated gap center
            this.currentGapY = initialGapY;  // Current gap center, will change if movesVertically
            this.movesVertically = movesVertically;
            this.verticalDirection = Math.random() > 0.5 ? 1 : -1;
            this.passed = false;

            // These will be calculated in update based on currentGapY
            this.topPipe = { y: 0, height: 0 };
            this.bottomPipe = { y: 0, height: 0 };
            this._calculateDimensions(); // Initial calculation
        }

        _calculateDimensions() {
            // Top Pipe
            this.topPipe.y = 0;
            this.topPipe.height = this.currentGapY - PIPE_GAP / 2;
            if (this.topPipe.height < MIN_PIPE_SEGMENT_HEIGHT) this.topPipe.height = MIN_PIPE_SEGMENT_HEIGHT;

            // Bottom Pipe
            this.bottomPipe.y = this.currentGapY + PIPE_GAP / 2;
            this.bottomPipe.height = GAME_HEIGHT - this.bottomPipe.y;
            if (this.bottomPipe.height < MIN_PIPE_SEGMENT_HEIGHT) {
                this.bottomPipe.height = MIN_PIPE_SEGMENT_HEIGHT;
                // Adjust y if height clamping affects it, though usually GAME_HEIGHT - y is fine
                // this.bottomPipe.y = GAME_HEIGHT - MIN_PIPE_SEGMENT_HEIGHT; // This could shrink the gap
            }
            // Ensure gap is not compromised by min height setting too much
            // If top pipe's bottom edge is below bottom pipe's top edge, there's overlap (bad)
            if(this.topPipe.y + this.topPipe.height > this.bottomPipe.y){
                // This indicates an issue, likely MIN_PIPE_SEGMENT_HEIGHT is too large for the current gap
                // Or the gap itself is too small. For now, let's prioritize gap.
                this.topPipe.height = this.currentGapY - PIPE_GAP / 2;
                this.bottomPipe.y = this.currentGapY + PIPE_GAP / 2;
                this.bottomPipe.height = GAME_HEIGHT - this.bottomPipe.y;

            }

        }

        update() {
            this.x -= gameSpeed;

            if (this.movesVertically) {
                const moveAmount = PIPE_VERTICAL_SPEED * this.verticalDirection;
                let newGapCenter = this.currentGapY + moveAmount;

                // Define bounds for the gap center based on its initial position and max offset
                const minPossibleGapY = this.initialGapY - PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const maxPossibleGapY = this.initialGapY + PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;

                // Also ensure gap doesn't go too near screen edges
                const screenEdgeMinGapY = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10; // 10px buffer
                const screenEdgeMaxGapY = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10);

                const finalMinGapY = Math.max(minPossibleGapY, screenEdgeMinGapY);
                const finalMaxGapY = Math.min(maxPossibleGapY, screenEdgeMaxGapY);


                if (newGapCenter > finalMaxGapY || newGapCenter < finalMinGapY) {
                    this.verticalDirection *= -1;
                    // Clamp to the valid range
                    newGapCenter = Math.max(finalMinGapY, Math.min(finalMaxGapY, newGapCenter));
                }
                this.currentGapY = newGapCenter;
            }
            this._calculateDimensions(); // Recalculate dimensions based on potentially new currentGapY
        }

        draw() {
            if (!pipeImg.isReady) return;

            // Draw Top Pipe (flipped beaker)
            if (this.topPipe.height > 0) {
                ctx.save();
                ctx.translate(this.x, this.topPipe.y + this.topPipe.height);
                ctx.scale(1, -1);
                ctx.drawImage(pipeImg, 0, 0, this.width, this.topPipe.height);
                ctx.restore();
            }

            // Draw Bottom Pipe (upright beaker)
            if (this.bottomPipe.height > 0) {
                ctx.drawImage(pipeImg, this.x, this.bottomPipe.y, this.width, this.bottomPipe.height);
            }
        }
    }

    class PowerUp { /* ... same as before ... */ }
    class Particle { /* ... same as before ... */ }
    function playSound(sound) { /* ... same as before (sound effectively off) ... */ }
    function initGame() { /* ... same as before (crucially, no drawGameObjects()) ... */
        rocket = null; 
        pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = PIPE_SPEED_INITIAL;
        gameState = 'START';
        loadHighScore();

        startScreen.style.display = 'flex';
        gameOverScreen.style.display = 'none';

        if (startButton) {
            if (assetsLoaded < assetsToLoad) {
                startButton.disabled = true; startButton.textContent = "Loading Assets...";
            } else {
                startButton.disabled = false; startButton.textContent = "Start Game";
            }
        }
        updateUI({ fuel: MAX_FUEL }); 

        if (ctx) {
             ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
    }
    function startGame() { /* ... same as before ... */
        gameState = 'PLAYING';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';

        rocket = new Rocket(); 

        pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0; 
        gameSpeed = PIPE_SPEED_INITIAL;

        updateUI(rocket);
        gameLoop();
    }
    function gameOver() { /* ... same as before ... */ }
    function loadHighScore() { /* ... same as before ... */ }
    function saveHighScore() { /* ... same as before ... */ }
    function handleInput(e) { /* ... same as before ... */ }

    function generatePipes() {
        if (frame % Math.floor(PIPE_SPACING / gameSpeed) === 0) {
            // Ensure initialGapY allows for PIPE_GAP and MIN_PIPE_SEGMENT_HEIGHT on both sides
            const minPossibleYForGapCenter = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 20; // 20px buffer
            const maxPossibleYForGapCenter = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 20);
            const rangeForGapCenter = maxPossibleYForGapCenter - minPossibleYForGapCenter;

            let initialGapY = Math.random() * rangeForGapCenter + minPossibleYForGapCenter;
            if (rangeForGapCenter <=0) { // Safety if screen too small for settings
                initialGapY = GAME_HEIGHT / 2;
            }

            const movesVertically = Math.random() < 0.4; // Slightly more chance of moving
            // Pass initialGapY to the constructor. The Pipe class will handle top/bottom distinction.
            pipes.push(new Pipe(GAME_WIDTH, initialGapY, movesVertically));
        }
        pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
    }

    function generatePowerUps() { /* ... same as before ... */ }

    function checkCollisions() {
        if (!rocket || gameState !== 'PLAYING') return;

        // Ground collision (same as before)
        if (rocket.y + rocket.height >= GAME_HEIGHT) {
            rocket.y = GAME_HEIGHT - rocket.height; rocket.velocityY = 0;
            if (!rocket.shieldActive) { gameOver(); return; }
            else { rocket.velocityY = FLAP_STRENGTH * 0.3; playSound(sounds.hit); }
        }

        for (let pipe of pipes) {
            // Define rocket's bounding box
            const rocketRect = {
                x: rocket.x,
                y: rocket.y,
                width: rocket.width,
                height: rocket.height
            };

            // --- COLLISION WITH TOP PIPE (Beaker) ---
            const topPipeEff = {
                x: pipe.x + PIPE_HITBOX_INSET_X,
                y: pipe.topPipe.y, // Starts at 0
                width: pipe.width - 2 * PIPE_HITBOX_INSET_X,
                // Collidable part of top pipe ends slightly above its visual bottom edge
                height: pipe.topPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE
            };
            if (topPipeEff.width < 0) topPipeEff.width = 0;
            if (topPipeEff.height < 0) topPipeEff.height = 0;

            if (!rocket.shieldActive &&
                rocketRect.x < topPipeEff.x + topPipeEff.width &&
                rocketRect.x + rocketRect.width > topPipeEff.x &&
                rocketRect.y < topPipeEff.y + topPipeEff.height && // Rocket's top touches bottom of top pipe's hitbox
                rocketRect.y + rocketRect.height > topPipeEff.y) {
                gameOver(); return;
            }

            // --- COLLISION WITH BOTTOM PIPE (Beaker) ---
            const bottomPipeEff = {
                x: pipe.x + PIPE_HITBOX_INSET_X,
                // Collidable part of bottom pipe starts slightly below its visual top edge
                y: pipe.bottomPipe.y + PIPE_HITBOX_INSET_Y_GAPEDGE,
                width: pipe.width - 2 * PIPE_HITBOX_INSET_X,
                height: pipe.bottomPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE
            };
            if (bottomPipeEff.width < 0) bottomPipeEff.width = 0;
            if (bottomPipeEff.height < 0) bottomPipeEff.height = 0;


            if (!rocket.shieldActive &&
                rocketRect.x < bottomPipeEff.x + bottomPipeEff.width &&
                rocketRect.x + rocketRect.width > bottomPipeEff.x &&
                rocketRect.y < bottomPipeEff.y + bottomPipeEff.height &&
                rocketRect.y + rocketRect.height > bottomPipeEff.y) { // Rocket's bottom touches top of bottom pipe's hitbox
                gameOver(); return;
            }


            // Score (same logic, but ensure it's tied to a single pipe instance passing)
            if (!pipe.passed && pipe.x + pipe.width < rocket.x) { // Check based on original pipe width for scoring
                pipe.passed = true;
                score++;
                playSound(sounds.score);
                gameSpeed += 0.02;
            }
        }

        // Power-up collision (same as before)
        for (let pu of powerUps) { /* ... */ }
    }

    function updateUI(currentRocket) { /* ... same as before ... */ }
    function updateGameObjects() { /* ... same as before ... */ }
    function drawGameObjects() { /* ... same as before ... */ }
    function gameLoop() { /* ... same as before ... */ }

    // Event Listeners (same as before)
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', startGame);
    window.addEventListener('keydown', handleInput);
    if (canvas) {
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleInput, { passive: false });
    }

    initGame();
});

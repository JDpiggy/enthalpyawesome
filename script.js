document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const fuelBar = document.getElementById('fuelBar');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreDisplay = document.getElementById('finalScore');
    const newHighScoreTextGameOver = document.getElementById('newHighScoreTextGameOver');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');

    // Game settings
    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    let rocket, pipes, powerUps, particles;
    let score, highScore, frame, gameSpeed, gameState;

    // --- ASSET LOADING ---
    const laliCharacterImg = new Image();
    laliCharacterImg.src = 'assets/tiles/lalicharacter.png';
    laliCharacterImg.isReady = false;

    const pipeImg = new Image();
    pipeImg.src = 'assets/tiles/beaker-removebg-preview.png';
    pipeImg.isReady = false;

    const fuelPowerUpImg = new Image();
    fuelPowerUpImg.src = 'assets/tiles/beans-removebg-preview.png';
    fuelPowerUpImg.isReady = false;

    let assetsToLoad = 3;
    let assetsLoaded = 0;

    function assetLoadManager() {
        assetsLoaded++;
        if (assetsLoaded >= assetsToLoad) {
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = "Start Game";
            }
            if (gameState === 'START' && ctx) {
                 updateUI(rocket || { fuel: MAX_FUEL });
                 if (!isStartScreenLoopRunning && laliCharacterImg.isReady) {
                    startScreenAnimationLoop();
                 }
            }
            console.log("All critical assets loading attempted.");
        }
    }

    laliCharacterImg.onload = () => { laliCharacterImg.isReady = true; console.log("Lali Character image loaded."); assetLoadManager(); };
    laliCharacterImg.onerror = () => { console.error("Failed to load Lali Character image."); laliCharacterImg.isReady = false; assetLoadManager(); };
    pipeImg.onload = () => { pipeImg.isReady = true; console.log("Pipe/Cylinder image loaded."); assetLoadManager(); };
    pipeImg.onerror = () => { console.error("Failed to load pipe/cylinder image: " + pipeImg.src); pipeImg.isReady = false; assetLoadManager(); };
    fuelPowerUpImg.onload = () => { fuelPowerUpImg.isReady = true; console.log("Fuel/Beans power-up image loaded."); assetLoadManager(); };
    fuelPowerUpImg.onerror = () => { console.error("Failed to load fuel/beans power-up image: " + fuelPowerUpImg.src); fuelPowerUpImg.isReady = false; assetLoadManager(); };
    // --- END ASSET LOADING ---

    const sounds = {
        flap: new Audio(), score: new Audio(), hit: new Audio(),
        powerup: new Audio(), fuelEmpty: new Audio()
    };
    sounds.flap.src = 'assets/sounds/fart.wav'; // <<< IMPORTANT: SET CORRECT PATH

    Object.values(sounds).forEach(sound => {
        if (sound.src) {
            sound.load();
            sound.oncanplaythrough = () => console.log(`${sound.src} can play through.`);
            sound.onerror = (e) => console.error(`Error loading sound: ${sound.src}`, e);
        }
    });

    // Rocket (Lali Character) properties
    const ROCKET_WIDTH = 90;  // <<< ADJUSTED (was 100) - Narrower to focus on torso for collision
const ROCKET_HEIGHT = 130; // <<< ADJUSTED (was 120) - Taller
const GRAVITY = 0.28;         // May need slight re-tuning with new dimensions
const FLAP_STRENGTH = -7.5; // <<< SLIGHTLY INCREASED flap for taller/heavier feel
const MAX_FUEL = 100;
const FUEL_CONSUMPTION = 2.5;
const FUEL_REGEN_RATE = 0;

// Pipe properties


    // Pipe properties
    const PIPE_WIDTH = 120;
    const PIPE_GAP = 260 + (ROCKET_HEIGHT - 95); // Adjust gap based on new rocket height if needed
    const PIPE_SPACING = 450;
    const PIPE_SPEED_INITIAL = 2.0;
    const PIPE_VERTICAL_MOVEMENT_MAX_OFFSET = 60;
    const PIPE_VERTICAL_SPEED = 0.45;
    const MIN_PIPE_SEGMENT_HEIGHT = 40;
    const PIPE_HITBOX_INSET_X = 40;
    const PIPE_HITBOX_INSET_Y_GAPEDGE = 15;

    // Power-up properties
    const POWERUP_SIZE = 50;
    const POWERUP_SPAWN_CHANCE = 0.0055;
    const SHIELD_DURATION = 540;
    const LOW_FUEL_THRESHOLD_PERCENT = 20;
    let canSpawnEmergencyBeans = true;
    const EMERGENCY_BEANS_COOLDOWN_FRAMES = 180;
    let emergencyBeansCooldownTimer = 0;

    // Start Screen Animation Variables
    let startScreenAnimFrame = 0;
    const startScreenCharYOffsetMax = 15;
    const startScreenCharBobSpeed = 0.03;
    let isStartScreenLoopRunning = false;


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
            if (this.y < 0) {
                this.y = 0;
                this.velocityY = 0;
            }
        }
        draw() {
            if (laliCharacterImg.isReady) {
                ctx.drawImage(laliCharacterImg, this.x, this.y, this.width, this.height);
            } else {
                ctx.fillStyle = 'purple'; // Fallback
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

    class Pipe { /* ... (same as previous version) ... */
        constructor(x, initialGapY, movesVertically) {
            this.x = x;
            this.width = PIPE_WIDTH;
            this.initialGapY = initialGapY;
            this.currentGapY = initialGapY;
            this.movesVertically = movesVertically;
            this.verticalDirection = Math.random() > 0.5 ? 1 : -1;
            this.passed = false;

            this.topPipe = { y: 0, height: 0 };
            this.bottomPipe = { y: 0, height: 0 };
            this._calculateDimensions();
        }

        _calculateDimensions() {
            this.topPipe.y = 0;
            this.topPipe.height = this.currentGapY - PIPE_GAP / 2;
            if (this.topPipe.height < MIN_PIPE_SEGMENT_HEIGHT) this.topPipe.height = MIN_PIPE_SEGMENT_HEIGHT;

            this.bottomPipe.y = this.currentGapY + PIPE_GAP / 2;
            this.bottomPipe.height = GAME_HEIGHT - this.bottomPipe.y;
            if (this.bottomPipe.height < MIN_PIPE_SEGMENT_HEIGHT) {
                this.bottomPipe.height = MIN_PIPE_SEGMENT_HEIGHT;
            }

            if(this.topPipe.y + this.topPipe.height > this.bottomPipe.y){
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

                const minPossibleGapY = this.initialGapY - PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const maxPossibleGapY = this.initialGapY + PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const screenEdgeMinGapY = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10;
                const screenEdgeMaxGapY = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10);
                const finalMinGapY = Math.max(minPossibleGapY, screenEdgeMinGapY);
                const finalMaxGapY = Math.min(maxPossibleGapY, screenEdgeMaxGapY);

                if (newGapCenter > finalMaxGapY || newGapCenter < finalMinGapY) {
                    this.verticalDirection *= -1;
                    newGapCenter = Math.max(finalMinGapY, Math.min(finalMaxGapY, newGapCenter));
                }
                this.currentGapY = newGapCenter;
            }
            this._calculateDimensions();
        }

        draw() {
            if (!pipeImg.isReady) return;

            if (this.topPipe.height > 0) {
                ctx.save();
                ctx.translate(this.x, this.topPipe.y + this.topPipe.height);
                ctx.scale(1, -1);
                ctx.drawImage(pipeImg, 0, 0, this.width, this.topPipe.height);
                ctx.restore();
            }

            if (this.bottomPipe.height > 0) {
                ctx.drawImage(pipeImg, this.x, this.bottomPipe.y, this.width, this.bottomPipe.height);
            }
        }
    }

    class PowerUp { /* ... (same as previous version) ... */
        constructor(x, y, type) {
            this.x = x; this.y = y; this.size = POWERUP_SIZE; this.type = type; this.collected = false;
        }
        update() { this.x -= gameSpeed; }
        draw() {
            if (this.collected) return;
            if (this.type === 'shield') {
                ctx.beginPath();
                ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 220, 255, 0.9)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(20,20,20,0.7)'; ctx.lineWidth = 2; ctx.stroke();
                const symbol = 'S';
                const symbolColor = '#1e272e';
                const powerUpFont = `bold ${this.size * 0.7}px 'Bangers', cursive`;
                ctx.fillStyle = symbolColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = powerUpFont;
                ctx.fillText(symbol, this.x + this.size / 2, this.y + this.size / 2 + this.size * 0.08);
            } else if (this.type === 'fuel') {
                if (fuelPowerUpImg.isReady) {
                    ctx.drawImage(fuelPowerUpImg, this.x, this.y, this.size, this.size);
                } else {
                    ctx.beginPath();
                    ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 190, 0, 0.9)';
                    ctx.fill();
                    const symbol = 'F';
                    const symbolColor = '#1e272e';
                    const powerUpFont = `bold ${this.size * 0.7}px 'Bangers', cursive`;
                    ctx.fillStyle = symbolColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.font = powerUpFont;
                    ctx.fillText(symbol, this.x + this.size / 2, this.y + this.size / 2 + this.size * 0.08);
                }
            }
        }
        applyEffect(rocketInstance) {
            playSound(sounds.powerup);
            if (this.type === 'shield') {
                rocketInstance.shieldActive = true; rocketInstance.shieldTimer = SHIELD_DURATION;
            } else if (this.type === 'fuel') {
                rocketInstance.fuel = MAX_FUEL;
            }
            this.collected = true;
            for (let i = 0; i < 20; i++) {
                particles.push(new Particle(this.x + this.size / 2, this.y + this.size / 2, 'collect'));
            }
        }
    }

    class Particle { /* ... (same as previous version with brown fart particles) ... */
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type;
            this.size = Math.random() * (type === 'explosion' ? 10 : 7) + 3;
            this.initialLife = (type === 'explosion' ? 70 : 40) + Math.random() * 30;
            this.life = this.initialLife;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (type === 'explosion' ? 10 : (type === 'collect' ? 5 : 3)) + 1;
            if (type === 'thrust') { // Fart particles
                const r = Math.floor(Math.random() * 50) + 100; 
                const g = Math.floor(Math.random() * 40) + 60;  
                const b = Math.floor(Math.random() * 30) + 20;  
                this.color = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.4 + 0.4})`; 
                this.velocityX = (Math.random() - 0.5) * 2.5; 
                this.velocityY = Math.random() * 2.0 + 1.0;   
                this.size = Math.random() * 8 + 4; 
            } else { 
                this.velocityX = Math.cos(angle) * speed;
                this.velocityY = Math.sin(angle) * speed;
                if (type === 'explosion') {
                    this.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 120)}, 0, 0.8)`;
                } else { 
                    this.color = `rgba(255, 230, ${Math.random() > 0.5 ? 50 : 150}, 0.8)`;
                }
            }
        }
        update() {
            this.x += this.velocityX; this.y += this.velocityY;
            if (this.type === 'thrust') { 
                this.velocityY += 0.03; 
                this.velocityX *= 0.98; 
                this.size *= 0.99;      
            } else if (this.type === 'explosion' || this.type === 'collect') {
                this.velocityX *= 0.97; this.velocityY *= 0.97;
                if(this.type === 'explosion') this.velocityY += 0.1;
            }
            this.life--;
            if (this.size < 1) this.life = 0; 
        }
        draw() { 
            ctx.globalAlpha = Math.max(0, this.life / this.initialLife);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    function playSound(sound) {
        if (sound && sound.src && sound.readyState >= 2) { // HAVE_CURRENT_DATA or more
            sound.currentTime = 0;
            sound.play().catch(error => {
                console.warn(`Sound play failed for ${sound.src}:`, error);
                // This often happens due to browser autoplay restrictions requiring user interaction first.
                // The first click on "Start Game" might count as user interaction for subsequent sounds.
            });
        } else if (sound && sound.src) {
            console.warn(`Sound ${sound.src} not ready or no src. State: ${sound.readyState}, networkState: ${sound.networkState}`);
            // If loading failed or src is bad, it might not play.
            // Attempt to load if it hasn't started.
            if(sound.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || sound.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                 if (sound.src) sound.load(); // Only call load if src is set
            }
        }
    }

    function drawStartScreenCharacter(bobOffset) {
        if (!laliCharacterImg.isReady || !ctx) return;
        const charWidth = ROCKET_WIDTH * 1.8;
        const charHeight = ROCKET_HEIGHT * 1.8;
        const charX = GAME_WIDTH / 2 - charWidth / 2;
        const charYBase = GAME_HEIGHT * 0.35 - charHeight / 2;
        const charY = charYBase + bobOffset;
        ctx.drawImage(laliCharacterImg, charX, charY, charWidth, charHeight);
    }

    function startScreenAnimationLoop() {
        if (gameState !== 'START' || !ctx) {
            isStartScreenLoopRunning = false;
            return;
        }
        isStartScreenLoopRunning = true;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        startScreenAnimFrame++;
        const bobOffset = Math.sin(startScreenAnimFrame * startScreenCharBobSpeed) * startScreenCharYOffsetMax;
        drawStartScreenCharacter(bobOffset);
        requestAnimationFrame(startScreenAnimationLoop);
    }

    function initGame() {
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
        canSpawnEmergencyBeans = true;
        emergencyBeansCooldownTimer = 0;
        if (assetsLoaded >= assetsToLoad && laliCharacterImg.isReady && !isStartScreenLoopRunning) {
            startScreenAnimationLoop();
        }
    }

    function startGame() {
        isStartScreenLoopRunning = false; // Stop start screen animation
        gameState = 'PLAYING';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        rocket = new Rocket();
        pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0;
        gameSpeed = PIPE_SPEED_INITIAL;
        canSpawnEmergencyBeans = true;
        emergencyBeansCooldownTimer = 0;
        updateUI(rocket);
        gameLoop();
    }

    function gameOver() { /* ... (same as previous version) ... */
        playSound(sounds.hit); gameState = 'GAMEOVER';
        if (rocket) {
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2, 'explosion'));
            }
            rocket.y = -2000; 
        }

        if (score > highScore) {
            highScore = score; saveHighScore();
            if(newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'block';
        } else {
            if(newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'none';
        }
        if(finalScoreDisplay) finalScoreDisplay.textContent = score; 
        if(gameOverScreen) gameOverScreen.style.display = 'flex';
        updateUI(rocket);
    }

    function loadHighScore() { highScore = parseInt(localStorage.getItem('flappyLaliFartV2')) || 0; }
    function saveHighScore() { localStorage.setItem('flappyLaliFartV2', highScore); }
    function handleInput(e) { /* ... (same as previous version) ... */
        if (e.code === 'Space' || e.type === 'mousedown' || e.type === 'touchstart') {
            e.preventDefault();
            if (gameState === 'PLAYING' && rocket) { rocket.flap(); }
        }
    }
    function generatePipes() { /* ... (same as previous version) ... */
        if (frame % Math.floor(PIPE_SPACING / gameSpeed) === 0) {
            const minPossibleYForGapCenter = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 20;
            const maxPossibleYForGapCenter = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 20);
            const rangeForGapCenter = maxPossibleYForGapCenter - minPossibleYForGapCenter;
            let initialGapY = (rangeForGapCenter > 0) ? (Math.random() * rangeForGapCenter + minPossibleYForGapCenter) : (GAME_HEIGHT / 2);
            const movesVertically = Math.random() < 0.4;
            pipes.push(new Pipe(GAME_WIDTH, initialGapY, movesVertically));
        }
        pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
    }
    function generatePowerUps() { /* ... (same as previous version) ... */
        if (Math.random() < POWERUP_SPAWN_CHANCE && powerUps.length < 3) {
            const powerUpType = Math.random() < 0.4 ? 'shield' : 'fuel';
            const powerUpY = Math.random() * (GAME_HEIGHT - POWERUP_SIZE - 150) + 75;
            const powerUpX = GAME_WIDTH + Math.random() * 200;
            powerUps.push(new PowerUp(powerUpX, powerUpY, powerUpType));
        }
        powerUps = powerUps.filter(pu => pu.x + pu.size > 0 && !pu.collected);
    }
    function trySpawnEmergencyBeans() { /* ... (same as previous version) ... */
        if (rocket && rocket.fuel < (MAX_FUEL * (LOW_FUEL_THRESHOLD_PERCENT / 100)) && canSpawnEmergencyBeans) {
            const existingFuelPowerUp = powerUps.find(pu => pu.type === 'fuel');
            if (!existingFuelPowerUp) {
                console.log("Low fuel! Spawning emergency beans.");
                const powerUpY = rocket.y + (Math.random() - 0.5) * 100;
                const clampedY = Math.max(POWERUP_SIZE / 2, Math.min(GAME_HEIGHT - POWERUP_SIZE * 1.5, powerUpY));
                let spawnX = GAME_WIDTH * 0.8;
                if (pipes.length > 0) {
                    const nextPipe = pipes.find(p => p.x + p.width > rocket.x + rocket.width);
                    if (nextPipe) {
                        spawnX = nextPipe.x + nextPipe.width + Math.random() * PIPE_SPACING * 0.3 + 50;
                    } else if (pipes[pipes.length-1].x + pipes[pipes.length-1].width > 0){
                        spawnX = pipes[pipes.length-1].x + pipes[pipes.length-1].width + Math.random() * PIPE_SPACING * 0.3 + 50;
                    }
                }
                spawnX = Math.max(spawnX, rocket.x + GAME_WIDTH * 0.3);
                spawnX = Math.min(spawnX, GAME_WIDTH * 1.5);
                powerUps.push(new PowerUp(spawnX, clampedY, 'fuel'));
                canSpawnEmergencyBeans = false;
                emergencyBeansCooldownTimer = EMERGENCY_BEANS_COOLDOWN_FRAMES;
            }
        }
        if (emergencyBeansCooldownTimer > 0) {
            emergencyBeansCooldownTimer--;
            if (emergencyBeansCooldownTimer <= 0) {
                canSpawnEmergencyBeans = true;
            }
        }
    }
    function checkCollisions() { /* ... (same as previous version) ... */
        if (!rocket || gameState !== 'PLAYING') return;
        if (rocket.y + rocket.height >= GAME_HEIGHT) {
            rocket.y = GAME_HEIGHT - rocket.height; rocket.velocityY = 0;
            if (!rocket.shieldActive) { gameOver(); return; }
            else { rocket.velocityY = FLAP_STRENGTH * 0.3; playSound(sounds.hit); }
        }
        for (let pipe of pipes) {
            const rocketRect = { x: rocket.x, y: rocket.y, width: rocket.width, height: rocket.height };
            const topPipeEff = {
                x: pipe.x + PIPE_HITBOX_INSET_X, y: pipe.topPipe.y,
                width: pipe.width - 2 * PIPE_HITBOX_INSET_X, height: pipe.topPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE
            };
            if (topPipeEff.width < 0) topPipeEff.width = 0; if (topPipeEff.height < 0) topPipeEff.height = 0;
            if (!rocket.shieldActive &&
                rocketRect.x < topPipeEff.x + topPipeEff.width && rocketRect.x + rocketRect.width > topPipeEff.x &&
                rocketRect.y < topPipeEff.y + topPipeEff.height && rocketRect.y + rocketRect.height > topPipeEff.y) {
                gameOver(); return;
            }
            const bottomPipeEff = {
                x: pipe.x + PIPE_HITBOX_INSET_X, y: pipe.bottomPipe.y + PIPE_HITBOX_INSET_Y_GAPEDGE,
                width: pipe.width - 2 * PIPE_HITBOX_INSET_X, height: pipe.bottomPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE
            };
            if (bottomPipeEff.width < 0) bottomPipeEff.width = 0; if (bottomPipeEff.height < 0) bottomPipeEff.height = 0;
            if (!rocket.shieldActive &&
                rocketRect.x < bottomPipeEff.x + bottomPipeEff.width && rocketRect.x + rocketRect.width > bottomPipeEff.x &&
                rocketRect.y < bottomPipeEff.y + bottomPipeEff.height && rocketRect.y + rocketRect.height > bottomPipeEff.y) {
                gameOver(); return;
            }
            if (!pipe.passed && pipe.x + pipe.width < rocket.x) {
                pipe.passed = true; score++; playSound(sounds.score); gameSpeed += 0.02;
            }
        }
        for (let pu of powerUps) {
            if (!pu.collected &&
                rocket.x < pu.x + pu.size && rocket.x + rocket.width > pu.x &&
                rocket.y < pu.y + pu.size && rocket.y + rocket.height > pu.y) {
                pu.applyEffect(rocket);
            }
        }
    }
    function updateUI(currentRocket) { /* ... (same as previous version) ... */
        if(scoreDisplay) scoreDisplay.textContent = `Score: ${score}`;
        if(highScoreDisplay) highScoreDisplay.textContent = `High Score: ${highScore}`;
        let fuelSource = currentRocket || (rocket ? rocket : { fuel: MAX_FUEL });
        if (fuelSource && fuelBar) {
            const fuelPercentage = (fuelSource.fuel / MAX_FUEL) * 100;
            fuelBar.style.width = `${fuelPercentage}%`;
            if (fuelPercentage < 20) fuelBar.style.backgroundColor = '#d63031';
            else if (fuelPercentage < 50) fuelBar.style.backgroundColor = '#fdcb6e';
            else fuelBar.style.backgroundColor = '#e17055';
        } else if (fuelBar) {
             fuelBar.style.width = '100%';
             fuelBar.style.backgroundColor = '#e17055';
        }
    }
    function updateGameObjects() { /* ... (same as previous version) ... */
        if (gameState !== 'PLAYING') return;
        if (rocket) rocket.update();
        pipes.forEach(pipe => pipe.update());
        powerUps.forEach(pu => pu.update());
        particles.forEach((p, index) => {
            p.update();
            if (p.life <= 0) particles.splice(index, 1);
        });
    }
    function drawGameObjects() { /* ... (same as previous version, now Lali is drawn by Rocket.draw) ... */
        if (!ctx) return;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        pipes.forEach(pipe => pipe.draw());
        powerUps.forEach(pu => pu.draw());
        if (gameState !== 'GAMEOVER' && rocket) rocket.draw(); // This will draw Lali
        particles.forEach(p => p.draw());
    }
    function gameLoop() { /* ... (same as previous version) ... */
        if (gameState !== 'PLAYING') return;
        frame++;
        generatePipes();
        if (frame % 75 === 0) generatePowerUps();
        trySpawnEmergencyBeans();
        updateGameObjects();
        checkCollisions();
        drawGameObjects();
        updateUI(rocket);
        requestAnimationFrame(gameLoop);
    }

    // Event Listeners
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', startGame);
    window.addEventListener('keydown', handleInput);
    if (canvas) {
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleInput, { passive: false });
    }

    initGame();
});

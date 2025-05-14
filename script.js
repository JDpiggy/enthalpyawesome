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

    // NEW: Background Music
    const backgroundMusic = new Audio();
    backgroundMusic.isReady = false; // Tracks if loading was attempted/successful

    let assetsToLoad = 4; // Updated: 3 images + 1 music
    let assetsLoaded = 0;

    function assetLoadManager() {
        assetsLoaded++;
        console.log(`Assets loaded: ${assetsLoaded}/${assetsToLoad}`);
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
                 // Attempt to play music once all assets are loaded and on start screen
                 if (backgroundMusic.isReady && backgroundMusic.paused) {
                    backgroundMusic.play().catch(e => {
                        console.warn("Background Music autoplay likely blocked by browser on initial load. Will attempt play on 'Start Game' click.", e);
                    });
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

    // NEW: Background Music Loading
    backgroundMusic.src = 'assets/sounds/background_music.mp3'; // <<< IMPORTANT: SET YOUR MUSIC FILE PATH
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3; // Adjust volume as needed (0.0 to 1.0)
    backgroundMusic.oncanplaythrough = () => {
        backgroundMusic.isReady = true;
        console.log("Background music can play through.");
        assetLoadManager();
    };
    backgroundMusic.onerror = (e) => {
        backgroundMusic.isReady = false; // Set to false, or true if you count "attempted"
        console.error("Failed to load background music.", e);
        assetLoadManager(); // Still call asset manager to not block the game
    };
    // Browsers often require user interaction to load/play audio. Some might load metadata without explicit load().
    // Explicitly calling load() is good practice.
    try {
        backgroundMusic.load();
    } catch (e) {
        console.error("Error calling backgroundMusic.load():", e);
        // If load() itself throws an error (unlikely for valid audio elements but possible in some environments)
        // We'll still call assetLoadManager from onerror if it triggers.
        // If onerror doesn't trigger, we might need to call assetLoadManager here too.
        // However, onerror should cover most load failures.
    }
    // --- END ASSET LOADING ---

    const sounds = {
        flap: new Audio(), score: new Audio(), hit: new Audio(),
        powerup: new Audio(), fuelEmpty: new Audio()
    };
    sounds.flap.src = 'assets/sounds/fart.wav';

    Object.values(sounds).forEach(sound => {
        if (sound.src) {
            sound.load();
            sound.oncanplaythrough = () => console.log(`${sound.src} can play through.`);
            sound.onerror = (e) => console.error(`Error loading sound: ${sound.src}`, e);
        }
    });

    // Rocket (Lali Character) properties
    const ROCKET_WIDTH = 90;
    const ROCKET_HEIGHT = 130;
    const GRAVITY = 0.28;
    const FLAP_STRENGTH = -7.5;
    const MAX_FUEL = 100;
    const FUEL_CONSUMPTION = 2.5;
    const FUEL_REGEN_RATE = 0;

    // Pipe properties
    const PIPE_WIDTH = 120;
    const PIPE_GAP = 260 + (ROCKET_HEIGHT - 95);
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
    const startScreenCharYOffsetMax = 25; // UPDATED: Increased for a more noticeable bob with a larger character
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

    class Pipe {
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

            if(this.topPipe.y + this.topPipe.height > this.bottomPipe.y){ // Ensure pipes don't overlap if gap is too small
                this.topPipe.height = Math.max(MIN_PIPE_SEGMENT_HEIGHT, this.currentGapY - PIPE_GAP / 2);
                this.bottomPipe.y = this.currentGapY + PIPE_GAP / 2;
                this.bottomPipe.height = Math.max(MIN_PIPE_SEGMENT_HEIGHT, GAME_HEIGHT - this.bottomPipe.y);
            }
        }

        update() {
            this.x -= gameSpeed;

            if (this.movesVertically) {
                const moveAmount = PIPE_VERTICAL_SPEED * this.verticalDirection;
                let newGapCenter = this.currentGapY + moveAmount;

                const minPossibleGapY = this.initialGapY - PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const maxPossibleGapY = this.initialGapY + PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const screenEdgeMinGapY = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10; // Min Y for gap center considering pipe heights
                const screenEdgeMaxGapY = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10); // Max Y for gap center
                const finalMinGapY = Math.max(minPossibleGapY, screenEdgeMinGapY);
                const finalMaxGapY = Math.min(maxPossibleGapY, screenEdgeMaxGapY);

                if (newGapCenter > finalMaxGapY || newGapCenter < finalMinGapY) {
                    this.verticalDirection *= -1;
                    newGapCenter = Math.max(finalMinGapY, Math.min(finalMaxGapY, newGapCenter)); // Clamp
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
                ctx.scale(1, -1); // Flip for top pipe
                ctx.drawImage(pipeImg, 0, 0, this.width, this.topPipe.height);
                ctx.restore();
            }

            if (this.bottomPipe.height > 0) {
                ctx.drawImage(pipeImg, this.x, this.bottomPipe.y, this.width, this.bottomPipe.height);
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
                } else { // Fallback drawing for fuel
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

    class Particle {
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
                } else { // collect particles
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
                if(this.type === 'explosion') this.velocityY += 0.1; // gravity for explosion bits
            }
            this.life--;
            if (this.size < 1) this.life = 0; // particle fades if too small
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
            });
        } else if (sound && sound.src) {
            console.warn(`Sound ${sound.src} not ready or no src. State: ${sound.readyState}, networkState: ${sound.networkState}`);
            if(sound.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || sound.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                 if (sound.src) sound.load();
            }
        }
    }

    function drawStartScreenCharacter(bobOffset) {
        if (!laliCharacterImg.isReady || !ctx) return;

        // UPDATED: Make character bigger
        const scaleFactor = 2.8; // Increased from 1.8 for a much bigger character
        const charWidth = ROCKET_WIDTH * scaleFactor;
        const charHeight = ROCKET_HEIGHT * scaleFactor;

        // UPDATED: Position character on the right side of the screen
        // This positions the character's center at 80% of the game width.
        // Adjust 0.80 (80%) as needed.
        const charX = GAME_WIDTH * 0.80 - charWidth / 2;

        // UPDATED: Adjust Y to be roughly vertically centered and accommodate bobbing
        const charYBase = GAME_HEIGHT / 2 - charHeight / 2; // Center vertically
        const charY = charYBase + bobOffset;

        ctx.drawImage(laliCharacterImg, charX, charY, charWidth, charHeight);
    }

    function startScreenAnimationLoop() {
        if (gameState !== 'START' || !ctx) {
            isStartScreenLoopRunning = false;
            return;
        }
        isStartScreenLoopRunning = true;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Clear canvas for animation

        startScreenAnimFrame++;
        const bobOffset = Math.sin(startScreenAnimFrame * startScreenCharBobSpeed) * startScreenCharYOffsetMax;
        drawStartScreenCharacter(bobOffset); // Draw the updated character

        requestAnimationFrame(startScreenAnimationLoop);
    }

    function initGame() {
        rocket = null; // Ensure rocket is null before new one is created
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

        updateUI({ fuel: MAX_FUEL }); // Initialize UI with full fuel
        if (ctx) {
             ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Clear canvas initially
        }

        canSpawnEmergencyBeans = true;
        emergencyBeansCooldownTimer = 0;

        // Start animation loop if assets are ready and not already running
        if (assetsLoaded >= assetsToLoad && laliCharacterImg.isReady && !isStartScreenLoopRunning) {
            startScreenAnimationLoop();
            // Attempt to play music here once assets are loaded
            if (backgroundMusic.isReady && backgroundMusic.paused) {
                backgroundMusic.play().catch(e => {
                    console.warn("BG Music autoplay likely blocked on init. Will try on game start.", e);
                });
            }
        }
    }

    function startGame() {
        isStartScreenLoopRunning = false; // Stop start screen animation
        gameState = 'PLAYING';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';

        rocket = new Rocket();
        pipes = []; // Reset pipes
        powerUps = []; // Reset powerups
        particles = []; // Reset particles
        score = 0;
        frame = 0;
        gameSpeed = PIPE_SPEED_INITIAL; // Reset game speed
        canSpawnEmergencyBeans = true;
        emergencyBeansCooldownTimer = 0;

        updateUI(rocket);

        // NEW: Play background music on game start (reliable way due to autoplay policies)
        if (backgroundMusic.isReady && backgroundMusic.paused) {
            backgroundMusic.play().catch(e => console.error("Error playing background music:", e));
        } else if (backgroundMusic.isReady && !backgroundMusic.paused) {
            // Music is already playing, do nothing or you could restart it if desired
            // backgroundMusic.currentTime = 0; // To restart if it was already playing
        }


        gameLoop();
    }

    function gameOver() {
        playSound(sounds.hit);
        gameState = 'GAMEOVER';

        if (rocket) { // Create explosion particles at rocket's last known good position
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2, 'explosion'));
            }
            rocket.y = -2000; // Move rocket off-screen
        }


        if (score > highScore) {
            highScore = score;
            saveHighScore();
            if(newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'block';
        } else {
            if(newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'none';
        }

        if(finalScoreDisplay) finalScoreDisplay.textContent = score;
        if(gameOverScreen) gameOverScreen.style.display = 'flex';

        updateUI(rocket); // Update UI, rocket might be null or off-screen
    }

    function loadHighScore() { highScore = parseInt(localStorage.getItem('flappyLaliFartV2')) || 0; }
    function saveHighScore() { localStorage.setItem('flappyLaliFartV2', highScore); }

    function handleInput(e) {
        if (e.code === 'Space' || e.type === 'mousedown' || e.type === 'touchstart') {
            e.preventDefault(); // Prevent default actions like page scroll on space or text selection on click
            if (gameState === 'PLAYING' && rocket) {
                rocket.flap();
            }
            // Optional: Could make first click anywhere on start screen also start game
            // if (gameState === 'START' && startButton && !startButton.disabled) {
            //    startGame();
            // }
        }
    }

    function generatePipes() {
        if (frame % Math.floor(PIPE_SPACING / gameSpeed) === 0) {
            const minPossibleYForGapCenter = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 20;
            const maxPossibleYForGapCenter = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 20);
            const rangeForGapCenter = maxPossibleYForGapCenter - minPossibleYForGapCenter;

            let initialGapY = (rangeForGapCenter > 0) ? (Math.random() * rangeForGapCenter + minPossibleYForGapCenter) : (GAME_HEIGHT / 2);
            const movesVertically = Math.random() < 0.4; // 40% chance a pipe pair moves
            pipes.push(new Pipe(GAME_WIDTH, initialGapY, movesVertically));
        }
        pipes = pipes.filter(pipe => pipe.x + pipe.width > 0); // Remove off-screen pipes
    }

    function generatePowerUps() {
        if (Math.random() < POWERUP_SPAWN_CHANCE && powerUps.length < 3) { // Limit max on-screen powerups
            const powerUpType = Math.random() < 0.4 ? 'shield' : 'fuel'; // 40% shield, 60% fuel
            const powerUpY = Math.random() * (GAME_HEIGHT - POWERUP_SIZE - 150) + 75; // Spawn within a vertical band
            const powerUpX = GAME_WIDTH + Math.random() * 200; // Spawn just off-screen to the right
            powerUps.push(new PowerUp(powerUpX, powerUpY, powerUpType));
        }
        powerUps = powerUps.filter(pu => pu.x + pu.size > 0 && !pu.collected); // Remove collected or off-screen
    }

    function trySpawnEmergencyBeans() {
        if (rocket && rocket.fuel < (MAX_FUEL * (LOW_FUEL_THRESHOLD_PERCENT / 100)) && canSpawnEmergencyBeans) {
            const existingFuelPowerUp = powerUps.find(pu => pu.type === 'fuel');
            if (!existingFuelPowerUp) { // Only spawn if no fuel power-up is already on screen
                console.log("Low fuel! Spawning emergency beans.");
                const powerUpY = rocket.y + (Math.random() - 0.5) * 100; // Near rocket's current Y
                const clampedY = Math.max(POWERUP_SIZE / 2, Math.min(GAME_HEIGHT - POWERUP_SIZE * 1.5, powerUpY));

                let spawnX = GAME_WIDTH * 0.8; // Default spawn X
                // Try to spawn it after the next pipe or a bit ahead of the rocket
                if (pipes.length > 0) {
                    const nextPipe = pipes.find(p => p.x + p.width > rocket.x + rocket.width);
                    if (nextPipe) {
                        spawnX = nextPipe.x + nextPipe.width + Math.random() * PIPE_SPACING * 0.3 + 50;
                    } else if (pipes[pipes.length-1].x + pipes[pipes.length-1].width > 0){ // If last pipe is still on screen
                        spawnX = pipes[pipes.length-1].x + pipes[pipes.length-1].width + Math.random() * PIPE_SPACING * 0.3 + 50;
                    }
                }
                spawnX = Math.max(spawnX, rocket.x + GAME_WIDTH * 0.3); // Ensure it's not too close behind
                spawnX = Math.min(spawnX, GAME_WIDTH * 1.5); // Don't spawn it excessively far

                powerUps.push(new PowerUp(spawnX, clampedY, 'fuel'));
                canSpawnEmergencyBeans = false; // Prevent immediate re-spawn
                emergencyBeansCooldownTimer = EMERGENCY_BEANS_COOLDOWN_FRAMES;
            }
        }

        if (emergencyBeansCooldownTimer > 0) {
            emergencyBeansCooldownTimer--;
            if (emergencyBeansCooldownTimer <= 0) {
                canSpawnEmergencyBeans = true; // Cooldown finished
            }
        }
    }

    function checkCollisions() {
        if (!rocket || gameState !== 'PLAYING') return;

        // Ground collision
        if (rocket.y + rocket.height >= GAME_HEIGHT) {
            rocket.y = GAME_HEIGHT - rocket.height; // Settle on ground
            rocket.velocityY = 0;
            if (!rocket.shieldActive) {
                gameOver();
                return;
            } else { // Shield active, bounce slightly
                rocket.velocityY = FLAP_STRENGTH * 0.3; // Small bounce
                playSound(sounds.hit); // Play hit sound even with shield
            }
        }

        // Pipe collisions
        for (let pipe of pipes) {
            const rocketRect = { x: rocket.x, y: rocket.y, width: rocket.width, height: rocket.height };

            // Define effective hitbox for top pipe (inset for leniency)
            const topPipeEff = {
                x: pipe.x + PIPE_HITBOX_INSET_X,
                y: pipe.topPipe.y,
                width: pipe.width - 2 * PIPE_HITBOX_INSET_X,
                height: pipe.topPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE
            };
            if (topPipeEff.width < 0) topPipeEff.width = 0; if (topPipeEff.height < 0) topPipeEff.height = 0;

            if (!rocket.shieldActive &&
                rocketRect.x < topPipeEff.x + topPipeEff.width &&
                rocketRect.x + rocketRect.width > topPipeEff.x &&
                rocketRect.y < topPipeEff.y + topPipeEff.height &&
                rocketRect.y + rocketRect.height > topPipeEff.y) {
                gameOver();
                return;
            }

            // Define effective hitbox for bottom pipe
            const bottomPipeEff = {
                x: pipe.x + PIPE_HITBOX_INSET_X,
                y: pipe.bottomPipe.y + PIPE_HITBOX_INSET_Y_GAPEDGE,
                width: pipe.width - 2 * PIPE_HITBOX_INSET_X,
                height: pipe.bottomPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE
            };
            if (bottomPipeEff.width < 0) bottomPipeEff.width = 0; if (bottomPipeEff.height < 0) bottomPipeEff.height = 0;

            if (!rocket.shieldActive &&
                rocketRect.x < bottomPipeEff.x + bottomPipeEff.width &&
                rocketRect.x + rocketRect.width > bottomPipeEff.x &&
                rocketRect.y < bottomPipeEff.y + bottomPipeEff.height &&
                rocketRect.y + rocketRect.height > bottomPipeEff.y) {
                gameOver();
                return;
            }

            // Score increment
            if (!pipe.passed && pipe.x + pipe.width < rocket.x) {
                pipe.passed = true;
                score++;
                playSound(sounds.score);
                gameSpeed += 0.02; // Slightly increase game speed with score
            }
        }

        // Power-up collisions
        for (let pu of powerUps) {
            if (!pu.collected &&
                rocket.x < pu.x + pu.size &&
                rocket.x + rocket.width > pu.x &&
                rocket.y < pu.y + pu.size &&
                rocket.y + rocket.height > pu.y) {
                pu.applyEffect(rocket);
            }
        }
    }

    function updateUI(currentRocket) {
        if(scoreDisplay) scoreDisplay.textContent = `Score: ${score}`;
        if(highScoreDisplay) highScoreDisplay.textContent = `High Score: ${highScore}`;

        let fuelSource = currentRocket || (rocket ? rocket : { fuel: MAX_FUEL }); // Get fuel from current rocket or default
        if (fuelSource && fuelBar) {
            const fuelPercentage = (fuelSource.fuel / MAX_FUEL) * 100;
            fuelBar.style.width = `${fuelPercentage}%`;
            if (fuelPercentage < LOW_FUEL_THRESHOLD_PERCENT) fuelBar.style.backgroundColor = '#d63031'; // Critical Red
            else if (fuelPercentage < 50) fuelBar.style.backgroundColor = '#fdcb6e'; // Warning Yellow
            else fuelBar.style.backgroundColor = '#e17055'; // Default Orange/Red (beans color)
        } else if (fuelBar) { // Fallback if no rocket (e.g., on initGame before rocket exists)
             fuelBar.style.width = '100%';
             fuelBar.style.backgroundColor = '#e17055';
        }
    }

    function updateGameObjects() {
        if (gameState !== 'PLAYING') return;
        if (rocket) rocket.update();
        pipes.forEach(pipe => pipe.update());
        powerUps.forEach(pu => pu.update());
        particles.forEach((p, index) => { // Update and remove dead particles
            p.update();
            if (p.life <= 0) particles.splice(index, 1);
        });
    }

    function drawGameObjects() {
        if (!ctx) return;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Clear canvas every frame

        pipes.forEach(pipe => pipe.draw());
        powerUps.forEach(pu => pu.draw());
        if (gameState !== 'GAMEOVER' && rocket) rocket.draw(); // Draw Lali (rocket)
        particles.forEach(p => p.draw());
    }

    function gameLoop() {
        if (gameState !== 'PLAYING') return;

        frame++;
        generatePipes();
        if (frame % 75 === 0) generatePowerUps(); // Generate powerups less frequently
        trySpawnEmergencyBeans();

        updateGameObjects();
        checkCollisions(); // Check collisions after updates
        drawGameObjects(); // Draw after updates and collision checks
        updateUI(rocket);

        requestAnimationFrame(gameLoop);
    }

    // Event Listeners
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', startGame);

    window.addEventListener('keydown', handleInput);
    if (canvas) {
        canvas.addEventListener('mousedown', handleInput);
        // Use { passive: false } for touchstart to allow preventDefault()
        canvas.addEventListener('touchstart', handleInput, { passive: false });
    }

    // Initialize the game
    initGame();
});

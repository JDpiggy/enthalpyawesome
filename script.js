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
    const GAME_WIDTH = 400;
    const GAME_HEIGHT = 600;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    let rocket, pipes, powerUps, particles;
    let score, highScore, frame, gameSpeed, gameState;
    let soundEnabled = true;

    // --- ASSET LOADING ---
    const rocketImg = new Image();
    // IMPORTANT: Verify this path is correct relative to your index.html file
    // Based on your screenshot "advancedflappy / assets / tiles / pixil-frame-0.png"
    // If index.html is in the 'advancedflappy' folder, this path should be correct.
    rocketImg.src = 'assets/tiles/pixil-frame-0.png';
    rocketImg.isReady = false; // Custom flag to check if loaded

    let assetsToLoad = 1; // Number of critical assets (just the rocket image for now)
    let assetsLoaded = 0;

    function assetLoadManager() {
        assetsLoaded++;
        if (assetsLoaded >= assetsToLoad) {
            // All critical assets are accounted for (loaded or failed)
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = "Start Game";
            }
            console.log("Asset loading phase complete. Game ready to start.");
            // If the game needs an immediate redraw after assets load, trigger it here.
            // For this game, enabling the start button is sufficient.
        }
    }

    rocketImg.onload = () => {
        console.log("Rocket image loaded successfully: " + rocketImg.src);
        rocketImg.isReady = true;
        assetLoadManager();
    };
    rocketImg.onerror = () => {
        console.error("Failed to load rocket image: " + rocketImg.src + ". Using fallback shape.");
        rocketImg.isReady = false; // Ensure it's false
        assetLoadManager(); // Still count as "load attempt finished"
    };
    // --- END ASSET LOADING ---


    // const shieldImg = new Image(); shieldImg.src = 'assets/shield_icon.png';
    // const fuelCanImg = new Image(); fuelCanImg.src = 'assets/fuel_icon.png';

    const sounds = {
        flap: new Audio(), // 'assets/flap.wav'
        score: new Audio(), // 'assets/score.wav'
        hit: new Audio(),   // 'assets/hit.wav'
        powerup: new Audio(),// 'assets/pickup.wav'
        fuelEmpty: new Audio() // 'assets/fuel_empty.wav'
    };

    const ROCKET_WIDTH = 30;
    const ROCKET_HEIGHT = 50; // Image will be scaled to this
    const GRAVITY = 0.3;
    const FLAP_STRENGTH = -7;
    const MAX_FUEL = 100;
    const FUEL_CONSUMPTION = 1.5;
    const FUEL_REGEN_RATE = 0.05;

    const PIPE_WIDTH = 70;
    const PIPE_GAP = 150;
    const PIPE_SPACING = 220;
    const PIPE_SPEED_INITIAL = 2;
    const PIPE_VERTICAL_MOVEMENT_MAX = 50;
    const PIPE_VERTICAL_SPEED = 0.5;

    const POWERUP_SIZE = 25;
    const POWERUP_SPAWN_CHANCE = 0.005;
    const SHIELD_DURATION = 300;

    class Rocket {
        constructor() {
            this.x = 50;
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
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(this.x + this.width / 2, this.y + this.height, 'thrust'));
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
            // --- MODIFIED ROCKET DRAWING ---
            if (rocketImg.isReady) {
                // Draw the loaded image
                ctx.drawImage(rocketImg, this.x, this.y, this.width, this.height);
            } else {
                // Fallback: Draw the original red triangle if image isn't ready or failed
                ctx.fillStyle = 'red'; // Original fallback color
                ctx.beginPath();
                ctx.moveTo(this.x, this.y + this.height);
                ctx.lineTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.closePath();
                ctx.fill();
            }
            // --- END MODIFIED ROCKET DRAWING ---

            if (this.shieldActive) {
                ctx.strokeStyle = 'cyan';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, Math.max(this.width, this.height) * 0.7, 0, Math.PI * 2);
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
            this.verticalDirection = 1;
            this.initialY = this.y;
            this.initialHeight = this.height;
        }

        update() {
            this.x -= gameSpeed;

            if (this.movesVertically) {
                if (this.isTopPipe) {
                    this.height += PIPE_VERTICAL_SPEED * this.verticalDirection;
                    if (this.height > this.initialHeight + PIPE_VERTICAL_MOVEMENT_MAX || this.height < this.initialHeight - PIPE_VERTICAL_MOVEMENT_MAX) {
                        this.verticalDirection *= -1;
                        this.height = Math.max(50, Math.min(this.gapY - PIPE_GAP / 2 - 20, this.height));
                    }
                } else {
                    const oldBottom = this.y + this.height;
                    this.y += PIPE_VERTICAL_SPEED * this.verticalDirection;
                    this.height = oldBottom - this.y;

                    if (this.y > this.initialY + PIPE_VERTICAL_MOVEMENT_MAX || this.y < this.initialY - PIPE_VERTICAL_MOVEMENT_MAX) {
                        this.verticalDirection *= -1;
                        this.y = Math.max(this.gapY + PIPE_GAP / 2 + 20, Math.min(GAME_HEIGHT - 50, this.y));
                        this.height = GAME_HEIGHT - this.y;
                    }
                }
            }
        }

        draw() {
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#58a041';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        }
    }

    class PowerUp {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.size = POWERUP_SIZE;
            this.type = type;
            this.collected = false;
        }

        update() {
            this.x -= gameSpeed;
        }

        draw() {
            if (this.collected) return;
            ctx.beginPath();
            ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
            if (this.type === 'shield') {
                ctx.fillStyle = 'rgba(0, 200, 255, 0.8)';
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 12px Arial';
                ctx.fillText('S', this.x + this.size / 2, this.y + this.size / 2 + 1);
            } else if (this.type === 'fuel') {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 12px Arial';
                ctx.fillText('F', this.x + this.size / 2, this.y + this.size / 2 + 1);
            }
        }

        applyEffect(rocket) {
            playSound(sounds.powerup);
            if (this.type === 'shield') {
                rocket.shieldActive = true;
                rocket.shieldTimer = SHIELD_DURATION;
            } else if (this.type === 'fuel') {
                rocket.fuel = MAX_FUEL;
            }
            this.collected = true;
            for (let i = 0; i < 10; i++) {
                particles.push(new Particle(this.x + this.size/2, this.y + this.size/2, 'collect'));
            }
        }
    }

    class Particle {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.size = Math.random() * 5 + 2;
            this.life = 30 + Math.random() * 30;
            if (type === 'thrust') {
                this.color = `rgba(255, ${Math.floor(Math.random() * 155) + 100}, 0, ${Math.random() * 0.5 + 0.5})`;
                this.velocityX = (Math.random() - 0.5) * 2;
                this.velocityY = Math.random() * 2 + 1;
            } else if (type === 'explosion') {
                this.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 100)}, 0, ${Math.random() * 0.5 + 0.5})`;
                this.velocityX = (Math.random() - 0.5) * 10;
                this.velocityY = (Math.random() - 0.5) * 10;
            } else if (type === 'collect') {
                this.color = `rgba(255, 255, 0, ${Math.random() * 0.5 + 0.5})`;
                this.velocityX = (Math.random() - 0.5) * 3;
                this.velocityY = (Math.random() - 0.5) * 3;
            }
        }

        update() {
            this.x += this.velocityX;
            this.y += this.velocityY;
            if (this.type === 'thrust') this.velocityY += 0.05;
            this.life--;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function playSound(sound) {
        if (soundEnabled && sound.src) {
            sound.currentTime = 0;
            sound.play().catch(e => console.warn("Audio play failed:", e));
        }
    }

    function initGame() {
        rocket = new Rocket();
        pipes = [];
        powerUps = [];
        particles = [];
        score = 0;
        frame = 0;
        gameSpeed = PIPE_SPEED_INITIAL;
        gameState = 'START';
        loadHighScore();
        updateUI();
        startScreen.style.display = 'flex';
        gameOverScreen.style.display = 'none';

        // --- HANDLE START BUTTON STATE BASED ON ASSET LOADING ---
        if (startButton) {
            if (assetsLoaded < assetsToLoad) {
                startButton.disabled = true;
                startButton.textContent = "Loading Assets...";
            } else {
                startButton.disabled = false;
                startButton.textContent = "Start Game";
            }
        }
        // --- END HANDLE START BUTTON ---
    }

    function startGame() {
        gameState = 'PLAYING';
        startScreen.style.display = 'none';
        rocket.fuel = MAX_FUEL;
        frame = 0; // Reset frame for consistent pipe/powerup generation
        pipes = []; // Clear any pre-existing pipes from a previous game over screen
        powerUps = []; // Clear powerups
        particles = []; // Clear particles
        gameSpeed = PIPE_SPEED_INITIAL; // Reset game speed
        gameLoop();
    }

    function gameOver() {
        playSound(sounds.hit);
        gameState = 'GAMEOVER';
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2, 'explosion'));
        }
        if(rocket) rocket.y = -1000; // Move rocket off-screen

        if (score > highScore) {
            highScore = score;
            saveHighScore();
            newHighScoreText.style.display = 'block';
        } else {
            newHighScoreText.style.display = 'none';
        }
        finalScoreDisplay.textContent = score;
        gameOverScreen.style.display = 'flex';
    }

    function loadHighScore() {
        highScore = parseInt(localStorage.getItem('flappyRocketHighScore')) || 0;
    }

    function saveHighScore() {
        localStorage.setItem('flappyRocketHighScore', highScore);
    }

    function handleInput(e) {
        if (e.code === 'Space' || e.type === 'mousedown' || e.type === 'touchstart') {
            e.preventDefault();
            if (gameState === 'PLAYING') {
                rocket.flap();
            }
        }
    }

    function generatePipes() {
        if (frame % Math.floor(PIPE_SPACING / gameSpeed) === 0) {
            const gapY = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + (PIPE_GAP / 2) + 50;
            const movesVertically = Math.random() < 0.3;
            pipes.push(new Pipe(GAME_WIDTH, true, gapY, movesVertically));
            pipes.push(new Pipe(GAME_WIDTH, false, gapY, movesVertically));

            if (Math.random() < POWERUP_SPAWN_CHANCE * 50 ) {
                const powerUpType = Math.random() < 0.5 ? 'shield' : 'fuel';
                const powerUpY = gapY - POWERUP_SIZE / 2 + (Math.random() - 0.5) * (PIPE_GAP / 3);
                powerUps.push(new PowerUp(GAME_WIDTH + PIPE_WIDTH / 2 - POWERUP_SIZE / 2, powerUpY, powerUpType));
            }
        }
        pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
    }

    function generatePowerUps() {
        if (Math.random() < POWERUP_SPAWN_CHANCE && powerUps.length < 2) {
            const powerUpType = Math.random() < 0.5 ? 'shield' : 'fuel';
            const powerUpY = Math.random() * (GAME_HEIGHT - POWERUP_SIZE - 100) + 50;
            const powerUpX = GAME_WIDTH + Math.random() * 100;
            powerUps.push(new PowerUp(powerUpX, powerUpY, powerUpType));
        }
        powerUps = powerUps.filter(pu => pu.x + pu.size > 0 && !pu.collected);
    }

    function checkCollisions() {
        if (!rocket) return; // Rocket might not be initialized if game over very fast

        if (rocket.y + rocket.height >= GAME_HEIGHT) {
            rocket.y = GAME_HEIGHT - rocket.height;
            rocket.velocityY = 0;
            if (!rocket.shieldActive) gameOver();
            else {
                rocket.velocityY = FLAP_STRENGTH * 0.5;
                playSound(sounds.hit);
            }
        }

        for (let pipe of pipes) {
            if (!rocket.shieldActive &&
                rocket.x < pipe.x + pipe.width &&
                rocket.x + rocket.width > pipe.x &&
                rocket.y < pipe.y + pipe.height &&
                rocket.y + rocket.height > pipe.y) {
                gameOver();
                return;
            }
            if (!pipe.passed && pipe.x + pipe.width < rocket.x && pipe.isTopPipe) {
                pipe.passed = true;
                const bottomPipe = pipes.find(p => p.gapY === pipe.gapY && !p.isTopPipe && !p.passed);
                if(bottomPipe) bottomPipe.passed = true;
                score++;
                playSound(sounds.score);
                gameSpeed += 0.05;
            }
        }

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

    function updateUI() {
        scoreDisplay.textContent = `Score: ${score}`;
        highScoreDisplay.textContent = `High Score: ${highScore}`;
        if (rocket) { // Ensure rocket exists before trying to access fuel
            const fuelPercentage = (rocket.fuel / MAX_FUEL) * 100;
            fuelBar.style.width = `${fuelPercentage}%`;
            fuelBar.style.backgroundColor = fuelPercentage < 20 ? 'red' : (fuelPercentage < 50 ? 'yellow' : 'orange');
        } else { // Default fuel bar state if no rocket (e.g. before game starts)
            fuelBar.style.width = '100%';
             fuelBar.style.backgroundColor = 'orange';
        }
    }

    function updateGameObjects() {
        if (!rocket) return;
        rocket.update();
        pipes.forEach(pipe => pipe.update());
        powerUps.forEach(pu => pu.update());
        particles.forEach((p, index) => {
            p.update();
            if (p.life <= 0) particles.splice(index, 1);
        });
    }

    function drawGameObjects() {
        ctx.fillStyle = '#70c5ce';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        pipes.forEach(pipe => pipe.draw());
        powerUps.forEach(pu => pu.draw());
        if (gameState !== 'GAMEOVER' && rocket) rocket.draw(); // Don't draw rocket if exploded
        particles.forEach(p => p.draw());
    }

    function gameLoop() {
        if (gameState !== 'PLAYING') return;

        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        frame++;
        generatePipes();
        generatePowerUps();

        updateGameObjects();
        checkCollisions(); 
        
        drawGameObjects();
        updateUI();

        if (gameState === 'PLAYING') {
            requestAnimationFrame(gameLoop);
        }
    }
    
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', () => {
        initGame(); 
        startGame(); 
    });
    
    window.addEventListener('keydown', handleInput);
    canvas.addEventListener('mousedown', handleInput);
    canvas.addEventListener('touchstart', handleInput, { passive: false });

    toggleSoundButton.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        toggleSoundButton.textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
    });

    initGame();
});

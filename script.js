document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT GRABBING ---
    // ... (same as your previous version) ...
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const fuelBar = document.getElementById('fuelBar');
    const coinCountDisplay = document.getElementById('coinCount');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const shopScreen = document.getElementById('shopScreen');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const shopButton = document.getElementById('shopButton');
    const backToMenuButton = document.getElementById('backToMenuButton');
    const finalScoreDisplay = document.getElementById('finalScore');
    const coinsEarnedDisplay = document.getElementById('coinsEarned');
    const newHighScoreTextGameOver = document.getElementById('newHighScoreTextGameOver');
    const shopCoinCountDisplay = document.getElementById('shopCoinCount');
    const shopPanelLeft = document.getElementById('shopPanelLeft');
    const shopCharacterPreviewImage = document.getElementById('shopCharacterPreviewImage');
    const shopCharacterName = document.getElementById('shopCharacterName');
    const shopCharacterPriceStatus = document.getElementById('shopCharacterPriceStatus');
    document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT GRABBING ---
    // ... (same as your previous version) ...
    const redeemCodeInput = document.getElementById('redeemCodeInput'); // NEW
    const redeemCodeButton = document.getElementById('redeemCodeButton'); // NEW
    const redeemStatusMessage = document.getElementById('redeemStatusMessage'); // NEW
    // ... (other consts for canvas, buttons, screens etc.)

    // ... (GAME SETTINGS & GLOBAL VARIABLES - same) ...
    // ... (CHARACTER DATA - same) ...
    // ... (ASSET LOADING - same, ensure all assets are loaded) ...
    // ... (SOUNDS - same, ensure 'purchase.wav' is set up) ...
    // ... (ROCKET_PROPERTIES, OBSTACLE_PROPERTIES, POWERUP_PROPERTIES - same) ...
    // ... (Rocket, Obstacle, PowerUp, Particle classes - same) ...
    // ... (playSound, drawStartScreenCharacter, startScreenAnimationLoop - same) ...
    // ... (localStorage functions, shop logic - updateCoinDisplay, renderCharacterShop, etc. - same) ...

    // --- REDEEM CODE LOGIC ---
    const redeemCodes = {
        "imjaron": {
            description: "Unlocks all Lali characters!",
            action: () => {
                let unlockedSomething = false;
                charactersData.forEach(char => {
                    if (!char.unlocked) {
                        char.unlocked = true;
                        unlockedSomething = true;
                    }
                });
                if (unlockedSomething) {
                    saveCharacterData(); // Save the new unlock status
                    // If shop is open, re-render it. If not, it will be correct when opened.
                    if (shopScreen.style.display !== 'none') {
                        renderCharacterShop();
                        updateShopPreview(shopPreviewCharacterId); // Refresh preview if it was one of the newly unlocked
                    }
                    return true; // Code was successful
                }
                return false; // No new characters were unlocked (already had them all)
            }
        },
        // Example for a future code:
        // "morecoins": {
        //     description: "Grants 1000 bonus coins!",
        //     action: () => {
        //         coins += 1000;
        //         saveCoins();
        //         updateCoinDisplay();
        //         return true;
        //     }
        // }
    };

    function handleRedeemCode() {
        if (!redeemCodeInput || !redeemStatusMessage) return;

        const enteredCode = redeemCodeInput.value.trim().toLowerCase(); // Normalize code
        redeemCodeInput.value = ''; // Clear input

        if (redeemCodes[enteredCode]) {
            const codeEffect = redeemCodes[enteredCode];
            const success = codeEffect.action(); // Execute the code's action

            if (success) {
                playSound(sounds.purchase); // Play sound on successful redemption
                redeemStatusMessage.textContent = codeEffect.description || "Code redeemed successfully!";
                redeemStatusMessage.className = 'success';
            } else {
                // Action might return false if, for example, all chars were already unlocked
                redeemStatusMessage.textContent = "Code applied, but no new changes.";
                redeemStatusMessage.className = 'success'; // Still a valid code
            }
        } else {
            redeemStatusMessage.textContent = "Invalid code. Please try again.";
            redeemStatusMessage.className = 'error';
        }

        redeemStatusMessage.style.display = 'block';
        // Optional: Hide message after a few seconds
        setTimeout(() => {
            if (redeemStatusMessage) redeemStatusMessage.style.display = 'none';
        }, 4000);
    }


    // --- MAIN GAME STATE FUNCTIONS ---
    function initGame() {
        // ... (existing initGame logic: loadGameData, reset vars, show startScreen, etc.) ...
        if (gameState !== 'LOADING') loadGameData();
        rocket = null; obstacles = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = OBSTACLE_SPEED_INITIAL; // Assuming OBSTACLE_SPEED_INITIAL is defined

        if(startScreen) startScreen.style.display = 'flex';
        if(gameOverScreen) gameOverScreen.style.display = 'none';
        if(shopScreen) shopScreen.style.display = 'none';
        if(redeemStatusMessage) redeemStatusMessage.style.display = 'none'; // Hide redeem message on init

        if (startButton) startButton.disabled = assetsLoaded < assetsToLoad;
        if (shopButton) shopButton.disabled = assetsLoaded < assetsToLoad;
        if (redeemCodeButton) redeemCodeButton.disabled = assetsLoaded < assetsToLoad; // Disable redeem button too if assets loading

        updateUI(null);
        if (ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        isStartScreenLoopRunning = false;
        if (gameState === 'START') {
            const gameChar = getCurrentGameCharacter();
            if (gameChar && gameChar.isReady) {
                isStartScreenLoopRunning = true;
                startScreenAnimationLoop();
            }
            if (backgroundMusic.isReady && backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.warn("BG Music autoplay likely blocked on init.", e));
            }
        }
    }

    // ... (startGame - same as before) ...
    // ... (gameOver - same as before) ...
    // ... (handleInput, generateObstacles, generatePowerUps, trySpawnEmergencyBeans, checkCollisions - same as before) ...
    // ... (updateGameObjects, drawGameObjects, gameLoop, updateUI - same as before) ...


    // --- EVENT LISTENERS ---
    // ... (existing listeners for startButton, restartButton, shopButton, backToMenuButton, window, canvas) ...
    if (redeemCodeButton) { // NEW
        redeemCodeButton.addEventListener('click', handleRedeemCode);
    }
    // Add Enter key listener for redeem input
    if (redeemCodeInput) { // NEW
        redeemCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleRedeemCode();
            }
        });
    }


    // --- INITIALIZE GAME ---
    // ... (same: loadGameData() then disable buttons until assets loaded by assetLoadManager calling initGame) ...
    loadGameData();
    if (startButton) startButton.disabled = true;
    if (shopButton) shopButton.disabled = true;
    if (redeemCodeButton) redeemCodeButton.disabled = true; // Also disable redeem button initially

});


    // --- GAME SETTINGS & GLOBAL VARIABLES ---
    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;
    if (canvas) {
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
    } else {
        console.error("Canvas element not found!");
        return;
    }

    let rocket, obstacles, powerUps, particles; // Renamed pipes to obstacles
    let score = 0, highScore = 0, frame = 0, gameSpeed = 2.0;
    let gameState = 'LOADING';
    let coins = 0;

    // --- CHARACTER DATA & ASSET PATHS ---
    // ... (characterData same as your previous version) ...
    let charactersData = [
        { id: 'lali_classic', name: 'Lali Classic', imageSrc: 'assets/tiles/lali_classic.png', price: 0, imageObj: new Image(), isReady: false, unlocked: true },
        { id: 'lali_super', name: 'Super Lali', imageSrc: 'assets/tiles/lali_super.png', price: 500, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_robo', name: 'Robo Lali', imageSrc: 'assets/tiles/lali_robo.png', price: 1500, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_ninja', name: 'Ninja Lali', imageSrc: 'assets/tiles/lali_ninja.png', price: 3000, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_golden', name: 'Golden Lali', imageSrc: 'assets/tiles/lali_golden.png', price: 7500, imageObj: new Image(), isReady: false, unlocked: false },
    ];
    let currentSelectedCharacterId = 'lali_classic';
    let shopPreviewCharacterId = 'lali_classic';

    // --- ASSET LOADING ---
    const beakerObstacleImg = new Image(); beakerObstacleImg.src = 'assets/tiles/beaker-removebg-preview.png'; beakerObstacleImg.isReady = false;
    const rulerObstacleImg = new Image(); rulerObstacleImg.src = 'assets/tiles/ruler_obstacle.png'; rulerObstacleImg.isReady = false; // NEW
    const bookstackObstacleImg = new Image(); bookstackObstacleImg.src = 'assets/tiles/bookstack_obstacle.png'; bookstackObstacleImg.isReady = false; // NEW

    const fuelPowerUpImg = new Image(); fuelPowerUpImg.src = 'assets/tiles/beans-removebg-preview.png'; fuelPowerUpImg.isReady = false;
    const backgroundMusic = new Audio(); backgroundMusic.isReady = false;

    let assetsToLoad = 2 + 1 + charactersData.length + 2; // pipe, fuel, music, chars + 2 new obstacles
    let assetsLoaded = 0;

    // ... (getCharacterById, getCurrentGameCharacter, assetLoadManager same as before) ...
    function getCharacterById(id) { return charactersData.find(char => char.id === id) || charactersData[0]; }
    function getCurrentGameCharacter() { return getCharacterById(currentSelectedCharacterId); }
    function assetLoadManager(assetName = "Generic asset") {
        assetsLoaded++;
        console.log(`${assetName} loaded. Assets: ${assetsLoaded}/${assetsToLoad}`);
        if (assetsLoaded >= assetsToLoad) {
            console.log("All critical assets loading attempted.");
            gameState = 'START';
            initGame();
        }
    }
    charactersData.forEach(charData => { /* ... (character image loading same as before) ... */
        charData.imageObj.src = charData.imageSrc;
        charData.imageObj.onload = () => { charData.isReady = true; assetLoadManager(`Char ${charData.name}`); };
        charData.imageObj.onerror = () => { charData.isReady = false; console.error(`Failed char: ${charData.name}`); assetLoadManager(`Char ${charData.name} (fail)`); };
    });

    beakerObstacleImg.onload = () => { beakerObstacleImg.isReady = true; assetLoadManager("Beaker Obstacle"); };
    beakerObstacleImg.onerror = () => { beakerObstacleImg.isReady = false; console.error("Beaker Obstacle fail"); assetLoadManager("Beaker (fail)"); };
    rulerObstacleImg.onload = () => { rulerObstacleImg.isReady = true; assetLoadManager("Ruler Obstacle"); };
    rulerObstacleImg.onerror = () => { rulerObstacleImg.isReady = false; console.error("Ruler Obstacle fail"); assetLoadManager("Ruler (fail)"); };
    bookstackObstacleImg.onload = () => { bookstackObstacleImg.isReady = true; assetLoadManager("Bookstack Obstacle"); };
    bookstackObstacleImg.onerror = () => { bookstackObstacleImg.isReady = false; console.error("Bookstack Obstacle fail"); assetLoadManager("Bookstack (fail)"); };

    fuelPowerUpImg.onload = () => { fuelPowerUpImg.isReady = true; assetLoadManager("Fuel Image"); };
    fuelPowerUpImg.onerror = () => { fuelPowerUpImg.isReady = false; console.error("Fuel Image fail"); assetLoadManager("Fuel (fail)"); };
    backgroundMusic.src = 'assets/sounds/background_music.mp3'; backgroundMusic.loop = true; backgroundMusic.volume = 0.3;
    backgroundMusic.oncanplaythrough = () => { backgroundMusic.isReady = true; assetLoadManager("Background Music"); };
    backgroundMusic.onerror = () => { backgroundMusic.isReady = false; console.error("BG Music fail"); assetLoadManager("Music (fail)"); };
    try { backgroundMusic.load(); } catch (e) { console.error("Music load() call fail:", e); }

    const sounds = { /* ... (sound setup same as before, ensure purchase sound exists) ... */
        flap: new Audio(), score: new Audio(), hit: new Audio(),
        powerup: new Audio(), fuelEmpty: new Audio(), purchase: new Audio()
    };
    sounds.flap.src = 'assets/sounds/fart.wav';
    sounds.purchase.src = 'assets/sounds/purchase.wav';
    // sounds.score.src = 'assets/sounds/score.wav'; // Uncomment and provide files if you have them
    // sounds.hit.src = 'assets/sounds/hit.wav';
    // sounds.powerup.src = 'assets/sounds/powerup.wav';
    // sounds.fuelEmpty.src = 'assets/sounds/fuel_empty.wav';
    Object.values(sounds).forEach(sound => { /* ... (sound loading same as before) ... */
        if (sound.src) {
            sound.load();
            sound.oncanplaythrough = () => console.log(`${sound.src.split('/').pop()} ready`);
            sound.onerror = (e) => console.error(`Sound Error: ${sound.src}`, e);
        }
    });

    // --- ROCKET (PLAYER) PROPERTIES ---
    // ... (same as before) ...
    const ROCKET_WIDTH = 90; const ROCKET_HEIGHT = 130; const GRAVITY = 0.28; const FLAP_STRENGTH = -7.5;
    const MAX_FUEL = 100; const FUEL_CONSUMPTION = 2.5; const FUEL_REGEN_RATE = 0;

    // --- OBSTACLE PROPERTIES ---
    // Generic gap and spacing
    const OBSTACLE_GAP = 260 + (ROCKET_HEIGHT - 95); // Min vertical opening
    const OBSTACLE_SPACING = 420; // Horizontal distance between obstacle pairs
    const OBSTACLE_SPEED_INITIAL = 2.0; // Starting speed
    const MIN_OBSTACLE_SEGMENT_HEIGHT = 40; // Min height for top/bottom part of an obstacle
    const OBSTACLE_VERTICAL_MOVEMENT_MAX_OFFSET = 60;
    const OBSTACLE_VERTICAL_SPEED = 0.45;

    // Type-specific properties (VISUAL width for drawing, EFFECTIVE width for collision logic)
    // ** YOU WILL LIKELY NEED TO ADJUST THESE VALUES BASED ON YOUR IMAGES **
    const OBSTACLE_TYPES = {
        beaker: {
            img: beakerObstacleImg,
            visualWidth: 120,  // How wide the beaker image is
            effectiveWidth: 50,// How wide its collision zone is
            hitboxInsetX: 15,  // Leniency inset from effectiveWidth edges
            hitboxInsetYGapEdge: 20 // Leniency inset from gap edge
        },
        ruler: {
            img: rulerObstacleImg,
            visualWidth: 140,   // Rulers are thinner
            effectiveWidth: 70,
            hitboxInsetX: 5,
            hitboxInsetYGapEdge: 5 // Rulers are usually straight, less leniency needed at gap
        },
        bookstack: {
            img: bookstackObstacleImg,
            visualWidth: 150,  // Books are wider
            effectiveWidth: 120,
            hitboxInsetX: 15,
            hitboxInsetYGapEdge: 30 // Books might have uneven edges
        }
    };

    // --- POWER-UP PROPERTIES ---
    const POWERUP_SIZE = 100;
    const POWERUP_SPAWN_CHANCE = 0.12; // INCREASED from 0.0055
    // ... (other power-up properties same as before) ...
    const SHIELD_DURATION = 540; const LOW_FUEL_THRESHOLD_PERCENT = 20;
    let canSpawnEmergencyBeans = true; const EMERGENCY_BEANS_COOLDOWN_FRAMES = 180;
    let emergencyBeansCooldownTimer = 0;


    // --- CORE GAME CLASSES ---
    class Rocket { /* ... (Rocket class same as your previous version) ... */
        constructor() {
            this.x = GAME_WIDTH / 6; this.y = GAME_HEIGHT / 2 - ROCKET_HEIGHT / 2;
            this.width = ROCKET_WIDTH; this.height = ROCKET_HEIGHT; this.velocityY = 0;
            this.fuel = MAX_FUEL; this.shieldActive = false; this.shieldTimer = 0;
            this.character = getCurrentGameCharacter();
        }
        flap() {
            if (this.fuel > 0 && gameState === 'PLAYING') {
                this.velocityY = FLAP_STRENGTH; this.fuel -= FUEL_CONSUMPTION;
                if (this.fuel < 0) this.fuel = 0; playSound(sounds.flap);
                for (let i = 0; i < 8; i++) { particles.push(new Particle(this.x + this.width / 2, this.y + this.height * 0.9, 'thrust'));}
            } else if (gameState === 'PLAYING') { playSound(sounds.fuelEmpty); }
        }
        update() {
            this.velocityY += GRAVITY; this.y += this.velocityY;
            if (this.fuel < MAX_FUEL) { this.fuel += FUEL_REGEN_RATE; if (this.fuel > MAX_FUEL) this.fuel = MAX_FUEL; }
            if (this.shieldActive) { this.shieldTimer--; if (this.shieldTimer <= 0) this.shieldActive = false; }
            if (this.y < 0) { this.y = 0; this.velocityY = 0; }
        }
        draw() {
            const charImg = this.character.imageObj;
            if (this.character.isReady && charImg.complete && charImg.naturalWidth !== 0) { ctx.drawImage(charImg, this.x, this.y, this.width, this.height);
            } else { ctx.fillStyle = 'purple'; ctx.fillRect(this.x, this.y, this.width, this.height); }
            if (this.shieldActive) {
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'; ctx.lineWidth = 5; ctx.beginPath();
                const shieldRadius = Math.max(this.width, this.height) * 0.8;
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, shieldRadius, 0, Math.PI * 2); ctx.stroke();
            }
        }
    }

    class Obstacle { // Was Pipe class
        constructor(x, initialGapY, movesVertically, type) {
            this.x = x; // Leading edge for logic
            this.type = type;
            const typeProps = OBSTACLE_TYPES[this.type];
            this.image = typeProps.img;
            this.visualWidth = typeProps.visualWidth;
            this.effectiveWidth = typeProps.effectiveWidth;
            this.hitboxInsetX = typeProps.hitboxInsetX;
            this.hitboxInsetYGapEdge = typeProps.hitboxInsetYGapEdge;

            this.initialGapY = initialGapY;
            this.currentGapY = initialGapY;
            this.movesVertically = movesVertically;
            this.verticalDirection = Math.random() > 0.5 ? 1 : -1;
            this.passed = false;

            this.topPart = { y: 0, height: 0 }; // Renamed from topPipe
            this.bottomPart = { y: 0, height: 0 }; // Renamed from bottomPipe
            this._calculateDimensions();
        }

        _calculateDimensions() {
            this.topPart.y = 0;
            this.topPart.height = this.currentGapY - OBSTACLE_GAP / 2;
            if (this.topPart.height < MIN_OBSTACLE_SEGMENT_HEIGHT) this.topPart.height = MIN_OBSTACLE_SEGMENT_HEIGHT;

            this.bottomPart.y = this.currentGapY + OBSTACLE_GAP / 2;
            this.bottomPart.height = GAME_HEIGHT - this.bottomPart.y;
            if (this.bottomPart.height < MIN_OBSTACLE_SEGMENT_HEIGHT) {
                this.bottomPart.height = MIN_OBSTACLE_SEGMENT_HEIGHT;
            }
            // Ensure parts don't overlap if gap is too small
            if (this.topPart.y + this.topPart.height > this.bottomPart.y - MIN_OBSTACLE_SEGMENT_HEIGHT) { // Check with min height
                 this.topPart.height = Math.max(MIN_OBSTACLE_SEGMENT_HEIGHT, this.currentGapY - OBSTACLE_GAP / 2);
                 this.bottomPart.y = this.currentGapY + OBSTACLE_GAP / 2;
                 this.bottomPart.height = Math.max(MIN_OBSTACLE_SEGMENT_HEIGHT, GAME_HEIGHT - this.bottomPart.y);
            }
        }

        update() {
            this.x -= gameSpeed;
            if (this.movesVertically) {
                const moveAmount = OBSTACLE_VERTICAL_SPEED * this.verticalDirection;
                let newGapCenter = this.currentGapY + moveAmount;
                const minBase = this.initialGapY - OBSTACLE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const maxBase = this.initialGapY + OBSTACLE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const screenMin = OBSTACLE_GAP / 2 + MIN_OBSTACLE_SEGMENT_HEIGHT + 10;
                const screenMax = GAME_HEIGHT - (OBSTACLE_GAP / 2 + MIN_OBSTACLE_SEGMENT_HEIGHT + 10);
                const finalMin = Math.max(minBase, screenMin);
                const finalMax = Math.min(maxBase, screenMax);
                if (newGapCenter > finalMax || newGapCenter < finalMin) {
                    this.verticalDirection *= -1;
                    newGapCenter = Math.max(finalMin, Math.min(finalMax, newGapCenter));
                }
                this.currentGapY = newGapCenter;
            }
            this._calculateDimensions();
        }

        draw() {
            if (!this.image || !this.image.isReady) return;
            // Calculate drawX to center the visualWidth around the logical X if effectiveWidth is different
            const drawX = this.x - (this.visualWidth - this.effectiveWidth) / 2;

            if (this.topPart.height > 0) {
                ctx.save();
                ctx.translate(drawX, this.topPart.y + this.topPart.height);
                ctx.scale(1, -1);
                ctx.drawImage(this.image, 0, 0, this.visualWidth, this.topPart.height);
                ctx.restore();
            }
            if (this.bottomPart.height > 0) {
                ctx.drawImage(this.image, drawX, this.bottomPart.y, this.visualWidth, this.bottomPart.height);
            }
        }
    }

    class PowerUp { /* ... (PowerUp class same as your previous version) ... */
        constructor(x, y, type) { this.x = x; this.y = y; this.size = POWERUP_SIZE; this.type = type; this.collected = false; }
        update() { this.x -= gameSpeed; }
        draw() {
            if (this.collected) return; const centerX = this.x + this.size / 2; const centerY = this.y + this.size / 2;
            if (this.type === 'shield') {
                ctx.beginPath(); ctx.arc(centerX, centerY, this.size / 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 220, 255, 0.9)'; ctx.fill();
                ctx.strokeStyle = 'rgba(20,20,20,0.7)'; ctx.lineWidth = 2; ctx.stroke();
                const symbol = 'S'; const font = `bold ${this.size * 0.7}px 'Bangers', cursive`;
                ctx.fillStyle = '#1e272e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font; ctx.fillText(symbol, centerX, centerY + this.size * 0.08);
            } else if (this.type === 'fuel') {
                if (fuelPowerUpImg.isReady) { ctx.drawImage(fuelPowerUpImg, this.x, this.y, this.size, this.size);
                } else {
                    ctx.beginPath(); ctx.arc(centerX, centerY, this.size / 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 190, 0, 0.9)'; ctx.fill();
                    const symbol = 'F'; const font = `bold ${this.size * 0.7}px 'Bangers', cursive`;
                    ctx.fillStyle = '#1e272e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font; ctx.fillText(symbol, centerX, centerY + this.size * 0.08);
                }
            }
        }
        applyEffect(rocketInstance) {
            playSound(sounds.powerup);
            if (this.type === 'shield') { rocketInstance.shieldActive = true; rocketInstance.shieldTimer = SHIELD_DURATION; }
            else if (this.type === 'fuel') { rocketInstance.fuel = MAX_FUEL; }
            this.collected = true;
            for (let i = 0; i < 20; i++) { particles.push(new Particle(this.x + this.size / 2, this.y + this.size / 2, 'collect')); }
        }
    }
    class Particle { /* ... (Particle class same as your previous version) ... */
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type;
            this.size = Math.random() * (type === 'explosion' ? 10 : (type === 'thrust' ? 8 : 7)) + 3;
            this.initialLife = (type === 'explosion' ? 70 : (type === 'thrust' ? 30 : 40)) + Math.random() * 30; this.life = this.initialLife;
            const angle = Math.random() * Math.PI * 2; let speed = Math.random() * (type === 'explosion' ? 10 : (type === 'collect' ? 5 : 3)) + 1;
            if (type === 'thrust') {
                const r = Math.floor(Math.random() * 50) + 100; const g = Math.floor(Math.random() * 40) + 60; const b = Math.floor(Math.random() * 30) + 20;
                this.color = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.4 + 0.4})`; this.velocityX = (Math.random() - 0.5) * 2.5;
                this.velocityY = Math.random() * 2.0 + 1.0; this.size = Math.random() * 8 + 4;
            } else {
                this.velocityX = Math.cos(angle) * speed; this.velocityY = Math.sin(angle) * speed;
                if (type === 'explosion') { this.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 120)}, 0, 0.8)`;}
                else { this.color = `rgba(255, 230, ${Math.random() > 0.5 ? 50 : 150}, 0.8)`; }
            }
        }
        update() {
            this.x += this.velocityX; this.y += this.velocityY;
            if (this.type === 'thrust') { this.velocityY += 0.03; this.velocityX *= 0.98; this.size *= 0.99;}
            else if (this.type === 'explosion' || this.type === 'collect') { this.velocityX *= 0.97; this.velocityY *= 0.97; if (this.type === 'explosion') this.velocityY += 0.1; }
            this.life--; if (this.size < 1) this.life = 0;
        }
        draw() {
            if (this.life <= 0 || this.size <=0) return; ctx.globalAlpha = Math.max(0, this.life / this.initialLife); ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
        }
    }


    // --- SOUND PLAYBACK, START SCREEN ANIMATION ---
    // ... (playSound, drawStartScreenCharacter, startScreenAnimationLoop same as before) ...
    function playSound(sound) { /* ... (same) ... */
        if (sound && sound.src && sound.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            sound.currentTime = 0; sound.play().catch(error => console.warn(`Sound play failed for ${sound.src.split('/').pop()}:`, error));
        } else if (sound && sound.src) {
            console.warn(`Sound ${sound.src.split('/').pop()} not ready. State: ${sound.readyState}, Network: ${sound.networkState}`);
            if (sound.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || sound.networkState === HTMLMediaElement.NETWORK_EMPTY) { if (sound.src) sound.load(); }
        }
    }
    let startScreenAnimFrame = 0; const startScreenCharYOffsetMax = 25; const startScreenCharBobSpeed = 0.03; let isStartScreenLoopRunning = false;
    function drawStartScreenCharacter(bobOffset) { /* ... (same, uses getCurrentGameCharacter) ... */
        const gameChar = getCurrentGameCharacter(); if (!gameChar || !gameChar.isReady || !ctx) return; const charImg = gameChar.imageObj;
        const scaleFactor = 2.8; const charWidth = ROCKET_WIDTH * scaleFactor; const charHeight = ROCKET_HEIGHT * scaleFactor;
        const charX = GAME_WIDTH * 0.80 - charWidth / 2; const charYBase = GAME_HEIGHT / 2 - charHeight / 2; const charY = charYBase + bobOffset;
        if (charImg.complete && charImg.naturalWidth !== 0) ctx.drawImage(charImg, charX, charY, charWidth, charHeight);
        else { ctx.fillStyle = 'grey'; ctx.fillRect(charX, charY, charWidth, charHeight); }
    }
    function startScreenAnimationLoop() { /* ... (same) ... */
        if (gameState !== 'START' || !isStartScreenLoopRunning || startScreen.style.display === 'none') { isStartScreenLoopRunning = false; return; }
        if(ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); startScreenAnimFrame++;
        const bobOffset = Math.sin(startScreenAnimFrame * startScreenCharBobSpeed) * startScreenCharYOffsetMax;
        drawStartScreenCharacter(bobOffset); requestAnimationFrame(startScreenAnimationLoop);
    }


    // --- LOCALSTORAGE, SHOP LOGIC ---
    // ... (loadGameData, saveCoins, saveHighScore, saveCharacterData, updateCoinDisplay, renderCharacterShop, updateShopPreview, equipCharacter, buyCharacter same as before) ...
    function loadGameData() { /* ... (same, uses _v2 keys) ... */
        coins = parseInt(localStorage.getItem('flappyLaliCoins_v2')) || 0; highScore = parseInt(localStorage.getItem('flappyLaliFartV2_hs')) || 0;
        currentSelectedCharacterId = localStorage.getItem('flappyLaliSelectedChar_v2') || 'lali_classic'; shopPreviewCharacterId = currentSelectedCharacterId;
        const unlockedChars = JSON.parse(localStorage.getItem('flappyLaliUnlockedChars_v2'));
        if (unlockedChars && Array.isArray(unlockedChars)) { charactersData.forEach(char => { char.unlocked = unlockedChars.includes(char.id); }); }
        const classicChar = getCharacterById('lali_classic'); if (classicChar) classicChar.unlocked = true;
        const selected = getCharacterById(currentSelectedCharacterId);
        if (!selected || !selected.unlocked) { currentSelectedCharacterId = 'lali_classic'; shopPreviewCharacterId = 'lali_classic'; localStorage.setItem('flappyLaliSelectedChar_v2', currentSelectedCharacterId); }
        updateCoinDisplay();
    }
    function saveCoins() { localStorage.setItem('flappyLaliCoins_v2', coins); }
    function saveHighScore() { localStorage.setItem('flappyLaliFartV2_hs', highScore); }
    function saveCharacterData() { const unlockedCharIds = charactersData.filter(char => char.unlocked).map(char => char.id); localStorage.setItem('flappyLaliUnlockedChars_v2', JSON.stringify(unlockedCharIds)); localStorage.setItem('flappyLaliSelectedChar_v2', currentSelectedCharacterId); }
    function updateCoinDisplay() { if (coinCountDisplay) coinCountDisplay.textContent = coins; if (shopCoinCountDisplay) shopCoinCountDisplay.textContent = coins; }
    function renderCharacterShop() { /* ... (same, creates shop UI) ... */
        if (!shopPanelLeft) return; shopPanelLeft.innerHTML = '';
        charactersData.forEach(char => {
            const slot = document.createElement('div'); slot.classList.add('character-slot'); if (char.id === shopPreviewCharacterId) slot.classList.add('selected-in-shop');
            const img = new Image(); img.src = char.imageSrc; img.alt = char.name; if (!char.isReady || !char.imageObj.complete || char.imageObj.naturalWidth === 0) img.classList.add('not-ready'); slot.appendChild(img);
            const infoDiv = document.createElement('div'); infoDiv.classList.add('char-info-shop');
            const nameP = document.createElement('p'); nameP.classList.add('char-name'); nameP.textContent = char.name; infoDiv.appendChild(nameP);
            if (char.unlocked) { const statusP = document.createElement('p'); statusP.classList.add('char-status'); statusP.textContent = (char.id === currentSelectedCharacterId) ? "Equipped" : "Owned"; infoDiv.appendChild(statusP);
            } else { const priceP = document.createElement('p'); priceP.classList.add('char-price'); priceP.textContent = `Price: ${char.price}`; infoDiv.appendChild(priceP); }
            slot.appendChild(infoDiv);
            const buttonContainer = document.createElement('div'); buttonContainer.classList.add('shop-button-container'); // Added class for styling
            if (char.unlocked) { if (char.id !== currentSelectedCharacterId) { const equipButton = document.createElement('button'); equipButton.textContent = "Equip"; equipButton.onclick = (e) => { e.stopPropagation(); equipCharacter(char.id); }; buttonContainer.appendChild(equipButton);}
            } else { const buyButton = document.createElement('button'); buyButton.textContent = "Buy"; if (coins < char.price) buyButton.disabled = true; buyButton.onclick = (e) => { e.stopPropagation(); buyCharacter(char.id); }; buttonContainer.appendChild(buyButton); }
            slot.appendChild(buttonContainer); slot.onclick = () => updateShopPreview(char.id); shopPanelLeft.appendChild(slot);
        });
    }
    function updateShopPreview(charId) { /* ... (same, updates right panel of shop) ... */
        shopPreviewCharacterId = charId; const char = getCharacterById(charId); if (!char) return;
        if (shopCharacterPreviewImage) { if (char.isReady && char.imageObj.complete && char.imageObj.naturalWidth > 0) { shopCharacterPreviewImage.src = char.imageObj.src; shopCharacterPreviewImage.classList.remove('not-ready'); } else { shopCharacterPreviewImage.src = ''; shopCharacterPreviewImage.classList.add('not-ready'); }}
        if (shopCharacterName) shopCharacterName.textContent = char.name;
        if (shopCharacterPriceStatus) { if (char.unlocked) { shopCharacterPriceStatus.textContent = (char.id === currentSelectedCharacterId) ? "Currently Equipped" : "Owned"; shopCharacterPriceStatus.className = 'char-status owned'; } else { shopCharacterPriceStatus.textContent = `Price: ${char.price} Coins`; shopCharacterPriceStatus.className = 'char-status'; }}
        const slots = shopPanelLeft.querySelectorAll('.character-slot');
        slots.forEach(s => { const slotCharName = s.querySelector('.char-name').textContent; const slotChar = charactersData.find(c => c.name === slotCharName); if (slotChar && slotChar.id === charId) s.classList.add('selected-in-shop'); else s.classList.remove('selected-in-shop'); });
    }
    function equipCharacter(charId) { /* ... (same) ... */ const charToEquip = getCharacterById(charId); if (charToEquip && charToEquip.unlocked) { currentSelectedCharacterId = charId; saveCharacterData(); renderCharacterShop(); updateShopPreview(shopPreviewCharacterId); }}
    function buyCharacter(charId) { /* ... (same) ... */ const charToBuy = getCharacterById(charId); if (charToBuy && !charToBuy.unlocked && coins >= charToBuy.price) { coins -= charToBuy.price; charToBuy.unlocked = true; playSound(sounds.purchase); saveCoins(); saveCharacterData(); updateCoinDisplay(); renderCharacterShop(); updateShopPreview(charId); }}


    // --- MAIN GAME STATE FUNCTIONS ---
    function initGame() { /* ... (same logic, sets up start screen) ... */
        if (gameState !== 'LOADING') loadGameData();
        rocket = null; obstacles = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = OBSTACLE_SPEED_INITIAL;
        if(startScreen) startScreen.style.display = 'flex'; if(gameOverScreen) gameOverScreen.style.display = 'none'; if(shopScreen) shopScreen.style.display = 'none';
        if (startButton) startButton.disabled = assetsLoaded < assetsToLoad; if (shopButton) shopButton.disabled = assetsLoaded < assetsToLoad;
        updateUI(null); if (ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        isStartScreenLoopRunning = false;
        if (gameState === 'START') {
            const gameChar = getCurrentGameCharacter();
            if (gameChar && gameChar.isReady) { isStartScreenLoopRunning = true; startScreenAnimationLoop(); }
            if (backgroundMusic.isReady && backgroundMusic.paused) { backgroundMusic.play().catch(e => console.warn("BG Music autoplay blocked on init.", e)); }
        }
    }
    function startGame() { /* ... (same logic, starts the game playing state) ... */
        isStartScreenLoopRunning = false; if(ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        gameState = 'PLAYING'; if(startScreen) startScreen.style.display = 'none'; if(shopScreen) shopScreen.style.display = 'none'; if(gameOverScreen) gameOverScreen.style.display = 'none';
        rocket = new Rocket(); obstacles = []; powerUps = []; particles = []; score = 0; frame = 0; gameSpeed = OBSTACLE_SPEED_INITIAL;
        canSpawnEmergencyBeans = true; emergencyBeansCooldownTimer = 0; updateUI(rocket);
        if (backgroundMusic.isReady && backgroundMusic.paused) { backgroundMusic.play().catch(e => console.error("Error playing background music:", e));}
        gameLoop();
    }
    function gameOver() { /* ... (same logic, handles game over state and coin awarding) ... */
        playSound(sounds.hit); gameState = 'GAMEOVER';
        const earnedThisGame = score; coins += earnedThisGame; saveCoins(); updateCoinDisplay(); if (coinsEarnedDisplay) coinsEarnedDisplay.textContent = earnedThisGame;
        if (rocket) { for (let i = 0; i < 50; i++) { particles.push(new Particle(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2, 'explosion'));} rocket = null; }
        if (score > highScore) { highScore = score; saveHighScore(); if (newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'block';} else { if (newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'none';}
        if (finalScoreDisplay) finalScoreDisplay.textContent = score; if (gameOverScreen) gameOverScreen.style.display = 'flex'; updateUI(null);
    }

    // --- GAME LOOP AND MECHANICS ---
    function handleInput(e) { /* ... (same) ... */ if (e.code === 'Space' || e.type === 'mousedown' || e.type === 'touchstart') { e.preventDefault(); if (gameState === 'PLAYING' && rocket) rocket.flap(); }}

    function generateObstacles() { // Was generatePipes
        if (frame % Math.floor(OBSTACLE_SPACING / gameSpeed) === 0) {
            const obstacleTypeKeys = Object.keys(OBSTACLE_TYPES);
            const randomType = obstacleTypeKeys[Math.floor(Math.random() * obstacleTypeKeys.length)];

            const minGapCenter = OBSTACLE_GAP / 2 + MIN_OBSTACLE_SEGMENT_HEIGHT + 20;
            const maxGapCenter = GAME_HEIGHT - (OBSTACLE_GAP / 2 + MIN_OBSTACLE_SEGMENT_HEIGHT + 20);
            const range = maxGapCenter - minGapCenter;
            let initialGapY = (range > 0) ? (Math.random() * range + minGapCenter) : (GAME_HEIGHT / 2);
            const movesVertically = Math.random() < 0.4; // 40% chance obstacles move
            obstacles.push(new Obstacle(GAME_WIDTH, initialGapY, movesVertically, randomType));
        }
        obstacles = obstacles.filter(obs => obs.x + obs.visualWidth > 0); // Use visualWidth for culling
    }

    function generatePowerUps() { /* ... (same, uses updated POWERUP_SPAWN_CHANCE) ... */
        if (Math.random() < POWERUP_SPAWN_CHANCE && powerUps.length < 3) {
            const type = Math.random() < 0.4 ? 'shield' : 'fuel';
            const y = Math.random() * (GAME_HEIGHT - POWERUP_SIZE - 150) + 75;
            const x = GAME_WIDTH + Math.random() * 200; powerUps.push(new PowerUp(x, y, type));
        }
        powerUps = powerUps.filter(pu => pu.x + pu.size > 0 && !pu.collected);
    }
    function trySpawnEmergencyBeans() { /* ... (same) ... */
        if (rocket && rocket.fuel < (MAX_FUEL * (LOW_FUEL_THRESHOLD_PERCENT / 100)) && canSpawnEmergencyBeans) {
            const existingFuelPU = powerUps.find(pu => pu.type === 'fuel');
            if (!existingFuelPU) {
                console.log("Low fuel! Spawning emergency beans.");
                let spawnX = GAME_WIDTH * 0.8; const nearRocketY = rocket.y + (Math.random() - 0.5) * 100;
                const clampedY = Math.max(POWERUP_SIZE / 2, Math.min(GAME_HEIGHT - POWERUP_SIZE * 1.5, nearRocketY));
                const nextObs = obstacles.find(o => o.x + o.effectiveWidth > rocket.x + rocket.width); // Use effectiveWidth
                if (nextObs) spawnX = nextObs.x + nextObs.effectiveWidth + Math.random() * OBSTACLE_SPACING * 0.3 + 50;
                else if (obstacles.length > 0 && obstacles[obstacles.length-1].x + obstacles[obstacles.length-1].effectiveWidth > 0) { spawnX = obstacles[obstacles.length-1].x + obstacles[obstacles.length-1].effectiveWidth + Math.random() * OBSTACLE_SPACING * 0.3 + 50;}
                spawnX = Math.max(spawnX, rocket.x + GAME_WIDTH * 0.3); spawnX = Math.min(spawnX, GAME_WIDTH * 1.5);
                powerUps.push(new PowerUp(spawnX, clampedY, 'fuel')); canSpawnEmergencyBeans = false; emergencyBeansCooldownTimer = EMERGENCY_BEANS_COOLDOWN_FRAMES;
            }
        }
        if (emergencyBeansCooldownTimer > 0) { emergencyBeansCooldownTimer--; if (emergencyBeansCooldownTimer <= 0) canSpawnEmergencyBeans = true; }
    }

    function checkCollisions() {
        if (!rocket || gameState !== 'PLAYING') return;

        // Ground collision
        if (rocket.y + rocket.height >= GAME_HEIGHT) { /* ... (same) ... */
            rocket.y = GAME_HEIGHT - rocket.height; rocket.velocityY = 0;
            if (!rocket.shieldActive) { gameOver(); return; } else { rocket.velocityY = FLAP_STRENGTH * 0.3; playSound(sounds.hit); }
        }

        // Obstacle collisions
        for (let obs of obstacles) {
            const rocketRect = { x: rocket.x, y: rocket.y, width: rocket.width, height: rocket.height };
            // Collision X is based on logical start of obstacle, adjusted for its specific insets
            const obsCollisionX = obs.x + obs.hitboxInsetX;
            const obsCollisionWidth = obs.effectiveWidth - 2 * obs.hitboxInsetX;

            // Top part collision
            const topPartRect = {
                x: obsCollisionX, y: obs.topPart.y,
                width: obsCollisionWidth, height: obs.topPart.height - obs.hitboxInsetYGapEdge
            };
            if (topPartRect.height < 0) topPartRect.height = 0;
            if (!rocket.shieldActive &&
                rocketRect.x < topPartRect.x + topPartRect.width && rocketRect.x + rocketRect.width > topPartRect.x &&
                rocketRect.y < topPartRect.y + topPartRect.height && rocketRect.y + rocketRect.height > topPartRect.y) {
                gameOver(); return;
            }

            // Bottom part collision
            const bottomPartRect = {
                x: obsCollisionX, y: obs.bottomPart.y + obs.hitboxInsetYGapEdge,
                width: obsCollisionWidth, height: obs.bottomPart.height - obs.hitboxInsetYGapEdge
            };
            if (bottomPartRect.height < 0) bottomPartRect.height = 0;
            if (!rocket.shieldActive &&
                rocketRect.x < bottomPartRect.x + bottomPartRect.width && rocketRect.x + rocketRect.width > bottomPartRect.x &&
                rocketRect.y < bottomPartRect.y + bottomPartRect.height && rocketRect.y + rocketRect.height > bottomPartRect.y) {
                gameOver(); return;
            }

            // Score point
            if (!obs.passed && obs.x + obs.effectiveWidth < rocket.x) { // Use effectiveWidth for scoring pass
                obs.passed = true; score++; playSound(sounds.score); gameSpeed += 0.02; // Slight speed increase
            }
        }
        // Power-up collisions (same)
        for (let pu of powerUps) { if (!pu.collected && rocket.x < pu.x + pu.size && rocket.x + rocket.width > pu.x && rocket.y < pu.y + pu.size && rocket.y + rocket.height > pu.y) pu.applyEffect(rocket); }
    }

    function updateGameObjects() { /* ... (same, but calls obstacles.forEach) ... */
        if (gameState !== 'PLAYING') return; if (rocket) rocket.update();
        obstacles.forEach(obs => obs.update()); powerUps.forEach(pu => pu.update());
        particles = particles.filter(p => p.life > 0); particles.forEach(p => p.update());
    }
    function drawGameObjects() { /* ... (same, but calls obstacles.forEach) ... */
        if (!ctx) return; ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        obstacles.forEach(obs => obs.draw()); powerUps.forEach(pu => pu.draw());
        if (gameState === 'PLAYING' && rocket) rocket.draw(); particles.forEach(p => p.draw());
    }
    function gameLoop() { /* ... (same, but calls generateObstacles) ... */
        if (gameState !== 'PLAYING') return; frame++;
        generateObstacles(); if (frame % 75 === 0) generatePowerUps(); trySpawnEmergencyBeans();
        updateGameObjects(); checkCollisions(); drawGameObjects(); updateUI(rocket); requestAnimationFrame(gameLoop);
    }
    function updateUI(currentRocket) { /* ... (same) ... */
        if (scoreDisplay) scoreDisplay.textContent = `Score: ${score}`; if (highScoreDisplay) highScoreDisplay.textContent = `High Score: ${highScore}`; updateCoinDisplay();
        let fuelSource = currentRocket || (rocket ? rocket : { fuel: MAX_FUEL });
        if (fuelBar) { if (fuelSource) { const fuelPercentage = (fuelSource.fuel / MAX_FUEL) * 100; fuelBar.style.width = `${fuelPercentage}%`; if (fuelPercentage < LOW_FUEL_THRESHOLD_PERCENT) fuelBar.style.backgroundColor = '#d63031'; else if (fuelPercentage < 50) fuelBar.style.backgroundColor = '#fdcb6e'; else fuelBar.style.backgroundColor = '#e17055'; } else { fuelBar.style.width = '100%'; fuelBar.style.backgroundColor = '#e17055';}}
    }

    // --- EVENT LISTENERS & INITIALIZATION ---
    // ... (Event listeners for buttons and input same as before) ...
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', initGame);
    if (shopButton) { shopButton.addEventListener('click', () => { isStartScreenLoopRunning = false; if (ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); startScreen.style.display = 'none'; shopScreen.style.display = 'flex'; renderCharacterShop(); updateShopPreview(shopPreviewCharacterId); updateCoinDisplay(); });}
    if (backToMenuButton) { backToMenuButton.addEventListener('click', () => { shopScreen.style.display = 'none'; startScreen.style.display = 'flex'; const gameChar = getCurrentGameCharacter(); if (assetsLoaded >= assetsToLoad && gameChar && gameChar.isReady) { isStartScreenLoopRunning = true; startScreenAnimationLoop(); }});}
    window.addEventListener('keydown', handleInput);
    if (canvas) { canvas.addEventListener('mousedown', handleInput); canvas.addEventListener('touchstart', handleInput, { passive: false });}

    loadGameData();
    if (startButton) startButton.disabled = true;
    if (shopButton) shopButton.disabled = true;
});

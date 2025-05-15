document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT GRABBING ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements for Game
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const fuelBar = document.getElementById('fuelBar');
    const coinCountDisplay = document.getElementById('coinCount'); // Main coin display

    // Screen Elements
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const shopScreen = document.getElementById('shopScreen');

    // Buttons
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const shopButton = document.getElementById('shopButton');
    const backToMenuButton = document.getElementById('backToMenuButton');

    // Game Over Screen Elements
    const finalScoreDisplay = document.getElementById('finalScore');
    const coinsEarnedDisplay = document.getElementById('coinsEarned');
    const newHighScoreTextGameOver = document.getElementById('newHighScoreTextGameOver');

    // Shop Screen Elements
    const shopCoinCountDisplay = document.getElementById('shopCoinCount');
    const shopPanelLeft = document.getElementById('shopPanelLeft');
    const shopCharacterPreviewImage = document.getElementById('shopCharacterPreviewImage');
    const shopCharacterName = document.getElementById('shopCharacterName');
    const shopCharacterPriceStatus = document.getElementById('shopCharacterPriceStatus');

    // --- GAME SETTINGS & GLOBAL VARIABLES ---
    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;
    if (canvas) {
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
    } else {
        console.error("Canvas element not found!");
        return; // Stop script if canvas isn't found
    }


    let rocket, pipes, powerUps, particles;
    let score = 0, highScore = 0, frame = 0, gameSpeed = 2.0;
    let gameState = 'LOADING'; // Initial state
    let coins = 0;

    // --- CHARACTER DATA & ASSET PATHS ---
    let charactersData = [
        { id: 'lali_classic', name: 'Lali Classic', imageSrc: 'assets/tiles/lali_classic.png', price: 0, imageObj: new Image(), isReady: false, unlocked: true },
        { id: 'lali_super', name: 'Super Lali', imageSrc: 'assets/tiles/lali_super.png', price: 500, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_robo', name: 'Robo Lali', imageSrc: 'assets/tiles/lali_robo.png', price: 1500, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_ninja', name: 'Ninja Lali', imageSrc: 'assets/tiles/lali_ninja.png', price: 3000, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_golden', name: 'Golden Lali', imageSrc: 'assets/tiles/lali_golden.png', price: 7500, imageObj: new Image(), isReady: false, unlocked: false },
    ];
    let currentSelectedCharacterId = 'lali_classic'; // For the game
    let shopPreviewCharacterId = 'lali_classic';   // For the shop preview

    // --- ASSET LOADING ---
    const pipeImg = new Image(); pipeImg.src = 'assets/tiles/beaker-removebg-preview.png'; pipeImg.isReady = false;
    const fuelPowerUpImg = new Image(); fuelPowerUpImg.src = 'assets/tiles/beans-removebg-preview.png'; fuelPowerUpImg.isReady = false;
    const backgroundMusic = new Audio(); backgroundMusic.isReady = false;

    let assetsToLoad = 2 + 1 + charactersData.length; // pipe, fuel, music + all character images
    let assetsLoaded = 0;

    function getCharacterById(id) {
        return charactersData.find(char => char.id === id) || charactersData[0];
    }
    function getCurrentGameCharacter() {
        return getCharacterById(currentSelectedCharacterId);
    }

    function assetLoadManager(assetName = "Generic asset") {
        assetsLoaded++;
        console.log(`${assetName} loaded. Assets: ${assetsLoaded}/${assetsToLoad}`);
        if (assetsLoaded >= assetsToLoad) {
            console.log("All critical assets loading attempted.");
            gameState = 'START'; // Move to start state after loading
            initGame(); // Call initGame after all assets are processed
        }
    }

    charactersData.forEach(charData => {
        charData.imageObj.src = charData.imageSrc;
        charData.imageObj.onload = () => {
            charData.isReady = true; assetLoadManager(`Char ${charData.name}`);
        };
        charData.imageObj.onerror = () => {
            charData.isReady = false; console.error(`Failed to load char: ${charData.name} from ${charData.imageSrc}`); assetLoadManager(`Char ${charData.name} (failed)`);
        };
    });

    pipeImg.onload = () => { pipeImg.isReady = true; assetLoadManager("Pipe Image"); };
    pipeImg.onerror = () => { pipeImg.isReady = false; console.error("Failed to load pipe image"); assetLoadManager("Pipe Image (failed)"); };
    fuelPowerUpImg.onload = () => { fuelPowerUpImg.isReady = true; assetLoadManager("Fuel Image"); };
    fuelPowerUpImg.onerror = () => { fuelPowerUpImg.isReady = false; console.error("Failed to load fuel image"); assetLoadManager("Fuel Image (failed)"); };

    backgroundMusic.src = 'assets/sounds/background_music.mp3';
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;
    backgroundMusic.oncanplaythrough = () => { backgroundMusic.isReady = true; assetLoadManager("Background Music"); };
    backgroundMusic.onerror = () => { backgroundMusic.isReady = false; console.error("Failed to load background music."); assetLoadManager("Background Music (failed)"); };
    try { backgroundMusic.load(); } catch (e) { console.error("Error calling backgroundMusic.load():", e); }

    const sounds = {
        flap: new Audio(), score: new Audio(), hit: new Audio(),
        powerup: new Audio(), fuelEmpty: new Audio(), purchase: new Audio()
    };
    sounds.flap.src = 'assets/sounds/fart.wav';
    sounds.purchase.src = 'assets/sounds/purchase.wav'; // Ensure this file exists
    // Add other sound sources if they exist
    // sounds.score.src = 'assets/sounds/score.wav';
    // sounds.hit.src = 'assets/sounds/hit.wav';
    // sounds.powerup.src = 'assets/sounds/powerup.wav';
    // sounds.fuelEmpty.src = 'assets/sounds/fuel_empty.wav';


    Object.values(sounds).forEach(sound => {
        if (sound.src) {
            sound.load();
            sound.oncanplaythrough = () => console.log(`${sound.src.split('/').pop()} ready`);
            sound.onerror = (e) => console.error(`Sound Error: ${sound.src}`, e);
        } else {
            // console.warn("A sound object is missing its src attribute.");
        }
    });

    // --- ROCKET (PLAYER) PROPERTIES ---
    const ROCKET_WIDTH = 90;
    const ROCKET_HEIGHT = 130;
    const GRAVITY = 0.28;
    const FLAP_STRENGTH = -7.5;
    const MAX_FUEL = 100;
    const FUEL_CONSUMPTION = 2.5;
    const FUEL_REGEN_RATE = 0; // No passive fuel regen

    // --- PIPE PROPERTIES ---
    const PIPE_WIDTH_IMG = 120; // Actual image width
    const PIPE_EFFECTIVE_WIDTH = 90; // For collision and spacing logic
    const PIPE_GAP = 260 + (ROCKET_HEIGHT - 95);
    const PIPE_SPACING = 400; // Distance between pipe pairs
    const PIPE_SPEED_INITIAL = 2.0;
    const PIPE_VERTICAL_MOVEMENT_MAX_OFFSET = 60;
    const PIPE_VERTICAL_SPEED = 0.45;
    const MIN_PIPE_SEGMENT_HEIGHT = 40;
    const PIPE_HITBOX_INSET_X = 15; // Inset from visual edge for collision leniency
    const PIPE_HITBOX_INSET_Y_GAPEDGE = 10;

    // --- POWER-UP PROPERTIES ---
    const POWERUP_SIZE = 50;
    const POWERUP_SPAWN_CHANCE = 0.0055; // Per frame
    const SHIELD_DURATION = 540; // Frames (9 seconds at 60fps)
    const LOW_FUEL_THRESHOLD_PERCENT = 20;
    let canSpawnEmergencyBeans = true;
    const EMERGENCY_BEANS_COOLDOWN_FRAMES = 180; // 3 seconds
    let emergencyBeansCooldownTimer = 0;


    // --- CORE GAME CLASSES ---
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
            this.character = getCurrentGameCharacter(); // Uses game's selected character
        }
        flap() {
            if (this.fuel > 0 && gameState === 'PLAYING') {
                this.velocityY = FLAP_STRENGTH;
                this.fuel -= FUEL_CONSUMPTION;
                if (this.fuel < 0) this.fuel = 0;
                playSound(sounds.flap);
                for (let i = 0; i < 8; i++) { // Thrust particles
                    particles.push(new Particle(this.x + this.width / 2, this.y + this.height * 0.9, 'thrust'));
                }
            } else if (gameState === 'PLAYING') {
                playSound(sounds.fuelEmpty);
            }
        }
        update() {
            this.velocityY += GRAVITY;
            this.y += this.velocityY;

            // Fuel regeneration (currently off)
            if (this.fuel < MAX_FUEL) {
                this.fuel += FUEL_REGEN_RATE;
                if (this.fuel > MAX_FUEL) this.fuel = MAX_FUEL;
            }

            // Shield timer
            if (this.shieldActive) {
                this.shieldTimer--;
                if (this.shieldTimer <= 0) {
                    this.shieldActive = false;
                }
            }

            // Prevent going off top of screen
            if (this.y < 0) {
                this.y = 0;
                this.velocityY = 0;
            }
        }
        draw() {
            const charImg = this.character.imageObj;
            if (this.character.isReady && charImg.complete && charImg.naturalWidth !== 0) {
                ctx.drawImage(charImg, this.x, this.y, this.width, this.height);
            } else { // Fallback drawing
                ctx.fillStyle = 'purple';
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
            this.width = PIPE_WIDTH_IMG; // Use image width for drawing
            this.effectiveWidth = PIPE_EFFECTIVE_WIDTH; // Use for collision/spacing
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
            // Ensure pipes don't overlap if gap is too small or values are problematic
            if (this.topPipe.y + this.topPipe.height > this.bottomPipe.y - MIN_PIPE_SEGMENT_HEIGHT) {
                 this.topPipe.height = Math.max(MIN_PIPE_SEGMENT_HEIGHT, this.currentGapY - PIPE_GAP / 2);
                 this.bottomPipe.y = this.currentGapY + PIPE_GAP / 2; // Recalculate based on adjusted top
                 this.bottomPipe.height = Math.max(MIN_PIPE_SEGMENT_HEIGHT, GAME_HEIGHT - this.bottomPipe.y);
            }
        }

        update() {
            this.x -= gameSpeed;

            if (this.movesVertically) {
                const moveAmount = PIPE_VERTICAL_SPEED * this.verticalDirection;
                let newGapCenter = this.currentGapY + moveAmount;

                const minPossibleGapYBase = this.initialGapY - PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const maxPossibleGapYBase = this.initialGapY + PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;

                // Screen edge limits for the gap center
                const screenEdgeMinGapY = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10;
                const screenEdgeMaxGapY = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10);

                const finalMinGapY = Math.max(minPossibleGapYBase, screenEdgeMinGapY);
                const finalMaxGapY = Math.min(maxPossibleGapYBase, screenEdgeMaxGapY);

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
            // Center the effective pipe within the drawn image width
            const drawX = this.x - (PIPE_WIDTH_IMG - this.effectiveWidth) / 2;

            if (this.topPipe.height > 0) {
                ctx.save();
                ctx.translate(drawX, this.topPipe.y + this.topPipe.height);
                ctx.scale(1, -1); // Flip for top pipe
                ctx.drawImage(pipeImg, 0, 0, this.width, this.topPipe.height);
                ctx.restore();
            }

            if (this.bottomPipe.height > 0) {
                ctx.drawImage(pipeImg, drawX, this.bottomPipe.y, this.width, this.bottomPipe.height);
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
            const centerX = this.x + this.size / 2;
            const centerY = this.y + this.size / 2;

            if (this.type === 'shield') {
                ctx.beginPath(); ctx.arc(centerX, centerY, this.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 220, 255, 0.9)'; ctx.fill();
                ctx.strokeStyle = 'rgba(20,20,20,0.7)'; ctx.lineWidth = 2; ctx.stroke();
                const symbol = 'S'; const symbolColor = '#1e272e'; const font = `bold ${this.size * 0.7}px 'Bangers', cursive`;
                ctx.fillStyle = symbolColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font;
                ctx.fillText(symbol, centerX, centerY + this.size * 0.08); // Slight Y offset for better centering
            } else if (this.type === 'fuel') {
                if (fuelPowerUpImg.isReady) {
                    ctx.drawImage(fuelPowerUpImg, this.x, this.y, this.size, this.size);
                } else { // Fallback
                    ctx.beginPath(); ctx.arc(centerX, centerY, this.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 190, 0, 0.9)'; ctx.fill();
                    const symbol = 'F'; const symbolColor = '#1e272e'; const font = `bold ${this.size * 0.7}px 'Bangers', cursive`;
                    ctx.fillStyle = symbolColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font;
                    ctx.fillText(symbol, centerX, centerY + this.size * 0.08);
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
            for (let i = 0; i < 20; i++) { // Collection particles
                particles.push(new Particle(this.x + this.size / 2, this.y + this.size / 2, 'collect'));
            }
        }
    }

    class Particle {
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type;
            this.size = Math.random() * (type === 'explosion' ? 10 : (type === 'thrust' ? 8 : 7)) + 3;
            this.initialLife = (type === 'explosion' ? 70 : (type === 'thrust' ? 30 : 40)) + Math.random() * 30;
            this.life = this.initialLife;

            const angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * (type === 'explosion' ? 10 : (type === 'collect' ? 5 : 3)) + 1;

            if (type === 'thrust') {
                const r = Math.floor(Math.random() * 50) + 100; // Brownish-orange
                const g = Math.floor(Math.random() * 40) + 60;
                const b = Math.floor(Math.random() * 30) + 20;
                this.color = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.4 + 0.4})`;
                this.velocityX = (Math.random() - 0.5) * 2.5; // Spread out slightly horizontally
                this.velocityY = Math.random() * 2.0 + 1.0;   // Mainly downwards
                this.size = Math.random() * 8 + 4;
            } else {
                this.velocityX = Math.cos(angle) * speed;
                this.velocityY = Math.sin(angle) * speed;
                if (type === 'explosion') {
                    this.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 120)}, 0, 0.8)`; // Fiery
                } else { // 'collect' particles
                    this.color = `rgba(255, 230, ${Math.random() > 0.5 ? 50 : 150}, 0.8)`; // Yellow/gold sparkles
                }
            }
        }
        update() {
            this.x += this.velocityX; this.y += this.velocityY;
            if (this.type === 'thrust') {
                this.velocityY += 0.03; // Slight gravity effect
                this.velocityX *= 0.98; // Air resistance
                this.size *= 0.99;      // Shrink
            } else if (this.type === 'explosion' || this.type === 'collect') {
                this.velocityX *= 0.97; // Damping
                this.velocityY *= 0.97;
                if (this.type === 'explosion') this.velocityY += 0.1; // Gravity for explosion bits
            }
            this.life--;
            if (this.size < 1) this.life = 0;
        }
        draw() {
            if (this.life <= 0 || this.size <=0) return;
            ctx.globalAlpha = Math.max(0, this.life / this.initialLife);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // --- SOUND PLAYBACK ---
    function playSound(sound) {
        if (sound && sound.src && sound.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            sound.currentTime = 0;
            sound.play().catch(error => console.warn(`Sound play failed for ${sound.src.split('/').pop()}:`, error));
        } else if (sound && sound.src) {
            console.warn(`Sound ${sound.src.split('/').pop()} not ready. State: ${sound.readyState}, Network: ${sound.networkState}`);
            if (sound.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || sound.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                if (sound.src) sound.load();
            }
        }
    }

    // --- START SCREEN ANIMATION (BOBBING CHARACTER ON CANVAS) ---
    let startScreenAnimFrame = 0;
    const startScreenCharYOffsetMax = 25;
    const startScreenCharBobSpeed = 0.03;
    let isStartScreenLoopRunning = false;

    function drawStartScreenCharacter(bobOffset) {
        const gameChar = getCurrentGameCharacter();
        if (!gameChar || !gameChar.isReady || !ctx) return;

        const charImg = gameChar.imageObj;
        const scaleFactor = 2.8;
        const charWidth = ROCKET_WIDTH * scaleFactor;
        const charHeight = ROCKET_HEIGHT * scaleFactor;
        const charX = GAME_WIDTH * 0.80 - charWidth / 2; // Position on right
        const charYBase = GAME_HEIGHT / 2 - charHeight / 2;
        const charY = charYBase + bobOffset;

        if (charImg.complete && charImg.naturalWidth !== 0) {
            ctx.drawImage(charImg, charX, charY, charWidth, charHeight);
        } else {
            ctx.fillStyle = 'grey'; // Fallback if image still not loaded
            ctx.fillRect(charX, charY, charWidth, charHeight);
        }
    }

    function startScreenAnimationLoop() {
        if (gameState !== 'START' || !isStartScreenLoopRunning || startScreen.style.display === 'none') {
            isStartScreenLoopRunning = false; // Ensure it stops if not on start screen or if gameState changes
            return;
        }
        if(ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        startScreenAnimFrame++;
        const bobOffset = Math.sin(startScreenAnimFrame * startScreenCharBobSpeed) * startScreenCharYOffsetMax;
        drawStartScreenCharacter(bobOffset);
        requestAnimationFrame(startScreenAnimationLoop);
    }

    // --- LOCALSTORAGE FUNCTIONS (PERSISTENCE) ---
    function loadGameData() {
        coins = parseInt(localStorage.getItem('flappyLaliCoins_v2')) || 0; // Added _v2 for fresh start if needed
        highScore = parseInt(localStorage.getItem('flappyLaliFartV2_hs')) || 0;
        currentSelectedCharacterId = localStorage.getItem('flappyLaliSelectedChar_v2') || 'lali_classic';
        shopPreviewCharacterId = currentSelectedCharacterId;

        const unlockedChars = JSON.parse(localStorage.getItem('flappyLaliUnlockedChars_v2'));
        if (unlockedChars && Array.isArray(unlockedChars)) {
            charactersData.forEach(char => {
                char.unlocked = unlockedChars.includes(char.id);
            });
        }
        // Ensure default character is always unlocked
        const classicChar = getCharacterById('lali_classic');
        if (classicChar) classicChar.unlocked = true;


        // Validate selected character is unlocked
        const selected = getCharacterById(currentSelectedCharacterId);
        if (!selected || !selected.unlocked) {
            currentSelectedCharacterId = 'lali_classic';
            shopPreviewCharacterId = 'lali_classic';
            localStorage.setItem('flappyLaliSelectedChar_v2', currentSelectedCharacterId);
        }
        updateCoinDisplay();
    }

    function saveCoins() { localStorage.setItem('flappyLaliCoins_v2', coins); }
    function saveHighScore() { localStorage.setItem('flappyLaliFartV2_hs', highScore); }
    function saveCharacterData() {
        const unlockedCharIds = charactersData.filter(char => char.unlocked).map(char => char.id);
        localStorage.setItem('flappyLaliUnlockedChars_v2', JSON.stringify(unlockedCharIds));
        localStorage.setItem('flappyLaliSelectedChar_v2', currentSelectedCharacterId);
    }

    // --- SHOP LOGIC ---
    function updateCoinDisplay() {
        if (coinCountDisplay) coinCountDisplay.textContent = coins;
        if (shopCoinCountDisplay) shopCoinCountDisplay.textContent = coins;
    }

    function renderCharacterShop() {
        if (!shopPanelLeft) return;
        shopPanelLeft.innerHTML = '';

        charactersData.forEach(char => {
            const slot = document.createElement('div');
            slot.classList.add('character-slot');
            if (char.id === shopPreviewCharacterId) slot.classList.add('selected-in-shop');

            const img = new Image();
            img.src = char.imageSrc;
            img.alt = char.name;
            if (!char.isReady || !char.imageObj.complete || char.imageObj.naturalWidth === 0) img.classList.add('not-ready');
            slot.appendChild(img);

            const infoDiv = document.createElement('div');
            infoDiv.classList.add('char-info-shop');
            const nameP = document.createElement('p');
            nameP.classList.add('char-name');
            nameP.textContent = char.name;
            infoDiv.appendChild(nameP);

            if (char.unlocked) {
                const statusP = document.createElement('p');
                statusP.classList.add('char-status');
                statusP.textContent = (char.id === currentSelectedCharacterId) ? "Equipped" : "Owned";
                infoDiv.appendChild(statusP);
            } else {
                const priceP = document.createElement('p');
                priceP.classList.add('char-price');
                priceP.textContent = `Price: ${char.price}`;
                infoDiv.appendChild(priceP);
            }
            slot.appendChild(infoDiv);

            const buttonContainer = document.createElement('div'); // To align button
            buttonContainer.style.marginLeft = "auto";

            if (char.unlocked) {
                if (char.id !== currentSelectedCharacterId) {
                    const equipButton = document.createElement('button');
                    equipButton.textContent = "Equip";
                    equipButton.onclick = (e) => { e.stopPropagation(); equipCharacter(char.id); };
                    buttonContainer.appendChild(equipButton);
                }
            } else {
                const buyButton = document.createElement('button');
                buyButton.textContent = "Buy";
                if (coins < char.price) buyButton.disabled = true;
                buyButton.onclick = (e) => { e.stopPropagation(); buyCharacter(char.id); };
                buttonContainer.appendChild(buyButton);
            }
            slot.appendChild(buttonContainer);
            slot.onclick = () => updateShopPreview(char.id);
            shopPanelLeft.appendChild(slot);
        });
    }

    function updateShopPreview(charId) {
        shopPreviewCharacterId = charId;
        const char = getCharacterById(charId);
        if (!char) return;

        if (shopCharacterPreviewImage) {
            if (char.isReady && char.imageObj.complete && char.imageObj.naturalWidth > 0) {
                shopCharacterPreviewImage.src = char.imageObj.src;
                shopCharacterPreviewImage.classList.remove('not-ready');
            } else {
                shopCharacterPreviewImage.src = ''; shopCharacterPreviewImage.classList.add('not-ready');
            }
        }
        if (shopCharacterName) shopCharacterName.textContent = char.name;
        if (shopCharacterPriceStatus) {
            if (char.unlocked) {
                shopCharacterPriceStatus.textContent = (char.id === currentSelectedCharacterId) ? "Currently Equipped" : "Owned";
                shopCharacterPriceStatus.className = 'char-status owned';
            } else {
                shopCharacterPriceStatus.textContent = `Price: ${char.price} Coins`;
                shopCharacterPriceStatus.className = 'char-status';
            }
        }
        // Update 'selected-in-shop' class for list items
        const slots = shopPanelLeft.querySelectorAll('.character-slot');
        slots.forEach(s => {
            // Find the character this slot represents (e.g., by matching name or having a data-id attribute)
            const slotCharName = s.querySelector('.char-name').textContent;
            const slotChar = charactersData.find(c => c.name === slotCharName);
            if (slotChar && slotChar.id === charId) s.classList.add('selected-in-shop');
            else s.classList.remove('selected-in-shop');
        });
    }

    function equipCharacter(charId) {
        const charToEquip = getCharacterById(charId);
        if (charToEquip && charToEquip.unlocked) {
            currentSelectedCharacterId = charId;
            saveCharacterData();
            renderCharacterShop();
            updateShopPreview(shopPreviewCharacterId); // Keep preview consistent or update to equipped
        }
    }

    function buyCharacter(charId) {
        const charToBuy = getCharacterById(charId);
        if (charToBuy && !charToBuy.unlocked && coins >= charToBuy.price) {
            coins -= charToBuy.price;
            charToBuy.unlocked = true;
            playSound(sounds.purchase);
            saveCoins();
            saveCharacterData();
            updateCoinDisplay();
            renderCharacterShop();
            updateShopPreview(charId);
        }
    }

    // --- MAIN GAME STATE FUNCTIONS ---
    function initGame() {
        if (gameState !== 'LOADING') loadGameData(); // Load data if not initial load call

        rocket = null; pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = PIPE_SPEED_INITIAL;
        // gameState remains 'START' (or 'LOADING' if it's the first call from assetManager)

        if(startScreen) startScreen.style.display = 'flex';
        if(gameOverScreen) gameOverScreen.style.display = 'none';
        if(shopScreen) shopScreen.style.display = 'none';

        if (startButton) startButton.disabled = assetsLoaded < assetsToLoad;
        if (shopButton) shopButton.disabled = assetsLoaded < assetsToLoad;

        updateUI(null); // Update scores, coins, fuel bar (with default)
        if (ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        isStartScreenLoopRunning = false;
        if (gameState === 'START') { // Only start animation if truly on start screen
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

    function startGame() {
        isStartScreenLoopRunning = false;
        if(ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Clear canvas before game starts

        gameState = 'PLAYING';
        if(startScreen) startScreen.style.display = 'none';
        if(shopScreen) shopScreen.style.display = 'none';
        if(gameOverScreen) gameOverScreen.style.display = 'none';

        rocket = new Rocket();
        pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = PIPE_SPEED_INITIAL;
        canSpawnEmergencyBeans = true; emergencyBeansCooldownTimer = 0;

        updateUI(rocket);
        if (backgroundMusic.isReady && backgroundMusic.paused) {
            backgroundMusic.play().catch(e => console.error("Error playing background music:", e));
        }
        gameLoop();
    }

    function gameOver() {
        playSound(sounds.hit);
        gameState = 'GAMEOVER';

        const earnedThisGame = score; // Coins earned = score
        coins += earnedThisGame;
        saveCoins();
        updateCoinDisplay();
        if (coinsEarnedDisplay) coinsEarnedDisplay.textContent = earnedThisGame;

        if (rocket) {
            for (let i = 0; i < 50; i++) { // Explosion particles
                particles.push(new Particle(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2, 'explosion'));
            }
            rocket = null; // Remove rocket from game
        }

        if (score > highScore) {
            highScore = score; saveHighScore();
            if (newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'block';
        } else {
            if (newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'none';
        }
        if (finalScoreDisplay) finalScoreDisplay.textContent = score;
        if (gameOverScreen) gameOverScreen.style.display = 'flex';
        updateUI(null); // Update UI after game over (rocket is null)
    }

    // --- GAME LOOP AND MECHANICS ---
    function handleInput(e) {
        if (e.code === 'Space' || e.type === 'mousedown' || e.type === 'touchstart') {
            e.preventDefault();
            if (gameState === 'PLAYING' && rocket) {
                rocket.flap();
            }
        }
    }

    function generatePipes() {
        if (frame % Math.floor(PIPE_SPACING / gameSpeed) === 0) {
            const minGapCenter = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 20;
            const maxGapCenter = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 20);
            const range = maxGapCenter - minGapCenter;
            let initialGapY = (range > 0) ? (Math.random() * range + minGapCenter) : (GAME_HEIGHT / 2);
            const movesVertically = Math.random() < 0.4;
            pipes.push(new Pipe(GAME_WIDTH, initialGapY, movesVertically));
        }
        pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
    }

    function generatePowerUps() {
        if (Math.random() < POWERUP_SPAWN_CHANCE && powerUps.length < 3) {
            const type = Math.random() < 0.4 ? 'shield' : 'fuel';
            const y = Math.random() * (GAME_HEIGHT - POWERUP_SIZE - 150) + 75; // Avoid edges
            const x = GAME_WIDTH + Math.random() * 200;
            powerUps.push(new PowerUp(x, y, type));
        }
        powerUps = powerUps.filter(pu => pu.x + pu.size > 0 && !pu.collected);
    }

    function trySpawnEmergencyBeans() {
        if (rocket && rocket.fuel < (MAX_FUEL * (LOW_FUEL_THRESHOLD_PERCENT / 100)) && canSpawnEmergencyBeans) {
            const existingFuelPU = powerUps.find(pu => pu.type === 'fuel');
            if (!existingFuelPU) {
                console.log("Low fuel! Spawning emergency beans.");
                // Complex spawn logic to try and place it helpfully
                let spawnX = GAME_WIDTH * 0.8;
                const nearRocketY = rocket.y + (Math.random() - 0.5) * 100;
                const clampedY = Math.max(POWERUP_SIZE / 2, Math.min(GAME_HEIGHT - POWERUP_SIZE * 1.5, nearRocketY));

                const nextPipe = pipes.find(p => p.x + p.effectiveWidth > rocket.x + rocket.width);
                if (nextPipe) spawnX = nextPipe.x + nextPipe.effectiveWidth + Math.random() * PIPE_SPACING * 0.3 + 50;
                else if (pipes.length > 0 && pipes[pipes.length-1].x + pipes[pipes.length-1].effectiveWidth > 0) {
                    spawnX = pipes[pipes.length-1].x + pipes[pipes.length-1].effectiveWidth + Math.random() * PIPE_SPACING * 0.3 + 50;
                }
                spawnX = Math.max(spawnX, rocket.x + GAME_WIDTH * 0.3); // Not too close behind
                spawnX = Math.min(spawnX, GAME_WIDTH * 1.5); // Not too far ahead

                powerUps.push(new PowerUp(spawnX, clampedY, 'fuel'));
                canSpawnEmergencyBeans = false;
                emergencyBeansCooldownTimer = EMERGENCY_BEANS_COOLDOWN_FRAMES;
            }
        }
        if (emergencyBeansCooldownTimer > 0) {
            emergencyBeansCooldownTimer--;
            if (emergencyBeansCooldownTimer <= 0) canSpawnEmergencyBeans = true;
        }
    }

    function checkCollisions() {
        if (!rocket || gameState !== 'PLAYING') return;

        // Ground collision
        if (rocket.y + rocket.height >= GAME_HEIGHT) {
            rocket.y = GAME_HEIGHT - rocket.height; rocket.velocityY = 0;
            if (!rocket.shieldActive) { gameOver(); return; }
            else { rocket.velocityY = FLAP_STRENGTH * 0.3; playSound(sounds.hit); } // Bounce with shield
        }

        // Pipe collisions
        for (let pipe of pipes) {
            const rocketRect = { x: rocket.x, y: rocket.y, width: rocket.width, height: rocket.height };
            const pipeHitboxX = pipe.x + (PIPE_WIDTH_IMG - pipe.effectiveWidth) / 2 + PIPE_HITBOX_INSET_X;
            const pipeHitboxWidth = pipe.effectiveWidth - 2 * PIPE_HITBOX_INSET_X;

            // Top pipe collision
            const topPipeRect = {
                x: pipeHitboxX, y: pipe.topPipe.y,
                width: pipeHitboxWidth, height: pipe.topPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE
            };
            if (topPipeRect.height < 0) topPipeRect.height = 0;
            if (!rocket.shieldActive &&
                rocketRect.x < topPipeRect.x + topPipeRect.width && rocketRect.x + rocketRect.width > topPipeRect.x &&
                rocketRect.y < topPipeRect.y + topPipeRect.height && rocketRect.y + rocketRect.height > topPipeRect.y) {
                gameOver(); return;
            }

            // Bottom pipe collision
            const bottomPipeRect = {
                x: pipeHitboxX, y: pipe.bottomPipe.y + PIPE_HITBOX_INSET_Y_GAPEDGE,
                width: pipeHitboxWidth, height: pipe.bottomPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE
            };
            if (bottomPipeRect.height < 0) bottomPipeRect.height = 0;
            if (!rocket.shieldActive &&
                rocketRect.x < bottomPipeRect.x + bottomPipeRect.width && rocketRect.x + rocketRect.width > bottomPipeRect.x &&
                rocketRect.y < bottomPipeRect.y + bottomPipeRect.height && rocketRect.y + rocketRect.height > bottomPipeRect.y) {
                gameOver(); return;
            }

            // Score point
            if (!pipe.passed && pipe.x + (PIPE_WIDTH_IMG - pipe.effectiveWidth)/2 + pipe.effectiveWidth < rocket.x) {
                pipe.passed = true; score++; playSound(sounds.score); gameSpeed += 0.02;
            }
        }

        // Power-up collisions
        for (let pu of powerUps) {
            if (!pu.collected &&
                rocket.x < pu.x + pu.size && rocket.x + rocket.width > pu.x &&
                rocket.y < pu.y + pu.size && rocket.y + rocket.height > pu.y) {
                pu.applyEffect(rocket);
            }
        }
    }

    function updateGameObjects() {
        if (gameState !== 'PLAYING') return;
        if (rocket) rocket.update();
        pipes.forEach(pipe => pipe.update());
        powerUps.forEach(pu => pu.update());
        particles = particles.filter(p => p.life > 0); // Remove dead particles before update/draw
        particles.forEach(p => p.update());
    }

    function drawGameObjects() {
        if (!ctx) return;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        pipes.forEach(pipe => pipe.draw());
        powerUps.forEach(pu => pu.draw());
        if (gameState === 'PLAYING' && rocket) rocket.draw();
        particles.forEach(p => p.draw());
    }

    function gameLoop() {
        if (gameState !== 'PLAYING') return;
        frame++;
        generatePipes();
        if (frame % 75 === 0) generatePowerUps(); // Less frequent power-up spawns
        trySpawnEmergencyBeans();
        updateGameObjects();
        checkCollisions();
        drawGameObjects();
        updateUI(rocket);
        requestAnimationFrame(gameLoop);
    }

    // --- UI UPDATE FUNCTION ---
    function updateUI(currentRocket) {
        if (scoreDisplay) scoreDisplay.textContent = `Score: ${score}`;
        if (highScoreDisplay) highScoreDisplay.textContent = `High Score: ${highScore}`;
        updateCoinDisplay(); // Centralized coin update

        let fuelSource = currentRocket || (rocket ? rocket : { fuel: MAX_FUEL }); // For start/gameover
        if (fuelBar) {
            if (fuelSource) {
                const fuelPercentage = (fuelSource.fuel / MAX_FUEL) * 100;
                fuelBar.style.width = `${fuelPercentage}%`;
                if (fuelPercentage < LOW_FUEL_THRESHOLD_PERCENT) fuelBar.style.backgroundColor = '#d63031';
                else if (fuelPercentage < 50) fuelBar.style.backgroundColor = '#fdcb6e';
                else fuelBar.style.backgroundColor = '#e17055';
            } else { // Default fuel bar state if no rocket (e.g. main menu)
                fuelBar.style.width = '100%';
                fuelBar.style.backgroundColor = '#e17055';
            }
        }
    }

    // --- EVENT LISTENERS ---
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', initGame); // Go back to main menu
    if (shopButton) {
        shopButton.addEventListener('click', () => {
            isStartScreenLoopRunning = false;
            if (ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            startScreen.style.display = 'none';
            shopScreen.style.display = 'flex';
            renderCharacterShop();
            updateShopPreview(shopPreviewCharacterId);
            updateCoinDisplay();
        });
    }
    if (backToMenuButton) {
        backToMenuButton.addEventListener('click', () => {
            shopScreen.style.display = 'none';
            startScreen.style.display = 'flex';
            const gameChar = getCurrentGameCharacter();
            if (assetsLoaded >= assetsToLoad && gameChar && gameChar.isReady) {
                isStartScreenLoopRunning = true;
                startScreenAnimationLoop();
            }
        });
    }

    window.addEventListener('keydown', handleInput);
    if (canvas) {
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleInput, { passive: false });
    }

    // --- INITIALIZE GAME ---
    // Start loading data, assets will trigger initGame() when done.
    loadGameData();
    // If assets load very fast, assetLoadManager might call initGame before DOMContentLoaded fully guarantees element availability,
    // but usually, DOMContentLoaded ensures elements are there before script runs deeply.
    // Explicitly disable buttons until assets are loaded
    if (startButton) startButton.disabled = true;
    if (shopButton) shopButton.disabled = true;

});

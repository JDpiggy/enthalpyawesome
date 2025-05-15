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

    // NEW UI Elements
    const coinCountDisplay = document.getElementById('coinCount');
    const coinsEarnedDisplay = document.getElementById('coinsEarned'); // On game over screen
    const characterSlotsContainer = document.getElementById('characterSlotsContainer');


    // Game settings
    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    let rocket, pipes, powerUps, particles;
    let score, highScore, frame, gameSpeed, gameState;
    let coins = 0; // NEW: Player coins

    // --- CHARACTER DATA ---
    // YOU MUST CREATE THESE IMAGE FILES IN assets/tiles/
    // Rename your current 'lalicharacter.png' to 'lali_classic.png' or update path below
    let charactersData = [
        { id: 'lali_classic', name: 'Lali Classic', imageSrc: 'assets/tiles/lali_classic.png', price: 0, imageObj: new Image(), isReady: false, unlocked: true },
        { id: 'lali_super', name: 'Super Lali', imageSrc: 'assets/tiles/lali_super.png', price: 500, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_robo', name: 'Robo Lali', imageSrc: 'assets/tiles/lali_robo.png', price: 1500, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_ninja', name: 'Ninja Lali', imageSrc: 'assets/tiles/lali_ninja.png', price: 3000, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_golden', name: 'Golden Lali', imageSrc: 'assets/tiles/lali_golden.png', price: 7500, imageObj: new Image(), isReady: false, unlocked: false },
    ];
    let currentSelectedCharacterId = 'lali_classic'; // Default

    // --- ASSET LOADING ---
    const pipeImg = new Image();
    pipeImg.src = 'assets/tiles/beaker-removebg-preview.png';
    pipeImg.isReady = false;

    const fuelPowerUpImg = new Image();
    fuelPowerUpImg.src = 'assets/tiles/beans-removebg-preview.png';
    fuelPowerUpImg.isReady = false;

    const backgroundMusic = new Audio();
    backgroundMusic.isReady = false;

    let assetsToLoad = 2 + 1 + charactersData.length; // pipe, fuel, music + all character images
    let assetsLoaded = 0;

    function getSelectedCharacter() {
        return charactersData.find(char => char.id === currentSelectedCharacterId) || charactersData[0];
    }
    function getCharacterById(id) {
        return charactersData.find(char => char.id === id) || charactersData[0];
    }


    function assetLoadManager(assetName = "Generic asset") {
        assetsLoaded++;
        console.log(`${assetName} loaded. Assets loaded: ${assetsLoaded}/${assetsToLoad}`);
        if (assetsLoaded >= assetsToLoad) {
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = "Start Game";
            }
            if (gameState === 'START' && ctx) {
                 updateUI(rocket || { fuel: MAX_FUEL }); // Pass a dummy rocket for fuel
                 if (!isStartScreenLoopRunning && getSelectedCharacter().isReady) {
                    startScreenAnimationLoop();
                 }
                 if (backgroundMusic.isReady && backgroundMusic.paused) {
                    backgroundMusic.play().catch(e => console.warn("BG Music autoplay blocked.", e));
                 }
            }
            console.log("All critical assets loading attempted.");
            renderCharacterShop(); // Render shop once all assets attempted to load
        }
    }

    // Load character images
    charactersData.forEach(charData => {
        charData.imageObj.src = charData.imageSrc;
        charData.imageObj.onload = () => {
            charData.isReady = true;
            console.log(`Character image loaded: ${charData.name}`);
            assetLoadManager(`Character ${charData.name}`);
            // If this is the selected character and the start screen loop isn't running, try to start it
            if (charData.id === currentSelectedCharacterId && gameState === 'START' && !isStartScreenLoopRunning) {
                startScreenAnimationLoop();
            }
            if (gameState === 'START') renderCharacterShop(); // Re-render shop if an image loads
        };
        charData.imageObj.onerror = () => {
            charData.isReady = false; // Mark as not ready, but still count towards loaded assets
            console.error(`Failed to load character image: ${charData.name} from ${charData.imageSrc}`);
            assetLoadManager(`Character ${charData.name} (failed)`);
             if (gameState === 'START') renderCharacterShop(); // Re-render shop
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
    backgroundMusic.onerror = (e) => { backgroundMusic.isReady = false; console.error("Failed to load background music.", e); assetLoadManager("Background Music (failed)"); };
    try { backgroundMusic.load(); } catch (e) { console.error("Error calling backgroundMusic.load():", e); }

    // --- END ASSET LOADING ---

    const sounds = { /* ... (sound setup same as before) ... */
        flap: new Audio(), score: new Audio(), hit: new Audio(),
        powerup: new Audio(), fuelEmpty: new Audio(), purchase: new Audio() // NEW: Purchase sound
    };
    sounds.flap.src = 'assets/sounds/fart.wav';
    sounds.purchase.src = 'assets/sounds/purchase.wav'; // << ADD A PURCHASE SOUND EFFECT

    Object.values(sounds).forEach(sound => { /* ... (sound loading same as before) ... */
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

    // Pipe properties (same as before)
    const PIPE_WIDTH = 120;
    const PIPE_GAP = 260 + (ROCKET_HEIGHT - 95);
    const PIPE_SPACING = 450;
    const PIPE_SPEED_INITIAL = 2.0;
    const PIPE_VERTICAL_MOVEMENT_MAX_OFFSET = 60;
    const PIPE_VERTICAL_SPEED = 0.45;
    const MIN_PIPE_SEGMENT_HEIGHT = 40;
    const PIPE_HITBOX_INSET_X = 40;
    const PIPE_HITBOX_INSET_Y_GAPEDGE = 15;

    // Power-up properties (same as before)
    const POWERUP_SIZE = 50;
    const POWERUP_SPAWN_CHANCE = 0.0055;
    const SHIELD_DURATION = 540;
    const LOW_FUEL_THRESHOLD_PERCENT = 20;
    let canSpawnEmergencyBeans = true;
    const EMERGENCY_BEANS_COOLDOWN_FRAMES = 180;
    let emergencyBeansCooldownTimer = 0;

    // Start Screen Animation Variables
    let startScreenAnimFrame = 0;
    const startScreenCharYOffsetMax = 25;
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
            this.character = getSelectedCharacter(); // Store the character object
        }
        flap() { /* ... (same as before) ... */
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
        update() { /* ... (same as before) ... */
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
            const charImg = this.character.imageObj;
            if (this.character.isReady && charImg.complete && charImg.naturalWidth !== 0) {
                ctx.drawImage(charImg, this.x, this.y, this.width, this.height);
            } else {
                ctx.fillStyle = 'purple'; // Fallback if image not ready
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
            if (this.shieldActive) { /* ... (shield drawing same as before) ... */
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                ctx.lineWidth = 5;
                ctx.beginPath();
                const shieldRadius = Math.max(this.width, this.height) * 0.8;
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, shieldRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    // Pipe, PowerUp, Particle classes remain the same as your previous version.
    // I'll include them for completeness if you paste directly, but no changes needed within them.
    class Pipe { /* ... (same as previous version) ... */
        constructor(x, initialGapY, movesVertically) {
            this.x = x; this.width = PIPE_WIDTH; this.initialGapY = initialGapY; this.currentGapY = initialGapY;
            this.movesVertically = movesVertically; this.verticalDirection = Math.random() > 0.5 ? 1 : -1; this.passed = false;
            this.topPipe = { y: 0, height: 0 }; this.bottomPipe = { y: 0, height: 0 }; this._calculateDimensions();
        }
        _calculateDimensions() {
            this.topPipe.y = 0; this.topPipe.height = this.currentGapY - PIPE_GAP / 2;
            if (this.topPipe.height < MIN_PIPE_SEGMENT_HEIGHT) this.topPipe.height = MIN_PIPE_SEGMENT_HEIGHT;
            this.bottomPipe.y = this.currentGapY + PIPE_GAP / 2; this.bottomPipe.height = GAME_HEIGHT - this.bottomPipe.y;
            if (this.bottomPipe.height < MIN_PIPE_SEGMENT_HEIGHT) this.bottomPipe.height = MIN_PIPE_SEGMENT_HEIGHT;
            if(this.topPipe.y + this.topPipe.height > this.bottomPipe.y){
                this.topPipe.height = Math.max(MIN_PIPE_SEGMENT_HEIGHT, this.currentGapY - PIPE_GAP / 2);
                this.bottomPipe.y = this.currentGapY + PIPE_GAP / 2;
                this.bottomPipe.height = Math.max(MIN_PIPE_SEGMENT_HEIGHT, GAME_HEIGHT - this.bottomPipe.y);
            }
        }
        update() {
            this.x -= gameSpeed;
            if (this.movesVertically) {
                const moveAmount = PIPE_VERTICAL_SPEED * this.verticalDirection; let newGapCenter = this.currentGapY + moveAmount;
                const minPossibleGapY = this.initialGapY - PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const maxPossibleGapY = this.initialGapY + PIPE_VERTICAL_MOVEMENT_MAX_OFFSET;
                const screenEdgeMinGapY = PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10;
                const screenEdgeMaxGapY = GAME_HEIGHT - (PIPE_GAP / 2 + MIN_PIPE_SEGMENT_HEIGHT + 10);
                const finalMinGapY = Math.max(minPossibleGapY, screenEdgeMinGapY); const finalMaxGapY = Math.min(maxPossibleGapY, screenEdgeMaxGapY);
                if (newGapCenter > finalMaxGapY || newGapCenter < finalMinGapY) {
                    this.verticalDirection *= -1; newGapCenter = Math.max(finalMinGapY, Math.min(finalMaxGapY, newGapCenter));
                } this.currentGapY = newGapCenter;
            } this._calculateDimensions();
        }
        draw() {
            if (!pipeImg.isReady) return;
            if (this.topPipe.height > 0) {
                ctx.save(); ctx.translate(this.x, this.topPipe.y + this.topPipe.height); ctx.scale(1, -1);
                ctx.drawImage(pipeImg, 0, 0, this.width, this.topPipe.height); ctx.restore();
            }
            if (this.bottomPipe.height > 0) ctx.drawImage(pipeImg, this.x, this.bottomPipe.y, this.width, this.bottomPipe.height);
        }
    }
    class PowerUp { /* ... (same as previous version) ... */
        constructor(x, y, type) { this.x = x; this.y = y; this.size = POWERUP_SIZE; this.type = type; this.collected = false; }
        update() { this.x -= gameSpeed; }
        draw() {
            if (this.collected) return;
            if (this.type === 'shield') {
                ctx.beginPath(); ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 220, 255, 0.9)'; ctx.fill();
                ctx.strokeStyle = 'rgba(20,20,20,0.7)'; ctx.lineWidth = 2; ctx.stroke();
                const symbol = 'S'; const symbolColor = '#1e272e'; const powerUpFont = `bold ${this.size * 0.7}px 'Bangers', cursive`;
                ctx.fillStyle = symbolColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = powerUpFont;
                ctx.fillText(symbol, this.x + this.size / 2, this.y + this.size / 2 + this.size * 0.08);
            } else if (this.type === 'fuel') {
                if (fuelPowerUpImg.isReady) { ctx.drawImage(fuelPowerUpImg, this.x, this.y, this.size, this.size);
                } else {
                    ctx.beginPath(); ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 190, 0, 0.9)'; ctx.fill();
                    const symbol = 'F'; const symbolColor = '#1e272e'; const powerUpFont = `bold ${this.size * 0.7}px 'Bangers', cursive`;
                    ctx.fillStyle = symbolColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = powerUpFont;
                    ctx.fillText(symbol, this.x + this.size / 2, this.y + this.size / 2 + this.size * 0.08);
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
    class Particle { /* ... (same as previous version) ... */
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type;
            this.size = Math.random() * (type === 'explosion' ? 10 : 7) + 3;
            this.initialLife = (type === 'explosion' ? 70 : 40) + Math.random() * 30;
            this.life = this.initialLife;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (type === 'explosion' ? 10 : (type === 'collect' ? 5 : 3)) + 1;
            if (type === 'thrust') {
                const r = Math.floor(Math.random() * 50) + 100; const g = Math.floor(Math.random() * 40) + 60; const b = Math.floor(Math.random() * 30) + 20;
                this.color = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.4 + 0.4})`;
                this.velocityX = (Math.random() - 0.5) * 2.5; this.velocityY = Math.random() * 2.0 + 1.0; this.size = Math.random() * 8 + 4;
            } else {
                this.velocityX = Math.cos(angle) * speed; this.velocityY = Math.sin(angle) * speed;
                if (type === 'explosion') this.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 120)}, 0, 0.8)`;
                else this.color = `rgba(255, 230, ${Math.random() > 0.5 ? 50 : 150}, 0.8)`;
            }
        }
        update() {
            this.x += this.velocityX; this.y += this.velocityY;
            if (this.type === 'thrust') { this.velocityY += 0.03; this.velocityX *= 0.98; this.size *= 0.99;
            } else if (this.type === 'explosion' || this.type === 'collect') {
                this.velocityX *= 0.97; this.velocityY *= 0.97; if(this.type === 'explosion') this.velocityY += 0.1;
            } this.life--; if (this.size < 1) this.life = 0;
        }
        draw() {
            ctx.globalAlpha = Math.max(0, this.life / this.initialLife); ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }


    function playSound(sound) { /* ... (same as before) ... */
        if (sound && sound.src && sound.readyState >= 2) {
            sound.currentTime = 0;
            sound.play().catch(error => console.warn(`Sound play failed for ${sound.src}:`, error));
        } else if (sound && sound.src) {
            console.warn(`Sound ${sound.src} not ready. State: ${sound.readyState}`);
            if(sound.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || sound.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                 if (sound.src) sound.load();
            }
        }
    }

    function drawStartScreenCharacter(bobOffset) {
        const selectedChar = getSelectedCharacter();
        if (!selectedChar || !selectedChar.isReady || !ctx) return;

        const charImg = selectedChar.imageObj;
        const scaleFactor = 2.8;
        const charWidth = ROCKET_WIDTH * scaleFactor;
        const charHeight = ROCKET_HEIGHT * scaleFactor;
        const charX = GAME_WIDTH * 0.80 - charWidth / 2;
        const charYBase = GAME_HEIGHT / 2 - charHeight / 2;
        const charY = charYBase + bobOffset;

        if (charImg.complete && charImg.naturalWidth !== 0) {
            ctx.drawImage(charImg, charX, charY, charWidth, charHeight);
        } else {
            // Fallback drawing if image somehow not ready after check
            ctx.fillStyle = 'grey';
            ctx.fillRect(charX, charY, charWidth, charHeight);
        }
    }

    function startScreenAnimationLoop() { /* ... (same as before, uses drawStartScreenCharacter) ... */
        if (gameState !== 'START' || !ctx) { isStartScreenLoopRunning = false; return; }
        isStartScreenLoopRunning = true;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        startScreenAnimFrame++;
        const bobOffset = Math.sin(startScreenAnimFrame * startScreenCharBobSpeed) * startScreenCharYOffsetMax;
        drawStartScreenCharacter(bobOffset);
        requestAnimationFrame(startScreenAnimationLoop);
    }

    // --- LOCALSTORAGE FUNCTIONS FOR COINS AND CHARACTERS ---
    function loadGameData() {
        coins = parseInt(localStorage.getItem('flappyLaliCoins')) || 0;
        highScore = parseInt(localStorage.getItem('flappyLaliFartV2')) || 0; // Existing high score
        currentSelectedCharacterId = localStorage.getItem('flappyLaliSelectedChar') || 'lali_classic';

        const unlockedChars = JSON.parse(localStorage.getItem('flappyLaliUnlockedChars'));
        if (unlockedChars) {
            charactersData.forEach(char => {
                if (unlockedChars.includes(char.id)) {
                    char.unlocked = true;
                }
            });
        } else { // First time load, ensure default is unlocked
            getCharacterById('lali_classic').unlocked = true;
            saveCharacterData(); // Save this initial state
        }
         // Ensure the selected character is actually unlocked, otherwise revert to default
        if (!getCharacterById(currentSelectedCharacterId).unlocked) {
            currentSelectedCharacterId = 'lali_classic';
            localStorage.setItem('flappyLaliSelectedChar', currentSelectedCharacterId);
        }

        updateCoinDisplay();
    }

    function saveCoins() {
        localStorage.setItem('flappyLaliCoins', coins);
    }

    function saveCharacterData() {
        const unlockedCharIds = charactersData.filter(char => char.unlocked).map(char => char.id);
        localStorage.setItem('flappyLaliUnlockedChars', JSON.stringify(unlockedCharIds));
        localStorage.setItem('flappyLaliSelectedChar', currentSelectedCharacterId);
    }
    function saveHighScore() { localStorage.setItem('flappyLaliFartV2', highScore); }


    // --- CHARACTER SHOP LOGIC ---
    function renderCharacterShop() {
        if (!characterSlotsContainer) return;
        characterSlotsContainer.innerHTML = ''; // Clear existing slots

        charactersData.forEach(char => {
            const slot = document.createElement('div');
            slot.classList.add('character-slot');
            if (char.id === currentSelectedCharacterId) {
                slot.classList.add('selected');
            }

            const img = new Image(); // Use a new Image for the shop display to not interfere with game's char.imageObj
            img.src = char.imageSrc;
            img.alt = char.name;
            if (!char.isReady) { // If the main imageObj for this char isn't ready, mark this one too
                img.classList.add('not-ready');
            }


            const nameP = document.createElement('p');
            nameP.classList.add('char-name');
            nameP.textContent = char.name;

            slot.appendChild(img);
            slot.appendChild(nameP);

            if (char.unlocked) {
                const statusP = document.createElement('p');
                statusP.classList.add('char-status');
                statusP.textContent = (char.id === currentSelectedCharacterId) ? "Selected" : "Owned";
                slot.appendChild(statusP);

                if (char.id !== currentSelectedCharacterId) {
                    const selectButton = document.createElement('button');
                    selectButton.textContent = "Select";
                    selectButton.onclick = () => selectCharacter(char.id);
                    slot.appendChild(selectButton);
                }
            } else {
                const priceP = document.createElement('p');
                priceP.classList.add('char-price');
                priceP.textContent = `Price: ${char.price} Coins`;
                slot.appendChild(priceP);

                const buyButton = document.createElement('button');
                buyButton.textContent = "Buy";
                if (coins < char.price) {
                    buyButton.disabled = true;
                }
                buyButton.onclick = () => buyCharacter(char.id);
                slot.appendChild(buyButton);
            }
            characterSlotsContainer.appendChild(slot);
        });
    }

    function selectCharacter(charId) {
        const charToSelect = getCharacterById(charId);
        if (charToSelect && charToSelect.unlocked) {
            currentSelectedCharacterId = charId;
            saveCharacterData();
            renderCharacterShop(); // Re-render to update "Selected" state
            // If start screen animation is running, restart it to show new character
            if (gameState === 'START' && isStartScreenLoopRunning) {
                isStartScreenLoopRunning = false; // Stop current
                startScreenAnimationLoop();     // Restart with new char
            } else if (gameState === 'START' && !isStartScreenLoopRunning && getSelectedCharacter().isReady) {
                startScreenAnimationLoop(); // Start if not running
            }
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
        } else if (charToBuy && coins < charToBuy.price) {
            // Optionally, provide feedback like "Not enough coins!"
            console.log("Not enough coins to buy " + charToBuy.name);
        }
    }

    function updateCoinDisplay() {
        if (coinCountDisplay) coinCountDisplay.textContent = coins;
    }


    function initGame() {
        loadGameData(); // Load coins, selected char, unlocked chars, high score

        rocket = null;
        pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = PIPE_SPEED_INITIAL;
        gameState = 'START';

        startScreen.style.display = 'flex';
        gameOverScreen.style.display = 'none';

        if (startButton) {
            if (assetsLoaded < assetsToLoad) {
                startButton.disabled = true; startButton.textContent = "Loading Assets...";
            } else {
                startButton.disabled = false; startButton.textContent = "Start Game";
            }
        }

        updateUI({ fuel: MAX_FUEL }); // Pass dummy rocket for initial fuel bar
        if (ctx) ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        canSpawnEmergencyBeans = true;
        emergencyBeansCooldownTimer = 0;

        renderCharacterShop(); // Initial render of the shop

        // Start animation loop if assets are ready for selected char and not already running
        const selectedChar = getSelectedCharacter();
        if (assetsLoaded >= assetsToLoad && selectedChar && selectedChar.isReady && !isStartScreenLoopRunning) {
            startScreenAnimationLoop();
            if (backgroundMusic.isReady && backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.warn("BG Music autoplay blocked on init.", e));
            }
        }
    }

    function startGame() {
        isStartScreenLoopRunning = false;
        gameState = 'PLAYING';
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';

        rocket = new Rocket(); // Rocket now uses selected character internally
        pipes = []; powerUps = []; particles = [];
        score = 0; frame = 0;
        gameSpeed = PIPE_SPEED_INITIAL;
        canSpawnEmergencyBeans = true;
        emergencyBeansCooldownTimer = 0;

        updateUI(rocket);

        if (backgroundMusic.isReady && backgroundMusic.paused) {
            backgroundMusic.play().catch(e => console.error("Error playing background music:", e));
        }
        gameLoop();
    }

    function gameOver() {
        playSound(sounds.hit);
        gameState = 'GAMEOVER';

        // NEW: Award coins based on score (1 point = 1 coin)
        const earnedThisGame = score;
        coins += earnedThisGame;
        saveCoins();
        updateCoinDisplay();
        if(coinsEarnedDisplay) coinsEarnedDisplay.textContent = earnedThisGame;


        if (rocket) { /* ... (explosion particles same as before) ... */
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2, 'explosion'));
            }
            rocket.y = -2000;
        }

        if (score > highScore) { /* ... (high score logic same as before) ... */
            highScore = score; saveHighScore();
            if(newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'block';
        } else {
            if(newHighScoreTextGameOver) newHighScoreTextGameOver.style.display = 'none';
        }
        if(finalScoreDisplay) finalScoreDisplay.textContent = score;
        if(gameOverScreen) gameOverScreen.style.display = 'flex';
        updateUI(rocket); // rocket might be null here
    }

    // handleInput, generatePipes, generatePowerUps, trySpawnEmergencyBeans, checkCollisions
    // updateGameObjects, drawGameObjects, gameLoop
    // These functions largely remain the same as your previous version.
    // The key change is that `rocket.draw()` and `drawStartScreenCharacter()` now use the selected character's image.

    function handleInput(e) { /* ... (same as previous version) ... */
        if (e.code === 'Space' || e.type === 'mousedown' || e.type === 'touchstart') {
            e.preventDefault();
            if (gameState === 'PLAYING' && rocket) rocket.flap();
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
                    if (nextPipe) spawnX = nextPipe.x + nextPipe.width + Math.random() * PIPE_SPACING * 0.3 + 50;
                    else if (pipes[pipes.length-1].x + pipes[pipes.length-1].width > 0) spawnX = pipes[pipes.length-1].x + pipes[pipes.length-1].width + Math.random() * PIPE_SPACING * 0.3 + 50;
                }
                spawnX = Math.max(spawnX, rocket.x + GAME_WIDTH * 0.3); spawnX = Math.min(spawnX, GAME_WIDTH * 1.5);
                powerUps.push(new PowerUp(spawnX, clampedY, 'fuel'));
                canSpawnEmergencyBeans = false; emergencyBeansCooldownTimer = EMERGENCY_BEANS_COOLDOWN_FRAMES;
            }
        }
        if (emergencyBeansCooldownTimer > 0) { emergencyBeansCooldownTimer--; if (emergencyBeansCooldownTimer <= 0) canSpawnEmergencyBeans = true; }
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
            const topPipeEff = { x: pipe.x + PIPE_HITBOX_INSET_X, y: pipe.topPipe.y, width: pipe.width - 2 * PIPE_HITBOX_INSET_X, height: pipe.topPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE };
            if (topPipeEff.width < 0) topPipeEff.width = 0; if (topPipeEff.height < 0) topPipeEff.height = 0;
            if (!rocket.shieldActive && rocketRect.x < topPipeEff.x + topPipeEff.width && rocketRect.x + rocketRect.width > topPipeEff.x && rocketRect.y < topPipeEff.y + topPipeEff.height && rocketRect.y + rocketRect.height > topPipeEff.y) { gameOver(); return; }
            const bottomPipeEff = { x: pipe.x + PIPE_HITBOX_INSET_X, y: pipe.bottomPipe.y + PIPE_HITBOX_INSET_Y_GAPEDGE, width: pipe.width - 2 * PIPE_HITBOX_INSET_X, height: pipe.bottomPipe.height - PIPE_HITBOX_INSET_Y_GAPEDGE };
            if (bottomPipeEff.width < 0) bottomPipeEff.width = 0; if (bottomPipeEff.height < 0) bottomPipeEff.height = 0;
            if (!rocket.shieldActive && rocketRect.x < bottomPipeEff.x + bottomPipeEff.width && rocketRect.x + rocketRect.width > bottomPipeEff.x && rocketRect.y < bottomPipeEff.y + bottomPipeEff.height && rocketRect.y + rocketRect.height > bottomPipeEff.y) { gameOver(); return; }
            if (!pipe.passed && pipe.x + pipe.width < rocket.x) { pipe.passed = true; score++; playSound(sounds.score); gameSpeed += 0.02; }
        }
        for (let pu of powerUps) { if (!pu.collected && rocket.x < pu.x + pu.size && rocket.x + rocket.width > pu.x && rocket.y < pu.y + pu.size && rocket.y + rocket.height > pu.y) pu.applyEffect(rocket); }
    }

    function updateUI(currentRocket) {
        if(scoreDisplay) scoreDisplay.textContent = `Score: ${score}`;
        if(highScoreDisplay) highScoreDisplay.textContent = `High Score: ${highScore}`;
        updateCoinDisplay(); // Keep coin display updated

        let fuelSource = currentRocket || (rocket ? rocket : { fuel: MAX_FUEL });
        if (fuelSource && fuelBar) { /* ... (fuel bar logic same as before) ... */
            const fuelPercentage = (fuelSource.fuel / MAX_FUEL) * 100;
            fuelBar.style.width = `${fuelPercentage}%`;
            if (fuelPercentage < LOW_FUEL_THRESHOLD_PERCENT) fuelBar.style.backgroundColor = '#d63031';
            else if (fuelPercentage < 50) fuelBar.style.backgroundColor = '#fdcb6e';
            else fuelBar.style.backgroundColor = '#e17055';
        } else if (fuelBar) {
             fuelBar.style.width = '100%'; fuelBar.style.backgroundColor = '#e17055';
        }
    }
    function updateGameObjects() { /* ... (same as previous version) ... */
        if (gameState !== 'PLAYING') return; if (rocket) rocket.update();
        pipes.forEach(pipe => pipe.update()); powerUps.forEach(pu => pu.update());
        particles.forEach((p, index) => { p.update(); if (p.life <= 0) particles.splice(index, 1); });
    }
    function drawGameObjects() { /* ... (same as previous version) ... */
        if (!ctx) return; ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        pipes.forEach(pipe => pipe.draw()); powerUps.forEach(pu => pu.draw());
        if (gameState !== 'GAMEOVER' && rocket) rocket.draw();
        particles.forEach(p => p.draw());
    }
    function gameLoop() { /* ... (same as previous version) ... */
        if (gameState !== 'PLAYING') return; frame++;
        generatePipes(); if (frame % 75 === 0) generatePowerUps();
        trySpawnEmergencyBeans(); updateGameObjects(); checkCollisions();
        drawGameObjects(); updateUI(rocket); requestAnimationFrame(gameLoop);
    }


    // Event Listeners
    if (startButton) startButton.addEventListener('click', startGame);
    if (restartButton) restartButton.addEventListener('click', initGame); // Changed to initGame to show start screen again
    window.addEventListener('keydown', handleInput);
    if (canvas) {
        canvas.addEventListener('mousedown', handleInput);
        canvas.addEventListener('touchstart', handleInput, { passive: false });
    }

    initGame(); // Start the game initialization
});

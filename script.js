document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT GRABBING ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
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
    const redeemCodeInput = document.getElementById('redeemCodeInput');
    const redeemCodeButton = document.getElementById('redeemCodeButton');
    const redeemStatusMessage = document.getElementById('redeemStatusMessage');

    if (!canvas || !ctx) {
        console.error("CRITICAL ERROR: Canvas or 2D context not found. Game cannot start.");
        alert("Error: Game canvas not found. Please check the HTML and try again.");
        return;
    }

    // --- GAME SETTINGS & GLOBAL VARIABLES ---
    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    let rocket, obstacles, powerUps, particles;
    let score = 0, highScore = 0, frame = 0, gameSpeed = 2.0;
    let gameState = 'LOADING';
    let coins = 0;
    let initialAssetsHaveLoaded = false;

    // --- CHARACTER DATA & ASSET PATHS ---
    let charactersData = [
        { id: 'lali_classic', name: 'Lali Classic', imageSrc: 'assets/tiles/lali_classic.png', price: 0, imageObj: new Image(), isReady: false, unlocked: true },
        { id: 'lali_banana', name: 'Banana Lali', imageSrc: 'assets/tiles/banana_lali.png', price: 100, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_super', name: 'Super Lali', imageSrc: 'assets/tiles/lali_super.png', price: 200, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_ninja', name: 'Ninja Lali', imageSrc: 'assets/tiles/lali_ninja.png', price: 300, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_robo', name: 'Robo Lali', imageSrc: 'assets/tiles/lali_robo.png', price: 600, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_golden', name: 'Golden Lali', imageSrc: 'assets/tiles/lali_golden.png', price: 1000, imageObj: new Image(), isReady: false, unlocked: false },
        { id: 'lali_kawaii', name: 'Kawaii Lali', imageSrc: 'assets/tiles/kawaii_lali.png', price: 1600, imageObj: new Image(), isReady: false, unlocked: false }
    ];
    let currentSelectedCharacterId = 'lali_classic';
    let shopPreviewCharacterId = 'lali_classic';

    // --- ASSET LOADING ---
    const beakerObstacleImg = new Image(); beakerObstacleImg.src = 'assets/tiles/beaker-removebg-preview.png'; beakerObstacleImg.isReady = false;
    const rulerObstacleImg = new Image(); rulerObstacleImg.src = 'assets/tiles/ruler_obstacle.png'; rulerObstacleImg.isReady = false;
    const bookstackObstacleImg = new Image(); bookstackObstacleImg.src = 'assets/tiles/bookstack_obstacle.png'; bookstackObstacleImg.isReady = false;
    const fuelPowerUpImg = new Image(); fuelPowerUpImg.src = 'assets/tiles/beans-removebg-preview.png'; fuelPowerUpImg.isReady = false;
    const shieldPowerUpImg = new Image(); shieldPowerUpImg.src = 'assets/tiles/your_shield_image.png';
    shieldPowerUpImg.isReady = false;
    const backgroundMusic = new Audio(); backgroundMusic.isReady = false;
    const backgroundImg = new Image(); backgroundImg.src = 'assets/tiles/background_sky.png'; backgroundImg.isReady = false;
    let backgroundX = 0;
    const BACKGROUND_SCROLL_SPEED_FACTOR = 0.3;

    let assetsToLoad = charactersData.length + 3 + 1 + 1 + 1 + 1;
    let assetsLoaded = 0;

    function getCharacterById(id) { return charactersData.find(char => char.id === id) || charactersData[0]; }
    function getCurrentGameCharacter() { return getCharacterById(currentSelectedCharacterId); }

    function assetLoadManager(assetName = "Generic asset") {
        assetsLoaded++;
        console.log(`${assetName} loaded. Assets: ${assetsLoaded}/${assetsToLoad} (Initial load flag: ${initialAssetsHaveLoaded})`);

        if (assetsLoaded >= assetsToLoad && !initialAssetsHaveLoaded) {
            initialAssetsHaveLoaded = true; 
            console.log("All critical assets successfully loaded for the first time. Initializing game.");
            gameState = 'START'; 
            initGame();
        } else if (assetsLoaded >= assetsToLoad && initialAssetsHaveLoaded) {
            console.log("Asset loaded/retried after initial setup. Game should already be initialized or initializing via initGame.");
        }
    }

    charactersData.forEach(charData => {
        charData.imageObj.src = charData.imageSrc;
        charData.imageObj.onload = () => { charData.isReady = true; assetLoadManager(`Char ${charData.name}`); };
        charData.imageObj.onerror = () => { charData.isReady = false; console.error(`Failed to load character image: ${charData.name} at ${charData.imageSrc}`); assetLoadManager(`Char ${charData.name} (fail)`); };
    });

    beakerObstacleImg.onload = () => { beakerObstacleImg.isReady = true; assetLoadManager("Beaker Obstacle"); };
    beakerObstacleImg.onerror = () => { beakerObstacleImg.isReady = false; console.error("Beaker Obstacle fail"); assetLoadManager("Beaker (fail)"); };
    rulerObstacleImg.onload = () => { rulerObstacleImg.isReady = true; assetLoadManager("Ruler Obstacle"); };
    rulerObstacleImg.onerror = () => { rulerObstacleImg.isReady = false; console.error("Ruler Obstacle fail"); assetLoadManager("Ruler (fail)"); };
    bookstackObstacleImg.onload = () => { bookstackObstacleImg.isReady = true; assetLoadManager("Bookstack Obstacle"); };
    bookstackObstacleImg.onerror = () => { bookstackObstacleImg.isReady = false; console.error("Bookstack Obstacle fail"); assetLoadManager("Bookstack (fail)"); };
    fuelPowerUpImg.onload = () => { fuelPowerUpImg.isReady = true; assetLoadManager("Fuel Image"); };
    fuelPowerUpImg.onerror = () => { fuelPowerUpImg.isReady = false; console.error("Fuel Image fail"); assetLoadManager("Fuel (fail)"); };
    shieldPowerUpImg.onload = () => { shieldPowerUpImg.isReady = true; assetLoadManager("Shield Image"); };
    shieldPowerUpImg.onerror = () => { shieldPowerUpImg.isReady = false; console.error("Shield Image fail"); assetLoadManager("Shield (fail)"); };
    backgroundMusic.src = 'assets/sounds/background_music.mp3'; backgroundMusic.loop = true; backgroundMusic.volume = 0.3;
    backgroundMusic.oncanplaythrough = () => { backgroundMusic.isReady = true; assetLoadManager("Background Music"); };
    backgroundMusic.onerror = () => { backgroundMusic.isReady = false; console.error("BG Music fail"); assetLoadManager("Music (fail)"); };
    try { backgroundMusic.load(); } catch (e) { console.error("Music load() call fail:", e); }
    backgroundImg.onload = () => { backgroundImg.isReady = true; assetLoadManager("Background Image"); };
    backgroundImg.onerror = () => { backgroundImg.isReady = false; console.error("Background Image fail"); assetLoadManager("Background Image (fail)"); };

    const sounds = { flap: new Audio(), score: new Audio(), hit: new Audio(), powerup: new Audio(), fuelEmpty: new Audio(), purchase: new Audio() };
    sounds.flap.src = 'assets/sounds/fart.wav';
    sounds.purchase.src = 'assets/sounds/purchase.wav';
    Object.values(sounds).forEach(sound => { if (sound.src) { sound.load(); sound.oncanplaythrough = () => console.log(`${sound.src.split('/').pop()} ready`); sound.onerror = (e) => console.error(`Sound Error: ${sound.src}`, e); }});

    const ROCKET_WIDTH = 90; const ROCKET_HEIGHT = 130; const GRAVITY = 0.28; const FLAP_STRENGTH = -7.5;
    const MAX_FUEL = 100; const FUEL_CONSUMPTION = 2.5; const FUEL_REGEN_RATE = 0;
    const OBSTACLE_GAP = 260 + (ROCKET_HEIGHT - 95); const OBSTACLE_SPACING = 420;
    const OBSTACLE_SPEED_INITIAL = 2.0; const MIN_OBSTACLE_SEGMENT_HEIGHT = 40;
    const OBSTACLE_VERTICAL_MOVEMENT_MAX_OFFSET = 60; const OBSTACLE_VERTICAL_SPEED = 0.45;
    const OBSTACLE_TYPES = {
        beaker:    { img: beakerObstacleImg,    visualWidth: 120, effectiveWidth: 40,  hitboxInsetX: 15, hitboxInsetYGapEdge: 30 },
        ruler:     { img: rulerObstacleImg,     visualWidth: 60,  effectiveWidth: 30,  hitboxInsetX: 5,  hitboxInsetYGapEdge: 5  },
        bookstack: { img: bookstackObstacleImg, visualWidth: 150, effectiveWidth: 120, hitboxInsetX: 25, hitboxInsetYGapEdge: 50 }
    };
    const SHIELD_POWERUP_SIZE = 70;
    const FUEL_POWERUP_SIZE = 100;
    const POWERUP_SPAWN_CHANCE = 0.011; const SHIELD_DURATION = 540;
    const LOW_FUEL_THRESHOLD_PERCENT = 25; let canSpawnEmergencyBeans = true;
    const EMERGENCY_BEANS_COOLDOWN_FRAMES = 180; let emergencyBeansCooldownTimer = 0;

    class Rocket {
        constructor() { this.x = GAME_WIDTH / 6; this.y = GAME_HEIGHT / 2 - ROCKET_HEIGHT / 2; this.width = ROCKET_WIDTH; this.height = ROCKET_HEIGHT; this.velocityY = 0; this.fuel = MAX_FUEL; this.shieldActive = false; this.shieldTimer = 0; this.character = getCurrentGameCharacter(); }
        flap() { if (this.fuel > 0 && gameState === 'PLAYING') { this.velocityY = FLAP_STRENGTH; this.fuel -= FUEL_CONSUMPTION; if (this.fuel < 0) this.fuel = 0; playSound(sounds.flap); for (let i = 0; i < 8; i++) { particles.push(new Particle(this.x + this.width / 2, this.y + this.height * 0.9, 'thrust'));}} else if (gameState === 'PLAYING') { playSound(sounds.fuelEmpty); }}
        update() { this.velocityY += GRAVITY; this.y += this.velocityY; if (this.fuel < MAX_FUEL) { this.fuel += FUEL_REGEN_RATE; if (this.fuel > MAX_FUEL) this.fuel = MAX_FUEL; } if (this.shieldActive) { this.shieldTimer--; if (this.shieldTimer <= 0) this.shieldActive = false; } if (this.y < 0) { this.y = 0; this.velocityY = 0; }}
        draw() {
            const charImg = this.character.imageObj;
            if (this.character.isReady && charImg.complete && charImg.naturalWidth !== 0 && charImg.naturalHeight !== 0) {
                const boxW = this.width;
                const boxH = this.height;
                const imgW = charImg.naturalWidth;
                const imgH = charImg.naturalHeight;

                const boxAspectRatio = boxW / boxH;
                const imgAspectRatio = imgW / imgH;

                let drawWidth, drawHeight;

                if (imgAspectRatio > boxAspectRatio) {
                    drawWidth = boxW;
                    drawHeight = drawWidth / imgAspectRatio;
                } else {
                    drawHeight = boxH;
                    drawWidth = drawHeight * imgAspectRatio;
                }

                const drawX = this.x + (boxW - drawWidth) / 2;
                const drawY = this.y + (boxH - drawHeight) / 2;

                ctx.drawImage(charImg, drawX, drawY, drawWidth, drawHeight);
            } else {
                ctx.fillStyle = 'purple';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }

            if (this.shieldActive) {
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                ctx.lineWidth = 5;
                ctx.beginPath();
                const r = Math.max(this.width, this.height) * 0.8;
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    class Obstacle {
        constructor(x, initialGapY, movesVertically, type) { this.x = x; this.type = type; const P = OBSTACLE_TYPES[this.type]; this.image = P.img; this.visualWidth = P.visualWidth; this.effectiveWidth = P.effectiveWidth; this.hitboxInsetX = P.hitboxInsetX; this.hitboxInsetYGapEdge = P.hitboxInsetYGapEdge; this.initialGapY = initialGapY; this.currentGapY = initialGapY; this.movesVertically = movesVertically; this.verticalDirection = Math.random() > 0.5 ? 1 : -1; this.passed = false; this.topPart = { y: 0, height: 0 }; this.bottomPart = { y: 0, height: 0 }; this._calculateDimensions(); }
        _calculateDimensions() { this.topPart.y = 0; this.topPart.height = this.currentGapY - OBSTACLE_GAP / 2; if (this.topPart.height < MIN_OBSTACLE_SEGMENT_HEIGHT) this.topPart.height = MIN_OBSTACLE_SEGMENT_HEIGHT; this.bottomPart.y = this.currentGapY + OBSTACLE_GAP / 2; this.bottomPart.height = GAME_HEIGHT - this.bottomPart.y; if (this.bottomPart.height < MIN_OBSTACLE_SEGMENT_HEIGHT) this.bottomPart.height = MIN_OBSTACLE_SEGMENT_HEIGHT; if (this.topPart.y + this.topPart.height > this.bottomPart.y - MIN_OBSTACLE_SEGMENT_HEIGHT) { this.topPart.height = Math.max(MIN_OBSTACLE_SEGMENT_HEIGHT, this.currentGapY - OBSTACLE_GAP / 2); this.bottomPart.y = this.currentGapY + OBSTACLE_GAP / 2; this.bottomPart.height = Math.max(MIN_OBSTACLE_SEGMENT_HEIGHT, GAME_HEIGHT - this.bottomPart.y); }}
        update() { this.x -= gameSpeed; if (this.movesVertically) { const mA = OBSTACLE_VERTICAL_SPEED * this.verticalDirection; let nGC = this.currentGapY + mA; const mB = this.initialGapY - OBSTACLE_VERTICAL_MOVEMENT_MAX_OFFSET; const xB = this.initialGapY + OBSTACLE_VERTICAL_MOVEMENT_MAX_OFFSET; const sM = OBSTACLE_GAP / 2 + MIN_OBSTACLE_SEGMENT_HEIGHT + 10; const sX = GAME_HEIGHT - (OBSTACLE_GAP / 2 + MIN_OBSTACLE_SEGMENT_HEIGHT + 10); const fM = Math.max(mB, sM); const fX = Math.min(xB, sX); if (nGC > fX || nGC < fM) { this.verticalDirection *= -1; nGC = Math.max(fM, Math.min(fX, nGC)); } this.currentGapY = nGC; } this._calculateDimensions(); }
        draw() { if (!this.image || !this.image.isReady) return; const dX = this.x - (this.visualWidth - this.effectiveWidth) / 2; if (this.topPart.height > 0) { ctx.save(); ctx.translate(dX, this.topPart.y + this.topPart.height); ctx.scale(1, -1); ctx.drawImage(this.image, 0, 0, this.visualWidth, this.topPart.height); ctx.restore(); } if (this.bottomPart.height > 0) { ctx.drawImage(this.image, dX, this.bottomPart.y, this.visualWidth, this.bottomPart.height); } }
    }
    class PowerUp {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            if (this.type === 'shield') {
                this.size = SHIELD_POWERUP_SIZE;
            } else if (this.type === 'fuel') {
                this.size = FUEL_POWERUP_SIZE;
            } else {
                this.size = 100;
            }
            this.collected = false;
        }
        update() { this.x -= gameSpeed; }
        draw() {
            if (this.collected) return;
            if (this.type === 'shield') {
                if (shieldPowerUpImg.isReady && shieldPowerUpImg.complete && shieldPowerUpImg.naturalWidth > 0) {
                    ctx.drawImage(shieldPowerUpImg, this.x, this.y, this.size, this.size);
                } else {
                    const cX = this.x + this.size / 2;
                    const cY = this.y + this.size / 2;
                    ctx.beginPath();
                    ctx.arc(cX, cY, this.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 180, 200, 0.7)';
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.textAlign='center';
                    ctx.textBaseline='middle';
                    ctx.font = `bold ${this.size*0.6}px Arial`;
                    ctx.fillText('S?', cX, cY);
                }
            } else if (this.type === 'fuel') {
                if (fuelPowerUpImg.isReady && fuelPowerUpImg.complete && fuelPowerUpImg.naturalWidth > 0) {
                    ctx.drawImage(fuelPowerUpImg, this.x, this.y, this.size, this.size);
                } else {
                    const cX = this.x + this.size / 2;
                    const cY = this.y + this.size / 2;
                    ctx.beginPath();
                    ctx.arc(cX, cY, this.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,190,0,0.7)';
                    ctx.fill();
                    ctx.fillStyle = 'black';
                    ctx.textAlign='center';
                    ctx.textBaseline='middle';
                    ctx.font = `bold ${this.size*0.6}px Arial`;
                    ctx.fillText('F?', cX, cY);
                }
            }
        }
        applyEffect(r) { playSound(sounds.powerup); if (this.type === 'shield') { r.shieldActive = true; r.shieldTimer = SHIELD_DURATION; } else if (this.type === 'fuel') { r.fuel = MAX_FUEL; } this.collected = true; for (let i=0; i<20; i++) { particles.push(new Particle(this.x+this.size/2, this.y+this.size/2, 'collect'));}}
    }
    class Particle {
        constructor(x, y, type) { this.x=x; this.y=y; this.type=type; this.size=Math.random()*(type==='explosion'?10:(type==='thrust'?8:7))+3; this.initialLife=(type==='explosion'?70:(type==='thrust'?30:40))+Math.random()*30; this.life=this.initialLife; const a=Math.random()*Math.PI*2; let s=Math.random()*(type==='explosion'?10:(type==='collect'?5:3))+1; if(type==='thrust'){const r=Math.floor(Math.random()*50)+100;const g=Math.floor(Math.random()*40)+60;const b=Math.floor(Math.random()*30)+20;this.color=`rgba(${r},${g},${b},${Math.random()*0.4+0.4})`;this.velocityX=(Math.random()-0.5)*2.5;this.velocityY=Math.random()*2.0+1.0;this.size=Math.random()*8+4;}else{this.velocityX=Math.cos(a)*s;this.velocityY=Math.sin(a)*s;if(type==='explosion'){this.color=`rgba(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*120)},0,0.8)`;}else{this.color=`rgba(255,230,${Math.random()>0.5?50:150},0.8)`;}}}
        update(){this.x+=this.velocityX;this.y+=this.velocityY;if(this.type==='thrust'){this.velocityY+=0.03;this.velocityX*=0.98;this.size*=0.99;}else if(this.type==='explosion'||this.type==='collect'){this.velocityX*=0.97;this.velocityY*=0.97;if(this.type==='explosion')this.velocityY+=0.1;}this.life--;if(this.size<1)this.life=0;}
        draw(){if(this.life<=0||this.size<=0)return;ctx.globalAlpha=Math.max(0,this.life/this.initialLife);ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(this.x,this.y,Math.max(0,this.size),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1.0;}
    }

    function playSound(s) { if (s && s.src && s.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) { s.currentTime = 0; s.play().catch(e => console.warn(`Sound play fail ${s.src.split('/').pop()}:`, e)); } else if (s && s.src) { console.warn(`Sound ${s.src.split('/').pop()} not ready. St: ${s.readyState}, Nw: ${s.networkState}`); if (s.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || s.networkState === HTMLMediaElement.NETWORK_EMPTY) { if (s.src) s.load(); }}}
    
    let startScreenAnimFrame = 0; const startScreenCharYOffsetMax = 25; const startScreenCharBobSpeed = 0.03; let isStartScreenLoopRunning = false;
    
    function drawStartScreenCharacter(bobOffset) {
        const gC = getCurrentGameCharacter();
        if (!gC || !gC.isReady || !ctx) return;
        const charImg = gC.imageObj;

        const scaleFactor = 2.8;
        const boxW_target = ROCKET_WIDTH * scaleFactor;
        const boxH_target = ROCKET_HEIGHT * scaleFactor;

        const boxX_corner = GAME_WIDTH * 0.80 - boxW_target / 2;
        const boxY_corner = GAME_HEIGHT / 2 - boxH_target / 2 + bobOffset;

        if (charImg.complete && charImg.naturalWidth !== 0 && charImg.naturalHeight !== 0) {
            const imgW = charImg.naturalWidth;
            const imgH = charImg.naturalHeight;
            const boxAspectRatio = boxW_target / boxH_target;
            const imgAspectRatio = imgW / imgH;

            let drawWidth, drawHeight;

            if (imgAspectRatio > boxAspectRatio) {
                drawWidth = boxW_target;
                drawHeight = drawWidth / imgAspectRatio;
            } else {
                drawHeight = boxH_target;
                drawWidth = drawHeight * imgAspectRatio;
            }
            
            const drawX = boxX_corner + (boxW_target - drawWidth) / 2;
            const drawY = boxY_corner + (boxH_target - drawHeight) / 2;
            
            ctx.drawImage(charImg, drawX, drawY, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = 'grey';
            ctx.fillRect(boxX_corner, boxY_corner, boxW_target, boxH_target);
        }
    }

    function startScreenAnimationLoop() { if (gameState !== 'START' || !isStartScreenLoopRunning || (startScreen && startScreen.style.display === 'none') ) { isStartScreenLoopRunning = false; return; } if(ctx){ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT); drawBackground();} startScreenAnimFrame++; const bO = Math.sin(startScreenAnimFrame*startScreenCharBobSpeed)*startScreenCharYOffsetMax; drawStartScreenCharacter(bO); requestAnimationFrame(startScreenAnimationLoop); }

    function loadGameData() { coins = parseInt(localStorage.getItem('flappyLaliCoins_v2'))||0; highScore = parseInt(localStorage.getItem('flappyLaliFartV2_hs'))||0; currentSelectedCharacterId = localStorage.getItem('flappyLaliSelectedChar_v2')||'lali_classic'; shopPreviewCharacterId = currentSelectedCharacterId; const uC = JSON.parse(localStorage.getItem('flappyLaliUnlockedChars_v2')); if (uC && Array.isArray(uC)) { charactersData.forEach(c => { c.unlocked = uC.includes(c.id); }); } const cC = getCharacterById('lali_classic'); if (cC) cC.unlocked = true; else { console.error("Classic Character definition not found!"); charactersData[0].unlocked = true;} const sel = getCharacterById(currentSelectedCharacterId); if (!sel||!sel.unlocked) { currentSelectedCharacterId = 'lali_classic'; shopPreviewCharacterId = 'lali_classic'; localStorage.setItem('flappyLaliSelectedChar_v2', currentSelectedCharacterId); } updateCoinDisplay(); }
    function saveCoins() { localStorage.setItem('flappyLaliCoins_v2', coins); } function saveHighScore() { localStorage.setItem('flappyLaliFartV2_hs', highScore); }
    function saveCharacterData() { const uCI = charactersData.filter(c => c.unlocked).map(c => c.id); localStorage.setItem('flappyLaliUnlockedChars_v2', JSON.stringify(uCI)); localStorage.setItem('flappyLaliSelectedChar_v2', currentSelectedCharacterId); }
    function updateCoinDisplay() { if(coinCountDisplay)coinCountDisplay.textContent=coins; if(shopCoinCountDisplay)shopCoinCountDisplay.textContent=coins; }
    function renderCharacterShop() { if(!shopPanelLeft){console.error("Shop panel left not found!"); return;} shopPanelLeft.innerHTML=''; charactersData.forEach(c=>{ const s=document.createElement('div'); s.classList.add('character-slot'); if(c.id===shopPreviewCharacterId)s.classList.add('selected-in-shop'); const i=new Image();i.src=c.imageSrc;i.alt=c.name;if(!c.isReady||!c.imageObj.complete||c.imageObj.naturalWidth===0)i.classList.add('not-ready');s.appendChild(i); const iD=document.createElement('div');iD.classList.add('char-info-shop'); const nP=document.createElement('p');nP.classList.add('char-name');nP.textContent=c.name;iD.appendChild(nP); if(c.unlocked){const sP=document.createElement('p');sP.classList.add('char-status');sP.textContent=(c.id===currentSelectedCharacterId)?"Equipped":"Owned";iD.appendChild(sP);}else{const pP=document.createElement('p');pP.classList.add('char-price');pP.textContent=`Price: ${c.price}`;iD.appendChild(pP);} s.appendChild(iD); const bC=document.createElement('div');bC.classList.add('shop-button-container'); if(c.unlocked){if(c.id!==currentSelectedCharacterId){const eB=document.createElement('button');eB.textContent="Equip";eB.onclick=(e)=>{e.stopPropagation();equipCharacter(c.id);};bC.appendChild(eB);}}else{const bB=document.createElement('button');bB.textContent="Buy";if(coins<c.price)bB.disabled=true;bB.onclick=(e)=>{e.stopPropagation();buyCharacter(c.id);};bC.appendChild(bB);} s.appendChild(bC);s.onclick=()=>updateShopPreview(c.id);shopPanelLeft.appendChild(s);});}
    function updateShopPreview(cId) { shopPreviewCharacterId=cId; const c=getCharacterById(cId); if(!c)return; if(shopCharacterPreviewImage){if(c.isReady&&c.imageObj.complete&&c.imageObj.naturalWidth>0){shopCharacterPreviewImage.src=c.imageObj.src;shopCharacterPreviewImage.classList.remove('not-ready');}else{shopCharacterPreviewImage.src='';shopCharacterPreviewImage.classList.add('not-ready');}} if(shopCharacterName)shopCharacterName.textContent=c.name; if(shopCharacterPriceStatus){if(c.unlocked){shopCharacterPriceStatus.textContent=(c.id===currentSelectedCharacterId)?"Currently Equipped":"Owned";shopCharacterPriceStatus.className='char-status owned';}else{shopCharacterPriceStatus.textContent=`Price: ${c.price} Coins`;shopCharacterPriceStatus.className='char-status';}} if(shopPanelLeft){const slts=shopPanelLeft.querySelectorAll('.character-slot');slts.forEach(slt=>{const sCN=slt.querySelector('.char-name').textContent;const sC=charactersData.find(ch=>ch.name===sCN);if(sC&&sC.id===cId)slt.classList.add('selected-in-shop');else slt.classList.remove('selected-in-shop');});}}
    function equipCharacter(cId) { const cTE=getCharacterById(cId); if(cTE&&cTE.unlocked){currentSelectedCharacterId=cId;saveCharacterData();renderCharacterShop();updateShopPreview(shopPreviewCharacterId);}}
    function buyCharacter(cId) { const cTB=getCharacterById(cId); if(cTB&&!cTB.unlocked&&coins>=cTB.price){coins-=cTB.price;cTB.unlocked=true;playSound(sounds.purchase);saveCoins();saveCharacterData();updateCoinDisplay();renderCharacterShop();updateShopPreview(cId);}}
    const redeemCodes = { "imjaron": { description: "All Lali characters unlocked!", action: () => { let uS = false; charactersData.forEach(c => { if (!c.unlocked) { c.unlocked = true; uS = true; }}); if (uS) { saveCharacterData(); if (shopScreen && shopScreen.style.display !== 'none') { renderCharacterShop(); updateShopPreview(shopPreviewCharacterId); }} return uS; }}};
    function handleRedeemCode() { if(!redeemCodeInput||!redeemStatusMessage)return; const eC=redeemCodeInput.value.trim().toLowerCase(); redeemCodeInput.value=''; if(redeemCodes[eC]){const cE=redeemCodes[eC];const succ=cE.action();if(succ){playSound(sounds.purchase);redeemStatusMessage.textContent=cE.description||"Code redeemed!";redeemStatusMessage.className='success';}else{redeemStatusMessage.textContent="Code applied, no new changes.";redeemStatusMessage.className='success';}}else{redeemStatusMessage.textContent="Invalid code.";redeemStatusMessage.className='error';} redeemStatusMessage.style.display='block'; setTimeout(()=>{if(redeemStatusMessage)redeemStatusMessage.style.display='none';},4000);}

    function initGame() {
        if (gameState !== 'LOADING' && !initialAssetsHaveLoaded) {
             loadGameData();
        }
        rocket = null; obstacles = []; powerUps = []; particles = [];
        score = 0; frame = 0; gameSpeed = OBSTACLE_SPEED_INITIAL;
        canSpawnEmergencyBeans = true; 
        emergencyBeansCooldownTimer = 0; 
        
        if(startScreen)startScreen.style.display='flex';
        if(gameOverScreen)gameOverScreen.style.display='none';
        if(shopScreen)shopScreen.style.display='none';
        if(redeemStatusMessage)redeemStatusMessage.style.display='none';

        const allAssetsReady = assetsLoaded >= assetsToLoad;
        if(startButton)startButton.disabled = !allAssetsReady;
        if(shopButton)shopButton.disabled = !allAssetsReady;
        if(redeemCodeButton)redeemCodeButton.disabled = !allAssetsReady;
        
        updateUI(null);
        if(ctx)ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT);
        isStartScreenLoopRunning=false; 
        if(gameState==='START' && allAssetsReady){
            const gC=getCurrentGameCharacter();
            if(gC && gC.isReady){
                isStartScreenLoopRunning=true;
                startScreenAnimationLoop();
            }
            if(backgroundMusic.isReady && backgroundMusic.paused){
                backgroundMusic.play().catch(e=>console.warn("BG Music autoplay fail init.",e));
            }
        }
    }
    function startGame() {
        isStartScreenLoopRunning=false;
        if(ctx)ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT);
        gameState='PLAYING';
        if(startScreen)startScreen.style.display='none';
        if(shopScreen)shopScreen.style.display='none';
        if(gameOverScreen)gameOverScreen.style.display='none';
        rocket=new Rocket(); 
        obstacles=[]; powerUps=[]; particles=[];
        score=0; frame=0; gameSpeed=OBSTACLE_SPEED_INITIAL;
        canSpawnEmergencyBeans=true; emergencyBeansCooldownTimer=0;
        updateUI(rocket);
        if(backgroundMusic.isReady && backgroundMusic.paused){
            backgroundMusic.play().catch(e=>console.error("BG music play err:",e));
        }
        gameLoop();
    }
    function gameOver() {
        playSound(sounds.hit);
        gameState='GAMEOVER';
        const eTG=score; coins+=eTG; saveCoins(); updateCoinDisplay();
        if(coinsEarnedDisplay)coinsEarnedDisplay.textContent=eTG;
        if(rocket){for(let i=0;i<50;i++){particles.push(new Particle(rocket.x+rocket.width/2,rocket.y+rocket.height/2,'explosion'));} rocket=null;}
        if(score>highScore){highScore=score;saveHighScore();if(newHighScoreTextGameOver)newHighScoreTextGameOver.style.display='block';}
        else{if(newHighScoreTextGameOver)newHighScoreTextGameOver.style.display='none';}
        if(finalScoreDisplay)finalScoreDisplay.textContent=score;
        if(gameOverScreen)gameOverScreen.style.display='flex';
        updateUI(null);
    }

    function drawBackground() { if(!ctx)return; if(backgroundImg.isReady && backgroundImg.complete && backgroundImg.naturalWidth > 0){ ctx.drawImage(backgroundImg, backgroundX, 0, backgroundImg.width, GAME_HEIGHT); if (backgroundX < 0) { ctx.drawImage(backgroundImg, backgroundX + backgroundImg.width, 0, backgroundImg.width, GAME_HEIGHT); } } else { ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT); }}
    function handleInput(e) {
        if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp' || e.type === 'mousedown' || e.type === 'touchstart') {
            e.preventDefault();
            if (gameState === 'PLAYING' && rocket) {
                rocket.flap();
            }
        }
    }
    function generateObstacles() { if(frame%Math.floor(OBSTACLE_SPACING/gameSpeed)===0){const oTK=Object.keys(OBSTACLE_TYPES);const rT=oTK[Math.floor(Math.random()*oTK.length)];const mGC=OBSTACLE_GAP/2+MIN_OBSTACLE_SEGMENT_HEIGHT+20;const xGC=GAME_HEIGHT-(OBSTACLE_GAP/2+MIN_OBSTACLE_SEGMENT_HEIGHT+20);const range=xGC-mGC;let iGY=(range>0)?(Math.random()*range+mGC):(GAME_HEIGHT/2);const mV=Math.random()<0.4;obstacles.push(new Obstacle(GAME_WIDTH,iGY,mV,rT));} obstacles=obstacles.filter(o=>o.x+o.visualWidth>0);}
    
    function generatePowerUps() {
        if (Math.random() < POWERUP_SPAWN_CHANCE && powerUps.length < 3) {
            const t = Math.random() < 0.4 ? 'shield' : 'fuel';
            const currentGeneratedPowerUpSize = (t === 'shield') ? SHIELD_POWERUP_SIZE : FUEL_POWERUP_SIZE;
            const y = Math.random() * (GAME_HEIGHT - currentGeneratedPowerUpSize - 150) + 75;
            const x = GAME_WIDTH + Math.random() * 200;
            powerUps.push(new PowerUp(x, y, t));
        }
        powerUps = powerUps.filter(pU => pU.x + pU.size > 0 && !pU.collected);
    }

    function trySpawnEmergencyBeans() {
        if (rocket && rocket.fuel < (MAX_FUEL * (LOW_FUEL_THRESHOLD_PERCENT / 100)) && canSpawnEmergencyBeans) {
            const eFPU = powerUps.find(pU => pU.type === 'fuel');
            if (!eFPU) {
                let sX = GAME_WIDTH * 0.8;
                const nRY = rocket.y + (Math.random() - 0.5) * 100;
                const cY = Math.max(FUEL_POWERUP_SIZE / 2, Math.min(GAME_HEIGHT - FUEL_POWERUP_SIZE * 1.5, nRY));
                const nO = obstacles.find(o => o.x + o.effectiveWidth > rocket.x + rocket.width);
                if (nO) sX = nO.x + nO.effectiveWidth + Math.random() * OBSTACLE_SPACING * 0.3 + 50;
                else if (obstacles.length > 0 && obstacles[obstacles.length - 1].x + obstacles[obstacles.length - 1].effectiveWidth > 0) {
                    sX = obstacles[obstacles.length - 1].x + obstacles[obstacles.length - 1].effectiveWidth + Math.random() * OBSTACLE_SPACING * 0.3 + 50;
                }
                sX = Math.max(sX, rocket.x + GAME_WIDTH * 0.3);
                sX = Math.min(sX, GAME_WIDTH * 1.5);
                powerUps.push(new PowerUp(sX, cY, 'fuel'));
                canSpawnEmergencyBeans = false;
                emergencyBeansCooldownTimer = EMERGENCY_BEANS_COOLDOWN_FRAMES;
            }
        }
        if (emergencyBeansCooldownTimer > 0) {
            emergencyBeansCooldownTimer--;
            if (emergencyBeansCooldownTimer <= 0) canSpawnEmergencyBeans = true;
        }
    }

    function checkCollisions() { if(!rocket||gameState!=='PLAYING')return; if(rocket.y+rocket.height>=GAME_HEIGHT){rocket.y=GAME_HEIGHT-rocket.height;rocket.velocityY=0;if(!rocket.shieldActive){gameOver();return;}else{rocket.velocityY=FLAP_STRENGTH*0.3;playSound(sounds.hit);}} for(let o of obstacles){const rR={x:rocket.x,y:rocket.y,width:rocket.width,height:rocket.height};const oCX=o.x+o.hitboxInsetX;const oCW=o.effectiveWidth-2*o.hitboxInsetX;const tPR={x:oCX,y:o.topPart.y,width:oCW,height:o.topPart.height-o.hitboxInsetYGapEdge};if(tPR.height<0)tPR.height=0;if(!rocket.shieldActive&&rR.x<tPR.x+tPR.width&&rR.x+rR.width>tPR.x&&rR.y<tPR.y+tPR.height&&rR.y+rR.height>tPR.y){gameOver();return;}const bPR={x:oCX,y:o.bottomPart.y+o.hitboxInsetYGapEdge,width:oCW,height:o.bottomPart.height-o.hitboxInsetYGapEdge};if(bPR.height<0)bPR.height=0;if(!rocket.shieldActive&&rR.x<bPR.x+bPR.width&&rR.x+rR.width>bPR.x&&rR.y<bPR.y+bPR.height&&rR.y+rR.height>bPR.y){gameOver();return;}if(!o.passed&&o.x+o.effectiveWidth<rocket.x){o.passed=true;score++;playSound(sounds.score);gameSpeed+=0.02;}} for(let pU of powerUps){const rocketRect={x:rocket.x,y:rocket.y,width:rocket.width,height:rocket.height}; if(!pU.collected&&rocketRect.x<pU.x+pU.size&&rocketRect.x+rocketRect.width>pU.x&&rocketRect.y<pU.y+pU.size&&rocketRect.y+rocketRect.height>pU.y)pU.applyEffect(rocket);}}
    function updateGameObjects() { if(gameState!=='PLAYING')return; if(rocket)rocket.update(); obstacles.forEach(o=>o.update()); powerUps.forEach(pU=>pU.update()); particles=particles.filter(p=>p.life>0); particles.forEach(p=>p.update()); if(backgroundImg.isReady){backgroundX-=gameSpeed*BACKGROUND_SCROLL_SPEED_FACTOR;if(backgroundX<=-backgroundImg.width){backgroundX+=backgroundImg.width;}}}
    function drawGameObjects() { if(!ctx)return; ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT); drawBackground(); obstacles.forEach(o=>o.draw()); powerUps.forEach(pU=>pU.draw()); if(gameState==='PLAYING'&&rocket)rocket.draw(); particles.forEach(p=>p.draw());}
    function gameLoop() { if(gameState!=='PLAYING')return; frame++; generateObstacles(); if(frame%75===0)generatePowerUps(); trySpawnEmergencyBeans(); updateGameObjects(); checkCollisions(); drawGameObjects(); updateUI(rocket); requestAnimationFrame(gameLoop);}
    function updateUI(cR) { if(scoreDisplay)scoreDisplay.textContent=`Score: ${score}`; if(highScoreDisplay)highScoreDisplay.textContent=`High Score: ${highScore}`; updateCoinDisplay(); let fS=cR||(rocket?rocket:{fuel:MAX_FUEL}); if(fuelBar){if(fS){const fP=(fS.fuel/MAX_FUEL)*100;fuelBar.style.width=`${fP}%`;if(fP<LOW_FUEL_THRESHOLD_PERCENT)fuelBar.style.backgroundColor='#d63031';else if(fP<50)fuelBar.style.backgroundColor='#fdcb6e';else fuelBar.style.backgroundColor='#e17055';}else{fuelBar.style.width='100%';fuelBar.style.backgroundColor='#e17055';}}}

    if(startButton)startButton.addEventListener('click',startGame); if(restartButton)restartButton.addEventListener('click',initGame);
    if(shopButton){shopButton.addEventListener('click',()=>{isStartScreenLoopRunning=false;if(ctx)ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT);if(startScreen)startScreen.style.display='none';if(shopScreen)shopScreen.style.display='flex';renderCharacterShop();updateShopPreview(shopPreviewCharacterId);updateCoinDisplay();});}
    if(backToMenuButton){backToMenuButton.addEventListener('click',()=>{if(shopScreen)shopScreen.style.display='none';if(startScreen)startScreen.style.display='flex';const gC=getCurrentGameCharacter();if(assetsLoaded>=assetsToLoad&&gC&&gC.isReady){isStartScreenLoopRunning=true;startScreenAnimationLoop();}});}
    if(redeemCodeButton){redeemCodeButton.addEventListener('click',handleRedeemCode);}
    if(redeemCodeInput){redeemCodeInput.addEventListener('keypress',(e)=>{if(e.key==='Enter'){handleRedeemCode();}});}
    window.addEventListener('keydown',handleInput); if(canvas){canvas.addEventListener('mousedown',handleInput);canvas.addEventListener('touchstart',handleInput,{passive:false});}

    loadGameData();
    if(startButton)startButton.disabled=true;
    if(shopButton)shopButton.disabled=true;
    if(redeemCodeButton)redeemCodeButton.disabled=true;
});

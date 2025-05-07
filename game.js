const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const grassImg = new Image();
grassImg.src = 'assets/tiles/grass.png';

let gold = 100;
let towers = [];
let enemies = [];

const TILE_SIZE = 32;
let frame = 0;

// Load sample tower/enemy images
const towerImg = new Image();
towerImg.src = 'assets/towers/tower1.png';

const enemyImg = new Image();
enemyImg.src = 'assets/enemies/enemy1.png';

function drawMap() {
  ctx.fillStyle = "#3b3b3b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function spawnEnemy() {
  enemies.push({ x: 0, y: 160, hp: 100, speed: 1 });
}

function updateEnemies() {
  for (const enemy of enemies) {
    enemy.x += enemy.speed;
    if (enemy.x > canvas.width) {
      // Reached end, lose life (optional)
      enemy.hp = 0;
    }
  }
  enemies = enemies.filter(e => e.hp > 0);
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.drawImage(enemyImg, enemy.x, enemy.y, TILE_SIZE, TILE_SIZE);
  }
}

function drawTowers() {
  for (const tower of towers) {
    ctx.drawImage(towerImg, tower.x, tower.y, TILE_SIZE, TILE_SIZE);
  }
}

function attackEnemies() {
  for (const tower of towers) {
    for (const enemy of enemies) {
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      if (Math.sqrt(dx * dx + dy * dy) < 100) {
        enemy.hp -= tower.damage;
        if (enemy.hp <= 0) gold += 10;
      }
    }
  }
  document.getElementById("gold").textContent = gold;
}

function placeTower() {
  if (gold >= 50) {
    towers.push({ x: 200, y: 200, damage: 10 });
    gold -= 50;
    document.getElementById("gold").textContent = gold;
  }
}

function upgradeTower() {
  if (gold >= 100 && towers.length > 0) {
    towers[0].damage += 10;
    gold -= 100;
    document.getElementById("gold").textContent = gold;
  }
}

function gameLoop() {
  drawMap();
  drawTowers();
  drawEnemies();
  updateEnemies();
  attackEnemies();

  frame++;
  if (frame % 120 === 0) spawnEnemy();

  requestAnimationFrame(gameLoop);
}

gameLoop();

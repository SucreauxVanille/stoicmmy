const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 基準サイズ
const baseWidth = 800;
const baseHeight = 600;

// スコア
let score = 0;
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const menuEl = document.getElementById("menu");
const resultEl = document.getElementById("result");

// 背景
let bgCanvas = null;
let bgCtx = null;

function makeBackground() {
  bgCanvas = document.createElement("canvas");
  bgCtx = bgCanvas.getContext("2d");

  bgCanvas.width = canvas.width;
  bgCanvas.height = canvas.height;

  const layerHeight = 48;

  let hue = 200;
  let sat = 75;
  let light = 90;

  const hueShift = -1.0;
  const satShift = +1.5;
  const lightShift = -1.5;

  for (let y = 0; y < bgCanvas.height; y += layerHeight) {
    const currentHue = hue + (y / layerHeight) * hueShift;
    const currentSat = sat + (y / layerHeight) * satShift;
    const currentLight = light + (y / layerHeight) * lightShift;

    bgCtx.fillStyle = `hsl(${currentHue}, ${currentSat}%, ${currentLight}%)`;
    bgCtx.fillRect(0, y, bgCanvas.width, layerHeight);
  }
}

// キャンバスサイズ
let scale = 1;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  scale = Math.min(canvas.width / baseWidth, canvas.height / baseHeight);
  
  if (scoreEl) {
    let size = 36 * scale;
    size = Math.max(24, size);
    size = Math.min(60, size);
    scoreEl.style.fontSize = `${size}px`;
  }

  makeBackground();
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// 画像ロード
const playerImg = new Image();
const redImg = new Image();

let loadedCount = 0;
function checkLoaded() {
  loadedCount++;
  if (loadedCount === 2) {
    loop();
  }
}
playerImg.onload = checkLoaded;
redImg.onload = checkLoaded;

playerImg.src = "swimmy.gif";
redImg.src = "red.gif";

// ==============================
// 難易度定義
// ==============================
const DIFFICULTY = {
  easy: { playerSpeed: 5, spawnInterval: 80, fishSpeed: { base: 2, rand: 1.5 } },
  normal: { playerSpeed: 8, spawnInterval: 40, fishSpeed: { base: 3.5, rand: 1.8 } },
  hard: { playerSpeed: 12, spawnInterval: 5, fishSpeed: { base: 5, rand: 2 } }
};
let currentDifficulty = null;

// ==============================
// 状態管理
// ==============================
let gameState = "select"; // select / playing / result
let timeLeft = 0;
const TIME_LIMIT = 30 * 60; // 30秒（60fps換算）

// ==============================
// プレイヤー
// ==============================
class Player {
  constructor(img) {
    this.img = img;
    this.width = 72;
    this.height = 36;
    this.reset();
    this.speed = 5;
  }

  reset() {
    this.x = canvas.width / 4;
    this.y = canvas.height / 2;
    this.dx = 0;
    this.dy = 0;
  }

  update() {
    this.x += this.dx * scale;
    this.y += this.dy * scale;

    this.x = Math.max(0, Math.min(canvas.width - this.width * scale, this.x));
    this.y = Math.max(0, Math.min(canvas.height - this.height * scale, this.y));
  }

  draw() {
    ctx.drawImage(this.img, this.x, this.y, this.width * scale, this.height * scale);
  }

  get rect() {
    return { x: this.x, y: this.y, width: this.width * scale, height: this.height * scale };
  }
}

// ==============================
// 赤い魚
// ==============================
class RedFish {
  constructor(img) {
    const fs = currentDifficulty.fishSpeed;
    this.img = img;
    this.width = 72;
    this.height = 36;
    this.x = canvas.width + 20;
    this.y = Math.random() * (canvas.height - this.height * scale);
    this.baseSpeed = fs.base + Math.random() * fs.rand;
  }

  update() {
    this.x -= this.baseSpeed * scale;
  }

  draw() {
    ctx.drawImage(this.img, this.x, this.y, this.width * scale, this.height * scale);
  }

  get rect() {
    return { x: this.x, y: this.y, width: this.width * scale, height: this.height * scale };
  }
}

// ==============================
// 初期化
// ==============================
const player = new Player(playerImg);
const redFishes = [];
const followers = [];
const maxFollowers = 30;

let spawnTimer = 0;
function spawnRedFish() {
  redFishes.push(new RedFish(redImg));
}

function addFollower() {
  if (followers.length >= maxFollowers) return;
  const last = followers.length ? followers[followers.length - 1] : player;
  followers.push({ x: last.x, y: last.y, width: 72, height: 36 });
}

function checkCollision(a, b) {
  const ra = a.rect;
  const rb = b.rect;
  return ra.x < rb.x + rb.width &&
         ra.x + ra.width > rb.x &&
         ra.y < rb.y + rb.height &&
         ra.y + ra.height > rb.y;
}

// ==============================
// 入力
// ==============================
const keys = {};
window.addEventListener("keydown", e => { keys[e.key] = true; });
window.addEventListener("keyup", e => { keys[e.key] = false; });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const touch = e.touches[0];
  player.x = touch.clientX - (player.width * scale) / 2;
  player.y = touch.clientY - (player.height * scale) / 2;
});

// ==============================
// ゲーム開始・終了
// ==============================
function startGame(diffKey) {
  currentDifficulty = DIFFICULTY[diffKey];

  score = 0;
  timeLeft = TIME_LIMIT;
  spawnTimer = 0;
  redFishes.length = 0;
  followers.length = 0;

  player.speed = currentDifficulty.playerSpeed;
  player.reset();

  if (scoreEl) scoreEl.textContent = "Score: 0";
  if (timeEl) timeEl.textContent = "Time: 30";

  menuEl.style.display = "none";
  resultEl.style.display = "none";

  gameState = "playing";
}

function endGame() {
  gameState = "result";
  resultEl.textContent = `Score: ${score}`;
  resultEl.style.display = "block";
  menuEl.style.display = "flex";
}

// ボタンイベント
document.querySelectorAll("#menu button").forEach(btn => {
  btn.addEventListener("click", () => {
    startGame(btn.dataset.diff);
  });
});

// ==============================
// ループ
// ==============================
function loop() {
  requestAnimationFrame(loop);

  // 背景
  if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, canvas.width, canvas.height);

  if (gameState !== "playing") return;

  // タイマー
  timeLeft--;
  if (timeEl) timeEl.textContent = `Time: ${Math.ceil(timeLeft / 60)}`;
  if (timeLeft <= 0) {
    endGame();
    return;
  }

  // プレイヤー移動
  player.dx = 0;
  player.dy = 0;
  if (keys["ArrowLeft"]) player.dx = -player.speed;
  if (keys["ArrowRight"]) player.dx = player.speed;
  if (keys["ArrowUp"]) player.dy = -player.speed;
  if (keys["ArrowDown"]) player.dy = player.speed;

  player.update();

  // 赤い魚更新
  for (let i = redFishes.length - 1; i >= 0; i--) {
    const fish = redFishes[i];
    fish.update();
    fish.draw();

    if (fish.x < -fish.width * scale) {
      redFishes.splice(i, 1);
      continue;
    }

    if (checkCollision(player, fish)) {
      redFishes.splice(i, 1);
      score++;
      if (scoreEl) scoreEl.textContent = `Score: ${score}`;
      addFollower();
    }
  }

  // 追従描画
  for (let i = 0; i < followers.length; i++) {
    const target = i === 0 ? player : followers[i - 1];
    const follower = followers[i];

    follower.x += (target.x - follower.x) * 0.2;
    follower.y += (target.y - follower.y) * 0.2;

    ctx.save();
    ctx.translate(follower.x + follower.width * scale, follower.y);
    ctx.scale(-1, 1);
    ctx.drawImage(redImg, 0, 0, follower.width * scale, follower.height * scale);
    ctx.restore();
  }

  // プレイヤー描画
  player.draw();

  // 赤い魚スポーン
  spawnTimer++;
  if (spawnTimer > currentDifficulty.spawnInterval) {
    spawnRedFish();
    spawnTimer = 0;
  }
}

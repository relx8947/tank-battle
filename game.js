// 坦克大战 Tank Battle - Classic Battle City style
(() => {
  "use strict";

  const TILE = 40;            // 像素 / 格
  const GRID = 13;            // 13 x 13 格
  const SIZE = TILE * GRID;   // 520
  const TANK = TILE - 6;      // 坦克尺寸略小于格

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // 地图元素
  const EMPTY = 0, BRICK = 1, STEEL = 2, BASE = 3, GRASS = 4;

  // 方向
  const DIRS = {
    up:    { x: 0,  y: -1, a: 0 },
    right: { x: 1,  y: 0,  a: 90 },
    down:  { x: 0,  y: 1,  a: 180 },
    left:  { x: -1, y: 0,  a: 270 },
  };

  // ---- 关卡地图模板 (13x13)，简化经典布局 ----
  const TEMPLATE = [
    "0000000000000",
    "0111011101110",
    "0101010101010",
    "0101110101110",
    "0100000000010",
    "0101220221010",
    "0001200021000",
    "0101244421010",
    "0100040400010",
    "0111040401110",
    "0001000001000",
    "0011010100110",
    "0000010100000",
  ];

  let map = [];
  function loadMap() {
    map = [];
    for (let r = 0; r < GRID; r++) {
      const row = [];
      for (let c = 0; c < GRID; c++) {
        let ch = +TEMPLATE[r][c];
        row.push(ch === 3 ? EMPTY : ch); // 模板里没用3，base单独放
      }
      map.push(row);
    }
    // 基地：底部中间
    const bc = 6, br = 12;
    map[br][bc] = BASE;
    // 基地周围砖墙保护
    map[br - 1][bc - 1] = BRICK;
    map[br - 1][bc] = BRICK;
    map[br - 1][bc + 1] = BRICK;
    map[br][bc - 1] = BRICK;
    map[br][bc + 1] = BRICK;
    baseAlive = true;
  }

  // ---- 游戏状态 ----
  let player, bullets, enemies, particles;
  let score, lives, stage, enemiesRemaining, baseAlive;
  let running = false, paused = false, gameOver = false;
  let spawnTimer = 0;
  const ENEMY_PER_STAGE = 8;
  const MAX_ENEMIES_FIELD = 4;

  const keys = {};

  // ---- 实体 ----
  function makeTank(px, py, dir, isPlayer) {
    return {
      x: px, y: py, dir,
      speed: isPlayer ? 2.2 : 1.4,
      isPlayer,
      cooldown: 0,
      moveTimer: 0,
      color: isPlayer ? "#f7d51d" : "#d84a38",
    };
  }

  function resetPlayer() {
    player = makeTank(4 * TILE + 3, 12 * TILE + 3, "up", true);
  }

  function startGame() {
    score = 0; lives = 3; stage = 1;
    initStage();
    running = true; paused = false; gameOver = false;
    hideOverlay();
    updateHUD();
  }

  function initStage() {
    loadMap();
    resetPlayer();
    bullets = [];
    enemies = [];
    particles = [];
    enemiesRemaining = ENEMY_PER_STAGE;
    spawnTimer = 0;
    updateHUD();
  }

  // ---- 碰撞: 矩形与地图 ----
  function rectHitsMap(x, y, w, h, opts = {}) {
    const passGrass = opts.passGrass !== false;
    const c0 = Math.floor(x / TILE), c1 = Math.floor((x + w - 1) / TILE);
    const r0 = Math.floor(y / TILE), r1 = Math.floor((y + h - 1) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r < 0 || c < 0 || r >= GRID || c >= GRID) return { solid: true };
        const t = map[r][c];
        if (t === BRICK || t === STEEL || t === BASE) return { solid: true, r, c, t };
        if (t === GRASS && !passGrass) return { solid: true, r, c, t };
      }
    }
    return { solid: false };
  }

  function tanksOverlap(a, b) {
    return a.x < b.x + TANK && a.x + TANK > b.x &&
           a.y < b.y + TANK && a.y + TANK > b.y;
  }

  function tryMove(tank, dir) {
    tank.dir = dir;
    const d = DIRS[dir];
    const nx = tank.x + d.x * tank.speed;
    const ny = tank.y + d.y * tank.speed;
    if (nx < 0 || ny < 0 || nx + TANK > SIZE || ny + TANK > SIZE) return;
    if (rectHitsMap(nx, ny, TANK, TANK).solid) return;
    // 与其它坦克碰撞
    const others = [player, ...enemies].filter(t => t && t !== tank);
    const probe = { x: nx, y: ny };
    for (const o of others) {
      if (o.x < probe.x + TANK && o.x + TANK > probe.x &&
          o.y < probe.y + TANK && o.y + TANK > probe.y) return;
    }
    tank.x = nx; tank.y = ny;
  }

  function fire(tank) {
    if (tank.cooldown > 0) return;
    tank.cooldown = tank.isPlayer ? 22 : 60;
    const d = DIRS[tank.dir];
    const cx = tank.x + TANK / 2;
    const cy = tank.y + TANK / 2;
    bullets.push({
      x: cx + d.x * (TANK / 2) - 3,
      y: cy + d.y * (TANK / 2) - 3,
      dir: tank.dir,
      speed: 5.5,
      fromPlayer: tank.isPlayer,
    });
  }

  function spawnEnemy() {
    if (enemiesRemaining <= 0) return;
    if (enemies.length >= MAX_ENEMIES_FIELD) return;
    const cols = [0, 6, 12];
    // 找一个不被占用的出生点
    for (const c of cols.sort(() => Math.random() - 0.5)) {
      const px = c * TILE + 3, py = 3;
      if (rectHitsMap(px, py, TANK, TANK).solid) continue;
      const blocked = [player, ...enemies].some(t =>
        t && t.x < px + TANK && t.x + TANK > px && t.y < py + TANK && t.y + TANK > py);
      if (blocked) continue;
      const e = makeTank(px, py, "down", false);
      e.moveTimer = 0;
      enemies.push(e);
      enemiesRemaining--;
      updateHUD();
      return;
    }
  }

  function explode(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: x + TANK / 2, y: y + TANK / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 20 + Math.random() * 12,
        color,
      });
    }
  }

  // ---- 更新 ----
  function update() {
    if (player.cooldown > 0) player.cooldown--;

    // 玩家输入
    if (keys.up) tryMove(player, "up");
    else if (keys.down) tryMove(player, "down");
    else if (keys.left) tryMove(player, "left");
    else if (keys.right) tryMove(player, "right");
    if (keys.fire) fire(player);

    // 敌人 AI
    for (const e of enemies) {
      if (e.cooldown > 0) e.cooldown--;
      e.moveTimer--;
      if (e.moveTimer <= 0) {
        const opts = ["up", "down", "left", "right"];
        // 偏向朝下/朝基地
        opts.push("down", "down");
        e.dir = opts[(Math.random() * opts.length) | 0];
        e.moveTimer = 30 + (Math.random() * 50 | 0);
      }
      tryMove(e, e.dir);
      if (Math.random() < 0.02) fire(e);
    }

    // 定时刷怪
    spawnTimer--;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = 120;
    }

    // 子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const d = DIRS[b.dir];
      b.x += d.x * b.speed;
      b.y += d.y * b.speed;

      // 出界
      if (b.x < 0 || b.y < 0 || b.x > SIZE || b.y > SIZE) {
        bullets.splice(i, 1); continue;
      }

      // 撞地图
      const c = Math.floor((b.x + 3) / TILE);
      const r = Math.floor((b.y + 3) / TILE);
      if (r >= 0 && c >= 0 && r < GRID && c < GRID) {
        const t = map[r][c];
        if (t === BRICK) {
          map[r][c] = EMPTY;
          explode(c * TILE, r * TILE, 6, "#b5651d");
          bullets.splice(i, 1); continue;
        }
        if (t === STEEL) {
          explode(c * TILE, r * TILE, 4, "#aaa");
          bullets.splice(i, 1); continue;
        }
        if (t === BASE) {
          map[r][c] = EMPTY;
          baseAlive = false;
          explode(c * TILE, r * TILE, 24, "#f7d51d");
          bullets.splice(i, 1);
          endGame(false);
          continue;
        }
      }

      // 撞坦克
      if (b.fromPlayer) {
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (b.x < e.x + TANK && b.x + 6 > e.x && b.y < e.y + TANK && b.y + 6 > e.y) {
            explode(e.x, e.y, 16, "#d84a38");
            enemies.splice(j, 1);
            score += 100;
            updateHUD();
            hit = true;
            break;
          }
        }
        if (hit) { bullets.splice(i, 1); continue; }
      } else {
        if (b.x < player.x + TANK && b.x + 6 > player.x &&
            b.y < player.y + TANK && b.y + 6 > player.y) {
          explode(player.x, player.y, 18, "#f7d51d");
          bullets.splice(i, 1);
          loseLife();
          continue;
        }
      }
    }

    // 粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // 过关判断
    if (enemiesRemaining <= 0 && enemies.length === 0) {
      stage++;
      score += 500;
      initStage();
    }
  }

  function loseLife() {
    lives--;
    updateHUD();
    if (lives <= 0) { endGame(false); return; }
    resetPlayer();
  }

  function endGame(win) {
    running = false;
    gameOver = true;
    showOverlay(
      win ? "胜 利!" : "游 戏 结 束",
      win ? `最终得分 ${score}` : `得分 ${score} · 再来一局`,
      "重新开始 ENTER"
    );
  }

  // ---- 绘制 ----
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const grassTiles = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const t = map[r][c];
        const x = c * TILE, y = r * TILE;
        if (t === BRICK) drawBrick(x, y);
        else if (t === STEEL) drawSteel(x, y);
        else if (t === BASE) drawBase(x, y);
        else if (t === GRASS) grassTiles.push([x, y]);
      }
    }

    // 坦克与子弹在草地之下
    enemies.forEach(e => drawTank(e));
    if (running || gameOver) drawTank(player, true);

    ctx.fillStyle = "#fff";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 6, 6));

    // 草地覆盖在坦克之上（经典隐蔽效果）
    grassTiles.forEach(([x, y]) => drawGrass(x, y));

    // 粒子
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
      ctx.globalAlpha = 1;
    });
  }

  function drawBrick(x, y) {
    ctx.fillStyle = "#7a3b10";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#b5651d";
    const h = TILE / 4;
    for (let i = 0; i < 4; i++) {
      const off = (i % 2) * (TILE / 4);
      for (let j = 0; j < 2; j++) {
        ctx.fillRect(x + 2 + off + j * (TILE / 2), y + i * h + 1, TILE / 2 - 3, h - 2);
      }
    }
  }

  function drawSteel(x, y) {
    ctx.fillStyle = "#9a9a9a";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#cfcfcf";
    ctx.fillRect(x + 3, y + 3, TILE / 2 - 4, TILE / 2 - 4);
    ctx.fillRect(x + TILE / 2 + 1, y + TILE / 2 + 1, TILE / 2 - 4, TILE / 2 - 4);
    ctx.fillStyle = "#5c5c5c";
    ctx.fillRect(x + TILE / 2 + 1, y + 3, TILE / 2 - 4, TILE / 2 - 4);
    ctx.fillRect(x + 3, y + TILE / 2 + 1, TILE / 2 - 4, TILE / 2 - 4);
  }

  function drawGrass(x, y) {
    ctx.fillStyle = "#1f6b1f";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#2f9e2f";
    for (let i = 0; i < 6; i++) {
      const gx = x + (i * 7 + 4) % TILE;
      const gy = y + ((i * 11 + 5) % TILE);
      ctx.fillRect(gx, gy, 5, 5);
    }
  }

  function drawBase(x, y) {
    ctx.fillStyle = baseAlive ? "#444" : "#222";
    ctx.fillRect(x, y, TILE, TILE);
    // 老鹰图标
    ctx.fillStyle = baseAlive ? "#f7d51d" : "#666";
    ctx.beginPath();
    ctx.moveTo(x + TILE / 2, y + 6);
    ctx.lineTo(x + TILE - 8, y + TILE - 8);
    ctx.lineTo(x + 8, y + TILE - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + TILE / 2 - 3, y + 10, 6, TILE - 18);
  }

  function drawTank(t, isPlayer) {
    const cx = t.x + TANK / 2;
    const cy = t.y + TANK / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((DIRS[t.dir].a * Math.PI) / 180);
    const s = TANK;
    const h = s / 2;
    // 履带
    ctx.fillStyle = "#333";
    ctx.fillRect(-h, -h, 6, s);
    ctx.fillRect(h - 6, -h, 6, s);
    // 车身
    ctx.fillStyle = t.color;
    ctx.fillRect(-h + 5, -h + 4, s - 10, s - 8);
    // 炮塔
    ctx.fillStyle = isPlayer ? "#fff3a0" : "#f0a094";
    ctx.fillRect(-7, -7, 14, 14);
    // 炮管
    ctx.fillStyle = "#222";
    ctx.fillRect(-3, -h - 4, 6, h + 6);
    ctx.restore();
  }

  // ---- HUD ----
  function updateHUD() {
    document.getElementById("stage").textContent = stage;
    document.getElementById("score").textContent = score;
    document.getElementById("lives").textContent = lives;
    const box = document.getElementById("enemy-icons");
    box.innerHTML = "";
    const left = enemiesRemaining + enemies.length;
    for (let i = 0; i < left; i++) {
      const s = document.createElement("span");
      box.appendChild(s);
    }
  }

  // ---- Overlay ----
  const overlay = document.getElementById("overlay");
  function showOverlay(title, text, btn) {
    document.getElementById("overlay-title").textContent = title;
    document.getElementById("overlay-text").textContent = text;
    document.getElementById("start-btn").textContent = btn;
    overlay.classList.remove("hidden");
  }
  function hideOverlay() { overlay.classList.add("hidden"); }

  document.getElementById("start-btn").addEventListener("click", startGame);

  // ---- 输入 ----
  const keyMap = {
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    Space: "fire", KeyJ: "fire",
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Enter") {
      if (!running) startGame();
      return;
    }
    if (e.code === "KeyP") {
      if (running) { paused = !paused; if (paused) showOverlay("暂 停", "按 P 继续", "继续 ENTER"); else hideOverlay(); }
      return;
    }
    const k = keyMap[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
  });

  window.addEventListener("keyup", (e) => {
    const k = keyMap[e.code];
    if (k) { keys[k] = false; e.preventDefault(); }
  });

  // ---- 主循环 ----
  function loop() {
    if (running && !paused) update();
    draw();
    requestAnimationFrame(loop);
  }

  // 初始：画一张静态地图作为背景
  loadMap();
  enemiesRemaining = ENEMY_PER_STAGE;
  enemies = []; bullets = []; particles = [];
  stage = 1; score = 0; lives = 3;
  player = makeTank(4 * TILE + 3, 12 * TILE + 3, "up", true);
  loop();
})();

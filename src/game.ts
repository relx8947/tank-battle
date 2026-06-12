import {
  ALIGN,
  COLORS,
  DIRS,
  Dir,
  ENEMY_PER_STAGE,
  MAX_ENEMIES_FIELD,
  SIZE,
  TANK,
  TILE,
  Tile,
} from "./constants";
import { GameMap } from "./map";
import { Renderer } from "./renderer";
import { UI } from "./ui";
import { Input } from "./input";
import type { Bullet, Particle, Tank } from "./types";

function makeTank(x: number, y: number, dir: Dir, isPlayer: boolean): Tank {
  return {
    x,
    y,
    dir,
    speed: isPlayer ? 2.2 : 1.4,
    isPlayer,
    cooldown: 0,
    moveTimer: 0,
    color: isPlayer ? COLORS.playerBody : COLORS.enemyBody,
  };
}

function approach(cur: number, target: number, step: number): number {
  if (Math.abs(target - cur) <= step) return target;
  return cur + Math.sign(target - cur) * step;
}

function snapToLane(v: number): number {
  return Math.round((v - ALIGN) / TILE) * TILE + ALIGN;
}

export class Game {
  private map = new GameMap();
  private renderer: Renderer;
  private ui: UI;
  private input: Input;

  private player!: Tank;
  private bullets: Bullet[] = [];
  private enemies: Tank[] = [];
  private particles: Particle[] = [];

  private score = 0;
  private lives = 3;
  private stage = 1;
  private enemiesRemaining = ENEMY_PER_STAGE;
  private spawnTimer = 0;

  private running = false;
  private paused = false;
  private gameOver = false;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.renderer = new Renderer(ctx);
    this.ui = new UI();
    this.input = new Input(
      () => {
        if (!this.running) this.start();
      },
      () => this.togglePause(),
    );
    this.ui.onStart(() => this.start());

    // 初始静态地图
    this.map.load();
    this.player = makeTank(4 * TILE + 3, 12 * TILE + 3, "up", true);
    requestAnimationFrame(() => this.loop());
  }

  private start(): void {
    this.score = 0;
    this.lives = 3;
    this.stage = 1;
    this.initStage();
    this.running = true;
    this.paused = false;
    this.gameOver = false;
    this.ui.hideOverlay();
    this.refreshHUD();
  }

  private initStage(): void {
    this.map.load();
    this.resetPlayer();
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.enemiesRemaining = ENEMY_PER_STAGE;
    this.spawnTimer = 0;
    this.refreshHUD();
  }

  private resetPlayer(): void {
    this.player = makeTank(4 * TILE + 3, 12 * TILE + 3, "up", true);
  }

  private togglePause(): void {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) this.ui.showOverlay("暂 停", "按 P 继续", "继续 ENTER");
    else this.ui.hideOverlay();
  }

  private refreshHUD(): void {
    this.ui.updateHUD(
      this.stage,
      this.score,
      this.lives,
      this.enemiesRemaining + this.enemies.length,
    );
  }

  private blocked(tank: Tank, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x + TANK > SIZE || y + TANK > SIZE) return true;
    if (this.map.rectSolid(x, y, TANK, TANK)) return true;
    const others = [this.player, ...this.enemies].filter((t) => t !== tank);
    for (const o of others) {
      if (o.x < x + TANK && o.x + TANK > x && o.y < y + TANK && o.y + TANK > y) return true;
    }
    return false;
  }

  private tryMove(tank: Tank, dir: Dir): void {
    tank.dir = dir;
    const d = DIRS[dir];
    if (d.x !== 0) tank.y = approach(tank.y, snapToLane(tank.y), tank.speed);
    else tank.x = approach(tank.x, snapToLane(tank.x), tank.speed);

    const nx = tank.x + d.x * tank.speed;
    const ny = tank.y + d.y * tank.speed;
    if (!this.blocked(tank, nx, ny)) {
      tank.x = nx;
      tank.y = ny;
    }
  }

  private fire(tank: Tank): void {
    if (tank.cooldown > 0) return;
    tank.cooldown = tank.isPlayer ? 22 : 60;
    const d = DIRS[tank.dir];
    const cx = tank.x + TANK / 2;
    const cy = tank.y + TANK / 2;
    this.bullets.push({
      x: cx + d.x * (TANK / 2) - 3,
      y: cy + d.y * (TANK / 2) - 3,
      dir: tank.dir,
      speed: 5.5,
      fromPlayer: tank.isPlayer,
    });
  }

  private spawnEnemy(): void {
    if (this.enemiesRemaining <= 0) return;
    if (this.enemies.length >= MAX_ENEMIES_FIELD) return;
    const cols = [0, 6, 12].sort(() => Math.random() - 0.5);
    for (const c of cols) {
      const px = c * TILE + 3;
      const py = 3;
      if (this.map.spawnBlocked(px, py)) continue;
      const occupied = [this.player, ...this.enemies].some(
        (t) => t.x < px + TANK && t.x + TANK > px && t.y < py + TANK && t.y + TANK > py,
      );
      if (occupied) continue;
      this.enemies.push(makeTank(px, py, "down", false));
      this.enemiesRemaining--;
      this.refreshHUD();
      return;
    }
  }

  private explode(x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + TANK / 2,
        y: y + TANK / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 20 + Math.random() * 12,
        color,
      });
    }
  }

  private update(): void {
    const keys = this.input.state;
    if (this.player.cooldown > 0) this.player.cooldown--;

    if (keys.up) this.tryMove(this.player, "up");
    else if (keys.down) this.tryMove(this.player, "down");
    else if (keys.left) this.tryMove(this.player, "left");
    else if (keys.right) this.tryMove(this.player, "right");
    if (keys.fire) this.fire(this.player);

    for (const e of this.enemies) {
      if (e.cooldown > 0) e.cooldown--;
      e.moveTimer--;
      if (e.moveTimer <= 0) {
        const opts: Dir[] = ["up", "down", "left", "right", "down", "down"];
        e.dir = opts[(Math.random() * opts.length) | 0];
        e.moveTimer = 30 + ((Math.random() * 50) | 0);
      }
      this.tryMove(e, e.dir);
      if (Math.random() < 0.02) this.fire(e);
    }

    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = 120;
    }

    this.updateBulletCollisions();
    this.updateBullets();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.enemiesRemaining <= 0 && this.enemies.length === 0) {
      this.stage++;
      this.score += 500;
      this.initStage();
    }
  }

  private updateBulletCollisions(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const a = this.bullets[i];
      if (!a) continue;
      for (let j = i - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (!b) continue;
        if (a.x < b.x + 6 && a.x + 6 > b.x && a.y < b.y + 6 && a.y + 6 > b.y) {
          this.explode(a.x - TANK / 2 + 3, a.y - TANK / 2 + 3, 6, "#fff");
          this.bullets.splice(i, 1);
          this.bullets.splice(j, 1);
          break;
        }
      }
    }
  }

  private updateBullets(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const d = DIRS[b.dir];
      b.x += d.x * b.speed;
      b.y += d.y * b.speed;

      if (b.x < 0 || b.y < 0 || b.x > SIZE || b.y > SIZE) {
        this.bullets.splice(i, 1);
        continue;
      }

      const c = Math.floor((b.x + 3) / TILE);
      const r = Math.floor((b.y + 3) / TILE);
      if (r >= 0 && c >= 0 && r < 13 && c < 13) {
        const t = this.map.at(r, c);
        if (t === Tile.Brick) {
          this.map.set(r, c, Tile.Empty);
          this.explode(c * TILE, r * TILE, 6, "#b5651d");
          this.bullets.splice(i, 1);
          continue;
        }
        if (t === Tile.Steel) {
          this.explode(c * TILE, r * TILE, 4, "#aaa");
          this.bullets.splice(i, 1);
          continue;
        }
        if (t === Tile.Base) {
          this.map.baseHP--;
          this.explode(c * TILE, r * TILE, 10, COLORS.yellow);
          this.bullets.splice(i, 1);
          if (this.map.baseHP <= 0) {
            this.map.set(r, c, Tile.Empty);
            this.map.baseAlive = false;
            this.explode(c * TILE, r * TILE, 24, COLORS.yellow);
            this.endGame(false);
          }
          continue;
        }
      }

      if (b.fromPlayer) {
        let hit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (b.x < e.x + TANK && b.x + 6 > e.x && b.y < e.y + TANK && b.y + 6 > e.y) {
            this.explode(e.x, e.y, 16, COLORS.enemyBody);
            this.enemies.splice(j, 1);
            this.score += 100;
            this.refreshHUD();
            hit = true;
            break;
          }
        }
        if (hit) {
          this.bullets.splice(i, 1);
          continue;
        }
      } else {
        const p = this.player;
        if (b.x < p.x + TANK && b.x + 6 > p.x && b.y < p.y + TANK && b.y + 6 > p.y) {
          this.explode(p.x, p.y, 18, COLORS.playerBody);
          this.bullets.splice(i, 1);
          this.loseLife();
          continue;
        }
      }
    }
  }

  private loseLife(): void {
    this.lives--;
    this.refreshHUD();
    if (this.lives <= 0) {
      this.endGame(false);
      return;
    }
    this.resetPlayer();
  }

  private endGame(win: boolean): void {
    this.running = false;
    this.gameOver = true;
    this.ui.showOverlay(
      win ? "胜 利!" : "游 戏 结 束",
      win ? `最终得分 ${this.score}` : `得分 ${this.score} · 再来一局`,
      "重新开始 ENTER",
    );
  }

  private loop(): void {
    if (this.running && !this.paused) this.update();
    this.renderer.draw(
      this.map,
      this.player,
      this.enemies,
      this.bullets,
      this.particles,
      this.running || this.gameOver,
    );
    requestAnimationFrame(() => this.loop());
  }
}

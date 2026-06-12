import { DIRS, GRID, SIZE, TANK, TILE, Tile } from "./constants";
import type { GameMap } from "./map";
import type { Bullet, Particle, Tank } from "./types";

export class Renderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  draw(
    map: GameMap,
    player: Tank,
    enemies: Tank[],
    bullets: Bullet[],
    particles: Particle[],
    showPlayer: boolean,
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const grassTiles: Array<[number, number]> = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const t = map.at(r, c);
        const x = c * TILE;
        const y = r * TILE;
        if (t === Tile.Brick) this.brick(x, y);
        else if (t === Tile.Steel) this.steel(x, y);
        else if (t === Tile.Base) this.base(x, y, map.baseAlive);
        else if (t === Tile.Grass) grassTiles.push([x, y]);
      }
    }

    enemies.forEach((e) => this.tank(e));
    if (showPlayer) this.tank(player);

    ctx.fillStyle = "#fff";
    bullets.forEach((b) => ctx.fillRect(b.x, b.y, 6, 6));

    grassTiles.forEach(([x, y]) => this.grass(x, y));

    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
      ctx.globalAlpha = 1;
    });
  }

  private brick(x: number, y: number): void {
    const ctx = this.ctx;
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

  private steel(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#9a9a9a";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#cfcfcf";
    ctx.fillRect(x + 3, y + 3, TILE / 2 - 4, TILE / 2 - 4);
    ctx.fillRect(x + TILE / 2 + 1, y + TILE / 2 + 1, TILE / 2 - 4, TILE / 2 - 4);
    ctx.fillStyle = "#5c5c5c";
    ctx.fillRect(x + TILE / 2 + 1, y + 3, TILE / 2 - 4, TILE / 2 - 4);
    ctx.fillRect(x + 3, y + TILE / 2 + 1, TILE / 2 - 4, TILE / 2 - 4);
  }

  private grass(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#1f6b1f";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#2f9e2f";
    for (let i = 0; i < 6; i++) {
      const gx = x + ((i * 7 + 4) % TILE);
      const gy = y + ((i * 11 + 5) % TILE);
      ctx.fillRect(gx, gy, 5, 5);
    }
  }

  private base(x: number, y: number, alive: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = alive ? "#444" : "#222";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = alive ? "#f7d51d" : "#666";
    ctx.beginPath();
    ctx.moveTo(x + TILE / 2, y + 6);
    ctx.lineTo(x + TILE - 8, y + TILE - 8);
    ctx.lineTo(x + 8, y + TILE - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + TILE / 2 - 3, y + 10, 6, TILE - 18);
  }

  private tank(t: Tank): void {
    const ctx = this.ctx;
    const cx = t.x + TANK / 2;
    const cy = t.y + TANK / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((DIRS[t.dir].a * Math.PI) / 180);
    const s = TANK;
    const h = s / 2;
    ctx.fillStyle = "#333";
    ctx.fillRect(-h, -h, 6, s);
    ctx.fillRect(h - 6, -h, 6, s);
    ctx.fillStyle = t.color;
    ctx.fillRect(-h + 5, -h + 4, s - 10, s - 8);
    ctx.fillStyle = t.isPlayer ? "#fff3a0" : "#f0a094";
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = "#222";
    ctx.fillRect(-3, -h - 4, 6, h + 6);
    ctx.restore();
  }
}

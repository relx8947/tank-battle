import { GRID, SIZE, TILE, TANK, Tile } from "./constants";

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

export const BASE_COL = 6;
export const BASE_ROW = 12;

export class GameMap {
  grid: Tile[][] = [];
  baseAlive = true;
  baseHP = 3;

  load(): void {
    this.grid = [];
    for (let r = 0; r < GRID; r++) {
      const row: Tile[] = [];
      for (let c = 0; c < GRID; c++) {
        const ch = +TEMPLATE[r][c] as Tile;
        row.push(ch === Tile.Base ? Tile.Empty : ch);
      }
      this.grid.push(row);
    }

    const bc = BASE_COL;
    const br = BASE_ROW;
    this.grid[br][bc] = Tile.Base;
    this.grid[br - 1][bc - 1] = Tile.Steel;
    this.grid[br - 1][bc] = Tile.Steel;
    this.grid[br - 1][bc + 1] = Tile.Steel;
    this.grid[br][bc - 1] = Tile.Steel;
    this.grid[br][bc + 1] = Tile.Steel;
    if (br - 2 >= 0) {
      this.grid[br - 2][bc - 1] = Tile.Brick;
      this.grid[br - 2][bc] = Tile.Brick;
      this.grid[br - 2][bc + 1] = Tile.Brick;
    }
    this.baseAlive = true;
    this.baseHP = 3;
  }

  at(r: number, c: number): Tile {
    return this.grid[r][c];
  }

  set(r: number, c: number, t: Tile): void {
    this.grid[r][c] = t;
  }

  // 矩形是否撞到不可通行的地图格
  rectSolid(x: number, y: number, w: number, h: number): boolean {
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - 1) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - 1) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r < 0 || c < 0 || r >= GRID || c >= GRID) return true;
        const t = this.grid[r][c];
        if (t === Tile.Brick || t === Tile.Steel || t === Tile.Base) return true;
      }
    }
    return false;
  }

  // 出生点是否被坦克大小的矩形占据为实体
  spawnBlocked(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x + TANK > SIZE || y + TANK > SIZE) return true;
    return this.rectSolid(x, y, TANK, TANK);
  }
}

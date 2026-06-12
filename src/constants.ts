export const TILE = 40;
export const GRID = 13;
export const SIZE = TILE * GRID;
export const TANK = TILE - 6;
export const ALIGN = (TILE - TANK) / 2;

export const ENEMY_PER_STAGE = 8;
export const MAX_ENEMIES_FIELD = 4;

export type Dir = "up" | "right" | "down" | "left";

export interface DirVec {
  x: number;
  y: number;
  a: number;
}

export const DIRS: Record<Dir, DirVec> = {
  up: { x: 0, y: -1, a: 0 },
  right: { x: 1, y: 0, a: 90 },
  down: { x: 0, y: 1, a: 180 },
  left: { x: -1, y: 0, a: 270 },
};

export const enum Tile {
  Empty = 0,
  Brick = 1,
  Steel = 2,
  Base = 3,
  Grass = 4,
}

export const COLORS = {
  playerBody: "#f7d51d",
  enemyBody: "#d84a38",
  yellow: "#f7d51d",
} as const;

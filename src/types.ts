import type { Dir } from "./constants";

export interface Tank {
  x: number;
  y: number;
  dir: Dir;
  speed: number;
  isPlayer: boolean;
  cooldown: number;
  moveTimer: number;
  color: string;
}

export interface Bullet {
  x: number;
  y: number;
  dir: Dir;
  speed: number;
  fromPlayer: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

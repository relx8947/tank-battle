export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

type InputKey = keyof InputState;

const KEY_MAP: Record<string, InputKey> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "fire",
  KeyJ: "fire",
};

export class Input {
  readonly state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
  };

  constructor(onEnter: () => void, onPause: () => void) {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Enter") {
        onEnter();
        return;
      }
      if (e.code === "KeyP") {
        onPause();
        return;
      }
      const k = KEY_MAP[e.code];
      if (k) {
        this.state[k] = true;
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      const k = KEY_MAP[e.code];
      if (k) {
        this.state[k] = false;
        e.preventDefault();
      }
    });
  }
}

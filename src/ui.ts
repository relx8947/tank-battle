function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

export class UI {
  private stage = el("stage");
  private score = el("score");
  private lives = el("lives");
  private enemyIcons = el("enemy-icons");
  private overlay = el("overlay");
  private overlayTitle = el("overlay-title");
  private overlayText = el("overlay-text");
  private startBtn = el<HTMLButtonElement>("start-btn");

  onStart(cb: () => void): void {
    this.startBtn.addEventListener("click", cb);
  }

  updateHUD(stage: number, score: number, lives: number, enemiesLeft: number): void {
    this.stage.textContent = String(stage);
    this.score.textContent = String(score);
    this.lives.textContent = String(lives);
    this.enemyIcons.innerHTML = "";
    for (let i = 0; i < enemiesLeft; i++) {
      this.enemyIcons.appendChild(document.createElement("span"));
    }
  }

  showOverlay(title: string, text: string, btn: string): void {
    this.overlayTitle.textContent = title;
    this.overlayText.textContent = text;
    this.startBtn.textContent = btn;
    this.overlay.classList.remove("hidden");
  }

  hideOverlay(): void {
    this.overlay.classList.add("hidden");
  }
}

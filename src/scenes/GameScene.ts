import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  // --- ゲームデータ ---
  private minerals: number = 0;
  private droneCount: number = 0;
  private droneCost: number = 10;
  private lastSaveTime: number = Date.now(); // 最後にセーブした時間

  // --- 表示オブジェクト ---
  private mineralText!: Phaser.GameObjects.Text;
  private droneText!: Phaser.GameObjects.Text;
  private planet!: Phaser.GameObjects.Arc;
  private buyButton!: Phaser.GameObjects.Container;
  private buyButtonBg!: Phaser.GameObjects.Rectangle;
  private buyButtonText!: Phaser.GameObjects.Text;
  private saveText!: Phaser.GameObjects.Text; // 「保存中...」の文字

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // データがあればロード、なければ初期化
    this.loadData();

    // オフライン収益の計算（前回セーブからの経過時間 × ドローン生産力）
    const now = Date.now();
    const diffSeconds = (now - this.lastSaveTime) / 1000;
    if (diffSeconds > 10 && this.droneCount > 0) {
      const earned = Math.floor(diffSeconds * this.droneCount);
      this.minerals += earned;
      alert(`おかえりなさい！\n放置中に ${earned} Minerals 稼ぎました！`);
    }

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // --- 1. 背景 ---
    for (let i = 0; i < 150; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.6);
      this.add.circle(x, y, Phaser.Math.FloatBetween(0.5, 2), 0xffffff, alpha);
    }

    // --- 2. 惑星 ---
    this.planet = this.add.circle(cx, cy - 150, 140, 0x4466aa).setInteractive({ useHandCursor: true });
    this.add.circle(cx - 40, cy - 180, 120, 0x000000, 0.2);
    this.add.ellipse(cx, cy - 150, 420, 80, 0x88ccff, 0.2).setRotation(0.2);

    // --- 3. UIテキスト ---
    const uiStyle = { fontFamily: '"Courier New", Courier, monospace', fontWeight: 'bold' };
    this.mineralText = this.add.text(cx, 120, '0 Minerals', { ...uiStyle, fontSize: '52px', color: '#ffffff' }).setOrigin(0.5);
    this.droneText = this.add.text(cx, 190, 'Drones: 0 (0/sec)', { ...uiStyle, fontSize: '24px', color: '#aaaaaa' }).setOrigin(0.5);
    
    // セーブ通知用テキスト（普段は消しておく）
    this.saveText = this.add.text(this.scale.width - 20, 20, 'Saved', { fontSize: '16px', color: '#00ff00' })
      .setOrigin(1, 0)
      .setAlpha(0);

    // --- 4. ボタン ---
    this.createBuyButton(cx, this.scale.height - 200);

    // --- 5. イベント ---
    this.planet.on('pointerdown', () => this.mine(1));

    // 1秒ごとのループ（自動採掘）
    this.time.addEvent({ delay: 1000, callback: () => this.autoMine(), loop: true });

    // 5秒ごとのループ（自動セーブ）
    this.time.addEvent({ delay: 5000, callback: () => this.saveData(), loop: true });

    this.updateUI();
  }

  // --- 機能メソッド ---

  private mine(amount: number) {
    this.minerals += amount;
    this.updateUI();
    if (amount === 1) {
      this.tweens.add({ targets: this.planet, scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true, ease: 'Power1' });
    }
  }

  private autoMine() {
    if (this.droneCount > 0) {
      this.minerals += this.droneCount;
      this.updateUI();
      // 数字が浮かぶ演出
      const cx = this.cameras.main.centerX;
      const cy = this.cameras.main.centerY;
      const text = this.add.text(cx + Phaser.Math.Between(-50, 50), cy - 150, `+${this.droneCount}`, { fontSize: '24px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
      this.tweens.add({ targets: text, y: text.y - 50, alpha: 0, duration: 1000, onComplete: () => text.destroy() });
    }
  }

  private buyDrone() {
    if (this.minerals >= this.droneCost) {
      this.minerals -= this.droneCost;
      this.droneCount++;
      this.droneCost = Math.floor(this.droneCost * 1.5);
      this.updateUI();
      this.saveData(); // 購入時にも即セーブ
    }
  }

  // --- セーブ＆ロード機能 ---

  private saveData() {
    const data = {
      minerals: this.minerals,
      droneCount: this.droneCount,
      droneCost: this.droneCost,
      lastSaveTime: Date.now()
    };
    // ローカルストレージ（ブラウザの保存領域）に書き込み
    localStorage.setItem('cosmic_save', JSON.stringify(data));
    
    // 「Saved」と一瞬表示
    this.saveText.setAlpha(1);
    this.tweens.add({ targets: this.saveText, alpha: 0, duration: 1000, delay: 500 });
  }

  private loadData() {
    const rawData = localStorage.getItem('cosmic_save');
    if (rawData) {
      const data = JSON.parse(rawData);
      this.minerals = data.minerals || 0;
      this.droneCount = data.droneCount || 0;
      this.droneCost = data.droneCost || 10;
      this.lastSaveTime = data.lastSaveTime || Date.now();
    }
  }

  private updateUI() {
    this.mineralText.setText(`${Math.floor(this.minerals)} Minerals`);
    this.droneText.setText(`Drones: ${this.droneCount} (${this.droneCount}/sec)`);
    this.buyButtonText.setText(`BUY DRONE\nCost: ${this.droneCost}`);

    if (this.minerals >= this.droneCost) {
      this.buyButtonBg.setFillStyle(0x22aa22);
      this.buyButton.setAlpha(1);
    } else {
      this.buyButtonBg.setFillStyle(0x555555);
      this.buyButton.setAlpha(0.7);
    }
  }

  private createBuyButton(x: number, y: number) {
    this.buyButton = this.add.container(x, y);
    this.buyButtonBg = this.add.rectangle(0, 0, 400, 120, 0x555555).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.buyDrone());
    const border = this.add.rectangle(0, 0, 400, 120).setStrokeStyle(4, 0xffffff);
    this.buyButtonText = this.add.text(0, 0, '', { fontSize: '32px', color: '#ffffff', align: 'center', fontStyle: 'bold' }).setOrigin(0.5);
    this.buyButton.add([this.buyButtonBg, border, this.buyButtonText]);
  }
}
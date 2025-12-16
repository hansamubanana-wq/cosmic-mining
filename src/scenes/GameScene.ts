import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  // --- ゲームデータ ---
  private minerals: number = 0;      // 現在の所持金
  private droneCount: number = 0;    // ドローンの数
  private droneCost: number = 10;    // ドローンの価格

  // --- 表示オブジェクト ---
  private mineralText!: Phaser.GameObjects.Text;
  private droneText!: Phaser.GameObjects.Text;
  private planet!: Phaser.GameObjects.Arc;
  private buyButton!: Phaser.GameObjects.Container;
  private buyButtonBg!: Phaser.GameObjects.Rectangle;
  private buyButtonText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // --- 1. 背景演出（星空） ---
    for (let i = 0; i < 150; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.6);
      this.add.circle(x, y, Phaser.Math.FloatBetween(0.5, 2), 0xffffff, alpha);
    }

    // --- 2. 惑星（タップエリア） ---
    // 惑星本体
    this.planet = this.add.circle(cx, cy - 150, 140, 0x4466aa)
      .setInteractive({ useHandCursor: true });
    
    // 惑星の影（立体感）
    this.add.circle(cx - 40, cy - 180, 120, 0x000000, 0.2);
    
    // 惑星の輪（土星っぽく）
    this.add.ellipse(cx, cy - 150, 420, 80, 0x88ccff, 0.2).setRotation(0.2);

    // --- 3. 情報表示テキスト ---
    const uiStyle = { fontFamily: '"Courier New", Courier, monospace', fontWeight: 'bold' };
    
    // 鉱石カウンター
    this.mineralText = this.add.text(cx, 120, '0 Minerals', { ...uiStyle, fontSize: '52px', color: '#ffffff' })
      .setOrigin(0.5);
    
    // ドローン情報
    this.droneText = this.add.text(cx, 190, 'Drones: 0 (0/sec)', { ...uiStyle, fontSize: '24px', color: '#aaaaaa' })
      .setOrigin(0.5);

    // --- 4. ショップボタンの作成 ---
    this.createBuyButton(cx, this.scale.height - 200);

    // --- 5. イベント設定 ---
    // 惑星クリック
    this.planet.on('pointerdown', () => this.mine(1)); // 手動は1ずつ

    // 自動採掘タイマー（1秒ごとに実行）
    this.time.addEvent({
      delay: 1000,
      callback: () => this.autoMine(),
      loop: true
    });

    // 初期表示更新
    this.updateUI();
  }

  // --- 機能メソッド ---

  // 採掘処理
  private mine(amount: number) {
    this.minerals += amount;
    this.updateUI();

    // 惑星のアニメーション（手動クリック時のみ）
    if (amount === 1) {
      this.tweens.add({
        targets: this.planet,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        ease: 'Power1'
      });
    }
  }

  // 自動採掘処理
  private autoMine() {
    if (this.droneCount > 0) {
      this.minerals += this.droneCount; // ドローンの数だけ増える
      this.updateUI();
      
      // 画面上に「+5」みたいな数字を浮かべる演出
      const cx = this.cameras.main.centerX;
      const cy = this.cameras.main.centerY;
      const floatText = this.add.text(
        cx + Phaser.Math.Between(-60, 60), 
        cy - 150, 
        `+${this.droneCount}`, 
        { fontSize: '24px', color: '#00ff00', fontStyle: 'bold' }
      ).setOrigin(0.5);

      this.tweens.add({
        targets: floatText,
        y: floatText.y - 50,
        alpha: 0,
        duration: 1000,
        onComplete: () => floatText.destroy()
      });
    }
  }

  // ドローン購入処理
  private buyDrone() {
    if (this.minerals >= this.droneCost) {
      this.minerals -= this.droneCost;
      this.droneCount++;
      // 価格を1.5倍にして端数を切り捨て（インフレさせる）
      this.droneCost = Math.floor(this.droneCost * 1.5);
      this.updateUI();
    }
  }

  // 画面の数字やボタンの色を更新
  private updateUI() {
    this.mineralText.setText(`${Math.floor(this.minerals)} Minerals`);
    this.droneText.setText(`Drones: ${this.droneCount} (${this.droneCount}/sec)`);
    this.buyButtonText.setText(`BUY DRONE\nCost: ${this.droneCost}`);

    // お金が足りるならボタンを緑に、足りないならグレーにする
    if (this.minerals >= this.droneCost) {
      this.buyButtonBg.setFillStyle(0x22aa22); // 緑
      this.buyButton.setAlpha(1);
    } else {
      this.buyButtonBg.setFillStyle(0x555555); // グレー
      this.buyButton.setAlpha(0.7);
    }
  }

  // ボタンを作る関数（ごちゃごちゃするので分離）
  private createBuyButton(x: number, y: number) {
    this.buyButton = this.add.container(x, y);

    // 背景
    this.buyButtonBg = this.add.rectangle(0, 0, 400, 120, 0x555555)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.buyDrone());
    
    // 枠線
    const border = this.add.rectangle(0, 0, 400, 120).setStrokeStyle(4, 0xffffff);

    // 文字
    this.buyButtonText = this.add.text(0, 0, '', { 
      fontSize: '32px', 
      color: '#ffffff', 
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // コンテナにまとめる
    this.buyButton.add([this.buyButtonBg, border, this.buyButtonText]);
  }
}
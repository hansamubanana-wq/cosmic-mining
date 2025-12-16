import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private planet!: Phaser.GameObjects.Arc; // 円（惑星）

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // 画面の中心座標を取得
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // --- 1. 背景の星屑を作る ---
    // ランダムな位置に小さな白い点をたくさん打つ
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.FloatBetween(1, 3);
      this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.1, 0.5));
    }

    // --- 2. 惑星（採掘対象）を作る ---
    // Graphicsを使わず、簡易的に円オブジェクト(Arc)を使用
    // 色: 0x4466aa (青っぽい惑星)
    this.planet = this.add.circle(cx, cy, 150, 0x4466aa)
      .setInteractive({ useHandCursor: true }); // クリック可能にする

    // 惑星に影をつけて立体的っぽくする（少し暗い円を重ねる）
    this.add.circle(cx - 30, cy - 30, 130, 0x000000, 0.2);

    // --- 3. スコア表示 ---
    const textStyle = { 
      fontFamily: 'Arial', 
      fontSize: '64px', 
      color: '#ffffff',
      fontStyle: 'bold'
    };
    this.scoreText = this.add.text(cx, cy - 300, '0', textStyle).setOrigin(0.5);
    this.add.text(cx, cy - 230, 'MINERALS', { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0.5);

    // --- 4. クリックイベント ---
    this.planet.on('pointerdown', () => {
      this.mineResource();
    });
  }

  // 資源を採掘する処理
  private mineResource() {
    // スコア加算
    this.score += 1;
    this.scoreText.setText(this.score.toString());

    // 惑星のアニメーション（クリックしたら縮んで戻る＝ボヨンとする）
    this.tweens.add({
      targets: this.planet,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true, // 元に戻る
      ease: 'Power1'
    });

    // クリック時のパーティクル（飛び散る破片）
    // ※これは後で実装します
  }
}
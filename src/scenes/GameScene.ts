import Phaser from 'phaser';

// 施設のデータ構造
interface Building {
  name: string;
  baseCost: number;
  baseIncome: number;
  count: number;
  cost: number;
  color: number;
}

export class GameScene extends Phaser.Scene {
  // --- ゲームデータ ---
  private minerals: number = 0;
  private lastSaveTime: number = Date.now();
  
  // 施設リスト（ここを増やせば無限に拡張可能）
  private buildings: Building[] = [
    { name: 'Mining Drone', baseCost: 15, baseIncome: 1, count: 0, cost: 15, color: 0x00ff00 },
    { name: 'Rover Unit', baseCost: 100, baseIncome: 5, count: 0, cost: 100, color: 0x00ccff },
    { name: 'Space Station', baseCost: 1100, baseIncome: 32, count: 0, cost: 1100, color: 0xffaa00 },
    { name: 'Moon Base', baseCost: 12000, baseIncome: 150, count: 0, cost: 12000, color: 0xff4444 },
    { name: 'Dyson Sphere', baseCost: 100000, baseIncome: 1000, count: 0, cost: 100000, color: 0xaa00ff },
  ];

  // --- 表示オブジェクト ---
  private mineralText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;
  private planet!: Phaser.GameObjects.Container; // 惑星をコンテナ化してリッチに
  private planetBody!: Phaser.GameObjects.Arc;
  private shopContainer!: Phaser.GameObjects.Container;
  private saveText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.loadData();
    this.calculateOfflineEarnings();

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // --- 1. 宇宙空間の作成（星空パーティクル） ---
    this.createStarField();

    // --- 2. リッチな惑星の作成 ---
    this.createPlanet(cx, cy - 200);

    // --- 3. UIテキスト ---
    const uiStyle = { fontFamily: '"Courier New", monospace', fontWeight: 'bold' };
    
    // 所持金（大きく表示）
    this.mineralText = this.add.text(cx, 100, '0', { ...uiStyle, fontSize: '60px', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#000000', 4);
      
    this.add.text(cx, 150, 'MINERALS', { ...uiStyle, fontSize: '16px', color: '#888888' }).setOrigin(0.5);

    // 秒間収益表示
    this.incomeText = this.add.text(cx, 180, '+0 / sec', { ...uiStyle, fontSize: '20px', color: '#00ff00' })
      .setOrigin(0.5)
      .setStroke('#000000', 2);

    // セーブ通知
    this.saveText = this.add.text(this.scale.width - 20, 20, 'AUTOSAVED', { fontSize: '14px', color: '#00ff00' })
      .setOrigin(1, 0).setAlpha(0);

    // --- 4. ショップリストの作成 ---
    this.createShopList(cx, cy + 50);

    // --- 5. イベントループ ---
    // 惑星クリック
    this.planet.setSize(300, 300);
    this.planet.setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePlanetClick(pointer));

    // 自動採掘（1秒ごと）
    this.time.addEvent({ delay: 1000, callback: () => this.autoMine(), loop: true });
    // 自動セーブ（10秒ごと）
    this.time.addEvent({ delay: 10000, callback: () => this.saveData(), loop: true });
    // UI更新ループ（高速）
    this.events.on('update', () => this.updateShopUI());

    this.updateUI();
  }

  // --- 画面構築メソッド ---

  private createStarField() {
    // 奥の星
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      this.add.circle(x, y, Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.5));
    }
  }

  private createPlanet(x: number, y: number) {
    this.planet = this.add.container(x, y);

    // 大気圏（光るぼやけた円）
    const atmosphere = this.add.arc(0, 0, 160, 0, 360, false, 0x4488ff, 0.3);
    this.tweens.add({ targets: atmosphere, alpha: 0.1, scale: 1.1, duration: 2000, yoyo: true, repeat: -1 });

    // 惑星本体（グラデーション風に重ねる）
    this.planetBody = this.add.circle(0, 0, 150, 0x4466aa);
    const shadow = this.add.circle(-20, -20, 130, 0x000000, 0.3); // 影
    const highlight = this.add.circle(30, 30, 100, 0xffffff, 0.1); // ハイライト

    // 惑星の輪
    const ring = this.add.ellipse(0, 0, 450, 100, 0x88ccff, 0.4).setRotation(0.3);
    
    this.planet.add([atmosphere, ring, this.planetBody, shadow, highlight]);
    
    // 自転アニメーション（輪をゆっくり回す）
    this.tweens.add({ targets: ring, rotation: 0.4, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private createShopList(x: number, startY: number) {
    this.shopContainer = this.add.container(0, 0);
    const gap = 85; // ボタンの間隔

    this.buildings.forEach((b, index) => {
      const y = startY + (index * gap);
      
      // ボタン背景
      const bg = this.add.rectangle(x, y, 380, 75, 0x222222)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0x555555);

      // 名前と所持数
      const nameText = this.add.text(x - 170, y - 20, b.name, { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' });
      const countText = this.add.text(x + 170, y - 20, `Lv.${b.count}`, { fontSize: '24px', color: '#ffffff' }).setOrigin(1, 0);
      
      // 価格と収入
      const costText = this.add.text(x - 170, y + 10, `Cost: ${this.formatNumber(b.cost)}`, { fontSize: '16px', color: '#aaaaaa' });
      const incomeText = this.add.text(x + 170, y + 10, `+${this.formatNumber(b.baseIncome)}/s`, { fontSize: '16px', color: '#00ff00' }).setOrigin(1, 0);

      // データ連動のために名前をつけておく
      bg.setName(`btn_${index}`);
      costText.setName(`cost_${index}`);
      countText.setName(`count_${index}`);
      
      // クリックイベント
      bg.on('pointerdown', () => this.buyBuilding(index));

      this.shopContainer.add([bg, nameText, countText, costText, incomeText]);
    });
  }

  // --- アクション処理 ---

  private handlePlanetClick(pointer: Phaser.Input.Pointer) {
    this.minerals += 1;
    this.updateUI();
    
    // 惑星が弾むアニメーション
    this.tweens.add({
      targets: this.planet,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 50,
      yoyo: true,
      ease: 'Power1'
    });

    // パーティクル演出（岩が飛び散る）
    this.createClickParticles(pointer.x, pointer.y);
    // 数字が飛び出す演出
    this.createFloatingText(pointer.x, pointer.y, '+1');
  }

  private createClickParticles(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 6), 0x88ccff);
      this.physics.add.existing(p); // 物理演算を一瞬使う（Phaser default physics使用前提）
      // 簡易的な動き（物理エンジンなしでTweenで実装）
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(30, 80);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0,
        duration: 400,
        onComplete: () => p.destroy()
      });
    }
  }

  private createFloatingText(x: number, y: number, msg: string) {
    const text = this.add.text(x, y, msg, { fontSize: '28px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      ease: 'Back.easeOut',
      onComplete: () => text.destroy()
    });
  }

  private autoMine() {
    let income = 0;
    this.buildings.forEach(b => income += (b.count * b.baseIncome));
    
    if (income > 0) {
      this.minerals += income;
      this.updateUI();
      // 惑星の中心から合計値が出る
      this.createFloatingText(this.planet.x, this.planet.y - 100, `+${this.formatNumber(income)}`);
    }
  }

  private buyBuilding(index: number) {
    const b = this.buildings[index];
    if (this.minerals >= b.cost) {
      this.minerals -= b.cost;
      b.count++;
      b.cost = Math.floor(b.cost * 1.5); // インフレ率1.5倍
      this.updateUI();
      this.updateShopUI(); // 即座にUI反映
      this.saveData(); // 購入時セーブ
    }
  }

  // --- UI更新 & ユーティリティ ---

  private updateUI() {
    this.mineralText.setText(this.formatNumber(Math.floor(this.minerals)));
    
    // 秒間収益の計算
    let totalIncome = 0;
    this.buildings.forEach(b => totalIncome += (b.count * b.baseIncome));
    this.incomeText.setText(`+${this.formatNumber(totalIncome)} / sec`);
  }

  private updateShopUI() {
    // ショップのボタンの状態（買えるかどうか）を常時監視して色を変える
    this.buildings.forEach((b, index) => {
      const bg = this.shopContainer.getByName(`btn_${index}`) as Phaser.GameObjects.Rectangle;
      const costText = this.shopContainer.getByName(`cost_${index}`) as Phaser.GameObjects.Text;
      const countText = this.shopContainer.getByName(`count_${index}`) as Phaser.GameObjects.Text;

      if (bg && costText && countText) {
        costText.setText(`Cost: ${this.formatNumber(b.cost)}`);
        countText.setText(`Lv.${b.count}`);

        if (this.minerals >= b.cost) {
          bg.setFillStyle(0x333333); // 買える：普通の色
          bg.setStrokeStyle(2, b.color); // 枠線を施設ごとのテーマカラーに
          bg.setAlpha(1);
        } else {
          bg.setFillStyle(0x000000); // 買えない：暗く
          bg.setStrokeStyle(1, 0x333333);
          bg.setAlpha(0.5);
        }
      }
    });
  }

  // 数字のフォーマット（1000 -> 1k, 1000000 -> 1M）
  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  // --- セーブ & ロード ---

  private saveData() {
    const saveObj = {
      minerals: this.minerals,
      buildings: this.buildings.map(b => ({ count: b.count, cost: b.cost })), // 必要なデータだけ抽出
      lastSaveTime: Date.now()
    };
    localStorage.setItem('cosmic_mining_v2', JSON.stringify(saveObj));
    
    this.saveText.setAlpha(1);
    this.tweens.add({ targets: this.saveText, alpha: 0, duration: 1000, delay: 500 });
  }

  private loadData() {
    const rawData = localStorage.getItem('cosmic_mining_v2');
    if (rawData) {
      const data = JSON.parse(rawData);
      this.minerals = data.minerals || 0;
      this.lastSaveTime = data.lastSaveTime || Date.now();

      // 建物のデータを復元
      if (data.buildings && Array.isArray(data.buildings)) {
        data.buildings.forEach((savedB: any, i: number) => {
          if (this.buildings[i]) {
            this.buildings[i].count = savedB.count;
            this.buildings[i].cost = savedB.cost;
          }
        });
      }
    } else {
      // 旧バージョンのデータチェック（移行措置）
      const oldData = localStorage.getItem('cosmic_save');
      if (oldData) {
        const d = JSON.parse(oldData);
        this.minerals = d.minerals || 0;
        if (d.droneCount) {
           this.buildings[0].count = d.droneCount; // 旧ドローンを新ドローンに引き継ぎ
           this.buildings[0].cost = d.droneCost || 15;
        }
      }
    }
  }

  private calculateOfflineEarnings() {
    const now = Date.now();
    const diffSeconds = (now - this.lastSaveTime) / 1000;
    
    if (diffSeconds > 10) {
      let totalIncome = 0;
      this.buildings.forEach(b => totalIncome += (b.count * b.baseIncome));
      
      if (totalIncome > 0) {
        const earned = Math.floor(totalIncome * diffSeconds);
        this.minerals += earned;
        alert(`オフライン収益レポート\n\n経過時間: ${Math.floor(diffSeconds)}秒\n獲得: ${this.formatNumber(earned)} Minerals`);
      }
    }
  }
}
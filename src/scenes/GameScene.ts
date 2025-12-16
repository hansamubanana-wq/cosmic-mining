import Phaser from 'phaser';

interface Building {
  id: string;
  name: string;
  baseCost: number;
  baseIncome: number;
  count: number;
  cost: number;
  color: number;
  icon: string;
}

export class GameScene extends Phaser.Scene {
  private minerals: number = 0;
  private lastSaveTime: number = Date.now();
  
  private buildings: Building[] = [
    { id: 'drone', name: '採掘ドローン', baseCost: 15, baseIncome: 1, count: 0, cost: 15, color: 0x22ff22, icon: '🛸' },
    { id: 'rover', name: '探査ローバー', baseCost: 100, baseIncome: 5, count: 0, cost: 100, color: 0x00ccff, icon: '🚜' },
    { id: 'station', name: '宇宙ステーション', baseCost: 1100, baseIncome: 32, count: 0, cost: 1100, color: 0xffaa00, icon: '🛰️' },
    { id: 'base', name: '月面基地', baseCost: 12000, baseIncome: 150, count: 0, cost: 12000, color: 0xff4444, icon: '🌔' },
    { id: 'dyson', name: 'ダイソン球', baseCost: 100000, baseIncome: 1000, count: 0, cost: 100000, color: 0xaa00ff, icon: '🌞' },
    { id: 'gate', name: 'ワープゲート', baseCost: 1000000, baseIncome: 5000, count: 0, cost: 1000000, color: 0x00ffff, icon: '🌀' },
  ];

  private mineralText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;
  private planet!: Phaser.GameObjects.Container;
  private shopContainer!: Phaser.GameObjects.Container;
  private saveText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.loadData();
    this.calculateOfflineEarnings();

    // 画面中央の基準線
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    
    this.createStarField();

    // --- レイアウト調整 ---
    // 画面が縦に伸びたので、配置を割合（%）で指定して綺麗に散らす
    const headerY = this.scale.height * 0.1;  // 上から10%の位置
    const planetY = this.scale.height * 0.25; // 上から25%の位置
    const shopY = this.scale.height * 0.55;   // 上から55%の位置からショップ開始

    // --- 惑星 ---
    this.createPlanet(cx, planetY);

    // --- UIヘッダー（文字サイズUP） ---
    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif', fontWeight: 'bold' };
    
    // 背景バー
    this.add.rectangle(cx, headerY, 900, 220, 0x000000, 0.5).setStrokeStyle(2, 0x444444);
    
    this.mineralText = this.add.text(cx, headerY - 20, '0', { ...jpFont, fontSize: '90px', color: '#ffffff' })
      .setOrigin(0.5).setStroke('#000000', 6);
      
    this.add.text(cx, headerY + 50, 'MINERALS', { ...jpFont, fontSize: '24px', color: '#aaaaaa' }).setOrigin(0.5);
    
    this.incomeText = this.add.text(cx, headerY + 90, '+0 / 秒', { ...jpFont, fontSize: '32px', color: '#00ff00' })
      .setOrigin(0.5).setStroke('#000000', 3);

    this.saveText = this.add.text(this.scale.width - 30, 40, 'AUTOSAVE', { fontSize: '24px', color: '#00ff00' }).setOrigin(1, 0).setAlpha(0);

    // --- ショップエリア ---
    this.createGridShop(cx, shopY);

    // --- イベント ---
    this.time.addEvent({ delay: 1000, callback: () => this.autoMine(), loop: true });
    this.time.addEvent({ delay: 10000, callback: () => this.saveData(), loop: true });
    this.events.on('update', () => this.updateShopUI());

    this.updateUI();
  }

  // --- 惑星生成 ---
  private createPlanet(x: number, y: number) {
    this.planet = this.add.container(x, y);
    // 惑星サイズも少し大きく
    const radius = 180;
    
    const body = this.add.circle(0, 0, radius, 0x4466aa);
    const shadow = this.add.circle(-30, -30, radius - 20, 0x000000, 0.3);
    const atmosphere = this.add.arc(0, 0, radius + 20, 0, 360, false, 0x4488ff, 0.2);
    const ring = this.add.ellipse(0, 0, radius * 3.5, radius * 0.8, 0x88ccff, 0.4).setRotation(0.3);

    this.planet.add([atmosphere, ring, body, shadow]);
    // タップ判定エリアも大きく
    this.planet.setSize(radius * 2.5, radius * 2.5);

    this.planet.setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePlanetClick(pointer));

    this.tweens.add({ targets: this.planet, y: y + 15, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ring, rotation: 0.35, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // --- グリッドショップ生成（巨大化） ---
  private createGridShop(centerX: number, startY: number) {
    this.shopContainer = this.add.container(0, 0);
    const cols = 2;
    // ボタンサイズを大幅アップ (190 -> 450)
    const cellWidth = 460;
    const cellHeight = 280;
    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", sans-serif', fontWeight: 'bold' };

    this.buildings.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // 間隔を少し空けて配置
      const x = centerX + (col - 0.5) * cellWidth * 1.08;
      const y = startY + row * cellHeight * 1.08;

      const container = this.add.container(x, y);

      // 背景ボタン
      const bg = this.add.rectangle(0, 0, 440, 260, 0x222222).setStrokeStyle(4, 0x555555)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.buyBuilding(i));
      bg.setName(`bg`);

      // ゲージ
      const barBg = this.add.rectangle(0, 120, 440, 15, 0x000000);
      const barFill = this.add.rectangle(-220, 120, 0, 15, 0xffff00).setOrigin(0, 0.5);
      barFill.setName('bar');

      // アイコン（サイズ倍増）
      const icon = this.add.text(0, -50, b.icon, { fontSize: '100px' }).setOrigin(0.5);
      
      // 文字情報（サイズ倍増）
      const nameText = this.add.text(0, 15, b.name, { ...jpFont, fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
      
      const costText = this.add.text(0, 55, `¥${this.formatNumber(b.cost)}`, { ...jpFont, fontSize: '36px', color: '#aaaaaa' }).setOrigin(0.5);
      costText.setName('cost');
      
      // 所持数バッジ
      const countBg = this.add.circle(180, -100, 35, 0x000000);
      const countText = this.add.text(180, -100, `${b.count}`, { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
      countText.setName('count');

      // 秒間収入
      const incomeText = this.add.text(0, 90, `+${this.formatNumber(b.baseIncome)}/秒`, { fontSize: '24px', color: '#00ff00' }).setOrigin(0.5);

      container.add([bg, barBg, barFill, icon, nameText, costText, incomeText, countBg, countText]);
      container.setName(`item_${i}`);
      this.shopContainer.add(container);
    });
  }

  // --- アクション ---

  private handlePlanetClick(pointer: Phaser.Input.Pointer) {
    const isCritical = Math.random() < 0.05;
    const baseAmount = 1;
    const amount = isCritical ? baseAmount * 10 : baseAmount;

    this.minerals += amount;
    this.updateUI();

    this.tweens.add({ targets: this.planet, scaleX: 0.9, scaleY: 0.9, duration: 50, yoyo: true });

    if (isCritical) {
      this.cameras.main.shake(100, 0.01);
      this.createFloatingText(pointer.x, pointer.y, `CRITICAL!\n+${amount}`, 0xff0000, 60);
    } else {
      this.createFloatingText(pointer.x, pointer.y, `+${amount}`, 0xffffff, 48);
    }
  }

  private autoMine() {
    let income = 0;
    this.buildings.forEach(b => income += (b.count * b.baseIncome));
    
    if (income > 0) {
      this.minerals += income;
      this.updateUI();
      
      const b = this.buildings[Phaser.Math.Between(0, this.buildings.length - 1)];
      if (b.count > 0) {
         // アイコンが飛び出す位置調整
         const x = this.planet.x + Phaser.Math.Between(-80, 80);
         this.createFloatingText(x, this.planet.y - 150, `${b.icon} +${this.formatNumber(income)}`, 0x00ff00, 32);
      }
    }
  }

  private buyBuilding(index: number) {
    const b = this.buildings[index];
    if (this.minerals >= b.cost) {
      this.minerals -= b.cost;
      b.count++;
      b.cost = Math.floor(b.cost * 1.5);
      this.updateUI();
      
      const container = this.shopContainer.getByName(`item_${index}`) as Phaser.GameObjects.Container;
      this.tweens.add({ targets: container, scale: 1.05, duration: 100, yoyo: true });
      
      this.saveData();
    }
  }

  // --- UI更新 ---

  private updateUI() {
    this.mineralText.setText(this.formatNumber(Math.floor(this.minerals)));
    let totalIncome = 0;
    this.buildings.forEach(b => totalIncome += (b.count * b.baseIncome));
    this.incomeText.setText(`+${this.formatNumber(totalIncome)} / 秒`);
  }

  private updateShopUI() {
    this.buildings.forEach((b, i) => {
      const container = this.shopContainer.getByName(`item_${i}`) as Phaser.GameObjects.Container;
      if (!container) return;

      const bg = container.getByName('bg') as Phaser.GameObjects.Rectangle;
      const costText = container.getByName('cost') as Phaser.GameObjects.Text;
      const countText = container.getByName('count') as Phaser.GameObjects.Text;
      const bar = container.getByName('bar') as Phaser.GameObjects.Rectangle;

      costText.setText(`¥${this.formatNumber(b.cost)}`);
      countText.setText(`${b.count}`);

      const percent = Phaser.Math.Clamp(this.minerals / b.cost, 0, 1);
      // バーの長さも最大値(440)に合わせて調整
      bar.width = 440 * percent;

      if (this.minerals >= b.cost) {
        bg.setStrokeStyle(4, b.color);
        bg.setAlpha(1);
        costText.setColor('#ffffff');
      } else {
        bg.setStrokeStyle(2, 0x444444);
        bg.setAlpha(0.6);
        costText.setColor('#888888');
      }
    });
  }

  private createFloatingText(x: number, y: number, msg: string, color: number, size: number) {
    const text = this.add.text(x, y, msg, { 
      fontSize: `${size}px`, 
      color: '#ffffff', 
      fontStyle: 'bold', 
      stroke: `#${color.toString(16)}`, 
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 120, // 浮き上がる距離も長く
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  private createStarField() {
    for (let i = 0; i < 150; i++) {
      this.add.circle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(0, this.scale.height),
        Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.8)
      );
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return Math.floor(num).toString();
  }

  private saveData() {
    const saveObj = {
      minerals: this.minerals,
      buildings: this.buildings.map(b => ({ id: b.id, count: b.count, cost: b.cost })),
      lastSaveTime: Date.now()
    };
    localStorage.setItem('cosmic_mining_v3', JSON.stringify(saveObj));
    this.saveText.setAlpha(1);
    this.tweens.add({ targets: this.saveText, alpha: 0, duration: 2000 });
  }

  private loadData() {
    const rawData = localStorage.getItem('cosmic_mining_v3');
    if (rawData) {
      const data = JSON.parse(rawData);
      this.minerals = data.minerals || 0;
      this.lastSaveTime = data.lastSaveTime || Date.now();
      if (data.buildings) {
        data.buildings.forEach((saved: any) => {
          const b = this.buildings.find(x => x.id === saved.id);
          if (b) { b.count = saved.count; b.cost = saved.cost; }
        });
      }
    }
  }

  private calculateOfflineEarnings() {
    const diff = (Date.now() - this.lastSaveTime) / 1000;
    if (diff > 10) {
      let income = 0;
      this.buildings.forEach(b => income += (b.count * b.baseIncome));
      if (income > 0) {
        const earned = income * diff;
        this.minerals += earned;
        // アラートが出ると操作の邪魔なので、今回はコンソールログだけに控える（あるいは後で専用UIを作る）
        console.log(`オフライン収益: ${this.formatNumber(earned)}`);
      }
    }
  }
}
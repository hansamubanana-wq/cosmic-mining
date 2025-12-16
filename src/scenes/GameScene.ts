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
  // --- ゲームデータ ---
  private minerals: number = 0;
  private lastSaveTime: number = Date.now();
  
  // 施設データ
  private buildings: Building[] = [
    { id: 'drone', name: '採掘ドローン', baseCost: 15, baseIncome: 1, count: 0, cost: 15, color: 0x22ff22, icon: '🛸' },
    { id: 'rover', name: '探査ローバー', baseCost: 100, baseIncome: 5, count: 0, cost: 100, color: 0x00ccff, icon: '🚜' },
    { id: 'station', name: '宇宙ステーション', baseCost: 1100, baseIncome: 32, count: 0, cost: 1100, color: 0xffaa00, icon: '🛰️' },
    { id: 'base', name: '月面基地', baseCost: 12000, baseIncome: 150, count: 0, cost: 12000, color: 0xff4444, icon: '🌔' },
    { id: 'dyson', name: 'ダイソン球', baseCost: 100000, baseIncome: 1000, count: 0, cost: 100000, color: 0xaa00ff, icon: '🌞' },
    { id: 'gate', name: 'ワープゲート', baseCost: 1000000, baseIncome: 5000, count: 0, cost: 1000000, color: 0x00ffff, icon: '🌀' },
  ];

  // --- 表示オブジェクト ---
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

    const cx = this.cameras.main.centerX;
    
    // --- 背景と惑星 ---
    this.createStarField();
    this.createPlanet(cx, 300);

    // --- UIヘッダー ---
    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif', fontWeight: 'bold' };
    
    // 所持金表示エリア（ここを修正：変数に入れずに直接描画）
    this.add.rectangle(cx, 80, 500, 150, 0x000000, 0.5);
    
    this.mineralText = this.add.text(cx, 70, '0', { ...jpFont, fontSize: '50px', color: '#ffffff' })
      .setOrigin(0.5).setStroke('#000000', 4);
    this.add.text(cx, 110, 'MINERALS', { ...jpFont, fontSize: '14px', color: '#888888' }).setOrigin(0.5);
    
    this.incomeText = this.add.text(cx, 140, '+0 / 秒', { ...jpFont, fontSize: '20px', color: '#00ff00' })
      .setOrigin(0.5).setStroke('#000000', 2);

    this.saveText = this.add.text(this.scale.width - 20, 20, 'AUTOSAVE', { fontSize: '12px', color: '#00ff00' }).setOrigin(1, 0).setAlpha(0);

    // --- ショップエリア ---
    this.createGridShop(cx, 550);

    // --- イベント ---
    this.time.addEvent({ delay: 1000, callback: () => this.autoMine(), loop: true });
    this.time.addEvent({ delay: 10000, callback: () => this.saveData(), loop: true });
    this.events.on('update', () => this.updateShopUI());

    this.updateUI();
  }

  // --- 惑星生成 ---
  private createPlanet(x: number, y: number) {
    this.planet = this.add.container(x, y);
    
    const body = this.add.circle(0, 0, 130, 0x4466aa);
    const shadow = this.add.circle(-20, -20, 110, 0x000000, 0.3);
    const atmosphere = this.add.arc(0, 0, 140, 0, 360, false, 0x4488ff, 0.2);
    const ring = this.add.ellipse(0, 0, 380, 80, 0x88ccff, 0.4).setRotation(0.3);

    this.planet.add([atmosphere, ring, body, shadow]);
    this.planet.setSize(260, 260);

    this.planet.setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePlanetClick(pointer));

    this.tweens.add({ targets: this.planet, y: y + 10, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ring, rotation: 0.35, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // --- グリッドショップ生成 ---
  private createGridShop(centerX: number, startY: number) {
    this.shopContainer = this.add.container(0, 0);
    const cols = 2;
    const cellWidth = 190;
    const cellHeight = 190;
    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", sans-serif', fontWeight: 'bold' };

    this.buildings.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = centerX + (col - 0.5) * cellWidth * 1.05;
      const y = startY + row * cellHeight * 1.05;

      const container = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, 180, 180, 0x222222).setStrokeStyle(2, 0x555555)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.buyBuilding(i));
      bg.setName(`bg`);

      const barBg = this.add.rectangle(0, 85, 180, 10, 0x000000);
      const barFill = this.add.rectangle(-90, 85, 0, 10, 0xffff00).setOrigin(0, 0.5);
      barFill.setName('bar');

      const icon = this.add.text(0, -30, b.icon, { fontSize: '60px' }).setOrigin(0.5);
      
      const nameText = this.add.text(0, 15, b.name, { ...jpFont, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      const costText = this.add.text(0, 40, `¥${this.formatNumber(b.cost)}`, { ...jpFont, fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);
      costText.setName('cost');
      
      const countBg = this.add.circle(70, -70, 20, 0x000000);
      const countText = this.add.text(70, -70, `${b.count}`, { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
      countText.setName('count');

      const incomeText = this.add.text(0, 60, `+${this.formatNumber(b.baseIncome)}/s`, { fontSize: '14px', color: '#00ff00' }).setOrigin(0.5);

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
      this.createFloatingText(pointer.x, pointer.y, `CRITICAL!\n+${amount}`, 0xff0000, 40);
    } else {
      this.createFloatingText(pointer.x, pointer.y, `+${amount}`, 0xffffff, 28);
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
         const x = this.planet.x + Phaser.Math.Between(-50, 50);
         this.planet.y + Phaser.Math.Between(-50, 50);
         this.createFloatingText(x, this.planet.y - 100, `${b.icon} +${this.formatNumber(income)}`, 0x00ff00, 24);
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
      this.tweens.add({ targets: container, scale: 1.1, duration: 100, yoyo: true });
      
      this.saveData();
    }
  }

  // --- UI更新 & 演出 ---

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
      bar.width = 180 * percent;

      if (this.minerals >= b.cost) {
        bg.setStrokeStyle(3, b.color);
        bg.setAlpha(1);
        costText.setColor('#ffffff');
      } else {
        bg.setStrokeStyle(1, 0x444444);
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
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 100,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  // --- ユーティリティ ---

  private createStarField() {
    for (let i = 0; i < 100; i++) {
      this.add.circle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(0, this.scale.height),
        Phaser.Math.FloatBetween(0.5, 2), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.8)
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

  // --- セーブ/ロード ---

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
    } else {
      const v2Data = localStorage.getItem('cosmic_mining_v2');
      if (v2Data) {
        const d = JSON.parse(v2Data);
        this.minerals = d.minerals || 0;
        alert("大型アップデートのため、施設がリセットされました。\n代わりに所持金は引き継がれます！");
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
        alert(`オフライン収益\n${this.formatNumber(earned)} Mineralsを獲得！`);
      }
    }
  }
}
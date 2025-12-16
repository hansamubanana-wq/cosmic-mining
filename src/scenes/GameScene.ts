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
  private planetBody!: Phaser.GameObjects.Arc;
  private shopContainer!: Phaser.GameObjects.Container;
  private saveText!: Phaser.GameObjects.Text;

  // cometTimer は削除しました

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.loadData();
    this.calculateOfflineEarnings();
    this.createStarField();

    const cx = 360;
    const headerY = 150;
    const planetY = 400;
    const shopY = 700;

    this.createHeader(cx, headerY);
    this.createPlanet(cx, planetY);
    this.createGridShop(cx, shopY);

    this.time.addEvent({ delay: 1000, callback: () => this.autoMine(), loop: true });
    this.time.addEvent({ delay: 5000, callback: () => this.saveData(), loop: true }); 
    this.events.on('update', () => this.updateShopUI());

    this.scheduleNextComet();
    this.updateUI();
  }

  // --- 彗星イベント ---
  private scheduleNextComet() {
    const delay = Phaser.Math.Between(15000, 45000); 
    // 変数への代入をやめ、直接実行
    this.time.addEvent({
      delay: delay,
      callback: () => this.spawnComet(),
    });
  }

  private spawnComet() {
    const isLeft = Math.random() > 0.5;
    const startX = isLeft ? -100 : 820;
    const endX = isLeft ? 820 : -100;
    const y = Phaser.Math.Between(100, 1000);

    const comet = this.add.container(startX, y);
    const head = this.add.circle(0, 0, 30, 0xffff00); 
    const tail = this.add.rectangle(isLeft ? -40 : 40, 0, 80, 20, 0xffaa00, 0.6);
    const glow = this.add.circle(0, 0, 50, 0xffffff, 0.3);
    
    comet.add([tail, glow, head]);
    
    const hitArea = this.add.circle(0, 0, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      this.catchComet(comet);
    });
    comet.add(hitArea);

    this.tweens.add({
      targets: comet,
      x: endX,
      y: y + Phaser.Math.Between(-200, 200),
      duration: 3000,
      onComplete: () => {
        comet.destroy();
        this.scheduleNextComet();
      }
    });
    
    this.tweens.add({
      targets: comet,
      angle: 360,
      duration: 500,
      repeat: -1
    });
  }

  private catchComet(comet: Phaser.GameObjects.Container) {
    comet.destroy();
    
    const bonus = Math.floor(this.minerals * 0.2) + 100;
    this.minerals += bonus;
    this.updateUI();

    this.cameras.main.shake(200, 0.02);
    this.createFloatingText(comet.x, comet.y, `LUCKY!!\n+${this.formatNumber(bonus)}`, 0xffff00, 60);
    
    for(let i=0; i<10; i++) {
        const p = this.add.circle(comet.x, comet.y, 10, 0xffff00);
        this.tweens.add({
            targets: p,
            x: comet.x + Phaser.Math.Between(-100, 100),
            y: comet.y + Phaser.Math.Between(-100, 100),
            alpha: 0,
            duration: 800,
            onComplete: () => p.destroy()
        });
    }

    this.scheduleNextComet();
  }

  // --- 惑星の進化 ---
  private checkPlanetEvolution() {
    let color = 0x4466aa; 

    if (this.minerals < 1000) {
        color = 0x888888;
    } else if (this.minerals < 100000) {
        color = 0x4466aa;
    } else if (this.minerals < 10000000) {
        color = 0x22aa44; 
    } else if (this.minerals < 1000000000) {
        color = 0xcc44cc; 
    } else {
        color = 0xffaa00; 
    }

    // 【修正箇所】
    // fillColorが null/undefined の場合は強制的に 0x888888 を使う
    // これにより safeCurrentColor は必ず number 型になる
    const safeCurrentColor = this.planetBody.fillColor || 0x888888;

    if (safeCurrentColor !== color) {
        this.tweens.addCounter({
            from: 0,
            to: 100,
            duration: 1000,
            onUpdate: (tween) => {
                const val = tween.getValue();
                const colObject = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(safeCurrentColor), // ここは絶対にnumberになる
                    Phaser.Display.Color.ValueToColor(color),
                    100, val
                );
                this.planetBody.setFillStyle(Phaser.Display.Color.GetColor(colObject.r, colObject.g, colObject.b));
            }
        });
    }
  }

  // --- ヘッダー ---
  private createHeader(x: number, y: number) {
    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif', fontWeight: 'bold' };
    
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.lineStyle(2, 0x444444);
    bg.fillRoundedRect(x - 320, y - 80, 640, 160, 20);
    bg.strokeRoundedRect(x - 320, y - 80, 640, 160, 20);

    this.mineralText = this.add.text(x, y - 15, '0', { ...jpFont, fontSize: '70px', color: '#ffffff' })
      .setOrigin(0.5).setStroke('#000000', 6);
      
    this.add.text(x, y + 45, 'MINERALS', { ...jpFont, fontSize: '20px', color: '#aaaaaa' }).setOrigin(0.5);
    
    this.incomeText = this.add.text(x, y + 75, '+0 / 秒', { ...jpFont, fontSize: '24px', color: '#00ff00' })
      .setOrigin(0.5).setStroke('#000000', 3);

    this.saveText = this.add.text(680, 20, 'AUTOSAVE', { fontSize: '16px', color: '#00ff00' }).setOrigin(1, 0).setAlpha(0);
  }

  // --- 惑星 ---
  private createPlanet(x: number, y: number) {
    this.planet = this.add.container(x, y);
    const radius = 180;
    
    this.planetBody = this.add.circle(0, 0, radius, 0x888888); 
    const shadow = this.add.circle(-20, -20, radius - 10, 0x000000, 0.3);
    const atmosphere = this.add.arc(0, 0, radius + 20, 0, 360, false, 0x4488ff, 0.2);
    const ring = this.add.ellipse(0, 0, radius * 3.2, radius * 0.7, 0x88ccff, 0.4).setRotation(0.3);

    this.planet.add([atmosphere, ring, this.planetBody, shadow]);
    this.planet.setSize(radius * 2.5, radius * 2.5);

    this.planet.setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePlanetClick(pointer));

    this.tweens.add({ targets: this.planet, y: y + 20, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ring, rotation: 0.35, duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // --- ショップ ---
  private createGridShop(centerX: number, startY: number) {
    this.shopContainer = this.add.container(0, 0);
    const cols = 2;
    const cellWidth = 330; 
    const cellHeight = 220;
    const margin = 20;

    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", sans-serif', fontWeight: 'bold' };

    this.buildings.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = centerX + (col === 0 ? -1 : 1) * (cellWidth / 2 + margin / 2);
      const y = startY + row * (cellHeight + margin);

      const container = this.add.container(x, y);

      const bg = this.add.graphics();
      const hitArea = this.add.rectangle(0, 0, cellWidth, cellHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.buyBuilding(i));
      
      bg.setName('bgGraphics'); 

      const barY = 70;
      const barBg = this.add.rectangle(0, barY, cellWidth * 0.9, 12, 0x000000);
      const barFill = this.add.rectangle(-(cellWidth * 0.9) / 2, barY, 0, 12, 0xffff00).setOrigin(0, 0.5);
      barFill.setName('bar');

      const icon = this.add.text(-90, -40, b.icon, { fontSize: '90px' }).setOrigin(0.5);
      
      const nameText = this.add.text(50, -60, b.name, { ...jpFont, fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
      
      const costText = this.add.text(50, -10, `¥${this.formatNumber(b.cost)}`, { ...jpFont, fontSize: '32px', color: '#aaaaaa' }).setOrigin(0.5);
      costText.setName('cost');
      
      const incomeText = this.add.text(50, 35, `+${this.formatNumber(b.baseIncome)}/秒`, { fontSize: '22px', color: '#00ff00' }).setOrigin(0.5);

      const countBg = this.add.circle(130, -80, 28, 0x000000).setStrokeStyle(3, 0xffffff);
      const countText = this.add.text(130, -80, `${b.count}`, { fontSize: '26px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      countText.setName('count');

      container.add([bg, hitArea, barBg, barFill, icon, nameText, costText, incomeText, countBg, countText]);
      container.setName(`item_${i}`);
      container.setData('info', { width: cellWidth, height: cellHeight, radius: 20 });

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
    
    const x = pointer.worldX;
    const y = pointer.worldY;
    const color = isCritical ? 0xff0000 : 0xffffff;
    const size = isCritical ? 60 : 40;
    this.createFloatingText(x, y, `+${amount}`, color, size);
  }

  private autoMine() {
    let income = 0;
    this.buildings.forEach(b => income += (b.count * b.baseIncome));
    if (income > 0) {
      this.minerals += income;
      this.updateUI();
      const b = this.buildings[Phaser.Math.Between(0, this.buildings.length - 1)];
      if (b.count > 0) {
         const x = this.planet.x + Phaser.Math.Between(-60, 60);
         this.createFloatingText(x, this.planet.y - 120, `${b.icon}+${this.formatNumber(income)}`, 0x00ff00, 28);
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
    
    this.checkPlanetEvolution();
  }

  private updateShopUI() {
    this.buildings.forEach((b, i) => {
      const container = this.shopContainer.getByName(`item_${i}`) as Phaser.GameObjects.Container;
      if (!container) return;

      const bgGraphics = container.getByName('bgGraphics') as Phaser.GameObjects.Graphics;
      const costText = container.getByName('cost') as Phaser.GameObjects.Text;
      const countText = container.getByName('count') as Phaser.GameObjects.Text;
      const bar = container.getByName('bar') as Phaser.GameObjects.Rectangle;
      
      const { width, height, radius } = container.getData('info');

      costText.setText(`¥${this.formatNumber(b.cost)}`);
      countText.setText(`${b.count}`);
      const percent = Phaser.Math.Clamp(this.minerals / b.cost, 0, 1);
      bar.width = (width * 0.9) * percent;

      bgGraphics.clear();
      const isAffordable = this.minerals >= b.cost;
      const bgColor = 0x222222;
      const strokeColor = isAffordable ? b.color : 0x555555;
      const alpha = isAffordable ? 0.9 : 0.6;
      bgGraphics.fillStyle(bgColor, alpha);
      bgGraphics.fillRoundedRect(-width/2, -height/2, width, height, radius);
      bgGraphics.lineStyle(isAffordable ? 4 : 2, strokeColor);
      bgGraphics.strokeRoundedRect(-width/2, -height/2, width, height, radius);
      costText.setColor(isAffordable ? '#ffffff' : '#888888');
    });
  }

  private createFloatingText(x: number, y: number, msg: string, color: number, size: number) {
    const text = this.add.text(x, y, msg, { fontSize: `${size}px`, color: '#ffffff', stroke: `#${color.toString(16)}`, strokeThickness: 4 }).setOrigin(0.5);
    this.tweens.add({ targets: text, y: y - 100, alpha: 0, duration: 1000, onComplete: () => text.destroy() });
  }

  private createStarField() {
    for (let i = 0; i < 150; i++) {
      this.add.circle(Phaser.Math.Between(0, 720), Phaser.Math.Between(0, 1280), Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.8));
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
    const saveObj = { minerals: this.minerals, buildings: this.buildings.map(b => ({ id: b.id, count: b.count, cost: b.cost })), lastSaveTime: Date.now() };
    localStorage.setItem('cosmic_mining_v6', JSON.stringify(saveObj));
    this.saveText.setAlpha(1);
    this.tweens.add({ targets: this.saveText, alpha: 0, duration: 2000 });
  }

  private loadData() {
    const rawData = localStorage.getItem('cosmic_mining_v6');
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
        const v5Data = localStorage.getItem('cosmic_mining_v5');
        if(v5Data) {
            const d = JSON.parse(v5Data);
            this.minerals = d.minerals || 0;
        }
    }
  }

  private calculateOfflineEarnings() {
    const diff = (Date.now() - this.lastSaveTime) / 1000;
    if (diff > 10) {
      let income = 0;
      this.buildings.forEach(b => income += (b.count * b.baseIncome));
      if (income > 0) this.minerals += (income * diff);
    }
  }
}
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
  
  // 画面サイズ管理用
  private w!: number;
  private h!: number;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // 画面サイズを取得
    this.w = this.scale.width;
    this.h = this.scale.height;

    // 画面リサイズ時にも再配置するようにイベント登録
    this.scale.on('resize', this.handleResize, this);

    this.loadData();
    this.calculateOfflineEarnings();

    // --- 背景 ---
    this.createStarField();

    // --- UI構築 ---
    // レイアウト計算
    const headerY = this.h * 0.12; // 上から12%
    const planetY = this.h * 0.30; // 上から30%
    const shopY = this.h * 0.55;   // 上から55%

    // 1. 惑星
    this.createPlanet(this.w / 2, planetY);

    // 2. ヘッダー情報の作成
    this.createHeader(headerY);

    // 3. ショップの作成
    this.createGridShop(shopY);

    // 4. イベントループ
    this.time.addEvent({ delay: 1000, callback: () => this.autoMine(), loop: true });
    this.time.addEvent({ delay: 10000, callback: () => this.saveData(), loop: true });
    this.events.on('update', () => this.updateShopUI());

    this.updateUI();
  }

  // リサイズ対応（画面回転時など）
  private handleResize(gameSize: Phaser.Structs.Size) {
    this.w = gameSize.width;
    this.h = gameSize.height;
    this.scene.restart(); // 簡易的にシーンをリスタートして再描画
  }

  // --- ヘッダーUI ---
  private createHeader(y: number) {
    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif', fontWeight: 'bold' };
    
    // 背景（角丸）
    const bgWidth = Math.min(this.w * 0.9, 600); // 最大600px
    const bgHeight = 160;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.lineStyle(2, 0x444444);
    bg.fillRoundedRect((this.w - bgWidth) / 2, y - bgHeight/2, bgWidth, bgHeight, 20);
    bg.strokeRoundedRect((this.w - bgWidth) / 2, y - bgHeight/2, bgWidth, bgHeight, 20);

    // テキスト
    this.mineralText = this.add.text(this.w / 2, y - 15, '0', { ...jpFont, fontSize: `${Math.max(40, this.w * 0.1)}px`, color: '#ffffff' })
      .setOrigin(0.5).setStroke('#000000', 6);
      
    this.add.text(this.w / 2, y + 35, 'MINERALS', { ...jpFont, fontSize: '16px', color: '#aaaaaa' }).setOrigin(0.5);
    
    this.incomeText = this.add.text(this.w / 2, y + 60, '+0 / 秒', { ...jpFont, fontSize: '24px', color: '#00ff00' })
      .setOrigin(0.5).setStroke('#000000', 3);

    this.saveText = this.add.text(this.w - 20, 20, 'AUTOSAVE', { fontSize: '14px', color: '#00ff00' }).setOrigin(1, 0).setAlpha(0);
  }

  // --- 惑星生成 ---
  private createPlanet(x: number, y: number) {
    this.planet = this.add.container(x, y);
    // 画面幅に合わせて惑星サイズを調整（最大でも幅の40%程度）
    const radius = Math.min(this.w * 0.2, 180);
    
    const body = this.add.circle(0, 0, radius, 0x4466aa);
    const shadow = this.add.circle(-radius * 0.15, -radius * 0.15, radius * 0.9, 0x000000, 0.3);
    const atmosphere = this.add.arc(0, 0, radius * 1.1, 0, 360, false, 0x4488ff, 0.2);
    const ring = this.add.ellipse(0, 0, radius * 3, radius * 0.6, 0x88ccff, 0.4).setRotation(0.3);

    this.planet.add([atmosphere, ring, body, shadow]);
    this.planet.setSize(radius * 2.2, radius * 2.2);

    this.planet.setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePlanetClick(pointer));

    this.tweens.add({ targets: this.planet, y: y + 15, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ring, rotation: 0.35, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // --- グリッドショップ生成（角丸UI） ---
  private createGridShop(startY: number) {
    this.shopContainer = this.add.container(0, 0);
    const cols = 2;
    
    // 画面幅からボタンサイズを計算（余白考慮）
    const margin = 20;
    const totalMargin = margin * (cols + 1);
    const cellWidth = (this.w - totalMargin) / cols;
    const cellHeight = cellWidth * 0.65; // 横長のボタン比率

    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", sans-serif', fontWeight: 'bold' };

    this.buildings.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = margin + (col * (cellWidth + margin)) + cellWidth / 2;
      const y = startY + (row * (cellHeight + margin)) + cellHeight / 2;

      const container = this.add.container(x, y);

      // --- 1. ボタン背景（角丸グラフィックス） ---
      const bg = this.add.graphics();
      // ※色や枠線は updateShopUI で描画するのでここでは枠だけ確保用透明オブジェクトを置く
      const hitArea = this.add.rectangle(0, 0, cellWidth, cellHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.buyBuilding(i));
      hitArea.setName('hitArea'); // 参照用

      // グラフィックスオブジェクトは更新用に保持
      bg.setName('bgGraphics'); 

      // --- 2. ゲージ背景 ---
      const barHeight = 8;
      const barY = (cellHeight / 2) - barHeight - 10;
      const barBg = this.add.rectangle(0, barY, cellWidth * 0.9, barHeight, 0x000000);
      const barFill = this.add.rectangle(-(cellWidth * 0.9) / 2, barY, 0, barHeight, 0xffff00).setOrigin(0, 0.5);
      barFill.setName('bar');

      // --- 3. アイコンとテキスト ---
      const iconSize = cellHeight * 0.4;
      const icon = this.add.text(-cellWidth * 0.3, -cellHeight * 0.1, b.icon, { fontSize: `${iconSize}px` }).setOrigin(0.5);
      
      const nameText = this.add.text(cellWidth * 0.1, -cellHeight * 0.25, b.name, { ...jpFont, fontSize: `${cellWidth * 0.09}px`, color: '#ffffff' }).setOrigin(0.5);
      
      const costText = this.add.text(cellWidth * 0.1, 0, `¥${this.formatNumber(b.cost)}`, { ...jpFont, fontSize: `${cellWidth * 0.11}px`, color: '#aaaaaa' }).setOrigin(0.5);
      costText.setName('cost');
      
      const incomeText = this.add.text(cellWidth * 0.1, cellHeight * 0.2, `+${this.formatNumber(b.baseIncome)}/秒`, { fontSize: `${cellWidth * 0.08}px`, color: '#00ff00' }).setOrigin(0.5);

      // 所持数バッジ
      const badgeSize = cellHeight * 0.25;
      const countBg = this.add.circle(cellWidth/2 - 15, -cellHeight/2 + 15, badgeSize, 0x000000).setStrokeStyle(2, 0xffffff);
      const countText = this.add.text(cellWidth/2 - 15, -cellHeight/2 + 15, `${b.count}`, { fontSize: `${badgeSize}px`, color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      countText.setName('count');

      // コンテナに追加（bgGraphicsを一番下に）
      container.add([bg, hitArea, barBg, barFill, icon, nameText, costText, incomeText, countBg, countText]);
      container.setName(`item_${i}`);
      
      // データ保持
      container.setData('info', { width: cellWidth, height: cellHeight, radius: 16 });

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
    
    // エフェクト
    const color = isCritical ? 0xff0000 : 0xffffff;
    const size = isCritical ? 60 : 40;
    this.createFloatingText(pointer.x, pointer.y, `+${amount}`, color, size);
  }

  private autoMine() {
    let income = 0;
    this.buildings.forEach(b => income += (b.count * b.baseIncome));
    if (income > 0) {
      this.minerals += income;
      this.updateUI();
      // エフェクト（ランダム）
      const b = this.buildings[Phaser.Math.Between(0, this.buildings.length - 1)];
      if (b.count > 0) {
         const x = this.planet.x + Phaser.Math.Between(-50, 50);
         this.createFloatingText(x, this.planet.y - 100, `${b.icon}+${this.formatNumber(income)}`, 0x00ff00, 24);
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

  // --- UI更新（角丸描画含む） ---
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

      const bgGraphics = container.getByName('bgGraphics') as Phaser.GameObjects.Graphics;
      const costText = container.getByName('cost') as Phaser.GameObjects.Text;
      const countText = container.getByName('count') as Phaser.GameObjects.Text;
      const bar = container.getByName('bar') as Phaser.GameObjects.Rectangle;
      
      const { width, height, radius } = container.getData('info');

      // 1. テキスト更新
      costText.setText(`¥${this.formatNumber(b.cost)}`);
      countText.setText(`${b.count}`);

      // 2. ゲージ更新
      const percent = Phaser.Math.Clamp(this.minerals / b.cost, 0, 1);
      bar.width = (width * 0.9) * percent;

      // 3. 背景描画（Graphicsで角丸を再描画）
      bgGraphics.clear();
      
      const isAffordable = this.minerals >= b.cost;
      const bgColor = 0x222222;
      const strokeColor = isAffordable ? b.color : 0x555555;
      const alpha = isAffordable ? 0.9 : 0.6;
      const lineWidth = isAffordable ? 4 : 2;

      // 塗り
      bgGraphics.fillStyle(bgColor, alpha);
      bgGraphics.fillRoundedRect(-width/2, -height/2, width, height, radius);
      
      // 線
      bgGraphics.lineStyle(lineWidth, strokeColor);
      bgGraphics.strokeRoundedRect(-width/2, -height/2, width, height, radius);

      costText.setColor(isAffordable ? '#ffffff' : '#888888');
    });
  }

  // --- ユーティリティ ---
  private createFloatingText(x: number, y: number, msg: string, color: number, size: number) {
    const text = this.add.text(x, y, msg, { fontSize: `${size}px`, color: '#ffffff', stroke: `#${color.toString(16)}`, strokeThickness: 3 }).setOrigin(0.5);
    this.tweens.add({ targets: text, y: y - 80, alpha: 0, duration: 800, onComplete: () => text.destroy() });
  }

  private createStarField() {
    for (let i = 0; i < 150; i++) {
      this.add.circle(Phaser.Math.Between(0, this.w), Phaser.Math.Between(0, this.h), Phaser.Math.FloatBetween(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.8));
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
    localStorage.setItem('cosmic_mining_v4', JSON.stringify(saveObj));
    this.saveText.setAlpha(1);
    this.tweens.add({ targets: this.saveText, alpha: 0, duration: 2000 });
  }

  private loadData() {
    const rawData = localStorage.getItem('cosmic_mining_v4');
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
        // v3からの引き継ぎ
        const v3Data = localStorage.getItem('cosmic_mining_v3');
        if (v3Data) {
            const d = JSON.parse(v3Data);
            this.minerals = d.minerals || 0;
        }
    }
  }

  private calculateOfflineEarnings() {
    const diff = (Date.now() - this.lastSaveTime) / 1000;
    if (diff > 10) {
      let income = 0;
      this.buildings.forEach(b => income += (b.count * b.baseIncome));
      if (income > 0) {
        this.minerals += (income * diff);
      }
    }
  }
}
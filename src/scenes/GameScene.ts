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
  
  // 施設リスト（日本語化完了）
  private buildings: Building[] = [
    { name: '採掘ドローン', baseCost: 15, baseIncome: 1, count: 0, cost: 15, color: 0x00ff00 },
    { name: '探査ローバー', baseCost: 100, baseIncome: 5, count: 0, cost: 100, color: 0x00ccff },
    { name: '宇宙ステーション', baseCost: 1100, baseIncome: 32, count: 0, cost: 1100, color: 0xffaa00 },
    { name: '月面基地', baseCost: 12000, baseIncome: 150, count: 0, cost: 12000, color: 0xff4444 },
    { name: 'ダイソン球', baseCost: 100000, baseIncome: 1000, count: 0, cost: 100000, color: 0xaa00ff },
  ];

  // --- 表示オブジェクト ---
  private mineralText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;
  private planet!: Phaser.GameObjects.Container;
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

    // --- 1. 宇宙空間の作成 ---
    this.createStarField();

    // --- 2. 惑星の作成 ---
    this.createPlanet(cx, cy - 200);

    // --- 3. UIテキスト（日本語フォント対応） ---
    // 日本語が見やすいフォント指定
    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif', fontWeight: 'bold' };
    
    // 所持金
    this.mineralText = this.add.text(cx, 100, '0', { ...jpFont, fontSize: '60px', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#000000', 4);
      
    this.add.text(cx, 150, '鉱石 (Minerals)', { ...jpFont, fontSize: '18px', color: '#888888' }).setOrigin(0.5);

    // 秒間収益
    this.incomeText = this.add.text(cx, 180, '+0 / 秒', { ...jpFont, fontSize: '20px', color: '#00ff00' })
      .setOrigin(0.5)
      .setStroke('#000000', 2);

    // セーブ通知
    this.saveText = this.add.text(this.scale.width - 20, 20, 'データ保存完了', { ...jpFont, fontSize: '16px', color: '#00ff00' })
      .setOrigin(1, 0).setAlpha(0);

    // --- 4. ショップリスト ---
    this.createShopList(cx, cy + 50);

    // --- 5. イベント設定 ---
    this.planet.setSize(300, 300);
    this.planet.setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handlePlanetClick(pointer));

    this.time.addEvent({ delay: 1000, callback: () => this.autoMine(), loop: true });
    this.time.addEvent({ delay: 10000, callback: () => this.saveData(), loop: true });
    this.events.on('update', () => this.updateShopUI());

    this.updateUI();
  }

  // --- 画面構築メソッド ---

  private createStarField() {
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      this.add.circle(x, y, Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.5));
    }
  }

  private createPlanet(x: number, y: number) {
    this.planet = this.add.container(x, y);
    const atmosphere = this.add.arc(0, 0, 160, 0, 360, false, 0x4488ff, 0.3);
    this.tweens.add({ targets: atmosphere, alpha: 0.1, scale: 1.1, duration: 2000, yoyo: true, repeat: -1 });

    this.planetBody = this.add.circle(0, 0, 150, 0x4466aa);
    const shadow = this.add.circle(-20, -20, 130, 0x000000, 0.3);
    const highlight = this.add.circle(30, 30, 100, 0xffffff, 0.1);
    const ring = this.add.ellipse(0, 0, 450, 100, 0x88ccff, 0.4).setRotation(0.3);
    
    this.planet.add([atmosphere, ring, this.planetBody, shadow, highlight]);
    this.tweens.add({ targets: ring, rotation: 0.4, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private createShopList(x: number, startY: number) {
    this.shopContainer = this.add.container(0, 0);
    const gap = 85;
    const jpFont = { fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif', fontWeight: 'bold' };

    this.buildings.forEach((b, index) => {
      const y = startY + (index * gap);
      
      const bg = this.add.rectangle(x, y, 380, 75, 0x222222)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0x555555);

      // 日本語名
      const nameText = this.add.text(x - 170, y - 20, b.name, { ...jpFont, fontSize: '20px', color: '#ffffff' });
      const countText = this.add.text(x + 170, y - 20, `Lv.${b.count}`, { ...jpFont, fontSize: '24px', color: '#ffffff' }).setOrigin(1, 0);
      
      // 費用と効果
      const costText = this.add.text(x - 170, y + 15, `費用: ${this.formatNumber(b.cost)}`, { ...jpFont, fontSize: '16px', color: '#aaaaaa' });
      const incomeText = this.add.text(x + 170, y + 15, `+${this.formatNumber(b.baseIncome)}/秒`, { ...jpFont, fontSize: '16px', color: '#00ff00' }).setOrigin(1, 0);

      bg.setName(`btn_${index}`);
      costText.setName(`cost_${index}`);
      countText.setName(`count_${index}`);
      
      bg.on('pointerdown', () => this.buyBuilding(index));
      this.shopContainer.add([bg, nameText, countText, costText, incomeText]);
    });
  }

  // --- アクション処理 ---

  private handlePlanetClick(pointer: Phaser.Input.Pointer) {
    this.minerals += 1;
    this.updateUI();
    
    this.tweens.add({
      targets: this.planet,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 50,
      yoyo: true,
      ease: 'Power1'
    });

    this.createClickParticles(pointer.x, pointer.y);
    this.createFloatingText(pointer.x, pointer.y, '+1');
  }

  private createClickParticles(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 6), 0x88ccff);
      this.physics.add.existing(p);
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
      this.createFloatingText(this.planet.x, this.planet.y - 100, `+${this.formatNumber(income)}`);
    }
  }

  private buyBuilding(index: number) {
    const b = this.buildings[index];
    if (this.minerals >= b.cost) {
      this.minerals -= b.cost;
      b.count++;
      b.cost = Math.floor(b.cost * 1.5);
      this.updateUI();
      this.updateShopUI();
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
    this.buildings.forEach((b, index) => {
      const bg = this.shopContainer.getByName(`btn_${index}`) as Phaser.GameObjects.Rectangle;
      const costText = this.shopContainer.getByName(`cost_${index}`) as Phaser.GameObjects.Text;
      const countText = this.shopContainer.getByName(`count_${index}`) as Phaser.GameObjects.Text;

      if (bg && costText && countText) {
        costText.setText(`費用: ${this.formatNumber(b.cost)}`);
        countText.setText(`Lv.${b.count}`);

        if (this.minerals >= b.cost) {
          bg.setFillStyle(0x333333);
          bg.setStrokeStyle(2, b.color);
          bg.setAlpha(1);
        } else {
          bg.setFillStyle(0x000000);
          bg.setStrokeStyle(1, 0x333333);
          bg.setAlpha(0.5);
        }
      }
    });
  }

  // 数字フォーマット（k=1,000, M=1,000,000）
  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  // --- セーブ & ロード ---

  private saveData() {
    const saveObj = {
      minerals: this.minerals,
      buildings: this.buildings.map(b => ({ count: b.count, cost: b.cost })),
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

      if (data.buildings && Array.isArray(data.buildings)) {
        data.buildings.forEach((savedB: any, i: number) => {
          if (this.buildings[i]) {
            this.buildings[i].count = savedB.count;
            this.buildings[i].cost = savedB.cost;
          }
        });
      }
    } else {
      // 旧データ引き継ぎ処理
      const oldData = localStorage.getItem('cosmic_save');
      if (oldData) {
        const d = JSON.parse(oldData);
        this.minerals = d.minerals || 0;
        if (d.droneCount) {
           this.buildings[0].count = d.droneCount;
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
        alert(`おかえりなさい！\n放置中に ${this.formatNumber(earned)} 個の鉱石を採掘しました！`);
      }
    }
  }
}
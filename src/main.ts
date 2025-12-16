import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE, // 画面サイズに合わせて変形
    parent: 'game-container',
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: {
    pixelArt: false, // ドット絵モードではないのでfalse
    antialias: true, // 滑らかにする
    roundPixels: true, // 文字の滲みを防ぐために座標を整数にする
  },
  backgroundColor: '#0d1117',
  scene: [GameScene],
};

new Phaser.Game(config);
// src/utils/ResponsiveUtils.ts
import Phaser from 'phaser';

export interface UIAnchorPoints {
  topLeft: { x: number; y: number };
  topCenter: { x: number; y: number };
  topRight: { x: number; y: number };
  centerLeft: { x: number; y: number };
  center: { x: number; y: number };
  centerRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomCenter: { x: number; y: number };
  bottomRight: { x: number; y: number };
  width: number;
  height: number;
  isPortrait: boolean;
}

export class ResponsiveUtils {
  public static getUIAnchors(scene: Phaser.Scene): UIAnchorPoints {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    const isPortrait = height > width;

    // Respect safe area offset if any (could check env values but standard padding is enough)
    const padding = 16;

    return {
      topLeft: { x: padding, y: padding },
      topCenter: { x: width / 2, y: padding },
      topRight: { x: width - padding, y: padding },
      centerLeft: { x: padding, y: height / 2 },
      center: { x: width / 2, y: height / 2 },
      centerRight: { x: width - padding, y: height / 2 },
      bottomLeft: { x: padding, y: height - padding },
      bottomCenter: { x: width / 2, y: height - padding },
      bottomRight: { x: width - padding, y: height - padding },
      width,
      height,
      isPortrait
    };
  }

  /**
   * Scale size relative to screen dimension to keep it legible.
   */
  public static getScaleFactor(scene: Phaser.Scene): number {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    
    // Choose standard scale base: 1280x720
    const designWidth = 1280;
    const designHeight = 720;
    
    // Scale factor based on the shorter dimension
    const scaleX = width / designWidth;
    const scaleY = height / designHeight;
    
    return Math.min(scaleX, scaleY);
  }
}

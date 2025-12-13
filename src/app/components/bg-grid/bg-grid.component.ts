import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { PanDragDirective } from './pan-drag.directive';

@Component({
  selector: 'app-bg-grid',
  standalone: true,
  imports: [CommonModule, PanDragDirective],
  templateUrl: './bg-grid.component.html',
  styleUrls: ['./bg-grid.component.scss'],
})
export class BgGridComponent implements OnInit {
  // per default drag-bar. kann mit [interactive]="false" abgeschaltet werden
  @Input() interactive = true;
  @HostBinding('class.is-safari') isSafari = false;

  images = [
    'assets/background/me_anzug.jpeg',
    'assets/background/me_sunset.jpeg',
    'assets/background/me_coding.jpeg',
    'assets/background/me_waterfall.png',
    'assets/background/me_stormtrooper.png',
    'assets/background/me_soccer.png',
  ];

  cols = 16;
  rows = 10;
  tileSize = 350;
  tileGap = 350;
  step = this.tileSize + this.tileGap;
  dragMultiplier = 1;
  worldX = 0;
  worldY = 0;
  grids = Array.from({ length: 9 }, (_, i) => i);
  tiles: number[] = [];

  rowPatterns = [
    [0, 1, 2, 3],
    [3, 4, 5, 0],
    [1, 0, 2, 5],
    [4, 3, 5, 2],
  ];

  ngOnInit(): void {
    this.isSafari = this.detectSafari();
    this.configureForViewport();
  }

  private detectSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /Safari/i.test(ua) && !/Chrome|CriOS|Android|Edg/i.test(ua);
  }

  private configureForViewport() {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const isSmall = width <= 1024;

    if (this.isSafari) {
      this.cols = 12;
      this.rows = 8;
      this.tileSize = isSmall ? 140 : 260;
      this.tileGap = isSmall ? 100 : 180;
      this.dragMultiplier = isSmall ? 2.2 : 1.1;
    } else {
      this.cols = 16;
      this.rows = 10;
      if (isSmall) {
        this.tileSize = 150;
        this.tileGap = 120;
        this.dragMultiplier = 2.5;
      } else {
        this.tileSize = 300;
        this.tileGap = 300;
        this.dragMultiplier = 1.2;
      }
    }

    this.step = this.tileSize + this.tileGap;
    this.tiles = Array.from({ length: this.cols * this.rows }, (_, i) => i);
  }

  onPanDelta(e: { dx: number; dy: number }) {
    if (!this.interactive) return;
    this.worldX += e.dx * this.dragMultiplier;
    this.worldY += e.dy * this.dragMultiplier;

    const totalW = this.cols * this.step;
    const totalH = this.rows * this.step;

    if (this.worldX > totalW) this.worldX -= totalW;
    if (this.worldX < -totalW) this.worldX += totalW;
    if (this.worldY > totalH) this.worldY -= totalH;
    if (this.worldY < -totalH) this.worldY += totalH;
  }

  tileImage(index: number) {
    const col = index % this.cols;
    const row = Math.floor(index / this.cols);
    const pattern = this.rowPatterns[row % this.rowPatterns.length];
    const imgIndex = pattern[col % pattern.length];
    return this.images[imgIndex];
  }

  tileTransform(index: number): string {
    const col = index % this.cols;
    const row = Math.floor(index / this.cols);
    return `translate(${col * this.step}px, ${row * this.step}px)`;
  }

  gridTransform(gridIndex: number): string {
    const gx = gridIndex % 3;
    const gy = Math.floor(gridIndex / 3);
    const x = (gx - 1) * this.cols * this.step + this.worldX + 10;
    const y = (gy - 1) * this.rows * this.step + this.worldY + 10;
    return `translate(${x}px, ${y}px)`;
  }
}

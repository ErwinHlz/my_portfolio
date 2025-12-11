import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { PanDragDirective } from '../../pages/home/pan-drag.directive';

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

  images = [
    '/assets/erwin_anzug.jpeg',
    '/assets/me_sunset.jpeg',
    '/assets/me_coding.jpeg',
    '/assets/me_waterfall.png',
    'assets/me_stormtrooper.png',
    'assets/me_soccer.png',
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
  tiles = Array.from({ length: this.cols * this.rows }, (_, i) => i);

  rowPatterns = [
    [0, 1, 2, 3],
    [3, 4, 5, 0],
    [1, 0, 2, 5],
    [4, 3, 5, 2],
  ];

  ngOnInit(): void {
    this.configureForViewport();
  }

  private configureForViewport() {
    const width = window.innerWidth;

    if (width <= 1024) {
      this.tileSize = 150;
      this.tileGap = 120;
      this.dragMultiplier = 2.5;
    } else {
      this.tileSize = 300;
      this.tileGap = 300;
      this.dragMultiplier = 1.2;
    }

    this.step = this.tileSize + this.tileGap;
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

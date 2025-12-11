import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PanDragDirective } from '../../components/bg-grid/pan-drag.directive';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { BgGridComponent } from 'src/app/components/bg-grid/bg-grid.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, BgGridComponent],
})
export class HomePage {
  images = [
    '/assets/image_1.jpg',
    '/assets/image_2.jpg',
    '/assets/image_3.jpg',
    '/assets/image_4.jpg',
    'assets/icon/instagram.svg',
    'assets/icon/hamburger.svg',
  ];
  // feste grid größe
  cols = 16;
  rows = 10;

  //tile-size muss zu css passen
  tileSize = 400;
  tileGap = 400;
  step = this.tileSize + this.tileGap;

  // kamera position im unendlichen Grid
  worldX = 0;
  worldY = 0;

  grids = Array.from({ length: 9 }, (_, i) => i);
  tiles = Array.from({ length: this.cols * this.rows }, (_, i) => i);

  rowPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [2, 0, 1],
    [5, 3, 4],
  ];

  // array für @for

  constructor() {
    this.initTiles();

    const step = this.tileSize + this.tileGap;

    this.worldX %= step * this.cols;
    this.worldY %= step * this.rows;
  }
  initTiles() {
    const totalTiles = this.cols * this.rows;
    this.tiles = Array.from({ length: totalTiles }, (_, i) => i);
  }

  onPanDelta(e: { dx: number; dy: number }) {
    this.worldX += e.dx;
    this.worldY += e.dy;

    const totalW = this.cols * this.step;
    const totalH = this.rows * this.step;

    // Recenter the 3×3 block when crossing grid boundaries
    if (this.worldX > totalW) this.worldX -= totalW;
    if (this.worldX < -totalW) this.worldX += totalW;
    if (this.worldY > totalH) this.worldY -= totalH;
    if (this.worldY < -totalH) this.worldY += totalH;
  }

  tileImage(index: number) {
    const col = index % this.cols; // Spalte
    const row = Math.floor(index / this.cols); // Reihe

    // zyklisch durch das Muster, falls mehr Reihen als definiert
    const pattern = this.rowPatterns[row % this.rowPatterns.length];

    // Spalte modulo Pattern-Länge
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

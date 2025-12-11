import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TimelineEndpoint, TimelineEvent } from '../../models/timeline.models';
import { TimelineService } from '../../services/timeline.service';

type PositionedEvent = TimelineEvent & {
  leftPct: number;
  widthPct: number;
  openStart: boolean;
  openEnd: boolean;
  accent: string;
  row: number;
  startValue: number;
  endValue: number;
};

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class TimelineComponent implements OnInit {
  events: PositionedEvent[] = [];
  yearTicks: number[] = [];
  quarterTicks: number[] = [];
  trackWidth = 960;
  minValue = 0;
  maxValue = 0;
  private readonly currentYear = new Date().getFullYear();
  private readonly currentMonth = new Date().getMonth() + 1;
  private readonly quarterWidth = 65;
  private readonly palette = [
    'var(--accent-gold)',
    'var(--accent-forest)',
    'var(--accent-ice)',
    'var(--accent-ember)',
    'var(--accent-mint)',
  ];

  private readonly timelineService = inject(TimelineService);

  ngOnInit(): void {
    this.timelineService.getTimeline().subscribe({
      next: (res) => this.prepareTimeline(res),
      error: (err) => console.error('Fehler beim Laden der Timeline:', err),
    });
  }

  positionForYear(year: number): number {
    const range = Math.max(0.01, this.maxValue - this.minValue);
    const pos = ((year - this.minValue) / range) * 100;
    return Math.min(110, Math.max(-10, pos));
  }

  private prepareTimeline(rawEvents: TimelineEvent[]): void {
    if (!rawEvents.length) {
      this.events = [];
      this.yearTicks = [];
      this.quarterTicks = [];
      this.minValue = 0;
      this.maxValue = 1;
      return;
    }

    const numericYears: number[] = [];
    rawEvents.forEach((ev) => {
      const sy = this.extractYear(ev.dateStart);
      const ey = this.extractYear(ev.dateEnd);
      if (sy !== undefined) numericYears.push(sy);
      if (ey !== undefined) numericYears.push(ey);
    });

    const baseMinYear = numericYears.length
      ? Math.min(...numericYears)
      : this.currentYear;
    const baseMaxYear = Math.max(
      this.currentYear,
      numericYears.length ? Math.max(...numericYears) : this.currentYear,
    );

    const axisStart = baseMinYear;
    const axisEnd = Math.ceil(baseMaxYear + (this.currentMonth - 1) / 12);

    this.minValue = axisStart;
    this.maxValue = axisEnd;

    this.yearTicks = this.buildYearTicks(axisStart, axisEnd);
    this.quarterTicks = this.buildQuarterTicks(axisStart, axisEnd);
    this.trackWidth = this.quarterTicks.length * this.quarterWidth;

    const range = Math.max(0.01, axisEnd - axisStart);

    const positioned = rawEvents.map((ev, idx) => {
      const accent = this.palette[idx % this.palette.length];
      const start = this.resolveEndpoint(ev.dateStart, axisStart, true);
      const end = this.resolveEndpoint(ev.dateEnd, axisEnd, false);

      const startVal = this.toNumericValue(start.year, start.month);
      const endVal = this.toNumericValue(end.year, end.month);

      const rawLeft = ((startVal - axisStart) / range) * 100;
      const rawWidth = Math.max(2, ((endVal - startVal) / range) * 100);
      const rawEnd = rawLeft + rawWidth;

      let leftPct = rawLeft;
      let widthPct = rawWidth;
      let openStart = start.open;
      let openEnd = end.open;

      if (rawLeft < 0) {
        leftPct = 0;
        widthPct = rawEnd;
        openStart = true;
      }

      if (rawEnd > 100) {
        widthPct = rawEnd - leftPct;
        openEnd = true;
      }

      return {
        ...ev,
        leftPct,
        widthPct,
        openStart,
        openEnd,
        accent,
        row: 0,
        startValue: startVal,
        endValue: endVal,
      };
    });

    this.events = this.assignRows(positioned);
  }

  private buildYearTicks(start: number, end: number): number[] {
    const ticks: number[] = [];
    for (let y = Math.floor(start); y <= Math.ceil(end); y++) {
      ticks.push(y);
    }
    return ticks;
  }

  private buildQuarterTicks(start: number, end: number): number[] {
    const ticks: number[] = [];
    for (let y = Math.floor(start); y < Math.ceil(end); y++) {
      for (let q = 0; q < 4; q++) {
        ticks.push(y + q * 0.25);
      }
    }
    return ticks;
  }

  private resolveEndpoint(
    value: TimelineEndpoint,
    axisStart: number,
    isStart: boolean,
  ): { year: number; month: number; open: boolean } {
    if (value === 'before') {
      return { year: axisStart - 1, month: isStart ? 1 : 12, open: true };
    }
    if (value === 'now') {
      return { year: this.currentYear, month: this.currentMonth, open: true };
    }

    const match = /^(\d{4})(?:-(\d{1,2}))?$/.exec(String(value));
    if (match) {
      const year = Number(match[1]);
      const monthRaw = match[2] ? Number(match[2]) : undefined;
      const month = this.clamp(
        Math.floor(monthRaw ?? (isStart ? 1 : 12)),
        1,
        12,
      );
      return { year, month, open: false };
    }

    return {
      year: isStart ? axisStart : this.currentYear,
      month: isStart ? 1 : this.currentMonth,
      open: false,
    };
  }

  private extractYear(value: TimelineEndpoint): number | undefined {
    const match = /^(\d{4})/.exec(String(value));
    return match ? Number(match[1]) : undefined;
  }

  private toNumericValue(year: number, month: number): number {
    return year + (this.clamp(month, 1, 12) - 1) / 12;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private assignRows(items: PositionedEvent[]): PositionedEvent[] {
    const sorted = [...items].sort((a, b) => {
      if (a.startValue === b.startValue) {
        return b.endValue - a.endValue;
      }
      return a.startValue - b.startValue;
    });

    sorted.forEach((item, idx) => {
      // Alternierend oberhalb/unterhalb der Achse platzieren
      item.row = idx % 2;
    });

    return sorted;
  }

  computeTop(row: number): string {
    const base = 90;
    const step = 45;
    const offset = this.rowOffset(row) * step;
    return `${base + offset}px`;
  }

  rowOffset(row: number): number {
    return row === 0 ? -1 : 1;
  }
}
